# 密码破解可视化工具 - 设计思路

## 一、熵计算思路

### 1.1 基础概念

密码熵（Password Entropy）是衡量密码不可预测性的指标，单位为比特（bits）。熵值越高，密码越难以被暴力破解。

**理论计算公式**：
```
熵值 = 密码长度 × log₂(字符集大小)
```

例如：
- 纯数字（10种字符）的8位密码：8 × log₂(10) ≈ 26.6 bits
- 大小写字母+数字（62种字符）的8位密码：8 × log₂(62) ≈ 47.6 bits

### 1.2 实际熵值 vs 理论熵值

理论熵值假设密码是完全随机的，但实际用户创建的密码往往存在大量可预测模式。本工具使用 **zxcvbn** 库作为基础，并针对中文场景进行扩展。

**zxcvbn 的核心检测模式**：

| 模式类型 | 说明 | 熵值扣除 |
|---------|------|---------|
| 字典单词 | 常见英文单词、人名、地名 | 大幅扣除 |
| 日期格式 | MMDDYY、YYYYMMDD等 | 扣除 |
| 重复字符 | aaaa、1111 | 扣除 |
| 序列模式 | abcd、1234 | 扣除 |
| 键盘布局 | qwerty、asdfg | 扣除 |
| l33t替换 | p@ssw0rd | 少量扣除 |

### 1.3 中文场景扩展

针对中国用户常用密码模式，我们额外检测以下模式：

#### 1.3.1 常见拼音/词汇

| 类别 | 示例 |
|-----|------|
| 人称代词 | wo, ni, ta, women, nimen |
| 情感词汇 | ai, qing, aiqing, woaini |
| 数字相关 | shengri, nian, yue, ri |
| 常见姓氏 | zhang, wang, li, liu, chen |
| 网络词汇 | qq, weixin, zhifu, taobao |
| 数字谐音 | 520, 1314, 888, 666 |

**检测逻辑**：
```typescript
for (const pinyin of CHINESE_PINYIN_COMMON) {
  if (lowerPassword.includes(pinyin)) {
    // 标记为拼音模式，熵值扣除
  }
}
```

#### 1.3.2 生日日期格式

中国用户常用生日作为密码，检测以下格式：

| 格式 | 示例 | 检测范围 |
|-----|------|---------|
| yyyyMMdd | 19900101 | 1900年至今 |
| yyMMdd | 900101 | 自动推断世纪 |
| yyyy/MM/dd | 1990/01/01 | 带分隔符 |
| yyyy-MM-dd | 1990-01-01 | 带分隔符 |

**检测逻辑**：
```typescript
function isBirthdayFormat(str: string): boolean {
  if (str.length === 8 && /^\d{8}$/.test(str)) {
    const year = parseInt(str.substring(0, 4))
    const month = parseInt(str.substring(4, 6))
    const day = parseInt(str.substring(6, 8))
    return year >= 1900 && month >= 1 && month <= 12 && day >= 1 && day <= 31
  }
  // 其他格式检测...
}
```

#### 1.3.3 键盘序列

除了标准的 qwerty 序列，还检测中文用户常用的模式：

| 序列类型 | 示例 |
|---------|------|
| 横向序列 | qwerty, asdfgh, zxcvbn |
| 纵向序列 | 1qaz2wsx, qazwsx |
| 数字序列 | 123456, 987654321 |
| 符号序列 | !@#$%^, 0987654321 |
| 倒序序列 | ytrewq, 654321 |

**检测逻辑**：
```typescript
const KEYBOARD_PATTERNS = [
  { pattern: 'qwerty', entropyReduction: 10 },
  { pattern: '1qaz2wsx', entropyReduction: 12 },
  { pattern: '123456', entropyReduction: 12 },
  // ...
]

for (const kp of KEYBOARD_PATTERNS) {
  if (passwordLower.includes(kp.pattern)) {
    entropy -= kp.entropyReduction * 0.5
  }
  // 同时检测倒序
  if (passwordLower.includes(reverse(kp.pattern))) {
    entropy -= kp.entropyReduction * 0.5
  }
}
```

### 1.4 熵值调整算法

最终熵值计算流程：

