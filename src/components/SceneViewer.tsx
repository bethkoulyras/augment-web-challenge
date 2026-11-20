import { useEffect, useMemo, useRef } from 'react'
import type { ReactNode } from 'react'
import MovementSlider from './MovementSlider'
import { Viewer } from '../viewer/Viewer'
import type { ViewerMode } from '../viewer/Viewer'
import type { BlastBoundaries } from '../data/blastBoundary'
import type { BlastHole } from '../data/blastHoles'
import type { ColourScale } from '../data/blockColours'
import type { Block, BlockModels, CategorySelection } from '../data/blockModels'
import type { SurveySurfaces } from '../data/surveySurfaces'

interface SceneViewerProps {
  models: BlockModels
  blastBoundaries: BlastBoundaries
  blastHoles: readonly BlastHole[]
  showBlastHoles: boolean
  showConnections: boolean
  getSurfaces: () => SurveySurfaces | null
  showSurfaces: boolean
  colourScale: ColourScale
  mode: ViewerMode
  onModeChange: (mode: ViewerMode) => void
  sidebarOpen: boolean
  onToggleSidebar: () => void
  filtered: boolean
  slicePosition: number | null
  selectedBlock: Block | null
  onSelectBlock: (block: Block | null) => void
  getMovementBlocks: () => readonly Block[] | null
  getVisibleBlocks: () => readonly Block[]
  visibleCount: number
  movementCount: number
  categorySelection: CategorySelection | null
  onSliceChange: (position: number) => void
  playbackOverlays: ReactNode
}

const breadcrumbButton = 'pointer-events-auto cursor-pointer rounded-xs text-left hover:text-white focus-visible:outline-2 focus-visible:outline-neutral-300'

