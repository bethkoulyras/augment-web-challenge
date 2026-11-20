import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import SceneViewer from './components/SceneViewer'
import ColourPalette from './components/ColourPalette'
import MinimumFilterControls from './components/MinimumFilterControls'
import CrossSectionPanel from './components/CrossSectionPanel'
import SectionSlider from './components/SectionSlider'
import BlockInspector from './components/BlockInspector'
import SectionSummary from './components/SectionSummary'
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
import type { ViewerMode } from './viewer/Viewer'
import { loadCsv } from './utils/loadCsv'

const emptyBlocks: readonly Block[] = []
const outlinedButton = 'group inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-sm border border-neutral-700 bg-transparent px-2.5 py-1.5 font-medium hover:bg-white/5 hover:text-white focus-visible:outline-2 focus-visible:outline-neutral-300 disabled:cursor-default disabled:opacity-40 aria-pressed:border-neutral-400 aria-pressed:bg-neutral-700 aria-pressed:text-white'
const layerDot = 'size-2 shrink-0 rounded-full opacity-40 group-aria-pressed:opacity-100'
const sliceIcon = (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="size-[18px]">
    <path d="M12 2.5 21 7.5v9l-9 5-9-5v-9Z" fillOpacity=".35" />
    <path d="m12 2.5 9 5-9 5-9-5Z" fillOpacity=".3" />
    <path d="m6 5.8 3-1.6 9 5v9l-3 1.6v-9Z" />
  </svg>
)

