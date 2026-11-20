import { useCallback, useEffect, useRef } from 'react'
import { Viewer } from './Viewer'
import type { ViewerMode } from './Viewer'
import type { BlastBoundaries } from '../data/blastBoundary'
import type { BlastHole } from '../data/blastHoles'
import type { ColourScale } from '../data/blockColours'
import type { Block, BlockModels, CategorySelection } from '../data/blockModels'
import type { SurveySurfaces } from '../data/surveySurfaces'

interface ViewerOptions {
  models: BlockModels | null
  blastBoundaries: BlastBoundaries
  blastHoles: readonly BlastHole[]
  showBlastHoles: boolean
  showConnections: boolean
  surfaces: SurveySurfaces | null
  showSurfaces: boolean
  colourScale: ColourScale | undefined
  mode: ViewerMode
  sidebarOpen: boolean
  slicePosition: number | null
  selectedBlock: Block | null
  onSelectBlock: (block: Block | null) => void
  movementBlocks: readonly Block[] | null
  visibleBlocks: readonly Block[]
  visibleCount: number
  movementCount: number
  categorySelection: CategorySelection | null
  onSliceChange: (position: number) => void
}

export function useViewer({
  models, blastBoundaries, blastHoles, showBlastHoles, showConnections, surfaces, showSurfaces,
  colourScale, mode, sidebarOpen, slicePosition, movementBlocks, visibleBlocks, visibleCount,
  movementCount, categorySelection, selectedBlock, onSelectBlock, onSliceChange,
}: ViewerOptions) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<Viewer | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container || !models) return

    const viewer = new Viewer(container, models, onSliceChange, onSelectBlock)
    viewerRef.current = viewer
    return () => {
      viewerRef.current = null
      viewer.dispose()
    }
  }, [models, onSliceChange, onSelectBlock])

  useEffect(() => {
    viewerRef.current?.setBlastBoundaries(blastBoundaries)
    viewerRef.current?.setBlastHoles(blastHoles)
  }, [models, blastBoundaries, blastHoles])

  useEffect(() => {
    if (surfaces) viewerRef.current?.setSurveySurfaces(surfaces)
  }, [models, surfaces])

  useEffect(() => {
    viewerRef.current?.setMovementBlocks(mode, movementBlocks ?? [])
  }, [models, mode, movementBlocks])

  useEffect(() => {
    viewerRef.current?.setVisibleBlocks(visibleBlocks)
    if (colourScale) viewerRef.current?.setColourScale(colourScale, mode === 'slice' ? categorySelection : null)
  }, [models, colourScale, mode, categorySelection, visibleBlocks, movementBlocks])

  // Dragging a grade cutoff can change the counts without rebuilding the meshes.
  useEffect(() => viewerRef.current?.setBlockCounts(visibleCount, movementCount), [models, movementBlocks, visibleBlocks, visibleCount, movementCount])

  useEffect(() => {
    viewerRef.current?.setSelectedBlock(mode === 'inspect' ? selectedBlock : null)
  }, [models, mode, movementBlocks, selectedBlock])

  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer) return
    viewer.setSidebarOpen(sidebarOpen)
    viewer.setBlastHolesVisible(showBlastHoles)
    viewer.setSurveySurfacesVisible(showSurfaces)
    viewer.setConnectionsVisible(showConnections)
  }, [models, sidebarOpen, showBlastHoles, showSurfaces, showConnections])

  useEffect(() => {
    if (mode !== 'model' && slicePosition !== null) viewerRef.current?.setSlicePosition(slicePosition)
    if (mode === 'inspect') viewerRef.current?.frameSection()
  }, [models, mode, slicePosition])

  const resetView = useCallback(() => viewerRef.current?.resetView(), [])
  const setProgress = useCallback((progress: number) => viewerRef.current?.setMovementProgress(progress), [])

  return { containerRef, resetView, setProgress }
}