export default function SceneViewer({
  models, blastBoundaries, blastHoles, showBlastHoles, showConnections, getSurfaces, showSurfaces,
  colourScale, mode, onModeChange, sidebarOpen, onToggleSidebar, filtered, slicePosition, getMovementBlocks,
  getVisibleBlocks, visibleCount, movementCount, categorySelection, selectedBlock, onSelectBlock,
  onSliceChange, playbackOverlays,
}: SceneViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const viewerRef = useRef<Viewer | null>(null)
  const surfaces = getSurfaces()
  const visibleBlocks = getVisibleBlocks()
  const movementBlocks = getMovementBlocks()
  const firstMovingBlock = useMemo(() => movementBlocks?.findIndex((block) => block.movementDistance > 0) ?? -1, [movementBlocks])

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

  useEffect(() => viewerRef.current?.setBlastHoles(blastHoles), [models, blastHoles])

  useEffect(() => viewerRef.current?.setBlastHolesVisible(showBlastHoles), [models, showBlastHoles])

  useEffect(() => {
    if (surfaces) viewerRef.current?.setSurveySurfaces(surfaces)
  }, [models, surfaces])

  useEffect(() => viewerRef.current?.setSurveySurfacesVisible(showSurfaces), [models, showSurfaces])

  useEffect(() => viewerRef.current?.setVisibleBlocks(visibleBlocks), [models, visibleBlocks])

  useEffect(() => viewerRef.current?.setMode(mode), [models, mode])

  useEffect(() => viewerRef.current?.setSidebarOpen(sidebarOpen), [models, sidebarOpen])

  useEffect(() => {
    if (mode !== 'model' && slicePosition !== null) viewerRef.current?.setSlicePosition(slicePosition)
  }, [models, mode, slicePosition])

  useEffect(() => {
    viewerRef.current?.setSection(movementBlocks ?? [])
  }, [models, mode, movementBlocks])

  useEffect(() => viewerRef.current?.setColourScale(colourScale, mode === 'slice' ? categorySelection : null), [models, colourScale, mode, categorySelection, visibleBlocks, movementBlocks])

  useEffect(() => viewerRef.current?.setBlockCounts(visibleCount, movementCount), [models, movementBlocks, visibleBlocks, visibleCount, movementCount])

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
        className="absolute inset-0 overflow-hidden"
        role="group"
        aria-label={mode === 'inspect' ? '3D section inspection' : '3D block model'}
      />
      <button
        type="button"
        aria-label={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
        title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
        aria-expanded={sidebarOpen}
        aria-controls="viewer-sidebar"
        aria-description={!sidebarOpen && filtered ? 'Colour filter active' : undefined}
        onClick={onToggleSidebar}
        className="relative z-20 col-start-1 row-start-1 grid h-10 w-[var(--viewer-toggle-width)] cursor-pointer place-items-center self-start justify-self-start rounded-md border border-neutral-700 bg-neutral-900/95 text-neutral-300 shadow-lg hover:bg-neutral-800 hover:text-white focus-visible:outline-2 focus-visible:outline-neutral-300 sm:absolute sm:top-[var(--viewer-inset)] sm:left-[var(--viewer-inset)] sm:aria-expanded:w-[var(--viewer-sidebar-width)] sm:aria-expanded:justify-items-start sm:aria-expanded:rounded-b-none sm:aria-expanded:border-transparent sm:aria-expanded:bg-transparent sm:aria-expanded:pl-[9px] sm:aria-expanded:shadow-none sm:aria-expanded:hover:bg-white/5"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" className="size-5">
          {sidebarOpen && <path d="M5 5h4v14H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" fill="currentColor" fillOpacity=".35" stroke="none" />}
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M9 5v14" />
        </svg>
      </button>
      <header className={'pointer-events-none relative z-20 col-start-1 row-start-1 ml-[calc(var(--viewer-toggle-width)_+_0.75rem)] min-w-0 self-start sm:absolute sm:top-[var(--viewer-inset)] sm:right-[var(--viewer-inset)] sm:ml-0 sm:transition-[left] sm:duration-200 sm:ease-out motion-reduce:transition-none ' + (sidebarOpen ? 'sm:left-[var(--viewer-sidebar-offset)]' : 'sm:left-[calc(var(--viewer-toggle-width)_+_2_*_var(--viewer-inset))]')}>
        <div className="flex h-[var(--viewer-header-height)] w-fit max-w-full flex-col justify-center gap-1 rounded-md border border-neutral-700 bg-neutral-900/95 px-2.5 py-2 shadow-lg sm:max-w-[calc(100%_-_4rem)] md:max-w-[calc(100%_-_7rem)] lg:px-5">
          <h1 className="text-xs leading-5 font-semibold text-neutral-100 min-[400px]:text-sm lg:text-base">OMP blast movement</h1>
          <div className="flex items-center gap-1">
            {mode === 'model' ? (
              <p className="text-[11px] text-neutral-400 md:text-xs" aria-live="polite">Model overview</p>
            ) : (
              <nav aria-label="Breadcrumb" aria-live="polite" className="text-[10px] whitespace-nowrap text-neutral-400 min-[360px]:text-[11px] md:text-xs">
                <button
                  type="button"
                  onClick={() => onModeChange('slice')}
                  aria-current={mode === 'slice' ? 'location' : undefined}
                  className={breadcrumbButton + ' aria-[current=location]:text-neutral-300'}
                >
                  Slice
                </button>
                {mode === 'inspect' && (
                  <>
                    {' '}<span aria-hidden="true">/</span>{' '}
                    <button type="button" onClick={() => onModeChange('inspect')} aria-current="location" className={breadcrumbButton + ' text-neutral-300'}>
                      Slice inspection
                    </button>
                  </>
                )}
              </nav>
            )}
          </div>
        </div>
      </header>
      <button
        type="button"
        aria-label="Reset view"
        title="Reset view"
        onClick={() => {
          if (selectedBlock) onSelectBlock(null)
          else viewerRef.current?.resetView()
        }}
        className="z-10 col-start-2 row-start-1 inline-flex min-h-10 min-w-10 cursor-pointer items-center justify-center gap-1.5 self-start justify-self-end rounded-md border border-neutral-700 bg-neutral-900/95 px-2.5 py-1.5 text-xs font-medium text-neutral-300 shadow-lg hover:bg-neutral-800 hover:text-white focus-visible:outline-2 focus-visible:outline-neutral-300 sm:absolute sm:top-[var(--viewer-inset)] sm:right-[var(--viewer-inset)]"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="size-5">
          <path d="M9 4H4v5m11-5h5v5M4 15v5h5m11-5v5h-5" />
          <circle cx="12" cy="12" r="2" />
        </svg>
        <span className="hidden min-[400px]:inline sm:hidden md:inline">Reset view</span>
      </button>
      <div className={'pointer-events-none z-10 col-span-full row-start-3 w-full sm:absolute sm:right-[var(--viewer-inset)] sm:bottom-[var(--viewer-inset)] sm:w-auto sm:transition-[left] sm:duration-200 sm:ease-out motion-reduce:transition-none ' + (sidebarOpen ? 'sm:left-[var(--viewer-sidebar-offset)]' : 'sm:left-[var(--viewer-inset)]')}>
        <MovementSlider
          mode={mode}
          getMovementBlocks={getMovementBlocks}
          movementCount={movementCount}
          disabled={firstMovingBlock < 0 || firstMovingBlock >= movementCount}
          onChange={(progress) => viewerRef.current?.setMovementProgress(progress)}
        >
          {playbackOverlays}
        </MovementSlider>
      </div>
    </>
  )
}
