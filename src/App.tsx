import { useCallback, useEffect, useMemo, useState } from 'react'
import ColourPalette from './components/ColourPalette'
import MinimumFilterControls from './components/MinimumFilterControls'
import MovementSlider from './components/MovementSlider'
import SliceSidebar from './components/SliceSidebar'
import ViewerHeader from './components/ViewerHeader'
import { colourValue, countMinimumMatches, createColourScales } from './data/blockColours'
import { csvFiles } from './data/csvFiles'
import { categoryFields, createBlockModels } from './data/blockModels'
import { createBlastBoundarySegments } from './data/blastBoundary'
import type { BlastBoundaries } from './data/blastBoundary'
import { createBlastHoles } from './data/blastHoles'
import type { BlastHole } from './data/blastHoles'
import type { Block, BlockModels, CategorySelection, ColourField } from './data/blockModels'
import { loadSurveySurfaces } from './data/surveySurfaces'
import type { SurveySurfaces } from './data/surveySurfaces'
import { useViewer } from './viewer/useViewer'
import type { ViewerMode } from './viewer/Viewer'
import { loadCsv } from './utils/loadCsv'

const emptyBlocks: readonly Block[] = []
const layerDot = 'size-2 shrink-0 rounded-full opacity-40 group-aria-pressed:opacity-100'