```
1. 基础计算：使用 zxcvbn 计算初始熵值
2. 中文模式检测：
   - 检测拼音/词汇模式
   - 检测生日日期模式
   - 检测键盘序列模式
3. 熵值调整：
   adjustedEntropy = max(1, baseEntropy - totalReduction * 0.5)
4. 强度评分映射：
   - < 20 bits: 极弱 (0)
   - 20-35 bits: 弱 (1)
   - 35-50 bits: 一般 (2)
   - 50-70 bits: 强 (3)
   - ≥ 70 bits: 极强 (4)
```

## 二、渲染性能取舍

### 2.1 需求分析

**核心需求**：
- 密码熵值从 0 到 100+ bits
- 可视化展示"指数爆炸"效果
- 节点数量可达到百万级
- 实时输入、实时渲染
- 支持双密码对比

**性能挑战**：
- 纯 SVG 无法支撑百万级节点
- DOM 操作开销巨大
- 力导向布局计算复杂度高
- 需要平滑动画效果

### 2.2 技术选型

**可选方案对比**：

| 方案 | 节点上限 | 性能 | 开发复杂度 |
|-----|---------|------|-----------|
| SVG | ~1000 | 差 | 低 |
| Canvas 2D | ~50000 | 中 | 低 |
| WebGL | ~1000000+ | 优 | 中 |

**最终选择**：WebGL 作为主渲染方案，Canvas 2D 作为降级方案。

### 2.3 渲染架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                      WebGLRenderer                            │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐    │
│  │  Node Pool  │  │  Edge Pool  │  │  Physics Engine │    │
│  │  (节点池)   │  │  (边池)    │  │  (物理引擎)     │    │
│  └─────────────┘  └─────────────┘  └─────────────────┘    │
│         │                 │                  │               │
│         ▼                 ▼                  ▼               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                 WebGL Shader Pipeline                  │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │  │
│  │  │ Vertex   │  │ Geometry │  │ Fragment         │  │  │
│  │  │ Shader   │  │ (CPU)    │  │ Shader           │  │  │
│  │  └──────────┘  └──────────┘  └──────────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 2.4 性能优化策略

#### 2.4.1 节点数量控制

**问题**：100 bits 熵值理论上对应 2¹⁰⁰ ≈ 1e30 个节点，无法渲染。

**解决方案**：熵值到节点数量的非线性映射

```typescript
function getNodeCountFromEntropy(entropy: number): number {
  if (entropy <= 0) return 0
  
  // 分段映射，控制在 10 ~ 1,000,000 范围内
  if (entropy < 10) {
    return Math.floor(Math.pow(10, entropy / 5))
  } else if (entropy < 30) {
    return Math.floor(Math.pow(10, (entropy + 10) / 8))
  } else if (entropy < 50) {
    return Math.floor(Math.pow(10, (entropy + 30) / 12))
  } else if (entropy < 80) {
    return Math.floor(MAX_NODES * (entropy / 80))
  } else {
    return MAX_NODES  // 1,000,000
  }
}
```

**映射曲线**：
| 熵值 (bits) | 节点数量 | 视觉效果 |
|------------|---------|---------|
| 0-10 | 10-100 | 稀疏分布 |
| 10-30 | 100-10,000 | 明显增长 |
| 30-50 | 10,000-100,000 | 密集分布 |
| 50-80 | 100,000-1,000,000 | "爆炸"效果 |
| 80+ | 1,000,000 | 最大密度 |

#### 2.4.2 力导向布局优化

**问题**：标准力导向算法复杂度 O(n²)，百万节点无法实时计算。

**优化策略**：

1. **网格空间划分**
   ```typescript
   const GRID_SIZE = 100
   const grid: Map<string, number[]> = new Map()
   
   // 将节点分配到网格单元
   for (const node of nodes) {
     const gridX = Math.floor(node.x / GRID_SIZE)
     const gridY = Math.floor(node.y / GRID_SIZE)
     const key = `${gridX},${gridY}`
     if (!grid.has(key)) grid.set(key, [])
     grid.get(key)!.push(node.id)
   }
   
   // 只与相邻网格的节点计算斥力
   for (const node of nodes) {
     const gridX = Math.floor(node.x / GRID_SIZE)
     const gridY = Math.floor(node.y / GRID_SIZE)
     
     for (let dx = -1; dx <= 1; dx++) {
       for (let dy = -1; dy <= 1; dy++) {
         const neighbors = grid.get(`${gridX+dx},${gridY+dy}`)
         // 只与这些邻居计算斥力
       }
     }
   }
   ```

