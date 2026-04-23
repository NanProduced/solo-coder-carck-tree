import React, { useState, useCallback } from 'react'
import { PasswordInput } from '@/components/PasswordInput'
import { VisualizerCanvas } from '@/components/VisualizerCanvas'
import { GPUSelector } from '@/components/GPUSelector'
import { CrackTimeDisplay } from '@/components/CrackTimeDisplay'
import { GPUCard, HashAlgorithm, getDefaultGPU, calculateCrackTime, CrackTimeResult } from '@/lib/gpuCompute'
import { PasswordStrength } from '@/lib/passwordEntropy'

type ViewMode = 'single' | 'compare'

const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('single')
  const [showSettings, setShowSettings] = useState(false)
  
  const [password1, setPassword1] = useState('')
  const [strength1, setStrength1] = useState<PasswordStrength | null>(null)
  const [crackTime1, setCrackTime1] = useState<CrackTimeResult | null>(null)
  
  const [password2, setPassword2] = useState('')
  const [strength2, setStrength2] = useState<PasswordStrength | null>(null)
  const [crackTime2, setCrackTime2] = useState<CrackTimeResult | null>(null)
  
  const [selectedGPU, setSelectedGPU] = useState<GPUCard>(getDefaultGPU())
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<HashAlgorithm>('sha256')

  const updateCrackTime = useCallback((
    strength: PasswordStrength | null,
    gpu: GPUCard,
    algorithm: HashAlgorithm
  ): CrackTimeResult | null => {
    if (!strength) return null
    const hashRate = gpu.hashRate[algorithm]
    return calculateCrackTime(strength.guesses, hashRate)
  }, [])

  const handlePassword1Change = useCallback((password: string, strength: PasswordStrength | null) => {
    setPassword1(password)
    setStrength1(strength)
    setCrackTime1(updateCrackTime(strength, selectedGPU, selectedAlgorithm))
  }, [selectedGPU, selectedAlgorithm, updateCrackTime])

  const handlePassword2Change = useCallback((password: string, strength: PasswordStrength | null) => {
    setPassword2(password)
    setStrength2(strength)
    setCrackTime2(updateCrackTime(strength, selectedGPU, selectedAlgorithm))
  }, [selectedGPU, selectedAlgorithm, updateCrackTime])

  const handleGPUChange = useCallback((gpu: GPUCard) => {
    setSelectedGPU(gpu)
    setCrackTime1(updateCrackTime(strength1, gpu, selectedAlgorithm))
    setCrackTime2(updateCrackTime(strength2, gpu, selectedAlgorithm))
  }, [strength1, strength2, selectedAlgorithm, updateCrackTime])

  const handleAlgorithmChange = useCallback((algorithm: HashAlgorithm) => {
    setSelectedAlgorithm(algorithm)
    setCrackTime1(updateCrackTime(strength1, selectedGPU, algorithm))
    setCrackTime2(updateCrackTime(strength2, selectedGPU, algorithm))
  }, [strength1, strength2, selectedGPU, updateCrackTime])

  const toggleViewMode = () => {
    setViewMode(prev => prev === 'single' ? 'compare' : 'single')
  }

  const samplePasswords = [
    { label: '弱密码', value: '123456' },
    { label: '生日', value: '19900101' },
    { label: '拼音', value: 'woaini123' },
    { label: '中等', value: 'MyDog123!' },
    { label: '强密码', value: 'xK9$mP2@vQ7!' },
    { label: '极强', value: 'aC@xzc(aNNx!kLm9$' },
  ]

  const handleSampleClick = (value: string, target: 1 | 2) => {
    if (target === 1) {
      handlePassword1Change(value, null)
    } else {
      handlePassword2Change(value, null)
    }
  }

  return (
    <div className="min-h-screen bg-dark-950 text-text-primary">
      <header className="border-b border-dark-800 bg-dark-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-neon-blue to-neon-purple flex items-center justify-center">
                <span className="text-xl">🔐</span>
              </div>
              <div>
                <h1 className="text-lg font-bold font-display tracking-tight">
                  密码破解可视化
                </h1>
                <p className="text-xs text-text-muted">
                  Password Cracker Visualizer
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 p-1 bg-dark-850 rounded-lg">
                <button
                  onClick={() => setViewMode('single')}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                    viewMode === 'single'
                      ? 'bg-neon-blue text-white shadow-[0_0_10px_oklch(0.75_0.15_250_/_0.3)]'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  单密码
                </button>
                <button
                  onClick={() => setViewMode('compare')}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                    viewMode === 'compare'
                      ? 'bg-neon-purple text-white shadow-[0_0_10px_oklch(0.70_0.18_280_/_0.3)]'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  双对比
                </button>
              </div>

              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`p-2 rounded-lg transition-all ${
                  showSettings
                    ? 'bg-dark-800 text-neon-blue'
                    : 'hover:bg-dark-800 text-text-secondary'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {showSettings && (
          <div className="mb-6 glass-panel rounded-xl p-6 animate-in">
            <h2 className="text-lg font-semibold mb-4 text-text-primary">
              显卡与算法设置
            </h2>
            <GPUSelector
              selectedGPU={selectedGPU}
              selectedAlgorithm={selectedAlgorithm}
              onGPUChange={handleGPUChange}
              onAlgorithmChange={handleAlgorithmChange}
            />
          </div>
        )}

        <div className={`grid gap-6 ${
          viewMode === 'compare' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'
        }`}>
          <div className="space-y-6">
            <div className="glass-panel rounded-xl p-6">
              <PasswordInput
                label={viewMode === 'compare' ? '密码 A' : '输入密码'}
                value={password1}
                onChange={handlePassword1Change}
                placeholder="例如: 123456 或 ac@xzc(aNNx"
                colorScheme="blue"
              />
              
              <div className="mt-4 pt-4 border-t border-dark-800">
                <p className="text-xs text-text-muted mb-2">示例密码：</p>
                <div className="flex flex-wrap gap-2">
                  {samplePasswords.map(sample => (
                    <button
                      key={sample.label}
                      onClick={() => handleSampleClick(sample.value, 1)}
                      className="px-3 py-1.5 text-xs font-mono-tech bg-dark-800 hover:bg-dark-700 
                               text-text-secondary hover:text-text-primary rounded-md transition-colors
                               border border-dark-700 hover:border-neon-blue/50"
                    >
                      {sample.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <CrackTimeDisplay
              crackTime={crackTime1}
              strength={strength1}
              hashRate={selectedGPU.hashRate[selectedAlgorithm]}
              colorScheme="blue"
            />
          </div>

          {viewMode === 'compare' && (
            <div className="space-y-6">
              <div className="glass-panel rounded-xl p-6">
                <PasswordInput
                  label="密码 B"
                  value={password2}
                  onChange={handlePassword2Change}
                  placeholder="输入另一个密码进行对比"
                  colorScheme="purple"
                />
                
                <div className="mt-4 pt-4 border-t border-dark-800">
                  <p className="text-xs text-text-muted mb-2">示例密码：</p>
                  <div className="flex flex-wrap gap-2">
                    {samplePasswords.map(sample => (
                      <button
                        key={sample.label}
                        onClick={() => handleSampleClick(sample.value, 2)}
                        className="px-3 py-1.5 text-xs font-mono-tech bg-dark-800 hover:bg-dark-700 
                                 text-text-secondary hover:text-text-primary rounded-md transition-colors
                                 border border-dark-700 hover:border-neon-purple/50"
                      >
                        {sample.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <CrackTimeDisplay
                crackTime={crackTime2}
                strength={strength2}
                hashRate={selectedGPU.hashRate[selectedAlgorithm]}
                colorScheme="purple"
              />
            </div>
          )}
        </div>

        <div className={`mt-6 grid gap-6 ${
          viewMode === 'compare' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'
        }`}>
          <div className="glass-panel rounded-xl overflow-hidden" style={{ height: '500px' }}>
            <VisualizerCanvas
              entropy={strength1?.entropy || 0}
              colorScheme="blue"
              label={viewMode === 'compare' ? '可视化 A' : undefined}
            />
          </div>

          {viewMode === 'compare' && (
            <div className="glass-panel rounded-xl overflow-hidden" style={{ height: '500px' }}>
              <VisualizerCanvas
                entropy={strength2?.entropy || 0}
                colorScheme="purple"
                label="可视化 B"
              />
            </div>
          )}
        </div>

        {viewMode === 'compare' && password1 && password2 && strength1 && strength2 && (
          <div className="mt-6 glass-panel rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4 text-center">
              对比分析
            </h3>
            <div className="grid grid-cols-3 gap-6 text-center">
              <div>
                <p className="text-sm text-text-muted mb-2">熵值差异</p>
                <p className={`text-2xl font-bold font-mono-tech ${
                  strength1.entropy > strength2.entropy ? 'text-neon-blue' : 
                  strength1.entropy < strength2.entropy ? 'text-neon-purple' : 'text-text-secondary'
                }`}>
                  {Math.abs(strength1.entropy - strength2.entropy).toFixed(1)} bits
                </p>
                <p className="text-xs text-text-muted mt-1">
                  {strength1.entropy > strength2.entropy ? 'A 更强' : 
                   strength1.entropy < strength2.entropy ? 'B 更强' : '相同'}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-text-muted mb-2">节点数量</p>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-neon-blue font-mono-tech">
                    {Math.round(Math.pow(10, Math.min(strength1.entropy / 10, 7))).toLocaleString()}
                  </span>
                  <span className="text-text-muted">vs</span>
                  <span className="text-neon-purple font-mono-tech">
                    {Math.round(Math.pow(10, Math.min(strength2.entropy / 10, 7))).toLocaleString()}
                  </span>
                </div>
              </div>
              
              <div>
                <p className="text-sm text-text-muted mb-2">破解时间倍数</p>
                {crackTime1 && crackTime2 && crackTime1.seconds > 0 && (
                  <p className="text-2xl font-bold font-mono-tech text-neon-cyan">
                    {(crackTime2.seconds / crackTime1.seconds).toExponential(1)} ×
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 text-center text-xs text-text-muted space-y-2">
          <p>
            💡 此工具仅供教育目的，展示密码强度与暴力破解难度的关系
          </p>
          <p>
            可视化节点数量基于熵值估算，GPU破解时间基于离线哈希攻击场景
          </p>
        </div>
      </main>
    </div>
  )
}

export default App
