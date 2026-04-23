export interface GPUCard {
  id: string
  name: string
  manufacturer: 'NVIDIA' | 'AMD' | 'Intel'
  releaseYear: number
  hashRate: {
    md5: number
    ntlm: number
    sha1: number
    sha256: number
    bcrypt: number
  }
  performanceTier: 'entry' | 'mid' | 'high' | 'enthusiast' | 'professional'
}

export type HashAlgorithm = 'md5' | 'ntlm' | 'sha1' | 'sha256' | 'bcrypt'

export const GPU_CARDS: GPUCard[] = [
  {
    id: 'rtx4090',
    name: 'NVIDIA RTX 4090',
    manufacturer: 'NVIDIA',
    releaseYear: 2022,
    hashRate: {
      md5: 200_000_000_000,
      ntlm: 200_000_000_000,
      sha1: 120_000_000_000,
      sha256: 18_000_000_000,
      bcrypt: 180_000
    },
    performanceTier: 'enthusiast'
  },
  {
    id: 'rtx4080',
    name: 'NVIDIA RTX 4080',
    manufacturer: 'NVIDIA',
    releaseYear: 2022,
    hashRate: {
      md5: 120_000_000_000,
      ntlm: 120_000_000_000,
      sha1: 75_000_000_000,
      sha256: 10_000_000_000,
      bcrypt: 100_000
    },
    performanceTier: 'high'
  },
  {
    id: 'rtx4070ti',
    name: 'NVIDIA RTX 4070 Ti',
    manufacturer: 'NVIDIA',
    releaseYear: 2023,
    hashRate: {
      md5: 100_000_000_000,
      ntlm: 100_000_000_000,
      sha1: 60_000_000_000,
      sha256: 8_000_000_000,
      bcrypt: 80_000
    },
    performanceTier: 'high'
  },
  {
    id: 'rtx3090',
    name: 'NVIDIA RTX 3090',
    manufacturer: 'NVIDIA',
    releaseYear: 2020,
    hashRate: {
      md5: 160_000_000_000,
      ntlm: 160_000_000_000,
      sha1: 100_000_000_000,
      sha256: 15_000_000_000,
      bcrypt: 140_000
    },
    performanceTier: 'enthusiast'
  },
  {
    id: 'rtx3080',
    name: 'NVIDIA RTX 3080',
    manufacturer: 'NVIDIA',
    releaseYear: 2020,
    hashRate: {
      md5: 100_000_000_000,
      ntlm: 100_000_000_000,
      sha1: 60_000_000_000,
      sha256: 8_500_000_000,
      bcrypt: 85_000
    },
    performanceTier: 'high'
  },
  {
    id: 'rtx3060',
    name: 'NVIDIA RTX 3060',
    manufacturer: 'NVIDIA',
    releaseYear: 2021,
    hashRate: {
      md5: 45_000_000_000,
      ntlm: 45_000_000_000,
      sha1: 28_000_000_000,
      sha256: 4_000_000_000,
      bcrypt: 40_000
    },
    performanceTier: 'mid'
  },
  {
    id: 'rx7900xtx',
    name: 'AMD RX 7900 XTX',
    manufacturer: 'AMD',
    releaseYear: 2022,
    hashRate: {
      md5: 140_000_000_000,
      ntlm: 140_000_000_000,
      sha1: 85_000_000_000,
      sha256: 12_000_000_000,
      bcrypt: 120_000
    },
    performanceTier: 'enthusiast'
  },
  {
    id: 'rx6900xt',
    name: 'AMD RX 6900 XT',
    manufacturer: 'AMD',
    releaseYear: 2020,
    hashRate: {
      md5: 90_000_000_000,
      ntlm: 90_000_000_000,
      sha1: 55_000_000_000,
      sha256: 7_500_000_000,
      bcrypt: 75_000
    },
    performanceTier: 'high'
  },
  {
    id: 'a100',
    name: 'NVIDIA A100 (专业卡)',
    manufacturer: 'NVIDIA',
    releaseYear: 2020,
    hashRate: {
      md5: 350_000_000_000,
      ntlm: 350_000_000_000,
      sha1: 220_000_000_000,
      sha256: 35_000_000_000,
      bcrypt: 350_000
    },
    performanceTier: 'professional'
  },
  {
    id: 'h100',
    name: 'NVIDIA H100 (专业卡)',
    manufacturer: 'NVIDIA',
    releaseYear: 2022,
    hashRate: {
      md5: 600_000_000_000,
      ntlm: 600_000_000_000,
      sha1: 380_000_000_000,
      sha256: 60_000_000_000,
      bcrypt: 600_000
    },
    performanceTier: 'professional'
  },
  {
    id: 'gtx1060',
    name: 'NVIDIA GTX 1060 (入门)',
    manufacturer: 'NVIDIA',
    releaseYear: 2016,
    hashRate: {
      md5: 15_000_000_000,
      ntlm: 15_000_000_000,
      sha1: 9_000_000_000,
      sha256: 1_200_000_000,
      bcrypt: 12_000
    },
    performanceTier: 'entry'
  },
  {
    id: 'rx580',
    name: 'AMD RX 580 (入门)',
    manufacturer: 'AMD',
    releaseYear: 2017,
    hashRate: {
      md5: 12_000_000_000,
      ntlm: 12_000_000_000,
      sha1: 7_500_000_000,
      sha256: 1_000_000_000,
      bcrypt: 10_000
    },
    performanceTier: 'entry'
  },
  {
    id: 'integrated',
    name: '集成显卡 (假设)',
    manufacturer: 'Intel',
    releaseYear: 2020,
    hashRate: {
      md5: 1_000_000_000,
      ntlm: 1_000_000_000,
      sha1: 600_000_000,
      sha256: 80_000_000,
      bcrypt: 800
    },
    performanceTier: 'entry'
  }
]