2. **力计算简化**
   ```typescript
   // 简化的斥力公式
   const force = repulsion / (distSq + 100)
   
   // 只对近距离节点计算
   if (dist < MIN_DIST * 2) {
     // 计算斥力
   }
   ```

3. **物理步数动态调整**
   ```typescript
   // 根据节点数量调整物理模拟步数
   const steps = nodeCount > 10000 ? 1 : 2
   for (let i = 0; i < steps; i++) {
     updatePhysics(0.8)  // dt = 0.8，略低于1
   }
   ```

#### 2.4.3 WebGL 渲染优化

1. **使用点精灵 (Point Sprites)**
   ```glsl
   // 顶点着色器
   attribute vec2 a_position;
   attribute vec4 a_color;
   attribute float a_size;
   
   void main() {
     gl_Position = u_projection * vec4(a_position, 0.0, 1.0);
     gl_PointSize = a_size;  // 点大小由顶点属性控制
     v_color = a_color;
   }
   
   // 片元着色器 - 圆形点带抗锯齿
   void main() {
     float dist = length(gl_PointCoord - vec2(0.5));
     if (dist > 0.5) discard;  // 圆形裁剪
     
     float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
     gl_FragColor = vec4(v_color.rgb, v_color.a * alpha);
   }
   ```

2. **批量渲染**
   ```typescript
   // 所有节点一次性提交，而非逐个绘制
   gl.drawArrays(gl.POINTS, 0, nodeCount);
   
   // 边也使用 LINE 图元批量绘制
   gl.drawArrays(gl.LINES, 0, edgeCount * 2);
   ```

3. **边数量限制**
   ```typescript
   // 树结构边数量 = 节点数量 - 1
   // 限制最多渲染 2000 条边，避免视觉混乱和性能问题
   const maxEdges = Math.min(edges.length, 2000);
   edges = edges.slice(0, maxEdges);
   ```

4. **缓冲区复用**
   ```typescript
   // 预分配大缓冲区，避免频繁重新分配
   this.nodePositions = new Float32Array(MAX_NODES * 2);
   this.nodeColors = new Float32Array(MAX_NODES * 4);
   this.nodeSizes = new Float32Array(MAX_NODES);
   
   // 每帧只更新数据，不重新创建缓冲区
   gl.bufferData(gl.ARRAY_BUFFER, this.nodePositions, gl.DYNAMIC_DRAW);
   ```

#### 2.4.4 降级方案

**WebGL 不可用时的 Canvas 2D 降级**：