export default function App() {
  const sidebarRef = useRef<HTMLDivElement>(null)
  const sidebarResultRef = useRef<HTMLDivElement>(null)
  const focusSectionRef = useRef(false)
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
  // React's development profiler deeply compares changed array props.
  const getVisibleBlocks = useCallback(() => orderedBlocks, [orderedBlocks])
  const getMovementBlocks = useCallback(() => movementBlocks, [movementBlocks])
  const getSurfaces = useCallback(() => surfaces, [surfaces])

  useLayoutEffect(() => {
    if (!sidebarOpen) return
    if ((mode !== 'model' || focusSectionRef.current) && sidebarRef.current) sidebarRef.current.scrollTop = 0
    if (focusSectionRef.current) {
      sidebarResultRef.current?.focus({ preventScroll: true })
      focusSectionRef.current = false
    }
  }, [mode, selectedBlock, sidebarOpen])

  useLayoutEffect(() => {
    const result = sidebarResultRef.current
    const frame = result?.parentElement
    if (!result || !frame) return
    const resizeResult = () => { frame.style.height = `${result.getBoundingClientRect().height}px` }
    resizeResult()
    const observer = new ResizeObserver(resizeResult)
    observer.observe(result)
    return () => observer.disconnect()
  }, [isLoading])

  useLayoutEffect(() => {
    const sidebar = sidebarRef.current
    if (!sidebar) return

    const updateScrollFade = () => {
      sidebar.toggleAttribute('data-scrollable-below', sidebar.scrollHeight - sidebar.clientHeight - sidebar.scrollTop > 1)
    }
    const observer = new ResizeObserver(updateScrollFade)
    observer.observe(sidebar)
    for (const child of sidebar.children) observer.observe(child)
    sidebar.addEventListener('scroll', updateScrollFade, { passive: true })
    updateScrollFade()

    return () => {
      observer.disconnect()
      sidebar.removeEventListener('scroll', updateScrollFade)
    }
  }, [isLoading])

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
    if (sidebarOpen && mode === nextMode) {
      if (sidebarRef.current) sidebarRef.current.scrollTop = 0
      sidebarResultRef.current?.focus({ preventScroll: true })
      return
    }
    focusSectionRef.current = true
    setSidebarOpen(true)
    if (mode !== nextMode) {
      setMode(nextMode)
      setSelectedBlock(null)
    }
  }

  const clearBlockSelection = (): void => {
    focusSectionRef.current = true
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

  const northingSlider = models && <SectionSlider blocks={models.pre} position={slicePosition} onChange={setSlicePosition} />

  return (
    <main className="viewer-layout relative grid h-full w-full grid-cols-[minmax(0,1fr)_auto] grid-rows-[auto_minmax(0,1fr)_auto] gap-3 p-[var(--viewer-inset)] sm:block sm:p-0">
      {!isLoading && models && colourScale && (
        <>
          <SceneViewer
            models={models}
            blastBoundaries={blastBoundaries}
            blastHoles={blastHoles}
            showBlastHoles={showBlastHoles}
            showConnections={showConnections}
            getSurfaces={getSurfaces}
            showSurfaces={showSurfaces}
            colourScale={colourScale}
            mode={mode}
            onModeChange={goToSectionMode}
            sidebarOpen={sidebarOpen}
            onToggleSidebar={() => setSidebarOpen((open) => !open)}
            filtered={filtered}
            slicePosition={slicePosition}
            getVisibleBlocks={getVisibleBlocks}
            getMovementBlocks={getMovementBlocks}
            visibleCount={visibleCount}
            movementCount={movementCount}
            categorySelection={categorySelection}
            selectedBlock={selectedBlock}
            onSelectBlock={setSelectedBlock}
            onSliceChange={setSlicePosition}
            playbackOverlays={
              <>
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
                      className={outlinedButton}
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
                      className={outlinedButton}
                    >
                      <span aria-hidden="true" className={layerDot + ' bg-amber-400'} />
                      Blast holes
                    </button>
                  </div>
                </div>
                {surfaceLoadFailed && <p role="status" className="text-amber-300">Couldn’t load the survey surfaces. Select Surfaces to retry.</p>}
              </>
            }
          />
          <aside
            id="viewer-sidebar"
            aria-label="Viewer sidebar"
            inert={!sidebarOpen}
            className={'z-10 col-span-full row-start-2 flex max-h-full w-full flex-col self-start overflow-hidden rounded-md border border-neutral-700 bg-neutral-900/95 text-xs text-neutral-300 shadow-lg transition-[opacity,visibility] duration-200 ease-out motion-reduce:transition-none sm:absolute sm:top-[var(--viewer-inset)] sm:left-[var(--viewer-inset)] sm:h-[calc(100%_-_2_*_var(--viewer-inset))] sm:w-[var(--viewer-sidebar-width)] sm:pt-10 ' + (sidebarOpen ? '' : 'invisible opacity-0')}
          >
            <div ref={sidebarRef} className="sidebar-scroll min-h-0 overflow-y-auto sm:border-t sm:border-white/10">
              <div className="overflow-hidden transition-[height] duration-200 ease-out motion-reduce:transition-none">
                <div id="section-workflow" ref={sidebarResultRef} tabIndex={-1} className="focus:outline-none">
                  <div key={selectedBlock ? 'block' : mode} className="px-2 pt-3 pb-4 motion-safe:animate-[sidebar-result-in_180ms_ease-out]">
                    <div className="rounded-sm bg-neutral-950/60 inset-ring inset-ring-white/10">
                      {mode === 'model' ? (
                        <button
                          type="button"
                          aria-label="Slice model"
                          aria-describedby="slice-model-hint"
                          aria-controls="section-workflow"
                          onClick={() => goToSectionMode('slice')}
                          className="group flex w-full cursor-pointer flex-col items-start gap-2 rounded-sm p-4 text-left hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-neutral-300 motion-safe:transition-colors"
                        >
                          <span className="flex w-full items-center gap-2 text-sm font-medium text-neutral-100">
                            {sliceIcon}
                            Slice model
                            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-auto size-3.5 shrink-0 text-neutral-400 group-hover:text-white">
                              <path d="M5 12h14m-6-6 6 6-6 6" />
                            </svg>
                          </span>
                          <span id="slice-model-hint" className="text-neutral-400">View a cross-section through the block model.</span>
                        </button>
                      ) : mode === 'slice' ? (
                        <CrossSectionPanel
                          blocks={trackedBlocks}
                          scale={colourScale}
                          filtered={filtered}
                          onExit={() => goToSectionMode('model')}
                          onInspect={trackedBlocks.length > 0 ? () => goToSectionMode('inspect') : undefined}
                        >
                          {northingSlider}
                        </CrossSectionPanel>
                      ) : (
                        <>
                          <div className="px-3 pt-4">
                            <button
                              type="button"
                              onClick={selectedBlock ? clearBlockSelection : () => goToSectionMode('slice')}
                              className={outlinedButton + ' text-neutral-100'}
                            >
                              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4">
                                <path d="M19 12H5m6-6-6 6 6 6" />
                              </svg>
                              {selectedBlock ? 'Back to section' : 'Back to slice'}
                            </button>
                          </div>
                          {selectedBlock ? (
                            <BlockInspector block={selectedBlock} models={models} field={colourField} onClear={clearBlockSelection} />
                          ) : (
                            <>
                              <SectionSummary blocks={trackedBlocks} totalCount={sectionBlocks.length} />
                              <div className="space-y-2 border-t border-white/10 px-3 pt-3 pb-4">
                                {northingSlider}
                                <button
                                  type="button"
                                  aria-label="Movement connections"
                                  aria-pressed={showConnections}
                                  onClick={() => setShowConnections((show) => !show)}
                                  className={outlinedButton}
                                >
                                  <span aria-hidden="true" className="w-3 border-t border-dashed border-neutral-400" />
                                  Connections
                                </button>
                              </div>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <ColourPalette scale={colourScale} onChange={changeColourField} filtered={filtered} categoryCode={categorySelection?.value ?? null} onCategoryCodeChange={changeCategoryCode}>
                {colourScale.kind !== 'category' && <MinimumFilterControls scale={colourScale} minimum={minimum} onChange={changeMinimum} />}
              </ColourPalette>
            </div>
          </aside>
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
                <button type="button" onClick={retryLoading} className={outlinedButton + ' mt-5 text-xs text-neutral-100'}>
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