export const HASH_ALGORITHMS: { id: HashAlgorithm; name: string; description: string; difficulty: string }[] = [
  { id: 'md5', name: 'MD5', description: '已废弃的哈希算法，极快但极不安全', difficulty: '极快' },
  { id: 'ntlm', name: 'NTLM', description: 'Windows认证协议，速度极快', difficulty: '极快' },
  { id: 'sha1', name: 'SHA-1', description: '已被破解的算法，已不推荐使用', difficulty: '快' },
  { id: 'sha256', name: 'SHA-256', description: '现代通用哈希算法', difficulty: '中等' },
  { id: 'bcrypt', name: 'bcrypt', description: '专为密码设计的慢哈希算法', difficulty: '慢' }
]

export const UNIVERSE_AGE_SECONDS = 4.3e17

export interface CrackTimeResult {
  seconds: number
  display: string
  magnitude: 'instant' | 'seconds' | 'minutes' | 'hours' | 'days' | 'months' | 'years' | 'centuries' | 'millennia' | 'universe' | 'infinite'
  universeMultiples?: number
  rawValue: number
}

export function calculateCrackTime(
  guesses: number,
  hashRatePerSecond: number
): CrackTimeResult {
  if (guesses <= 0) {
    return {
      seconds: 0,
      display: '无密码',
      magnitude: 'instant',
      rawValue: 0
    }
  }
  
  const seconds = guesses / hashRatePerSecond
  
  let display: string
  let magnitude: CrackTimeResult['magnitude']
  let universeMultiples: number | undefined
  
  if (seconds < 1) {
    display = '瞬间 (< 1秒)'
    magnitude = 'instant'
  } else if (seconds < 60) {
    display = `${Math.round(seconds)} 秒`
    magnitude = 'seconds'
  } else if (seconds < 3600) {
    display = `${Math.round(seconds / 60)} 分钟`
    magnitude = 'minutes'
  } else if (seconds < 86400) {
    display = `${(seconds / 3600).toFixed(1)} 小时`
    magnitude = 'hours'
  } else if (seconds < 2592000) {
    display = `${(seconds / 86400).toFixed(1)} 天`
    magnitude = 'days'
  } else if (seconds < 31536000) {
    display = `${(seconds / 2592000).toFixed(1)} 个月`
    magnitude = 'months'
  } else if (seconds < 3153600000) {
    display = `${(seconds / 31536000).toFixed(1)} 年`
    magnitude = 'years'
  } else if (seconds < 315360000000) {
    display = `${(seconds / 3153600000).toFixed(1)} 世纪`
    magnitude = 'centuries'
  } else if (seconds < UNIVERSE_AGE_SECONDS) {
    display = `${(seconds / 31536000000).toFixed(0)} 千年`
    magnitude = 'millennia'
  } else {
    universeMultiples = seconds / UNIVERSE_AGE_SECONDS
    magnitude = 'universe'
    
    if (universeMultiples < 1000) {
      display = `${universeMultiples.toFixed(0)} 倍宇宙年龄`
    } else if (universeMultiples < 1e6) {
      display = `${(universeMultiples / 1000).toFixed(0)} 千倍宇宙年龄`
    } else if (universeMultiples < 1e9) {
      display = `${(universeMultiples / 1e6).toFixed(0)} 百万倍宇宙年龄`
    } else if (universeMultiples < 1e12) {
      display = `${(universeMultiples / 1e9).toFixed(0)} 十亿倍宇宙年龄`
    } else {
      display = '∞ 近乎无限'
      magnitude = 'infinite'
    }
  }
  
  return {
    seconds,
    display,
    magnitude,
    universeMultiples,
    rawValue: seconds
  }
}

