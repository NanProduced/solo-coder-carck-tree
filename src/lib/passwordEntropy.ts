import zxcvbn from 'zxcvbn'

export interface PasswordStrength {
  password: string
  entropy: number
  guesses: number
  guessesLog10: number
  score: number
  crackTimeSeconds: number
  crackTimeDisplay: string
  feedback: {
    warning: string
    suggestions: string[]
  }
  patterns: PatternMatch[]
  chinesePatterns: ChinesePatternMatch[]
}

export interface PatternMatch {
  pattern: string
  token: string
  i: number
  j: number
  entropy: number
}

export interface ChinesePatternMatch {
  type: 'pinyin' | 'birthday' | 'keyboard' | 'chineseNumber'
  token: string
  i: number
  j: number
  entropyReduction: number
  description: string
}

const CHINESE_PINYIN_COMMON = new Set([
  'wo', 'ni', 'ta', 'women', 'nimen', 'tamen',
  'ai', 'love', 'qing', 'nian', 'yue', 'ri',
  'sheng', 'xiao', 'xue', 'xi', 'huan', 'le',
  'ma', 'ba', 'ma', 'ge', 'jie', 'di', 'mei',
  'qq', 'wechat', 'weixin', 'zhifu', 'alipay',
  'taobao', 'jingdong', 'pinduoduo', 'baidu',
  'admin', 'root', 'test', 'user', 'login',
  'password', 'passwd', 'pwd', '123', 'abc',
  'zhang', 'wang', 'li', 'liu', 'chen', 'yang',
  'zhao', 'huang', 'zhou', 'wu', 'xu', 'sun',
  'qian', 'zheng', 'feng', 'dai', 'wei', 'jiang',
  'shi', 'tang', 'hao', 'yu', 'he', 'guo',
  'gao', 'lin', 'luo', 'zheng', 'xie', 'song',
  'ming', 'hong', 'wei', 'jun', 'yong', 'jian',
  'ping', 'hua', 'fang', 'na', 'lan', 'ting',
  'xin', 'xiang', 'mei', 'li', 'zhen', 'fang',
  'qiang', 'bin', 'lei', 'chao', 'bo', 'fei',
  'tao', 'ran', 'jie', 'peng', 'gang', 'long',
  'ying', 'ting', 'ya', 'qin', 'mei', 'ling',
  '1314', '520', '521', '888', '666', '999',
  'woaini', 'aini', 'aiwo', 'baobei', 'qinai',
  'xiaoming', 'xiaohong', 'xiaohua', 'xiaoli',
  'xiaowang', 'xiaozhang', 'xiaoli', 'xiaochen',
])

const KEYBOARD_PATTERNS = [
  { pattern: 'qwerty', length: 6, entropyReduction: 10 },
  { pattern: 'qwertz', length: 6, entropyReduction: 10 },
  { pattern: 'azerty', length: 6, entropyReduction: 10 },
  { pattern: '1qaz2wsx', length: 8, entropyReduction: 12 },
  { pattern: 'qazwsx', length: 6, entropyReduction: 10 },
  { pattern: 'wsxedc', length: 6, entropyReduction: 10 },
  { pattern: 'edcrfv', length: 6, entropyReduction: 10 },
  { pattern: 'rfvtgb', length: 6, entropyReduction: 10 },
  { pattern: '123456', length: 6, entropyReduction: 12 },
  { pattern: '654321', length: 6, entropyReduction: 12 },
  { pattern: '12345678', length: 8, entropyReduction: 14 },
  { pattern: '87654321', length: 8, entropyReduction: 14 },
  { pattern: '123456789', length: 9, entropyReduction: 15 },
  { pattern: '987654321', length: 9, entropyReduction: 15 },
  { pattern: '0987654321', length: 10, entropyReduction: 16 },
  { pattern: '!@#$%^', length: 6, entropyReduction: 10 },
  { pattern: '^%$#@!', length: 6, entropyReduction: 10 },
  { pattern: 'asdfgh', length: 6, entropyReduction: 10 },
  { pattern: 'hgfdsa', length: 6, entropyReduction: 10 },
  { pattern: 'zxcvbn', length: 6, entropyReduction: 10 },
  { pattern: 'nbvcxz', length: 6, entropyReduction: 10 },
  { pattern: 'poiuyt', length: 6, entropyReduction: 10 },
  { pattern: 'tyuiop', length: 6, entropyReduction: 10 },
  { pattern: 'lkjhgf', length: 6, entropyReduction: 10 },
  { pattern: 'fghjkl', length: 6, entropyReduction: 10 },
]

