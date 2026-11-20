import { useMemo, useState } from 'react'
import ColourPalette from './components/ColourPalette'
import MinimumFilterControls from './components/MinimumFilterControls'
import ModelLayerControls from './components/ModelLayerControls'
import MovementSlider from './components/MovementSlider'
import SectionSlider from './components/SectionSlider'
import SliceSidebar from './components/SliceSidebar'
import ViewerHeader from './components/ViewerHeader'
import { countMinimumMatches } from './data/blockColours'
import type { Block } from './data/blockModels'
import { useBlastData } from './data/useBlastData'
import { useBlockFilters } from './data/useBlockFilters'
import { useViewer } from './viewer/useViewer'
import type { ViewerMode } from './viewer/Viewer'

const emptyBlocks: readonly Block[] = []

export default function App() {
  const { blast, blastHoles, blastHolesLoading, surfaces, showSurfaces, surfaceLoadFailed, toggleSurfaces, retryLoading } = useBlastData()
  const [showBlastHoles, setShowBlastHoles] = useState(false)
  const [showConnections, setShowConnections] = useState(false)
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null)
  const [mode, setMode] = useState<ViewerMode>('model')
  const [slicePosition, setSlicePosition] = useState<number | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sidebarFocusRequest, setSidebarFocusRequest] = useState(0)
  const data = blast.status === 'ready' ? blast.data : null
  const allBlocks = data?.blocks ?? emptyBlocks
  const {
    colourField, colourScale, minimum, filtered, orderedBlocks, categorySelection, visibleCount,
    modelBlocks, modelCount, changeColourField, changeCategoryCode, changeMinimum,
  } = useBlockFilters(allBlocks, () => setSelectedBlock(null))

  const inSection = mode !== 'model'
  const sectionBlocks = useMemo(() => {
    if (!inSection || slicePosition === null) return emptyBlocks
    return orderedBlocks.filter((block) => Math.abs(block.y - slicePosition) <= block.depth / 2 + 0.001)
  }, [inSection, orderedBlocks, slicePosition])

  const sectionCohort = useMemo(() => categorySelection
    ? sectionBlocks.filter((block) => block.attributes[categorySelection.field] === categorySelection.value)
    : sectionBlocks, [sectionBlocks, categorySelection])

  const trackedBlocks = useMemo(() => minimum === null
    ? sectionCohort
    : sectionCohort.slice(0, countMinimumMatches(sectionCohort, colourField, minimum)), [sectionCohort, colourField, minimum])

  const movementBlocks = mode === 'inspect' ? sectionCohort : mode === 'model' ? modelBlocks : null
  const movementCount = mode === 'inspect' ? trackedBlocks.length : movementBlocks ? modelCount : 0
  const firstMovingBlock = useMemo(() => movementBlocks?.findIndex((block) => block.movementDistance > 0) ?? -1, [movementBlocks])
  // A token lets playback detect new blocks without receiving the full array.
  const playbackSource = useMemo(() => Symbol(), [movementBlocks])

  const { containerRef, viewerFailed, resetView, setProgress } = useViewer({
    data,
    blastHoles,
    surfaces,
    showBlastHoles,
    showConnections,
    showSurfaces,
    colourScale,
    mode,
    sidebarOpen,
    slicePosition,
    movementBlocks,
    visibleBlocks: orderedBlocks,
    visibleCount,
    movementCount,
    categorySelection,
    selectedBlock,
    onSelectBlock: setSelectedBlock,
    onSliceChange: setSlicePosition,
  })

  const goToSectionMode = (nextMode: ViewerMode): void => {
    setSidebarFocusRequest((request) => request + 1)
    setSidebarOpen(true)
    if (mode !== nextMode) {
      setMode(nextMode)
      setSelectedBlock(null)
    }
  }

  const clearBlockSelection = (): void => {
    setSidebarFocusRequest((request) => request + 1)
    setSelectedBlock(null)
  }

  return (
    <main className="viewer-layout relative grid h-full w-full grid-cols-[minmax(0,1fr)_auto] grid-rows-[auto_minmax(0,1fr)_auto] gap-3 p-[var(--viewer-inset)] sm:block sm:p-0">
      {data && colourScale && !viewerFailed && (
        <>
          <div
            ref={containerRef}
            className="absolute inset-0 overflow-hidden"
            role="group"
            aria-label={mode === 'inspect' ? '3D section inspection' : '3D block model'}
          />
          <ViewerHeader
            mode={mode}
            sidebarOpen={sidebarOpen}
            filtered={filtered}
            onModeChange={goToSectionMode}
            onToggleSidebar={() => setSidebarOpen((open) => !open)}
            onReset={() => {
              if (selectedBlock) setSelectedBlock(null)
              else resetView()
            }}
          />
          <div className={'pointer-events-none z-10 col-span-full row-start-3 w-full sm:absolute sm:right-[var(--viewer-inset)] sm:bottom-[var(--viewer-inset)] sm:w-auto sm:transition-[left] sm:duration-200 sm:ease-out motion-reduce:transition-none ' + (sidebarOpen ? 'sm:left-[var(--viewer-sidebar-offset)]' : 'sm:left-[var(--viewer-inset)]')}>
            <MovementSlider
              mode={mode}
              playbackSource={playbackSource}
              movementCount={movementCount}
              disabled={firstMovingBlock < 0 || firstMovingBlock >= movementCount}
              onChange={setProgress}
            >
              <ModelLayerControls
                showSurfaces={showSurfaces}
                surfacesLoading={showSurfaces && surfaces === null}
                surfaceLoadFailed={surfaceLoadFailed}
                onToggleSurfaces={toggleSurfaces}
                showBlastHoles={showBlastHoles}
                blastHolesLoading={blastHolesLoading}
                hasBlastHoles={blastHoles.length > 0}
                onToggleBlastHoles={() => setShowBlastHoles((show) => !show)}
              />
            </MovementSlider>
          </div>
          <SliceSidebar
            scale={colourScale}
            filtered={filtered}
            mode={mode}
            open={sidebarOpen}
            focusRequest={sidebarFocusRequest}
            blocks={trackedBlocks}
            totalCount={sectionBlocks.length}
            northingSlider={<SectionSlider blocks={allBlocks} position={slicePosition} onChange={setSlicePosition} />}
            selectedBlock={selectedBlock}
            showConnections={showConnections}
            onModeChange={goToSectionMode}
            onClearBlock={clearBlockSelection}
            onToggleConnections={() => setShowConnections((show) => !show)}
          >
            <ColourPalette scale={colourScale} onChange={changeColourField} filtered={filtered} categoryCode={categorySelection?.value ?? null} onCategoryCodeChange={changeCategoryCode}>
              {colourScale.kind !== 'category' && <MinimumFilterControls scale={colourScale} minimum={minimum} onChange={changeMinimum} />}
            </ColourPalette>
          </SliceSidebar>
        </>
      )}
      {(blast.status !== 'ready' || viewerFailed) && (
        <div className="absolute inset-0 grid place-items-center p-[var(--viewer-inset)]">
          <div className="w-full max-w-sm rounded-md border border-neutral-700 bg-neutral-900/95 p-6 shadow-lg">
            <h1 className="text-lg font-semibold tracking-tight text-neutral-100">OMP blast movement</h1>
            {viewerFailed ? (
              <div role="alert" className="mt-2 space-y-1 text-sm">
                <p className="font-medium text-red-300">Couldn’t start the 3D viewer</p>
                <p className="text-neutral-400">Enable WebGL 2 in your browser and reload the page.</p>
              </div>
            ) : blast.status === 'failed' ? (
              <>
                <div role="alert" className="mt-2 space-y-1 text-sm">
                  <p className="font-medium text-red-300">
                    Couldn’t load the {blast.stage}
                  </p>
                  <p className="break-words text-neutral-400">{blast.message}</p>
                </div>
                <button type="button" onClick={retryLoading} className="outlined-button mt-5 text-xs text-neutral-100">
                  Try again
                </button>
              </>
            ) : blast.status === 'loading' && (
              <>
                <p role="status" className="mt-1 text-sm text-neutral-400">
                  Loading {blast.stage}…
                </p>
                <div aria-hidden="true" className="mt-5 h-1 overflow-hidden rounded-sm bg-neutral-800">
                  <span className="block h-full w-1/3 rounded-sm bg-[#8aa0b2] motion-safe:animate-[viewer-loading_1.2s_ease-in-out_infinite_alternate] motion-reduce:w-full motion-reduce:bg-neutral-600" />
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  )
}
