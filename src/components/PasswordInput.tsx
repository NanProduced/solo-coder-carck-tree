import React, { useState, useCallback } from 'react'
import { PasswordStrength, calculatePasswordStrength } from '@/lib/passwordEntropy'

interface PasswordInputProps {
  label: string
  value: string
  onChange: (password: string, strength: PasswordStrength | null) => void
  placeholder?: string
  colorScheme?: 'blue' | 'purple'
}

const STRENGTH_LABELS = ['极弱', '弱', '一般', '强', '极强']
const STRENGTH_COLORS = [
  'oklch(0.65 0.22 20)',
  'oklch(0.70 0.18 70)',
  'oklch(0.70 0.18 200)',
  'oklch(0.70 0.15 140)',
  'oklch(0.70 0.18 280)'
]

export const PasswordInput: React.FC<PasswordInputProps> = ({
  label,
  value,
  onChange,
  placeholder = '输入密码...',
  colorScheme = 'blue'
}) => {
  const [showPassword, setShowPassword] = useState(false)
  const [strength, setStrength] = useState<PasswordStrength | null>(null)
  const [isFocused, setIsFocused] = useState(false)

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const password = e.target.value
    if (password) {
      const calculated = calculatePasswordStrength(password)
      setStrength(calculated)
      onChange(password, calculated)
    } else {
      setStrength(null)
      onChange('', null)
    }
  }, [onChange])

  const toggleShowPassword = () => {
    setShowPassword(prev => !prev)
  }

  const borderColor = colorScheme === 'blue' ? 'border-neon-blue' : 'border-neon-purple'
  const glowColor = colorScheme === 'blue' ? 'shadow-[0_0_20px_oklch(0.75_0.15_250_/_0.3)]' : 'shadow-[0_0_20px_oklch(0.70_0.18_280_/_0.3)]'

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-text-secondary">
          {label}
        </label>
        {strength !== null && (
          <div className="flex items-center gap-2">
            <span 
              className="text-sm font-semibold"
              style={{ color: STRENGTH_COLORS[strength.score] }}
            >
              {STRENGTH_LABELS[strength.score]}
            </span>
            <span className="text-xs text-text-muted font-mono-tech">
              {strength.entropy.toFixed(1)} bits
            </span>
          </div>
        )}
      </div>

      <div className={`relative transition-all duration-200 ${isFocused ? glowColor : ''}`}>
        <input
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className={`w-full px-4 py-3 pr-12 bg-dark-850 border rounded-lg
                     font-mono-tech text-base text-text-primary placeholder-text-muted
                     transition-all duration-200 outline-none
                     ${isFocused ? `${borderColor} bg-dark-800` : 'border-border'}`}
        />
        <button
          type="button"
          onClick={toggleShowPassword}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5
                     text-text-muted hover:text-text-primary transition-colors
                     rounded-md hover:bg-dark-700"
          aria-label={showPassword ? '隐藏密码' : '显示密码'}
        >
          {showPassword ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
          )}
        </button>
      </div>

      {strength !== null && value.length > 0 && (
        <div className="space-y-2">
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4].map(level => (
              <div
                key={level}
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                  level <= strength.score
                    ? ''
                    : 'bg-dark-800'
                }`}
                style={{
                  backgroundColor: level <= strength.score ? STRENGTH_COLORS[strength.score] : undefined
                }}
              />
            ))}
          </div>

          {strength.feedback.warning && (
            <div className="p-2 rounded-md bg-dark-850 border border-strength-weak/30">
              <p className="text-xs text-strength-weak">
                ⚠️ {strength.feedback.warning}
              </p>
            </div>
          )}

          {strength.feedback.suggestions.length > 0 && (
            <div className="space-y-1">
              {strength.feedback.suggestions.slice(0, 3).map((suggestion, idx) => (
                <p key={idx} className="text-xs text-text-muted flex items-start gap-2">
                  <span className="text-neon-cyan flex-shrink-0">💡</span>
                  <span>{suggestion}</span>
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