function isBirthdayFormat(str: string): { match: boolean; format: string; description: string } {
  if (str.length === 8 && /^\d{8}$/.test(str)) {
    const year = parseInt(str.substring(0, 4))
    const month = parseInt(str.substring(4, 6))
    const day = parseInt(str.substring(6, 8))
    const currentYear = new Date().getFullYear()
    if (year >= 1900 && year <= currentYear && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return { match: true, format: 'yyyyMMdd', description: `生日格式: ${year}年${month}月${day}日` }
    }
  }
  if (str.length === 6 && /^\d{6}$/.test(str)) {
    const year = parseInt(str.substring(0, 2))
    const month = parseInt(str.substring(2, 4))
    const day = parseInt(str.substring(4, 6))
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return { match: true, format: 'yyMMdd', description: `生日格式: ${year < 50 ? '20' : '19'}${year.toString().padStart(2, '0')}年${month}月${day}日` }
    }
  }
  if (str.length === 8 && /^\d{4}\/\d{2}\/\d{2}$/.test(str)) {
    const parts = str.split('/')
    const year = parseInt(parts[0])
    const month = parseInt(parts[1])
    const day = parseInt(parts[2])
    const currentYear = new Date().getFullYear()
    if (year >= 1900 && year <= currentYear && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return { match: true, format: 'yyyy/MM/dd', description: `生日格式: ${year}年${month}月${day}日` }
    }
  }
  if (str.length === 8 && /^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const parts = str.split('-')
    const year = parseInt(parts[0])
    const month = parseInt(parts[1])
    const day = parseInt(parts[2])
    const currentYear = new Date().getFullYear()
    if (year >= 1900 && year <= currentYear && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return { match: true, format: 'yyyy-MM-dd', description: `生日格式: ${year}年${month}月${day}日` }
    }
  }
  return { match: false, format: '', description: '' }
}

function findChinesePatterns(password: string): ChinesePatternMatch[] {
  const patterns: ChinesePatternMatch[] = []
  const lowerPassword = password.toLowerCase()
  
  for (const pinyin of CHINESE_PINYIN_COMMON) {
    let startIndex = 0
    while ((startIndex = lowerPassword.indexOf(pinyin, startIndex)) !== -1) {
      patterns.push({
        type: 'pinyin',
        token: password.substring(startIndex, startIndex + pinyin.length),
        i: startIndex,
        j: startIndex + pinyin.length - 1,
        entropyReduction: Math.max(2, pinyin.length * 0.8),
        description: `常见拼音/词汇: "${password.substring(startIndex, startIndex + pinyin.length)}"`
      })
      startIndex += pinyin.length
    }
  }
  
  for (const keyboardPattern of KEYBOARD_PATTERNS) {
    const patternLower = keyboardPattern.pattern.toLowerCase()
    const passwordLower = lowerPassword
    
    if (passwordLower.includes(patternLower)) {
      const index = passwordLower.indexOf(patternLower)
      patterns.push({
        type: 'keyboard',
        token: password.substring(index, index + keyboardPattern.length),
        i: index,
        j: index + keyboardPattern.length - 1,
        entropyReduction: keyboardPattern.entropyReduction,
        description: `键盘序列: "${password.substring(index, index + keyboardPattern.length)}"`
      })
    }
    
    const reversedPattern = patternLower.split('').reverse().join('')
    if (passwordLower.includes(reversedPattern)) {
      const index = passwordLower.indexOf(reversedPattern)
      patterns.push({
        type: 'keyboard',
        token: password.substring(index, index + reversedPattern.length),
        i: index,
        j: index + reversedPattern.length - 1,
        entropyReduction: keyboardPattern.entropyReduction,
        description: `倒序键盘序列: "${password.substring(index, index + reversedPattern.length)}"`
      })
    }
  }
  
  for (let len = 6; len <= 10; len++) {
    for (let i = 0; i <= password.length - len; i++) {
      const substring = password.substring(i, i + len)
      const birthdayCheck = isBirthdayFormat(substring)
      if (birthdayCheck.match) {
        patterns.push({
          type: 'birthday',
          token: substring,
          i: i,
          j: i + len - 1,
          entropyReduction: 15,
          description: birthdayCheck.description
        })
      }
    }
  }
  
  const uniquePatterns: ChinesePatternMatch[] = []
  const coveredPositions = new Set<string>()
  
  for (const pattern of patterns) {
    const posKey = `${pattern.i}-${pattern.j}`
    if (!coveredPositions.has(posKey)) {
      uniquePatterns.push(pattern)
      for (let i = pattern.i; i <= pattern.j; i++) {
        coveredPositions.add(`${i}`)
      }
    }
  }
  
  return uniquePatterns
}

