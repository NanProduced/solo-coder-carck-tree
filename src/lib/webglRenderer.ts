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
  maxNodes: 100000,
  nodeSize: 2,
  repulsion: 100,
  attraction: 0.01,
  damping: 0.92,
  gravity: 0.01,
  centerForce: 0.05
}

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

const EDGE_VERTEX_SHADER_SOURCE = `
  attribute vec2 a_position;
  attribute vec4 a_color;
  
  uniform mat4 u_projection;
  
  varying vec4 v_color;
  
  void main() {
    gl_Position = u_projection * vec4(a_position, 0.0, 1.0);
    v_color = a_color;
  }
`

const EDGE_FRAGMENT_SHADER_SOURCE = `
  precision mediump float;
  
  varying vec4 v_color;
  
  void main() {
    gl_FragColor = v_color;
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
  private edgeProgram: WebGLProgram | null = null
  
  private nodes: Node[] = []
  private edges: Edge[] = []
  
  private nodePositions: Float32Array = new Float32Array()
  private nodeColors: Float32Array = new Float32Array()
  private nodeSizes: Float32Array = new Float32Array()
  
  private edgePositions: Float32Array = new Float32Array()
  private edgeColors: Float32Array = new Float32Array()
  
  private positionBuffer: WebGLBuffer | null = null
  private colorBuffer: WebGLBuffer | null = null
  private sizeBuffer: WebGLBuffer | null = null
  private edgePositionBuffer: WebGLBuffer | null = null
  private edgeColorBuffer: WebGLBuffer | null = null
  
  private animationFrameId: number = 0
  private isRunning: boolean = false
  
  private options: RendererOptions
  private width: number = 0
  private height: number = 0
  
  private targetNodeCount: number = 0
  private currentEntropy: number = 0
  
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
      antialias: true,
      alpha: true,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false
    })
    
    if (!this.gl) {
      console.warn('WebGL not supported, falling back to canvas 2D')
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
    
    const edgeVertexShader = createShader(gl, gl.VERTEX_SHADER, EDGE_VERTEX_SHADER_SOURCE)
    const edgeFragmentShader = createShader(gl, gl.FRAGMENT_SHADER, EDGE_FRAGMENT_SHADER_SOURCE)
    
    if (edgeVertexShader && edgeFragmentShader) {
      this.edgeProgram = createProgram(gl, edgeVertexShader, edgeFragmentShader)
    }
    
    this.positionBuffer = gl.createBuffer()
    this.colorBuffer = gl.createBuffer()
    this.sizeBuffer = gl.createBuffer()
    this.edgePositionBuffer = gl.createBuffer()
    this.edgeColorBuffer = gl.createBuffer()
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
    this.currentEntropy = entropy
    const nodeCount = this.getNodeCountFromEntropy(entropy)
    this.targetNodeCount = nodeCount
    
    this.updateNodeTree()
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
    } else if (entropy < 80) {
      return Math.floor(maxNodes * (entropy / 80))
    } else {
      return maxNodes
    }
  }
  
  private updateNodeTree(): void {
    const targetCount = Math.min(this.targetNodeCount, this.options.maxNodes)
    const currentCount = this.nodes.length
    
    if (targetCount === currentCount) return
    
    if (targetCount < currentCount) {
      this.nodes = this.nodes.slice(0, targetCount)
      this.edges = this.generateEdges(this.nodes)
    } else {
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
      
      const size = Math.max(1, this.options.nodeSize * (1.5 - depth * 0.2))
      const alpha = Math.max(0.3, 0.9 - depth * 0.1)
      
      this.nodes.push({
        id,
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
        targetX: centerX + Math.cos(angle) * radius,
        targetY: centerY + Math.sin(angle) * radius,
        size,
        color: [r, g, b],
        alpha,
        depth,
        fixed: false
      })
    }
    
    this.edges = this.generateEdges(this.nodes)
  }
  
  private getNodeDepth(id: number): number {
    if (id === 0) return 0
    return Math.floor(Math.log2(id + 1))
  }
  
  private getInitialRadius(depth: number): number {
    const baseRadius = Math.min(this.width, this.height) * 0.1
    return baseRadius + depth * 40 + Math.random() * 20
  }
  
  private getHueForDepth(depth: number): number {
    const baseHue = 0.65
    const hueVariation = depth * 0.02
    return (baseHue + hueVariation) % 1
  }
  
  private generateEdges(nodes: Node[]): Edge[] {
    const edges: Edge[] = []
    
    if (nodes.length <= 1) return edges
    
    for (let i = 1; i < nodes.length; i++) {
      const parentId = Math.floor((i - 1) / 2)
      if (parentId < nodes.length) {
        edges.push({
          from: parentId,
          to: i,
          depth: nodes[i].depth
        })
      }
    }
    
    const maxEdges = Math.min(edges.length, 2000)
    return edges.slice(0, maxEdges)
  }
  
  private allocateBuffers(): void {
    const nodeCount = this.nodes.length
    const edgeCount = this.edges.length
    
    this.nodePositions = new Float32Array(nodeCount * 2)
    this.nodeColors = new Float32Array(nodeCount * 4)
    this.nodeSizes = new Float32Array(nodeCount)
    
    this.edgePositions = new Float32Array(edgeCount * 4)
    this.edgeColors = new Float32Array(edgeCount * 8)
  }
  
  private updatePhysics(dt: number = 1): void {
    const nodes = this.nodes
    const edges = this.edges
    
    const centerX = this.width / 2
    const centerY = this.height / 2
    
    const repulsion = this.options.repulsion
    const attraction = this.options.attraction
    const damping = this.options.damping
    const gravity = this.options.gravity
    const centerForce = this.options.centerForce
    
    const gridSize = 100
    const grid: Map<string, number[]> = new Map()
    
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i]
      const gridX = Math.floor(node.x / gridSize)
      const gridY = Math.floor(node.y / gridSize)
      const key = `${gridX},${gridY}`
      
      if (!grid.has(key)) {
        grid.set(key, [])
      }
      grid.get(key)!.push(i)
      
      node.vx += (centerX - node.x) * centerForce
      node.vy += (centerY - node.y) * centerForce
      
      const angle = Math.atan2(node.y - centerY, node.x - centerX)
      const dist = Math.hypot(node.x - centerX, node.y - centerY)
      const idealDist = 50 + node.depth * 30
      
      node.vx += Math.cos(angle) * (idealDist - dist) * gravity
      node.vy += Math.sin(angle) * (idealDist - dist) * gravity
    }
    
    for (let i = 0; i < nodes.length; i++) {
      const nodeA = nodes[i]
      const gridX = Math.floor(nodeA.x / gridSize)
      const gridY = Math.floor(nodeA.y / gridSize)
      
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const key = `${gridX + dx},${gridY + dy}`
          const cellNodes = grid.get(key)
          if (!cellNodes) continue
          
          for (const j of cellNodes) {
            if (j <= i) continue
            
            const nodeB = nodes[j]
            
            const dx = nodeB.x - nodeA.x
            const dy = nodeB.y - nodeA.y
            const distSq = dx * dx + dy * dy
            const dist = Math.sqrt(distSq) || 0.1
            
            const minDist = 20
            if (dist < minDist * 2) {
              const force = repulsion * (1 / (distSq + 100)) * dt
              const fx = (dx / dist) * force
              const fy = (dy / dist) * force
              
              nodeA.vx -= fx
              nodeA.vy -= fy
              nodeB.vx += fx
              nodeB.vy += fy
            }
          }
        }
      }
    }
    
    for (const edge of edges) {
      const nodeA = nodes[edge.from]
      const nodeB = nodes[edge.to]
      
      if (!nodeA || !nodeB) continue
      
      const dx = nodeB.x - nodeA.x
      const dy = nodeB.y - nodeA.y
      const dist = Math.hypot(dx, dy) || 1
      
      const idealLength = 30 + edge.depth * 10
      const force = (dist - idealLength) * attraction * dt
      
      const fx = (dx / dist) * force
      const fy = (dy / dist) * force
      
      nodeA.vx += fx
      nodeA.vy += fy
      nodeB.vx -= fx
      nodeB.vy -= fy
    }
    
    for (const node of nodes) {
      if (node.fixed) continue
      
      node.vx *= damping
      node.vy *= damping
      
      const maxSpeed = 10
      const speed = Math.hypot(node.vx, node.vy)
      if (speed > maxSpeed) {
        node.vx = (node.vx / speed) * maxSpeed
        node.vy = (node.vy / speed) * maxSpeed
      }
      
      node.x += node.vx * dt
      node.y += node.vy * dt
      
      const margin = 50
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
    const edges = this.edges
    
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
    
    if (edges.length > 0 && this.edgeProgram) {
      gl.useProgram(this.edgeProgram)
      
      const edgePosLoc = gl.getAttribLocation(this.edgeProgram, 'a_position')
      const edgeColorLoc = gl.getAttribLocation(this.edgeProgram, 'a_color')
      const edgeProjLoc = gl.getUniformLocation(this.edgeProgram, 'u_projection')
      
      let edgeIndex = 0
      let edgeColorIndex = 0
      
      for (const edge of edges) {
        const fromNode = nodes[edge.from]
        const toNode = nodes[edge.to]
        
        if (!fromNode || !toNode) continue
        
        this.edgePositions[edgeIndex++] = fromNode.x
        this.edgePositions[edgeIndex++] = fromNode.y
        this.edgePositions[edgeIndex++] = toNode.x
        this.edgePositions[edgeIndex++] = toNode.y
        
        const alpha = Math.max(0.1, 0.4 - edge.depth * 0.05)
        const color = [0.4, 0.5, 0.8, alpha]
        
        for (let i = 0; i < 2; i++) {
          this.edgeColors[edgeColorIndex++] = color[0]
          this.edgeColors[edgeColorIndex++] = color[1]
          this.edgeColors[edgeColorIndex++] = color[2]
          this.edgeColors[edgeColorIndex++] = color[3]
        }
      }
      
      gl.bindBuffer(gl.ARRAY_BUFFER, this.edgePositionBuffer)
      gl.bufferData(gl.ARRAY_BUFFER, this.edgePositions, gl.DYNAMIC_DRAW)
      gl.enableVertexAttribArray(edgePosLoc)
      gl.vertexAttribPointer(edgePosLoc, 2, gl.FLOAT, false, 0, 0)
      
      gl.bindBuffer(gl.ARRAY_BUFFER, this.edgeColorBuffer)
      gl.bufferData(gl.ARRAY_BUFFER, this.edgeColors, gl.DYNAMIC_DRAW)
      gl.enableVertexAttribArray(edgeColorLoc)
      gl.vertexAttribPointer(edgeColorLoc, 4, gl.FLOAT, false, 0, 0)
      
      gl.uniformMatrix4fv(edgeProjLoc, false, projection)
      
      gl.drawArrays(gl.LINES, 0, edges.length * 2)
    }
    
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
    
    ctx.strokeStyle = 'rgba(100, 140, 200, 0.2)'
    ctx.lineWidth = 0.5
    
    for (const edge of this.edges) {
      const from = this.nodes[edge.from]
      const to = this.nodes[edge.to]
      if (!from || !to) continue
      
      ctx.beginPath()
      ctx.moveTo(from.x, from.y)
      ctx.lineTo(to.x, to.y)
      ctx.stroke()
    }
    
    for (const node of this.nodes) {
      const alpha = Math.floor(node.alpha * 255).toString(16).padStart(2, '0')
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
    
    const steps = this.nodes.length > 10000 ? 1 : 2
    for (let i = 0; i < steps; i++) {
      this.updatePhysics(0.8)
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
    this.edges = []
    this.targetNodeCount = 0
    this.currentEntropy = 0
    this.allocateBuffers()
  }
  
  public destroy(): void {
    this.stop()
    
    const gl = this.gl
    if (gl) {
      if (this.positionBuffer) gl.deleteBuffer(this.positionBuffer)
      if (this.colorBuffer) gl.deleteBuffer(this.colorBuffer)
      if (this.sizeBuffer) gl.deleteBuffer(this.sizeBuffer)
      if (this.edgePositionBuffer) gl.deleteBuffer(this.edgePositionBuffer)
      if (this.edgeColorBuffer) gl.deleteBuffer(this.edgeColorBuffer)
      if (this.nodeProgram) gl.deleteProgram(this.nodeProgram)
      if (this.edgeProgram) gl.deleteProgram(this.edgeProgram)
    }
  }
}
