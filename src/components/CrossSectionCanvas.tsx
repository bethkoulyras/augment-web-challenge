import { useEffect, useRef } from 'react'
import { colourCss, colourForValue, colourValue } from '../data/blockColours'
import type { ColourScale } from '../data/blockColours'
import type { Block } from '../data/blockModels'

interface CrossSectionCanvasProps {
  blocks: readonly Block[]
  scale: ColourScale
}

export default function CrossSectionCanvas({ blocks, scale }: CrossSectionCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return

    const draw = (): void => {
      const width = canvas.clientWidth
      const height = canvas.clientHeight
      const pixelRatio = Math.min(window.devicePixelRatio, 2)
      canvas.width = Math.round(width * pixelRatio)
      canvas.height = Math.round(height * pixelRatio)
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)

      const padding = 8
      if (!blocks.length || width <= padding * 2 || height <= padding * 2) return

      let minX = Infinity
      let maxX = -Infinity
      let minZ = Infinity
      let maxZ = -Infinity
      for (const block of blocks) {
        minX = Math.min(minX, block.x - block.width / 2)
        maxX = Math.max(maxX, block.x + block.width / 2)
        minZ = Math.min(minZ, block.z - block.height / 2)
        maxZ = Math.max(maxZ, block.z + block.height / 2)
      }

      const pixelsPerUnit = Math.min(
        (width - padding * 2) / Math.max(maxX - minX, 1),
        (height - padding * 2) / Math.max(maxZ - minZ, 1),
      )
      const centreX = (minX + maxX) / 2
      const canvasBottom = height - padding
      context.strokeStyle = 'rgba(0, 0, 0, 0.3)'
      context.lineWidth = 0.5

      for (const block of blocks) {
        const screenX = width / 2 + (block.x - block.width / 2 - centreX) * pixelsPerUnit
        const screenY = canvasBottom - (block.z + block.height / 2 - minZ) * pixelsPerUnit
        const blockWidth = block.width * pixelsPerUnit
        const blockHeight = block.height * pixelsPerUnit
        context.fillStyle = colourCss(colourForValue(scale, colourValue(block, scale.field)))
        context.fillRect(screenX, screenY, blockWidth, blockHeight)
        if (blockWidth > 1.5 && blockHeight > 1.5) {
          context.strokeRect(screenX, screenY, blockWidth, blockHeight)
        }
      }
    }

    draw()
    const observer = new ResizeObserver(draw)
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [blocks, scale])

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={'Cross-section coloured by ' + scale.field}
      className="h-44 w-full"
    />
  )
}