function calculateBaseEntropy(password: string): number {
  let charsetSize = 0
  if (/[a-z]/.test(password)) charsetSize += 26
  if (/[A-Z]/.test(password)) charsetSize += 26
  if (/[0-9]/.test(password)) charsetSize += 10
  if (/[^a-zA-Z0-9]/.test(password)) charsetSize += 32
  
  if (charsetSize === 0) charsetSize = 1
  
  return password.length * Math.log2(charsetSize)
}

export function calculatePasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return {
      password: '',
      entropy: 0,
      guesses: 0,
      guessesLog10: 0,
      score: 0,
      crackTimeSeconds: 0,
      crackTimeDisplay: '立即',
      feedback: {
        warning: '',
        suggestions: []
      },
      patterns: [],
      chinesePatterns: []
    }
  }
  
  const result = zxcvbn(password)
  const chinesePatterns = findChinesePatterns(password)
  
  const baseEntropy = result.entropy ?? calculateBaseEntropy(password)
  
  let adjustedEntropy = baseEntropy
  let totalEntropyReduction = 0
  
  for (const pattern of chinesePatterns) {
    totalEntropyReduction += pattern.entropyReduction
  }
  
  adjustedEntropy = Math.max(1, adjustedEntropy - totalEntropyReduction * 0.5)
  
  const adjustedGuesses = Math.pow(2, adjustedEntropy)
  
  const suggestions = [...(result.feedback?.suggestions || [])]
  
  for (const pattern of chinesePatterns) {
    if (pattern.type === 'pinyin') {
      suggestions.push(`避免使用常见拼音或词汇："${pattern.token}"`)
    } else if (pattern.type === 'birthday') {
      suggestions.push(`避免使用生日日期：${pattern.description}`)
    } else if (pattern.type === 'keyboard') {
      suggestions.push(`避免使用键盘序列："${pattern.token}"`)
    }
  }
  
  if (password.length < 8) {
    suggestions.unshift('密码至少需要8个字符')
  }
  
  let warning = result.feedback?.warning || ''
  if (chinesePatterns.length > 0 && !warning) {
    warning = '密码包含常见模式，容易被破解'
  }
  
  let adjustedScore = result.score
  if (chinesePatterns.length > 0) {
    adjustedScore = Math.max(0, adjustedScore - 1)
  }
  if (adjustedEntropy < 20) adjustedScore = 0
  else if (adjustedEntropy < 35) adjustedScore = 1
  else if (adjustedEntropy < 50) adjustedScore = 2
  else if (adjustedEntropy < 70) adjustedScore = 3
  else adjustedScore = 4
  
  return {
    password,
    entropy: adjustedEntropy,
    guesses: adjustedGuesses,
    guessesLog10: Math.log10(adjustedGuesses),
    score: adjustedScore,
    crackTimeSeconds: adjustedGuesses,
    crackTimeDisplay: formatCrackTime(adjustedGuesses),
    feedback: {
      warning,
      suggestions: [...new Set(suggestions)].slice(0, 5)
    },
    patterns: (result.sequence || []).map((s: any) => ({
      pattern: s.pattern || 'unknown',
      token: s.token || '',
      i: s.i || 0,
      j: s.j || 0,
      entropy: s.entropy || 0
    })),
    chinesePatterns
  }
}

function formatCrackTime(guesses: number): string {
  if (guesses < 1e3) return '几秒内'
  if (guesses < 1e6) return '几分钟'
  if (guesses < 1e9) return '几小时'
  if (guesses < 1e12) return '几天'
  if (guesses < 1e15) return '几个月'
  if (guesses < 1e18) return '几年'
  if (guesses < 1e24) return '几个世纪'
  if (guesses < 1e30) return '数千年'
  if (guesses < 1e36) return '数百万年'
  
  const universeAge = 4.3e17
  const universeMultiples = guesses / universeAge
  
  if (universeMultiples < 1e3) return `${Math.round(universeMultiples)}倍宇宙年龄`
  if (universeMultiples < 1e6) return `${(universeMultiples / 1e3).toFixed(0)}千倍宇宙年龄`
  if (universeMultiples < 1e9) return `${(universeMultiples / 1e6).toFixed(0)}百万倍宇宙年龄`
  if (universeMultiples < 1e12) return `${(universeMultiples / 1e9).toFixed(0)}十亿倍宇宙年龄`
  
  return `∞ 近乎无限`
}

export function getBaseEntropy(password: string): number {
  return calculateBaseEntropy(password)
}

export function getNodeCountFromEntropy(entropy: number): number {
  if (entropy <= 0) return 0
  
  const exponent = Math.min(entropy / 10, 7)
  const nodeCount = Math.floor(Math.pow(10, exponent))
  
  return Math.max(10, Math.min(nodeCount, 1000000))
}
