import React, { useEffect, useRef, useState } from 'react'
import { WebGLRenderer } from '@/lib/webglRenderer'

interface VisualizerCanvasProps {
  entropy: number
  colorScheme?: 'blue' | 'purple' | 'cyan' | 'green'
  label?: string
  onStatsChange?: (nodeCount: number, fps: number) => void
}

export const VisualizerCanvas: React.FC<VisualizerCanvasProps> = ({
  entropy,
  label,
  onStatsChange
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<WebGLRenderer | null>(null)
  const [stats, setStats] = useState({ nodeCount: 0, fps: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!canvasRef.current) return

    const renderer = new WebGLRenderer(canvasRef.current, {
      maxNodes: 30000
    })

    renderer.onRender((nodeCount, fps) => {
      setStats({ nodeCount, fps })
      if (onStatsChange) {
        onStatsChange(nodeCount, fps)
      }
    })

    renderer.start()
    rendererRef.current = renderer

    return () => {
      renderer.destroy()
    }
  }, [])

  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.setEntropy(entropy)
    }
  }, [entropy])

  const nodeCountDisplay = stats.nodeCount >= 1000000
    ? `${(stats.nodeCount / 1000000).toFixed(0)}M`
    : stats.nodeCount >= 1000
    ? `${(stats.nodeCount / 1000).toFixed(0)}K`
    : stats.nodeCount.toString()

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: 'block' }}
      />
      
      {label && (
        <div className="absolute top-4 left-4 text-sm font-mono-tech text-text-secondary">
          {label}
        </div>
      )}
      
      {stats.nodeCount > 0 && (
        <div className="absolute bottom-4 right-4 flex gap-4 text-xs font-mono-tech">
          <div className="px-3 py-1.5 glass-panel rounded-lg">
            <span className="text-text-muted">节点: </span>
            <span className="text-neon-blue">{nodeCountDisplay}</span>
          </div>
          <div className="px-3 py-1.5 glass-panel rounded-lg">
            <span className="text-text-muted">FPS: </span>
            <span className={stats.fps >= 50 ? 'text-neon-green' : stats.fps >= 30 ? 'text-neon-cyan' : 'text-neon-pink'}>
              {stats.fps}
            </span>
          </div>
        </div>
      )}
      
      {entropy <= 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl mb-2 opacity-30">🔐</div>
            <p className="text-text-muted text-sm">输入密码开始可视化</p>
          </div>
        </div>
      )}
    </div>
  )
}
