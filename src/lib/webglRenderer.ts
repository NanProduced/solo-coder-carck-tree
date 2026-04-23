export interface Node {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  targetX: number
  targetY: number
  size: number
  color: number[]
  alpha: number
  depth: number
  fixed: boolean
}

export interface Edge {
  from: number
  to: number
  depth: number
}

export interface RendererOptions {
  maxNodes: number
  nodeSize: number
  repulsion: number
  attraction: number
  damping: number
  gravity: number
  centerForce: number
}

const DEFAULT_OPTIONS: RendererOptions = {
  maxNodes: 50000,
  nodeSize: 2,
  repulsion: 60,
  attraction: 0.005,
  damping: 0.9,
  gravity: 0.005,
  centerForce: 0.02
}

const THROTTLE_DELAY = 150

const VERTEX_SHADER_SOURCE = `
  attribute vec2 a_position;
  attribute vec4 a_color;
  attribute float a_size;
  
  uniform mat4 u_projection;
  
  varying vec4 v_color;
  
  void main() {
    gl_Position = u_projection * vec4(a_position, 0.0, 1.0);
    gl_PointSize = a_size;
    v_color = a_color;
  }
`

const FRAGMENT_SHADER_SOURCE = `
  precision mediump float;
  
  varying vec4 v_color;
  
  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;
    
    float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
    gl_FragColor = vec4(v_color.rgb, v_color.a * alpha);
  }
`

function createShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type)
  if (!shader) return null
  
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Shader compile error:', gl.getShaderInfoLog(shader))
    gl.deleteShader(shader)
    return null
  }
  
  return shader
}

function createProgram(
  gl: WebGLRenderingContext,
  vertexShader: WebGLShader,
  fragmentShader: WebGLShader
): WebGLProgram | null {
  const program = gl.createProgram()
  if (!program) return null
  
  gl.attachShader(program, vertexShader)
  gl.attachShader(program, fragmentShader)
  gl.linkProgram(program)
  
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(program))
    gl.deleteProgram(program)
    return null
  }
  
  return program
}

function hslToRgb(h: number, s: number, l: number): number[] {
  let r, g, b
  
  if (s === 0) {
    r = g = b = l
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1/6) return p + (q - p) * 6 * t
      if (t < 1/2) return q
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
      return p
    }
    
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1/3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1/3)
  }
  
  return [r, g, b]
}

export class WebGLRenderer {
  private canvas: HTMLCanvasElement
  private gl: WebGLRenderingContext | null = null
  private nodeProgram: WebGLProgram | null = null
  
  private nodes: Node[] = []
  
  private nodePositions: Float32Array = new Float32Array()
  private nodeColors: Float32Array = new Float32Array()
  private nodeSizes: Float32Array = new Float32Array()
  
  private positionBuffer: WebGLBuffer | null = null
  private colorBuffer: WebGLBuffer | null = null
  private sizeBuffer: WebGLBuffer | null = null
  
  private animationFrameId: number = 0
  private isRunning: boolean = false
  
  private options: RendererOptions
  private width: number = 0
  private height: number = 0
  
  private pendingEntropy: number = 0
  private lastUpdateTime: number = 0
  private isUpdatePending: boolean = false
  
  private onRenderCallback?: (nodeCount: number, fps: number) => void
  private lastFrameTime: number = 0
  private frameCount: number = 0
  private fps: number = 0
  
  constructor(canvas: HTMLCanvasElement, options?: Partial<RendererOptions>) {
    this.canvas = canvas
    this.options = { ...DEFAULT_OPTIONS, ...options }
    
    this.initWebGL()
    this.resize()
    
    window.addEventListener('resize', () => this.resize())
  }
  