export function formatHashRate(hashRate: number): string {
  if (hashRate >= 1e15) return `${(hashRate / 1e15).toFixed(1)} PH/s`
  if (hashRate >= 1e12) return `${(hashRate / 1e12).toFixed(1)} TH/s`
  if (hashRate >= 1e9) return `${(hashRate / 1e9).toFixed(1)} GH/s`
  if (hashRate >= 1e6) return `${(hashRate / 1e6).toFixed(1)} MH/s`
  if (hashRate >= 1e3) return `${(hashRate / 1e3).toFixed(1)} kH/s`
  return `${hashRate} H/s`
}

export function getGPUsByTier(tier: GPUCard['performanceTier']): GPUCard[] {
  return GPU_CARDS.filter(gpu => gpu.performanceTier === tier)
}

export function getDefaultGPU(): GPUCard {
  return GPU_CARDS[0]
}

export function getGPUById(id: string): GPUCard | undefined {
  return GPU_CARDS.find(gpu => gpu.id === id)
}

export const PERFORMANCE_TIER_LABELS: Record<GPUCard['performanceTier'], string> = {
  entry: '入门级',
  mid: '中端',
  high: '高端',
  enthusiast: '发烧级',
  professional: '专业级'
}

export const MAGNITUDE_COLORS: Record<CrackTimeResult['magnitude'], string> = {
  instant: 'oklch(0.65 0.22 20)',
  seconds: 'oklch(0.65 0.22 20)',
  minutes: 'oklch(0.70 0.18 70)',
  hours: 'oklch(0.70 0.18 70)',
  days: 'oklch(0.70 0.18 200)',
  months: 'oklch(0.70 0.18 200)',
  years: 'oklch(0.70 0.15 140)',
  centuries: 'oklch(0.70 0.15 140)',
  millennia: 'oklch(0.70 0.15 140)',
  universe: 'oklch(0.70 0.18 280)',
  infinite: 'oklch(0.70 0.18 280)'
}

export const MAGNITUDE_ICONS: Record<CrackTimeResult['magnitude'], string> = {
  instant: '⚡',
  seconds: '⏱️',
  minutes: '⏰',
  hours: '🌅',
  days: '📅',
  months: '📆',
  years: '🎂',
  centuries: '🏛️',
  millennia: '🌍',
  universe: '🌌',
  infinite: '♾️'
}