export default function App() {
  const [models, setModels] = useState<BlockModels | null>(null)
  const [blastBoundaries, setBlastBoundaries] = useState<BlastBoundaries>({ pre: [], post: [] })
  const [blastHoles, setBlastHoles] = useState<BlastHole[]>([])
  const [showBlastHoles, setShowBlastHoles] = useState(false)
  const [showConnections, setShowConnections] = useState(false)
  const [showSurfaces, setShowSurfaces] = useState(true)
  const [surfaces, setSurfaces] = useState<SurveySurfaces | null>(null)
  const [surfaceLoadFailed, setSurfaceLoadFailed] = useState(false)
  const [loadedCount, setLoadedCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null)
  const [categorySelection, setCategorySelection] = useState<CategorySelection | null>(null)
  const [minimumFilter, setMinimumFilter] = useState<{ minimum: number; blocks: readonly Block[] } | null>(null)
  const [mode, setMode] = useState<ViewerMode>('model')
  const [slicePosition, setSlicePosition] = useState<number | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sidebarFocusRequest, setSidebarFocusRequest] = useState(0)
  const [colourField, setColourField] = useState<ColourField>('grade_01')
  const isLoading = loadedCount < csvFiles.length
  const surfacesLoading = showSurfaces && surfaces === null

  const colourScales = useMemo(() => createColourScales(models?.pre ?? emptyBlocks), [models])
  const colourScale = colourScales.get(colourField)
  const minimum = minimumFilter?.minimum ?? null
  const filtered = categorySelection !== null || minimum !== null
  const orderedBlocks = minimumFilter?.blocks ?? models?.pre ?? emptyBlocks

  const visibleCount = countMinimumMatches(orderedBlocks, colourField, minimum)

  const categoryBlocks = useMemo(() => categorySelection
    ? orderedBlocks.filter((block) => block.attributes[categorySelection.field] === categorySelection.value)
    : null, [orderedBlocks, categorySelection])

  const modelBlocks = categoryBlocks ?? orderedBlocks
  const modelCount = categoryBlocks?.length ?? visibleCount

  const sectionBlocks = useMemo(() => {
    if (mode === 'model' || slicePosition === null) return emptyBlocks
    return orderedBlocks.filter((block) => Math.abs(block.y - slicePosition) <= block.depth / 2 + 0.001)
  }, [mode, orderedBlocks, slicePosition])

  const sectionCohort = useMemo(() => categorySelection
    ? sectionBlocks.filter((block) => block.attributes[categorySelection.field] === categorySelection.value)
    : sectionBlocks, [sectionBlocks, categorySelection])

  const trackedBlocks = useMemo(() => minimum === null
    ? sectionCohort
    : sectionCohort.slice(0, countMinimumMatches(sectionCohort, colourField, minimum)), [sectionCohort, colourField, minimum])

  const movementBlocks = mode === 'inspect' ? sectionCohort : mode === 'model' ? modelBlocks : null
  const movementCount = mode === 'inspect' ? trackedBlocks.length : movementBlocks ? modelCount : 0
  const firstMovingBlock = useMemo(() => movementBlocks?.findIndex((block) => block.movementDistance > 0) ?? -1, [movementBlocks])
  // React's development profiler deeply compares changed array props.
  const getMovementBlocks = useCallback(() => movementBlocks, [movementBlocks])

  const readyModels = !isLoading && colourScale ? models : null
  const { containerRef, resetView, setProgress } = useViewer({
    models: readyModels,
    blastBoundaries,
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

  useEffect(() => {
    const controller = new AbortController()

    const loadFiles = async (): Promise<void> => {
      for (const file of csvFiles) {
        const rows = await loadCsv('/' + file, controller.signal)
        if (controller.signal.aborted) return
        if (file === '1_mbm.csv') {
          const loadedModels = createBlockModels(rows)
          if (!loadedModels.pre.length) throw new Error('The block model file contains no usable blocks.')
          setModels(loadedModels)
        }
        if (file === '1_pre_string.csv') setBlastBoundaries((current) => ({ ...current, pre: createBlastBoundarySegments(rows) }))
        if (file === '1_pst_string.csv') setBlastBoundaries((current) => ({ ...current, post: createBlastBoundarySegments(rows) }))
        setLoadedCount((count) => count + 1)
      }
    }

    loadFiles().catch((error: unknown) => {
      if (!controller.signal.aborted) {
        setError(error instanceof Error ? error.message : 'Could not load the CSV.')
      }
    })

    loadCsv('/1_blastholes.csv', controller.signal).then((rows) => {
      if (!controller.signal.aborted) setBlastHoles(createBlastHoles(rows))
    }).catch(() => {
      if (!controller.signal.aborted) setBlastHoles([])
    })

    return () => controller.abort()
  }, [loadAttempt])

  useEffect(() => {
    if (error || !showSurfaces || surfaces) return
    const controller = new AbortController()
    const { signal } = controller

    loadSurveySurfaces(signal).then((data) => {
      if (!signal.aborted) setSurfaces(data)
    }).catch(() => {
      if (signal.aborted) return
      setShowSurfaces(false)
      setSurfaceLoadFailed(true)
    })

    return () => controller.abort()
  }, [error, showSurfaces, surfaces])

  const toggleSurfaces = (): void => {
    setSurfaceLoadFailed(false)
    setShowSurfaces((show) => !show)
  }

  const retryLoading = (): void => {
    setModels(null)
    setBlastBoundaries({ pre: [], post: [] })
    setLoadedCount(0)
    setError(null)
    setLoadAttempt((attempt) => attempt + 1)
  }

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

  const changeColourField = (field: ColourField): void => {
    if (field === colourField) return
    setColourField(field)
    setMinimumFilter(null)
    setCategorySelection(null)
    if (minimumFilter || categorySelection) setSelectedBlock(null)
  }

  const changeCategoryCode = (value: number | null): void => {
    const field = categoryFields.find((category) => category === colourField)
    if (!field || (categorySelection?.value ?? null) === value) return
    setCategorySelection(value === null ? null : { field, value })
    setSelectedBlock(null)
  }

  const changeMinimum = (minimum: number | null): void => {
    if (minimum !== null && models) {
      const sortableValue = (block: Block): number => {
        const value = colourValue(block, colourField)
        return value !== null && Number.isFinite(value) ? value : -Infinity
      }
      // The renderer hides the suffix by updating its instance count.
      const blocks = minimumFilter?.blocks ?? [...models.pre].sort((a, b) => sortableValue(b) - sortableValue(a))
      setMinimumFilter({ minimum, blocks })
    } else {
      setMinimumFilter(null)
    }
    setSelectedBlock(null)
  }

  return (
    <main className="viewer-layout relative grid h-full w-full grid-cols-[minmax(0,1fr)_auto] grid-rows-[auto_minmax(0,1fr)_auto] gap-3 p-[var(--viewer-inset)] sm:block sm:p-0">
      {readyModels && colourScale && (
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
              getMovementBlocks={getMovementBlocks}
              movementCount={movementCount}
              disabled={firstMovingBlock < 0 || firstMovingBlock >= movementCount}
              onChange={setProgress}
            >
              <div role="group" aria-label="Model layers" className="flex flex-wrap items-center justify-end gap-4">
                <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-neutral-400">
                  <span aria-hidden="true" className="w-3 border-t border-neutral-500" />
                  Blast boundary
                </span>
                <div className="flex flex-wrap justify-end gap-3">
                  <button
                    type="button"
                    aria-pressed={showSurfaces}
                    aria-busy={surfacesLoading || undefined}
                    title={surfacesLoading ? 'Loading survey surfaces…' : undefined}
                    onClick={toggleSurfaces}
                    className="group outlined-button"
                  >
                    <span aria-hidden="true" className={surfacesLoading ? 'size-3 shrink-0 rounded-full border border-neutral-500 border-t-neutral-100 motion-safe:animate-spin' : layerDot + ' bg-[#8aa0b2]'} />
                    Surfaces
                  </button>
                  <button
                    type="button"
                    aria-pressed={showBlastHoles}
                    disabled={!blastHoles.length}
                    title={blastHoles.length ? undefined : 'Blast hole data unavailable'}
                    onClick={() => setShowBlastHoles((show) => !show)}
                    className="group outlined-button"
                  >
                    <span aria-hidden="true" className={layerDot + ' bg-amber-400'} />
                    Blast holes
                  </button>
                </div>
              </div>
              {surfaceLoadFailed && <p role="status" className="text-amber-300">Couldn’t load the survey surfaces. Select Surfaces to retry.</p>}
            </MovementSlider>
          </div>
          <SliceSidebar
            models={readyModels}
            scale={colourScale}
            filtered={filtered}
            mode={mode}
            open={sidebarOpen}
            focusRequest={sidebarFocusRequest}
            blocks={trackedBlocks}
            totalCount={sectionBlocks.length}
            slicePosition={slicePosition}
            selectedBlock={selectedBlock}
            showConnections={showConnections}
            onModeChange={goToSectionMode}
            onSliceChange={setSlicePosition}
            onClearBlock={clearBlockSelection}
            onToggleConnections={() => setShowConnections((show) => !show)}
          >
            <ColourPalette scale={colourScale} onChange={changeColourField} filtered={filtered} categoryCode={categorySelection?.value ?? null} onCategoryCodeChange={changeCategoryCode}>
              {colourScale.kind !== 'category' && <MinimumFilterControls scale={colourScale} minimum={minimum} onChange={changeMinimum} />}
            </ColourPalette>
          </SliceSidebar>
        </>
      )}
      {(isLoading || error) && (
        <div className="absolute inset-0 grid place-items-center p-[var(--viewer-inset)]">
          <div className="w-full max-w-sm rounded-md border border-neutral-700 bg-neutral-900/95 p-6 shadow-lg">
            <h1 className="text-lg font-semibold tracking-tight text-neutral-100">OMP blast movement</h1>
            {error ? (
              <>
                <div role="alert" className="mt-2 space-y-1 text-sm">
                  <p className="font-medium text-red-300">
                    {models ? 'Couldn’t load the blast boundaries' : 'Couldn’t load the block model'}
                  </p>
                  <p className="break-words text-neutral-400">{error}</p>
                </div>
                <button type="button" onClick={retryLoading} className="outlined-button mt-5 text-xs text-neutral-100">
                  Try again
                </button>
              </>
            ) : (
              <>
                <p role="status" className="mt-1 text-sm text-neutral-400">
                  {models ? 'Loading blast boundaries…' : 'Loading block model…'}
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
