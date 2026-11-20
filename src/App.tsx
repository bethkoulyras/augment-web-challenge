import { useCallback, useEffect, useMemo, useState } from 'react'
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
import type { Block, BlockModels, CategorySelection, ColourField } from './data/blockModels'
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
  const [minimumFilter, setMinimumFilter] = useState<{ minimum: number; blocks: readonly Block[] } | null>(null)
  const [mode, setMode] = useState<ViewerMode>('model')
  const [slicePosition, setSlicePosition] = useState<number | null>(null)
  const [paletteCollapsed, setPaletteCollapsed] = useState(false)
  const [colourField, setColourField] = useState<ColourField>('grade_01')
  const isLoading = loadedCount < csvFiles.length

  const colourScales = useMemo(() => createColourScales(models?.pre ?? emptyBlocks), [models])
  const colourScale = colourScales.get(colourField)
  const minimum = minimumFilter?.minimum ?? null
  const orderedBlocks = minimumFilter?.blocks ?? models?.pre ?? emptyBlocks

  const visibleCount = countMinimumMatches(orderedBlocks, colourField, minimum)

  const categoryBlocks = useMemo(() => categorySelection
    ? orderedBlocks.filter((block) => block.attributes[categorySelection.field] === categorySelection.value)
    : null, [orderedBlocks, categorySelection])

  const modelBlocks = categoryBlocks ?? minimumFilter?.blocks ?? null
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
    <main className="relative h-full w-full">
      {!isLoading && models && colourScale && (
        <>
          <SceneViewer models={models} blastBoundaries={blastBoundaries} colourScale={colourScale} mode={mode} slicePosition={slicePosition} getVisibleBlocks={getVisibleBlocks} getMovementBlocks={getMovementBlocks} visibleCount={visibleCount} movementCount={movementCount} categorySelection={categorySelection} selectedBlock={selectedBlock} onSelectBlock={setSelectedBlock} onSliceChange={setSlicePosition} />
          <div className="absolute top-20 left-6 z-10 flex w-80 max-h-[calc(100%_-_12rem)] max-w-[calc(100%_-_3rem)] flex-col gap-3 overflow-y-auto sm:top-6 sm:max-h-[calc(100%_-_8rem)]">
            <ColourPalette scale={colourScale} onChange={changeColourField} collapsed={paletteCollapsed} onToggle={() => setPaletteCollapsed((current) => !current)} minimum={minimum} categoryCode={categorySelection?.value ?? null} onCategoryCodeChange={changeCategoryCode}>
              {colourScale.kind !== 'category' && <MinimumFilterControls scale={colourScale} minimum={minimum} onChange={changeMinimum} />}
            </ColourPalette>
            {mode !== 'model' && slicePosition !== null && <CrossSectionPanel blocks={trackedBlocks} scale={colourScale} filtered={categorySelection !== null || minimum !== null} onInspect={mode === 'slice' ? () => setMode('inspect') : undefined} />}
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
