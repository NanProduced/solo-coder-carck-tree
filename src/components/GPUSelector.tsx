import React from 'react'
import { GPUCard, HashAlgorithm, GPU_CARDS, HASH_ALGORITHMS, formatHashRate, PERFORMANCE_TIER_LABELS } from '@/lib/gpuCompute'

interface GPUSelectorProps {
  selectedGPU: GPUCard
  selectedAlgorithm: HashAlgorithm
  onGPUChange: (gpu: GPUCard) => void
  onAlgorithmChange: (algorithm: HashAlgorithm) => void
}

export const GPUSelector: React.FC<GPUSelectorProps> = ({
  selectedGPU,
  selectedAlgorithm,
  onGPUChange,
  onAlgorithmChange
}) => {
  const tiers = ['entry', 'mid', 'high', 'enthusiast', 'professional'] as const

  const getTierColor = (tier: GPUCard['performanceTier']) => {
    switch (tier) {
      case 'entry': return 'border-dark-700'
      case 'mid': return 'border-neon-cyan/30'
      case 'high': return 'border-neon-blue/40'
      case 'enthusiast': return 'border-neon-purple/50'
      case 'professional': return 'border-neon-pink/60'
    }
  }

  const getTierBadgeColor = (tier: GPUCard['performanceTier']) => {
    switch (tier) {
      case 'entry': return 'bg-dark-800 text-text-muted'
      case 'mid': return 'bg-neon-cyan/10 text-neon-cyan'
      case 'high': return 'bg-neon-blue/10 text-neon-blue'
      case 'enthusiast': return 'bg-neon-purple/10 text-neon-purple'
      case 'professional': return 'bg-neon-pink/10 text-neon-pink'
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-3">
          哈希算法
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {HASH_ALGORITHMS.map(algo => (
            <button
              key={algo.id}
              onClick={() => onAlgorithmChange(algo.id)}
              className={`p-3 rounded-lg border transition-all duration-200 text-left
                         ${selectedAlgorithm === algo.id
                           ? 'bg-dark-800 border-neon-blue shadow-[0_0_15px_oklch(0.75_0.15_250_/_0.2)]'
                           : 'bg-dark-850 border-border hover:border-neon-blue/50'
                         }`}
            >
              <div className="font-mono-tech text-sm font-semibold text-text-primary">
                {algo.name}
              </div>
              <div className="text-xs text-text-muted mt-1">
                {algo.difficulty}
              </div>
            </button>
          ))}
        </div>
        <p className="text-xs text-text-muted mt-2">
          {HASH_ALGORITHMS.find(a => a.id === selectedAlgorithm)?.description}
        </p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-medium text-text-secondary">
            显卡型号
          </label>
          <div className="text-xs text-text-muted font-mono-tech">
            当前算力: <span className="text-neon-blue">{formatHashRate(selectedGPU.hashRate[selectedAlgorithm])}</span>
          </div>
        </div>

        <div className="space-y-4">
          {tiers.map(tier => {
            const tierGPUs = GPU_CARDS.filter(gpu => gpu.performanceTier === tier)
            if (tierGPUs.length === 0) return null

            return (
              <div key={tier}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded ${getTierBadgeColor(tier)}`}>
                    {PERFORMANCE_TIER_LABELS[tier]}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {tierGPUs.map(gpu => {
                    const isSelected = gpu.id === selectedGPU.id
                    const hashRate = gpu.hashRate[selectedAlgorithm]

                    return (
                      <button
                        key={gpu.id}
                        onClick={() => onGPUChange(gpu)}
                        className={`p-3 rounded-lg border transition-all duration-200 text-left
                                   ${isSelected
                                     ? 'bg-dark-800 border-neon-blue shadow-[0_0_15px_oklch(0.75_0.15_250_/_0.2)]'
                                     : `bg-dark-850 ${getTierColor(tier)} hover:border-neon-blue/50`
                                   }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-medium ${isSelected ? 'text-neon-blue' : 'text-text-primary'}`}>
                            {gpu.name}
                          </span>
                          {isSelected && (
                            <svg className="w-4 h-4 text-neon-green" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-text-muted">
                            {gpu.manufacturer} · {gpu.releaseYear}
                          </span>
                          <span className="text-xs font-mono-tech text-neon-cyan">
                            {formatHashRate(hashRate)}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
