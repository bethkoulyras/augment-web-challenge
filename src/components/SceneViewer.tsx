import { useEffect, useRef } from 'react'
import { Viewer } from '../viewer/Viewer'
import type { ViewerMode } from '../viewer/Viewer'
import type { ColourScale } from '../data/blockColours'
import type { Block, BlockModels, ModelView } from '../data/blockModels'

interface SceneViewerProps {
  models: BlockModels
  view: ModelView
  colourScale: ColourScale
  mode: ViewerMode
  slicePosition: number | null
  selectedBlock: Block | null
  onSelectBlock: (block: Block | null) => void
  sectionBlocks: readonly Block[]
  onSliceChange: (position: number) => void
}

export default function SceneViewer({ models, view, colourScale, mode, slicePosition, sectionBlocks, selectedBlock, onSelectBlock, onSliceChange }: SceneViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const viewerRef = useRef<Viewer | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const viewer = new Viewer(container, models, onSliceChange, onSelectBlock)
    viewerRef.current = viewer
    return () => {
      viewerRef.current = null
      viewer.dispose()
    }
  }, [models, onSliceChange, onSelectBlock])

  useEffect(() => viewerRef.current?.setView(view), [models, view])

  useEffect(() => viewerRef.current?.setColourScale(colourScale), [models, colourScale])

  useEffect(() => {
    const sidebarWidth = 320
    const sidebarSpacing = 24 * 2
    viewerRef.current?.setMode(mode, sidebarWidth + sidebarSpacing)
  }, [models, mode])

  useEffect(() => {
    if (mode === 'inspect' && slicePosition !== null) viewerRef.current?.setSlicePosition(slicePosition)
  }, [models, mode, slicePosition])

  useEffect(() => {
    viewerRef.current?.setHoverBlocks(mode === 'inspect' ? sectionBlocks : [])
  }, [models, mode, sectionBlocks])

  useEffect(() => {
    viewerRef.current?.setSelectedBlock(mode === 'inspect' ? selectedBlock : null)
  }, [models, mode, sectionBlocks, selectedBlock])

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden"
      role="group"
      aria-label={mode === 'inspect' ? '3D section inspection' : view === 'pre' ? '3D pre-blast block model' : '3D predicted post-blast block model'}
    />
  )
}