```typescript
private renderFallback(): void {
  const ctx = this.canvas.getContext('2d')
  if (!ctx) return
  
  // 1. 清空画布
  ctx.fillStyle = '#0f0f1a'
  ctx.fillRect(0, 0, width, height)
  
  // 2. 绘制边（限制数量）
  ctx.strokeStyle = 'rgba(100, 140, 200, 0.2)'
  ctx.lineWidth = 0.5
  for (const edge of this.edges.slice(0, 2000)) {
    // 绘制边
  }
  
  // 3. 绘制节点
  for (const node of this.nodes) {
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`
    ctx.beginPath()
    ctx.arc(node.x, node.y, node.size, 0, Math.PI * 2)
    ctx.fill()
  }
}
```

### 2.5 性能指标

**目标帧率**：
- 节点数 < 10,000：60 FPS
- 节点数 10,000 - 100,000：30-60 FPS
- 节点数 100,000 - 1,000,000：15-30 FPS

**内存占用**：
- 每个节点：位置(2×4) + 颜色(4×4) + 大小(4) + 物理属性 ≈ 40 bytes
- 1,000,000 节点：≈ 40 MB (可接受)

### 2.6 动画平滑策略

1. **阻尼衰减**
   ```typescript
   node.vx *= damping  // damping = 0.9
   node.vy *= damping
   ```

2. **速度限制**
   ```typescript
   const maxSpeed = 10
   const speed = Math.hypot(node.vx, node.vy)
   if (speed > maxSpeed) {
     node.vx = (node.vx / speed) * maxSpeed
     node.vy = (node.vy / speed) * maxSpeed
   }
   ```

3. **边界约束**
   ```typescript
   node.x = Math.max(margin, Math.min(width - margin, node.x))
   node.y = Math.max(margin, Math.min(height - margin, node.y))
   ```

## 三、GPU 算力估算

### 3.1 数据来源

显卡哈希率数据基于以下参考：
- Hashcat 官方基准测试
- OpenBenchmarking.org 公开数据
- 社区实测结果汇总

### 3.2 常见显卡算力

| 显卡型号 | 发布年份 | MD5 (H/s) | SHA-256 (H/s) | bcrypt (H/s) |
|---------|---------|-----------|---------------|-------------|
| NVIDIA H100 | 2022 | 600 GH/s | 60 GH/s | 600 kH/s |
| NVIDIA A100 | 2020 | 350 GH/s | 35 GH/s | 350 kH/s |
| NVIDIA RTX 4090 | 2022 | 200 GH/s | 18 GH/s | 180 kH/s |
| NVIDIA RTX 3090 | 2020 | 160 GH/s | 15 GH/s | 140 kH/s |
| AMD RX 7900 XTX | 2022 | 140 GH/s | 12 GH/s | 120 kH/s |
| NVIDIA RTX 4080 | 2022 | 120 GH/s | 10 GH/s | 100 kH/s |
| 集成显卡 | - | 1 GH/s | 80 MH/s | 800 H/s |

### 3.3 破解时间计算

```typescript
破解时间(秒) = 需要尝试次数 / 每秒哈希率

需要尝试次数 ≈ 2^熵值 / 2  (平均情况)
```

**时间尺度参照**：
| 时间单位 | 秒数 | 说明 |
|---------|------|------|
| 秒 | 1 | 即时 |
| 分钟 | 60 | 很快 |
| 小时 | 3,600 | 可等待 |
| 天 | 86,400 | 需耐心 |
| 月 | ~2.6e6 | 漫长 |
| 年 | ~3.2e7 | 极长 |
| 世纪 | ~3.2e9 | 历史级 |
| 宇宙年龄 | ~4.3e17 | 天文数字 |

## 四、视觉设计

### 4.1 色彩系统

使用 OKLCH 色彩空间，确保感知均匀：

```css
/* 主色调 - 科技蓝 */
--color-glow-blue: oklch(0.75 0.15 250)

/* 强调色 */
--color-glow-cyan: oklch(0.80 0.15 180)    /* 对比色 */
--color-glow-purple: oklch(0.70 0.18 280)  /* 第二密码 */
--color-glow-pink: oklch(0.70 0.20 330)    /* 警告 */
--color-glow-green: oklch(0.75 0.15 140)   /* 成功 */

/* 强度色阶 */
oklch(0.65 0.22 20)   /* 极弱 - 红色 */
oklch(0.70 0.18 70)   /* 弱 - 橙色 */
oklch(0.70 0.18 200)  /* 一般 - 蓝色 */
oklch(0.70 0.15 140)  /* 强 - 绿色 */
oklch(0.70 0.18 280)  /* 极强 - 紫色 */
```

### 4.2 字体选择

```css
/* 显示字体 - 现代感 */
font-family: 'Space Grotesk', sans-serif;

/* 等宽字体 - 技术感 */
font-family: 'JetBrains Mono', 'Fira Code', monospace;
```

### 4.3 动效设计

- 节点入场：从中心向外扩散
- 力导向：持续的轻微运动，保持活力
- 颜色渐变：随深度变化的色相偏移
- 透明度：随深度递减，营造层次感

---

## 五、项目结构

```
src/
├── lib/
│   ├── passwordEntropy.ts    # 密码熵计算模块
│   ├── gpuCompute.ts          # GPU算力估算模块
│   └── webglRenderer.ts       # WebGL渲染引擎
├── components/
│   ├── VisualizerCanvas.tsx   # 可视化画布组件
│   ├── PasswordInput.tsx      # 密码输入组件
│   ├── GPUSelector.tsx        # 显卡选择器
│   └── CrackTimeDisplay.tsx   # 破解时间展示
├── App.tsx                     # 主应用
├── main.tsx                    # 入口
└── index.css                   # 样式
```
