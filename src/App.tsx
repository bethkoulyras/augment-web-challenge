import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import SceneViewer from './components/SceneViewer'
import ColourPalette from './components/ColourPalette'
import MinimumFilterControls from './components/MinimumFilterControls'
import CrossSectionPanel from './components/CrossSectionPanel'
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
import type { ViewerMode } from './viewer/Viewer'
import { loadCsv } from './utils/loadCsv'

const emptyBlocks: readonly Block[] = []
export default function App() {
  const sidebarRef = useRef<HTMLDivElement>(null)
  const [models, setModels] = useState<BlockModels | null>(null)
  const [blastBoundaries, setBlastBoundaries] = useState<BlastBoundaries>({ pre: [], post: [] })
  const [blastHoles, setBlastHoles] = useState<BlastHole[]>([])
  const [loadedCount, setLoadedCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null)
  const [categorySelection, setCategorySelection] = useState<CategorySelection | null>(null)
  const [minimumFilter, setMinimumFilter] = useState<{ minimum: number; blocks: readonly Block[] } | null>(null)
  const [mode, setMode] = useState<ViewerMode>('model')
  const [slicePosition, setSlicePosition] = useState<number | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [colourField, setColourField] = useState<ColourField>('grade_01')
  const isLoading = loadedCount < csvFiles.length

  const colourScales = useMemo(() => createColourScales(models?.pre ?? emptyBlocks), [models])
  const colourScale = colourScales.get(colourField)
  const minimum = minimumFilter?.minimum ?? null
  const filtered = categorySelection !== null || minimum !== null
  const hasCrossSection = mode !== 'model' && slicePosition !== null
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

  useLayoutEffect(() => {
    if (!sidebarOpen || !hasCrossSection) return
    const sidebar = sidebarRef.current
    const panel = sidebar?.querySelector('#cross-section-panel')
    if (!sidebar || !panel) return
    const sidebarBounds = sidebar.getBoundingClientRect()
    const panelBounds = panel.getBoundingClientRect()
    if (panelBounds.bottom > sidebarBounds.bottom) {
      sidebar.scrollTop += Math.min(panelBounds.top - sidebarBounds.top, panelBounds.bottom - sidebarBounds.bottom)
    }
  }, [hasCrossSection, sidebarOpen])

  useEffect(() => {
    const controller = new AbortController()
    setLoadedCount(0)
    setSelectedBlock(null)

    const loadFiles = async (): Promise<void> => {
      for (const file of csvFiles) {
        const rows = await loadCsv('/' + file, controller.signal)
        if (controller.signal.aborted) return
        if (file === '1_mbm.csv') setModels(createBlockModels(rows))
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
  }, [])

  const toggleSlicing = (): void => {
    setMode(mode === 'slice' ? 'model' : 'slice')
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
    <main className="relative grid h-full w-full grid-cols-[minmax(0,1fr)_auto] grid-rows-[auto_minmax(0,1fr)_auto] gap-3 p-6 sm:block sm:p-0">
      {!isLoading && models && colourScale && (
        <>
          <SceneViewer models={models} blastBoundaries={blastBoundaries} blastHoles={blastHoles} colourScale={colourScale} mode={mode} sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen((open) => !open)} filtered={filtered} slicePosition={slicePosition} getVisibleBlocks={getVisibleBlocks} getMovementBlocks={getMovementBlocks} visibleCount={visibleCount} movementCount={movementCount} categorySelection={categorySelection} selectedBlock={selectedBlock} onSelectBlock={setSelectedBlock} onSliceChange={setSlicePosition} onToggleSlicer={toggleSlicing} onInspectSection={mode === 'slice' && trackedBlocks.length > 0 ? () => setMode('inspect') : undefined} />
          <aside
            id="viewer-sidebar"
            aria-label="Viewer sidebar"
            inert={!sidebarOpen}
            className={'z-10 col-span-full row-start-2 flex max-h-full w-full flex-col self-start overflow-hidden rounded-xl bg-neutral-900/95 text-xs text-neutral-300 shadow-lg inset-ring inset-ring-white/10 transition-[opacity,visibility] duration-200 ease-out motion-reduce:transition-none sm:absolute sm:top-6 sm:left-6 sm:max-h-[calc(100%_-_3rem)] sm:w-80 sm:pt-10 ' + (sidebarOpen ? '' : 'invisible opacity-0')}
          >
            <div ref={sidebarRef} className="min-h-0 divide-y divide-white/10 overflow-y-auto sm:border-t sm:border-white/10">
              <ColourPalette scale={colourScale} onChange={changeColourField} categoryCode={categorySelection?.value ?? null} onCategoryCodeChange={changeCategoryCode}>
                {colourScale.kind !== 'category' && <MinimumFilterControls scale={colourScale} minimum={minimum} onChange={changeMinimum} />}
              </ColourPalette>
              {hasCrossSection && <CrossSectionPanel blocks={trackedBlocks} scale={colourScale} filtered={filtered} />}
              {mode === 'inspect' && (selectedBlock
                ? <BlockInspector block={selectedBlock} models={models} field={colourField} onClear={() => setSelectedBlock(null)} />
                : <SectionSummary blocks={trackedBlocks} totalCount={sectionBlocks.length} />)}
            </div>
          </aside>
        </>
      )}
      {error ? (
        <p role="alert" className="absolute inset-0 grid place-items-center p-6 text-red-300">{error}</p>
      ) : isLoading && (
        <div role="status" className="absolute inset-0 grid place-items-center">
          <span className="sr-only">Loading data…</span>
          <span aria-hidden="true" className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-700 border-t-neutral-200 motion-reduce:animate-none" />
        </div>
      )}
    </main>
  )
}
