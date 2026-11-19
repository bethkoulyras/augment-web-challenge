import { useEffect, useRef, useState } from 'react'
import MovementSlider from './MovementSlider'
import { Viewer } from '../viewer/Viewer'
import type { ViewerMode } from '../viewer/Viewer'
import type { BlastBoundaries } from '../data/blastBoundary'
import type { ColourScale } from '../data/blockColours'
import type { Block, BlockModels, CategorySelection } from '../data/blockModels'

interface SceneViewerProps {
  models: BlockModels
  blastBoundaries: BlastBoundaries
  colourScale: ColourScale
  mode: ViewerMode
  slicePosition: number | null
  selectedBlock: Block | null
  onSelectBlock: (block: Block | null) => void
  sectionBlocks: readonly Block[]
  categoryBlocks: readonly Block[] | null
  categorySelection: CategorySelection | null
  onSliceChange: (position: number) => void
}

export default function SceneViewer({ models, blastBoundaries, colourScale, mode, slicePosition, sectionBlocks, categoryBlocks, categorySelection, selectedBlock, onSelectBlock, onSliceChange }: SceneViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const viewerRef = useRef<Viewer | null>(null)
  const [showConnections, setShowConnections] = useState(false)
  const movementBlocks = mode === 'inspect' ? sectionBlocks : mode === 'model' ? categoryBlocks : null

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

  useEffect(() => viewerRef.current?.setBlastBoundaries(blastBoundaries), [models, blastBoundaries])

  useEffect(() => viewerRef.current?.setColourScale(colourScale, mode === 'slice' ? categorySelection : null), [models, colourScale, mode, categorySelection])

  useEffect(() => {
    const sidebarWidth = 320
    const sidebarSpacing = 24 * 2
    viewerRef.current?.setMode(mode, sidebarWidth + sidebarSpacing)
  }, [models, mode])

  useEffect(() => {
    if (mode === 'inspect' && slicePosition !== null) viewerRef.current?.setSlicePosition(slicePosition)
  }, [models, mode, slicePosition])

  useEffect(() => {
    viewerRef.current?.setSection(movementBlocks ?? [])
  }, [models, mode, movementBlocks])

  useEffect(() => {
    viewerRef.current?.setSelectedBlock(mode === 'inspect' ? selectedBlock : null)
  }, [models, mode, movementBlocks, selectedBlock])

  useEffect(() => {
    if (mode === 'inspect') viewerRef.current?.frameSection()
  }, [models, mode, slicePosition])

  useEffect(() => {
    viewerRef.current?.setConnectionsVisible(showConnections)
  }, [models, showConnections])

  return (
    <>
      <div
        ref={containerRef}
        className="relative h-full w-full overflow-hidden"
        role="group"
        aria-label={mode === 'inspect' ? '3D section inspection' : '3D block model'}
      />
      {movementBlocks !== null && (
        <MovementSlider
          sectionBlocks={movementBlocks}
          disabled={!movementBlocks.some((block) => block.movementDistance > 0)}
          onChange={(progress) => viewerRef.current?.setMovementProgress(progress)}
          showConnections={showConnections}
          onConnectionsChange={mode === 'inspect' && !selectedBlock ? setShowConnections : undefined}
        />
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
