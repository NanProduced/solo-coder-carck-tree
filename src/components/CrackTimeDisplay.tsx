import React from 'react'
import { CrackTimeResult, MAGNITUDE_COLORS, MAGNITUDE_ICONS, formatHashRate } from '@/lib/gpuCompute'
import { PasswordStrength } from '@/lib/passwordEntropy'

interface CrackTimeDisplayProps {
  crackTime: CrackTimeResult | null
  strength: PasswordStrength | null
  hashRate: number
  colorScheme?: 'blue' | 'purple'
}

const TIME_SCALE_LABELS = [
  { label: '秒', multiplier: 1 },
  { label: '分钟', multiplier: 60 },
  { label: '小时', multiplier: 3600 },
  { label: '天', multiplier: 86400 },
  { label: '月', multiplier: 2592000 },
  { label: '年', multiplier: 31536000 },
  { label: '世纪', multiplier: 3153600000 },
  { label: '宇宙年龄', multiplier: 4.3e17 }
]

export const CrackTimeDisplay: React.FC<CrackTimeDisplayProps> = ({
  crackTime,
  strength,
  hashRate,
  colorScheme = 'blue'
}) => {
  if (!crackTime || !strength) {
    return (
      <div className="glass-panel rounded-xl p-6">
        <div className="text-center text-text-muted py-8">
          <div className="text-4xl mb-3 opacity-30">⏳</div>
          <p>输入密码查看破解时间估算</p>
        </div>
      </div>
    )
  }

  const color = colorScheme === 'blue' ? 'text-neon-blue' : 'text-neon-purple'
  const bgGlow = colorScheme === 'blue' 
    ? 'shadow-[0_0_30px_oklch(0.75_0.15_250_/_0.15)]' 
    : 'shadow-[0_0_30px_oklch(0.70_0.18_280_/_0.15)]'

  const getTimeScalePosition = () => {
    if (crackTime.seconds === 0) return 0
    const logSeconds = Math.log10(crackTime.seconds)
    const logUniverse = Math.log10(4.3e17)
    return Math.min(1, Math.max(0, logSeconds / logUniverse))
  }

  const timeScalePosition = getTimeScalePosition()

  const formatScientific = (num: number): string => {
    if (num === 0) return '0'
    if (num < 1e3) return num.toFixed(0)
    if (num < 1e6) return (num / 1e3).toFixed(1) + ' × 10³'
    if (num < 1e9) return (num / 1e6).toFixed(1) + ' × 10⁶'
    if (num < 1e12) return (num / 1e9).toFixed(1) + ' × 10⁹'
    if (num < 1e15) return (num / 1e12).toFixed(1) + ' × 10¹²'
    if (num < 1e18) return (num / 1e15).toFixed(1) + ' × 10¹⁵'
    const exp = Math.floor(Math.log10(num))
    const mantissa = num / Math.pow(10, exp)
    return mantissa.toFixed(2) + ` × 10^${exp}`
  }

  return (
    <div className="space-y-4">
      <div className={`glass-panel rounded-xl p-6 ${bgGlow}`}>
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
               style={{ backgroundColor: MAGNITUDE_COLORS[crackTime.magnitude] + '20' }}>
            <span className="text-3xl">{MAGNITUDE_ICONS[crackTime.magnitude]}</span>
          </div>
          
          <h3 className="text-sm font-medium text-text-secondary mb-2">
            离线破解时间估算
          </h3>
          
          <div 
            className="text-3xl font-bold font-display mb-1"
            style={{ color: MAGNITUDE_COLORS[crackTime.magnitude] }}
          >
            {crackTime.display}
          </div>
          
          <div className="text-xs text-text-muted font-mono-tech">
            基于 {formatHashRate(hashRate)} 算力
          </div>
        </div>
      </div>

      <div className="glass-panel rounded-xl p-5">
        <h4 className="text-sm font-medium text-text-secondary mb-4">
          时间尺度参照
        </h4>
        
        <div className="relative h-8 mb-4">
          <div className="absolute inset-0 bg-dark-800 rounded-full overflow-hidden">
            <div 
              className="absolute inset-y-0 left-0 transition-all duration-500 rounded-full"
              style={{ 
                width: `${timeScalePosition * 100}%`,
                background: `linear-gradient(90deg, ${MAGNITUDE_COLORS.seconds}, ${MAGNITUDE_COLORS.universe})`
              }}
            />
          </div>
          
          <div 
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white transition-all duration-500"
            style={{ 
              left: `calc(${timeScalePosition * 100}% - 8px)`,
              backgroundColor: MAGNITUDE_COLORS[crackTime.magnitude],
              boxShadow: `0 0 10px ${MAGNITUDE_COLORS[crackTime.magnitude]}`
            }}
          />
        </div>
        
        <div className="flex justify-between text-xs text-text-muted">
          {TIME_SCALE_LABELS.map((scale, idx) => (
            <div key={idx} className="text-center">
              <div className="w-1.5 h-1.5 rounded-full bg-dark-700 mx-auto mb-1" />
              <span>{scale.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="glass-panel rounded-lg p-4">
          <div className="text-xs text-text-muted mb-1">熵值</div>
          <div className={`text-xl font-bold font-mono-tech ${color}`}>
            {strength.entropy.toFixed(1)} <span className="text-sm text-text-muted">bits</span>
          </div>
        </div>
        
        <div className="glass-panel rounded-lg p-4">
          <div className="text-xs text-text-muted mb-1">需尝试次数</div>
          <div className={`text-lg font-bold font-mono-tech ${color}`}>
            {formatScientific(strength.guesses)}
          </div>
        </div>
      </div>

      {strength.chinesePatterns.length > 0 && (
        <div className="glass-panel rounded-lg p-4">
          <h4 className="text-sm font-medium text-text-secondary mb-3">
            🇨🇳 检测到中文场景模式
          </h4>
          <div className="space-y-2">
            {strength.chinesePatterns.map((pattern, idx) => (
              <div key={idx} className="flex items-start gap-3 p-2 rounded-md bg-dark-800/50">
                <span className="text-sm">
                  {pattern.type === 'pinyin' ? '📝' : pattern.type === 'birthday' ? '🎂' : '⌨️'}
                </span>
                <div>
                  <code className="text-sm font-mono-tech text-strength-weak">
                    {pattern.token}
                  </code>
                  <p className="text-xs text-text-muted mt-0.5">
                    {pattern.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