  private initWebGL(): void {
    this.gl = this.canvas.getContext('webgl', {
      antialias: false,
      alpha: true,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
      powerPreference: 'default'
    })
    
    if (!this.gl) {
      console.warn('WebGL not supported, falling back to simple rendering')
      return
    }
    
    const gl = this.gl
    
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
    
    const nodeVertexShader = createShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE)
    const nodeFragmentShader = createShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SOURCE)
    
    if (nodeVertexShader && nodeFragmentShader) {
      this.nodeProgram = createProgram(gl, nodeVertexShader, nodeFragmentShader)
    }
    
    this.positionBuffer = gl.createBuffer()
    this.colorBuffer = gl.createBuffer()
    this.sizeBuffer = gl.createBuffer()
  }
  
  private resize(): void {
    const dpr = window.devicePixelRatio || 1
    const rect = this.canvas.getBoundingClientRect()
    
    this.width = rect.width
    this.height = rect.height
    
    this.canvas.width = this.width * dpr
    this.canvas.height = this.height * dpr
    
    if (this.gl) {
      this.gl.viewport(0, 0, this.canvas.width, this.canvas.height)
    }
  }
  
  public setEntropy(entropy: number): void {
    this.pendingEntropy = entropy
    this.isUpdatePending = true
  }
  
  private processPendingUpdate(): void {
    if (!this.isUpdatePending) return
    
    const now = performance.now()
    if (now - this.lastUpdateTime < THROTTLE_DELAY) return
    
    this.lastUpdateTime = now
    this.isUpdatePending = false
    
    const targetCount = this.getNodeCountFromEntropy(this.pendingEntropy)
    const currentCount = this.nodes.length
    
    if (targetCount === currentCount) {
      return
    }
    
    this.updateNodeTree(targetCount)
  }
  
  private getNodeCountFromEntropy(entropy: number): number {
    if (entropy <= 0) return 0
    
    const maxNodes = this.options.maxNodes
    
    if (entropy < 10) {
      return Math.floor(Math.pow(10, entropy / 5))
    } else if (entropy < 30) {
      return Math.floor(Math.pow(10, (entropy + 10) / 8))
    } else if (entropy < 50) {
      return Math.floor(Math.pow(10, (entropy + 30) / 12))
    } else if (entropy < 70) {
      return Math.floor(maxNodes * (entropy / 70))
    } else {
      return maxNodes
    }
  }
  
  private updateNodeTree(targetCount: number): void {
    targetCount = Math.min(targetCount, this.options.maxNodes)
    const currentCount = this.nodes.length
    
    if (targetCount < currentCount) {
      this.nodes = this.nodes.slice(0, targetCount)
    } else if (targetCount > currentCount) {
      const nodesToAdd = targetCount - currentCount
      this.addNodes(nodesToAdd)
    }
    
    this.allocateBuffers()
  }
  
  private addNodes(count: number): void {
    const startId = this.nodes.length
    const centerX = this.width / 2
    const centerY = this.height / 2
    
    for (let i = 0; i < count; i++) {
      const id = startId + i
      const depth = this.getNodeDepth(id)
      
      const angle = Math.random() * Math.PI * 2
      const radius = this.getInitialRadius(depth)
      
      const hue = this.getHueForDepth(depth)
      const [r, g, b] = hslToRgb(hue, 0.7, 0.6)
      
      const size = Math.max(1, this.options.nodeSize * (1.5 - depth * 0.15))
      const alpha = Math.max(0.2, 0.8 - depth * 0.08)
      
      this.nodes.push({
        id,
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        targetX: centerX + Math.cos(angle) * radius,
        targetY: centerY + Math.sin(angle) * radius,
        size,
        color: [r, g, b],
        alpha,
        depth,
        fixed: false
      })
    }
  }
  
  private getNodeDepth(id: number): number {
    if (id === 0) return 0
    return Math.floor(Math.log2(id + 1))
  }
  
  private getInitialRadius(depth: number): number {
    const baseRadius = Math.min(this.width, this.height) * 0.08
    return baseRadius + depth * 25 + Math.random() * 15
  }
  
  private getHueForDepth(depth: number): number {
    const baseHue = 0.65
    const hueVariation = depth * 0.015
    return (baseHue + hueVariation) % 1
  }
  
  private allocateBuffers(): void {
    const nodeCount = this.nodes.length
    
    this.nodePositions = new Float32Array(nodeCount * 2)
    this.nodeColors = new Float32Array(nodeCount * 4)
    this.nodeSizes = new Float32Array(nodeCount)
  }
  
  private updateSimple(dt: number = 1): void {
    const nodes = this.nodes
    const centerX = this.width / 2
    const centerY = this.height / 2
    const damping = this.options.damping
    const gravity = this.options.gravity
    
    for (const node of nodes) {
      const angle = Math.atan2(node.y - centerY, node.x - centerX)
      const dist = Math.hypot(node.x - centerX, node.y - centerY)
      const idealDist = 40 + node.depth * 20
      
      node.vx += Math.cos(angle) * (idealDist - dist) * gravity
      node.vy += Math.sin(angle) * (idealDist - dist) * gravity
      
      node.vx += (Math.random() - 0.5) * 0.3
      node.vy += (Math.random() - 0.5) * 0.3
      
      node.vx *= damping
      node.vy *= damping
      
      const maxSpeed = 5
      const speed = Math.hypot(node.vx, node.vy)
      if (speed > maxSpeed) {
        node.vx = (node.vx / speed) * maxSpeed
        node.vy = (node.vy / speed) * maxSpeed
      }
      
      node.x += node.vx * dt
      node.y += node.vy * dt
      
      const margin = 30
      node.x = Math.max(margin, Math.min(this.width - margin, node.x))
      node.y = Math.max(margin, Math.min(this.height - margin, node.y))
    }
  }
  
  private render(): void {
    const gl = this.gl
    if (!gl || !this.nodeProgram) {
      this.renderFallback()
      return
    }
    
    const dpr = window.devicePixelRatio || 1
    const nodes = this.nodes
    
    gl.clearColor(0.06, 0.06, 0.1, 1.0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    
    const left = 0
    const right = this.width
    const bottom = this.height
    const top = 0
    
    const projection = new Float32Array([
      2 / (right - left), 0, 0, 0,
      0, 2 / (top - bottom), 0, 0,
      0, 0, -1, 0,
      -(right + left) / (right - left), -(top + bottom) / (top - bottom), 0, 1
    ])
    
    gl.useProgram(this.nodeProgram)
    
    const posLoc = gl.getAttribLocation(this.nodeProgram, 'a_position')
    const colorLoc = gl.getAttribLocation(this.nodeProgram, 'a_color')
    const sizeLoc = gl.getAttribLocation(this.nodeProgram, 'a_size')
    const projLoc = gl.getUniformLocation(this.nodeProgram, 'u_projection')
    
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i]
      
      this.nodePositions[i * 2] = node.x
      this.nodePositions[i * 2 + 1] = node.y
      
      this.nodeColors[i * 4] = node.color[0]
      this.nodeColors[i * 4 + 1] = node.color[1]
      this.nodeColors[i * 4 + 2] = node.color[2]
      this.nodeColors[i * 4 + 3] = node.alpha
      
      this.nodeSizes[i] = node.size * dpr
    }
    
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, this.nodePositions, gl.DYNAMIC_DRAW)
    gl.enableVertexAttribArray(posLoc)
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0)
    
    gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, this.nodeColors, gl.DYNAMIC_DRAW)
    gl.enableVertexAttribArray(colorLoc)
    gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, 0, 0)
    
    gl.bindBuffer(gl.ARRAY_BUFFER, this.sizeBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, this.nodeSizes, gl.DYNAMIC_DRAW)
    gl.enableVertexAttribArray(sizeLoc)
    gl.vertexAttribPointer(sizeLoc, 1, gl.FLOAT, false, 0, 0)
    
    gl.uniformMatrix4fv(projLoc, false, projection)
    
    gl.drawArrays(gl.POINTS, 0, nodes.length)
  }
  
  private renderFallback(): void {
    const ctx = this.canvas.getContext('2d')
    if (!ctx) return
    
    const dpr = window.devicePixelRatio || 1
    
    ctx.fillStyle = '#0f0f1a'
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
    
    ctx.save()
    ctx.scale(dpr, dpr)
    
    for (const node of this.nodes) {
      const r = Math.floor(node.color[0] * 255)
      const g = Math.floor(node.color[1] * 255)
      const b = Math.floor(node.color[2] * 255)
      
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${node.alpha})`
      ctx.beginPath()
      ctx.arc(node.x, node.y, node.size, 0, Math.PI * 2)
      ctx.fill()
    }
    
    ctx.restore()
  }
  
  private animate = (timestamp: number): void => {
    if (!this.isRunning) return
    
    this.frameCount++
    if (timestamp - this.lastFrameTime >= 1000) {
      this.fps = this.frameCount
      this.frameCount = 0
      this.lastFrameTime = timestamp
      
      if (this.onRenderCallback) {
        this.onRenderCallback(this.nodes.length, this.fps)
      }
    }
    
    this.processPendingUpdate()
    
    if (this.nodes.length > 0) {
      this.updateSimple(0.8)
    }
    
    this.render()
    
    this.animationFrameId = requestAnimationFrame(this.animate)
  }
  
  public start(): void {
    if (this.isRunning) return
    this.isRunning = true
    this.lastFrameTime = performance.now()
    this.animationFrameId = requestAnimationFrame(this.animate)
  }
  
  public stop(): void {
    this.isRunning = false
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = 0
    }
  }
  
  public setOptions(options: Partial<RendererOptions>): void {
    this.options = { ...this.options, ...options }
  }
  
  public onRender(callback: (nodeCount: number, fps: number) => void): void {
    this.onRenderCallback = callback
  }
  
  public getNodeCount(): number {
    return this.nodes.length
  }
  
  public getFps(): number {
    return this.fps
  }
  
  public clear(): void {
    this.nodes = []
    this.pendingEntropy = 0
    this.isUpdatePending = false
    this.allocateBuffers()
  }
  
  public destroy(): void {
    this.stop()
    
    const gl = this.gl
    if (gl) {
      if (this.positionBuffer) gl.deleteBuffer(this.positionBuffer)
      if (this.colorBuffer) gl.deleteBuffer(this.colorBuffer)
      if (this.sizeBuffer) gl.deleteBuffer(this.sizeBuffer)
      if (this.nodeProgram) gl.deleteProgram(this.nodeProgram)
    }
  }
}
