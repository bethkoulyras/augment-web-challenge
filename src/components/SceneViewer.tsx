import { useEffect, useMemo, useRef, useState } from 'react'
import MovementSlider from './MovementSlider'
import SectionSlider from './SectionSlider'
import { Viewer } from '../viewer/Viewer'
import type { ViewerMode } from '../viewer/Viewer'
import type { BlastBoundaries } from '../data/blastBoundary'
import type { BlastHole } from '../data/blastHoles'
import type { ColourScale } from '../data/blockColours'
import type { Block, BlockModels, CategorySelection } from '../data/blockModels'

interface SceneViewerProps {
  models: BlockModels
  blastBoundaries: BlastBoundaries
  blastHoles: readonly BlastHole[]
  colourScale: ColourScale
  mode: ViewerMode
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
  onToggleSlicer: () => void
  onInspectSection?: () => void
}

const toolButton = 'inline-flex min-h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-neutral-700 bg-neutral-900/95 px-2.5 py-1.5 text-xs font-medium text-neutral-300 hover:bg-neutral-800 hover:text-white focus-visible:outline-2 focus-visible:outline-neutral-300 disabled:cursor-default disabled:opacity-40'
const overlayButton = toolButton + ' aria-pressed:border-neutral-400 aria-pressed:bg-neutral-700 aria-pressed:text-white'

export default function SceneViewer({ models, blastBoundaries, blastHoles, colourScale, mode, sidebarOpen, onToggleSidebar, filtered, slicePosition, getMovementBlocks, getVisibleBlocks, visibleCount, movementCount, categorySelection, selectedBlock, onSelectBlock, onSliceChange, onToggleSlicer, onInspectSection }: SceneViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const viewerRef = useRef<Viewer | null>(null)
  const slicerButtonRef = useRef<HTMLButtonElement>(null)
  const [showConnections, setShowConnections] = useState(false)
  const [showBlastHoles, setShowBlastHoles] = useState(false)
  const sliceInactive = mode === 'model'
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

  useEffect(() => viewerRef.current?.setVisibleBlocks(visibleBlocks), [models, visibleBlocks])

  useEffect(() => {
    const sidebarWidth = 320
    const sidebarSpacing = 24 * 2
    viewerRef.current?.setMode(mode, sidebarWidth + sidebarSpacing)
  }, [models, mode])

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
        className="relative z-20 col-start-1 row-start-1 grid size-10 cursor-pointer place-items-center justify-self-start rounded-xl border border-white/10 bg-neutral-900/95 text-neutral-300 hover:bg-neutral-800 hover:text-white focus-visible:outline-2 focus-visible:outline-neutral-300 sm:absolute sm:top-6 sm:left-6 sm:aria-expanded:rounded-tr-none sm:aria-expanded:rounded-bl-none sm:aria-expanded:border-transparent sm:aria-expanded:bg-transparent sm:aria-expanded:hover:bg-white/5"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" className="size-5">
          {sidebarOpen && <path d="M5 5h4v14H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" fill="currentColor" fillOpacity=".35" stroke="none" />}
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M9 5v14" />
        </svg>
        {!sidebarOpen && filtered && <span aria-hidden="true" className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-amber-400" />}
      </button>
      <button
        type="button"
        onClick={() => {
          if (selectedBlock) onSelectBlock(null)
          else viewerRef.current?.resetView()
        }}
        className={toolButton + ' z-10 col-start-2 row-start-1 justify-self-end sm:absolute sm:top-6 sm:right-6'}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="size-4">
          <path d="M9 4H4v5m11-5h5v5M4 15v5h5m11-5v5h-5" />
          <circle cx="12" cy="12" r="2" />
        </svg>
        Reset view
      </button>
      <div className={'pointer-events-none z-10 col-span-full row-start-3 flex w-full flex-col gap-2 sm:absolute sm:right-6 sm:bottom-6 sm:w-auto sm:transition-[left] sm:duration-200 sm:ease-out motion-reduce:transition-none lg:flex-row lg:gap-3 ' + (sidebarOpen ? 'sm:left-92' : 'sm:left-6')}>
        <section aria-label="Slicer controls" className="pointer-events-auto relative min-w-0 rounded-xl border border-neutral-700 bg-neutral-900/95 px-3 py-2 text-xs text-neutral-300 shadow-lg lg:flex-1">
          <div className="flex min-h-8 items-center justify-between gap-1">
            <button
              ref={slicerButtonRef}
              type="button"
              aria-controls={mode === 'inspect' ? undefined : 'section-position-controls'}
              aria-expanded={mode === 'inspect' ? undefined : !sliceInactive}
              onClick={onToggleSlicer}
              className={toolButton + ' px-2!' + (sliceInactive ? ' absolute inset-0 m-auto h-9 w-fit' : '')}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="size-[18px]">
                {mode === 'inspect' ? (
                  <path d="M19 12H5m6-6-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                ) : (
                  <path d="M4.5 4.5h9L8 19.5H4.5A1.5 1.5 0 0 1 3 18V6a1.5 1.5 0 0 1 1.5-1.5Zm12.5 0h2.5A1.5 1.5 0 0 1 21 6v12a1.5 1.5 0 0 1-1.5 1.5h-8Z" />
                )}
              </svg>
              {sliceInactive ? 'Slice model' : mode === 'slice' ? 'Exit slice' : 'Back to slice'}
            </button>
            {mode === 'slice' && (
              <button
                type="button"
                disabled={!onInspectSection}
                onClick={() => {
                  slicerButtonRef.current?.focus()
                  onInspectSection?.()
                }}
                className={toolButton + ' ml-auto px-2!'}
              >
                Inspect section
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3.5">
                  <path d="M5 12h14m-6-6 6 6-6 6" />
                </svg>
              </button>
            )}
          </div>
          <div id="section-position-controls" className={sliceInactive ? 'invisible' : undefined}>
            <SectionSlider
              blocks={models.pre}
              position={slicePosition}
              disabled={sliceInactive || selectedBlock !== null}
              onChange={onSliceChange}
            />
          </div>
        </section>
        <MovementSlider
          mode={mode}
          getMovementBlocks={getMovementBlocks}
          movementCount={movementCount}
          disabled={firstMovingBlock < 0 || firstMovingBlock >= movementCount}
          onChange={(progress) => viewerRef.current?.setMovementProgress(progress)}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-2">
            <span className="flex items-center gap-1.5 text-neutral-400">
              <span aria-hidden="true" className="w-3 border-t border-neutral-500" />
              Blast boundary
            </span>
            <div role="group" aria-label="Overlays" className="ml-auto flex flex-wrap justify-end gap-1.5">
              <button
                type="button"
                aria-pressed={showBlastHoles}
                disabled={!blastHoles.length}
                title={blastHoles.length ? undefined : 'Blast hole data unavailable'}
                onClick={() => setShowBlastHoles((show) => !show)}
                className={overlayButton}
              >
                <span aria-hidden="true" className="size-1.5 rounded-full bg-amber-400" />
                Blast holes
              </button>
              {mode === 'inspect' && !selectedBlock && (
                <button
                  type="button"
                  aria-label="Movement connections"
                  aria-pressed={showConnections}
                  onClick={() => setShowConnections((show) => !show)}
                  className={overlayButton}
                >
                  <span aria-hidden="true" className="w-3 border-t border-dashed border-neutral-400" />
                  Connections
                </button>
              )}
            </div>
          </div>
        </MovementSlider>
      </div>
    </>
  )
}
