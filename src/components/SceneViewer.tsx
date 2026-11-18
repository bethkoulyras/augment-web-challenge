import { useEffect, useRef } from 'react'
import MovementSlider from './MovementSlider'
import { Viewer } from '../viewer/Viewer'
import type { ViewerMode } from '../viewer/Viewer'
import type { ColourScale } from '../data/blockColours'
import type { Block, BlockModels } from '../data/blockModels'

interface SceneViewerProps {
  models: BlockModels
  colourScale: ColourScale
  mode: ViewerMode
  slicePosition: number | null
  selectedBlock: Block | null
  onSelectBlock: (block: Block | null) => void
  sectionBlocks: readonly Block[]
  onSliceChange: (position: number) => void
}

export default function SceneViewer({ models, colourScale, mode, slicePosition, sectionBlocks, selectedBlock, onSelectBlock, onSliceChange }: SceneViewerProps) {
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
    viewerRef.current?.setSection(mode === 'inspect' ? sectionBlocks : [])
  }, [models, mode, sectionBlocks])

  useEffect(() => {
    viewerRef.current?.setSelectedBlock(mode === 'inspect' ? selectedBlock : null)
  }, [models, mode, sectionBlocks, selectedBlock])

  return (
    <>
      <div
        ref={containerRef}
        className="relative h-full w-full overflow-hidden"
        role="group"
        aria-label={mode === 'inspect' ? '3D section inspection' : '3D pre-blast block model'}
      />
      {mode === 'inspect' && slicePosition !== null && (
        <MovementSlider key={slicePosition} disabled={!sectionBlocks.some((block) => block.movementDistance > 0)} onChange={(progress) => viewerRef.current?.setMovementProgress(progress)} />
      )}
      {mode === 'inspect' && (
        <button
          type="button"
          onClick={() => {
            if (selectedBlock) onSelectBlock(null)
            else viewerRef.current?.frameSection()
          }}
          className="absolute top-6 right-6 z-10 cursor-pointer rounded-lg border border-neutral-700 bg-neutral-900/95 px-4 py-2 text-sm text-neutral-300 shadow-lg hover:text-white focus-visible:outline-2 focus-visible:outline-neutral-300"
        >
          Reset view
        </button>
      )}
    </>
  )
}
