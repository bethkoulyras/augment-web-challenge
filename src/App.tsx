import { useCallback, useEffect, useMemo, useState } from 'react'
import SceneViewer from './components/SceneViewer'
import ColourPalette from './components/ColourPalette'
import CategoryControls from './components/CategoryControls'
import GradeFilterControls from './components/GradeFilterControls'
import CrossSectionPanel from './components/CrossSectionPanel'
import SectionSlider from './components/SectionSlider'
import BlockInspector from './components/BlockInspector'
import SectionSummary from './components/SectionSummary'
import { createColourScales } from './data/blockColours'
import { csvFiles } from './data/csvFiles'
import { createBlockModels, countGradeMatches } from './data/blockModels'
import { createBlastBoundarySegments } from './data/blastBoundary'
import type { BlastBoundaries } from './data/blastBoundary'
import type { Block, BlockModels, CategorySelection, ColourField, GradeField, GradeFilter } from './data/blockModels'
import type { ViewerMode } from './viewer/Viewer'
import { loadCsv } from './utils/loadCsv'

const emptyBlocks: readonly Block[] = []

export default function App() {
  const [models, setModels] = useState<BlockModels | null>(null)
  const [blastBoundaries, setBlastBoundaries] = useState<BlastBoundaries>({ pre: [], post: [] })
  const [loadedCount, setLoadedCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null)
  const [categorySelection, setCategorySelection] = useState<CategorySelection | null>(null)
  const [filteredGrade, setFilteredGrade] = useState<{ filter: GradeFilter; blocks: readonly Block[] } | null>(null)
  const [mode, setMode] = useState<ViewerMode>('model')
  const [slicePosition, setSlicePosition] = useState<number | null>(null)
  const [paletteCollapsed, setPaletteCollapsed] = useState(false)
  const [categoriesCollapsed, setCategoriesCollapsed] = useState(false)
  const [colourField, setColourField] = useState<ColourField>('grade_01')
  const isLoading = loadedCount < csvFiles.length

  const colourScales = useMemo(() => createColourScales(models?.pre ?? emptyBlocks), [models])
  const colourScale = colourScales.get(colourField)
  const gradeFilter = filteredGrade?.filter ?? null
  const orderedBlocks = filteredGrade?.blocks ?? models?.pre ?? emptyBlocks

  const visibleCount = countGradeMatches(orderedBlocks, gradeFilter)

  const categoryBlocks = useMemo(() => categorySelection
    ? orderedBlocks.filter((block) => block.attributes[categorySelection.field] === categorySelection.value)
    : null, [orderedBlocks, categorySelection])

  const modelBlocks = categoryBlocks ?? filteredGrade?.blocks ?? null
  const modelCount = categoryBlocks ? countGradeMatches(categoryBlocks, gradeFilter) : visibleCount

  const sectionBlocks = useMemo(() => {
    if (mode === 'model' || slicePosition === null) return emptyBlocks
    return orderedBlocks.filter((block) => Math.abs(block.y - slicePosition) <= block.depth / 2 + 0.001)
  }, [mode, orderedBlocks, slicePosition])

  const sectionCohort = useMemo(() => categorySelection
    ? sectionBlocks.filter((block) => block.attributes[categorySelection.field] === categorySelection.value)
    : sectionBlocks, [sectionBlocks, categorySelection])

  const trackedBlocks = useMemo(() => gradeFilter
    ? sectionCohort.slice(0, countGradeMatches(sectionCohort, gradeFilter))
    : sectionCohort, [sectionCohort, gradeFilter])

  const movementBlocks = mode === 'inspect' ? sectionCohort : mode === 'model' ? modelBlocks : null
  const movementCount = mode === 'inspect' ? trackedBlocks.length : movementBlocks ? modelCount : 0
  // React's development profiler deeply compares changed array props.
  const getVisibleBlocks = useCallback(() => orderedBlocks, [orderedBlocks])
  const getMovementBlocks = useCallback(() => movementBlocks, [movementBlocks])

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

    return () => controller.abort()
  }, [])

  const toggleSlicing = (): void => {
    const enabled = mode === 'model'
    setMode(enabled ? 'slice' : 'model')
    setPaletteCollapsed(enabled)
    setCategoriesCollapsed(enabled)
    setSelectedBlock(null)
  }

  const changeGradeFilter = (filter: GradeFilter | null): void => {
    if (filter && models) {
      const grade = (block: Block): number => {
        const value = block.attributes[filter.field]
        return value !== null && Number.isFinite(value) ? value : -Infinity
      }
      // The renderer hides the suffix by updating its instance count.
      const blocks = filteredGrade?.filter.field === filter.field
        ? filteredGrade.blocks
        : [...models.pre].sort((a, b) => grade(b) - grade(a))
      setFilteredGrade({ filter, blocks })
    } else {
      setFilteredGrade(null)
    }
    setSelectedBlock(null)
  }

  return (
    <main className="relative h-full w-full">
      {!isLoading && models && colourScale && (
        <>
          <SceneViewer models={models} blastBoundaries={blastBoundaries} colourScale={colourScale} mode={mode} slicePosition={slicePosition} getVisibleBlocks={getVisibleBlocks} getMovementBlocks={getMovementBlocks} visibleCount={visibleCount} movementCount={movementCount} categorySelection={categorySelection} selectedBlock={selectedBlock} onSelectBlock={setSelectedBlock} onSliceChange={setSlicePosition} />
          <div className="absolute top-20 left-6 z-10 flex w-80 max-h-[calc(100%_-_12rem)] max-w-[calc(100%_-_3rem)] flex-col gap-3 overflow-y-auto sm:top-6 sm:max-h-[calc(100%_-_8rem)]">
            <ColourPalette scale={colourScale} onChange={(field) => {
              setColourField(field)
              if (gradeFilter && field.startsWith('grade_') && field !== gradeFilter.field) {
                changeGradeFilter(null)
              }
            }} collapsed={paletteCollapsed} onToggle={() => setPaletteCollapsed((current) => !current)} gradeFilter={gradeFilter}>
              {colourScale.kind === 'grade' && <GradeFilterControls field={colourField as GradeField} scale={colourScale} filter={gradeFilter} onChange={changeGradeFilter} />}
            </ColourPalette>
            <CategoryControls colourScales={colourScales} selection={categorySelection} collapsed={categoriesCollapsed} onToggle={() => setCategoriesCollapsed((current) => !current)} onChange={(selection) => { setCategorySelection(selection); setSelectedBlock(null) }} />
            {mode !== 'model' && slicePosition !== null && <CrossSectionPanel blocks={trackedBlocks} scale={colourScale} filtered={categorySelection !== null || gradeFilter !== null} onInspect={mode === 'slice' ? () => setMode('inspect') : undefined} />}
            {mode === 'inspect' && slicePosition !== null && !selectedBlock && (
              <SectionSlider blocks={models.pre} position={slicePosition} onChange={(position) => { setSlicePosition(position); setSelectedBlock(null) }} />
            )}
            {mode === 'inspect' && (selectedBlock
              ? <BlockInspector block={selectedBlock} models={models} field={colourField} onClear={() => setSelectedBlock(null)} />
              : <SectionSummary blocks={trackedBlocks} totalCount={sectionBlocks.length} />)}
          </div>
          <button
            type="button"
            aria-pressed={mode === 'inspect' ? undefined : mode === 'slice'}
            onClick={mode === 'inspect' ? () => { setMode('slice'); setSelectedBlock(null) } : toggleSlicing}
            className="absolute top-6 left-6 z-10 cursor-pointer rounded-lg border border-neutral-700 bg-neutral-900/95 px-4 py-2 text-sm text-neutral-300 shadow-lg hover:text-white focus-visible:outline-2 focus-visible:outline-neutral-300 aria-pressed:border-neutral-500 aria-pressed:bg-neutral-800 aria-pressed:text-neutral-100 sm:left-92"
          >
            {mode === 'inspect' ? 'Back to slice' : 'Slice model'}
          </button>
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
