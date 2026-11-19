import { useEffect, useMemo, useState } from 'react'
import SceneViewer from './components/SceneViewer'
import ColourPalette from './components/ColourPalette'
import CategoryControls from './components/CategoryControls'
import CrossSectionPanel from './components/CrossSectionPanel'
import SectionSlider from './components/SectionSlider'
import BlockInspector from './components/BlockInspector'
import SectionSummary from './components/SectionSummary'
import { createColourScale } from './data/blockColours'
import { csvFiles } from './data/csvFiles'
import { createBlockModels } from './data/blockModels'
import { createBlastBoundarySegments } from './data/blastBoundary'
import type { Block, CategorySelection, ColourField } from './data/blockModels'
import type { ViewerMode } from './viewer/Viewer'
import { loadCsv } from './utils/loadCsv'
import type { CsvRow } from './utils/loadCsv'

export default function App() {
  const [data, setData] = useState<Record<string, CsvRow[]>>({})
  const [error, setError] = useState<string | null>(null)
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null)
  const [categorySelection, setCategorySelection] = useState<CategorySelection | null>(null)
  const [mode, setMode] = useState<ViewerMode>('model')
  const [slicePosition, setSlicePosition] = useState<number | null>(null)
  const [paletteCollapsed, setPaletteCollapsed] = useState(false)
  const [categoriesCollapsed, setCategoriesCollapsed] = useState(false)
  const [colourField, setColourField] = useState<ColourField>('grade_01')
  const isLoading = csvFiles.some((file) => !data[file])
  const preBoundaryRows = data['1_pre_string.csv']
  const postBoundaryRows = data['1_pst_string.csv']
  const blastBoundaries = useMemo(() => ({
    pre: createBlastBoundarySegments(preBoundaryRows ?? []),
    post: createBlastBoundarySegments(postBoundaryRows ?? []),
  }), [preBoundaryRows, postBoundaryRows])
  const mbmRows = data['1_mbm.csv']
  const models = useMemo(() => mbmRows ? createBlockModels(mbmRows) : null, [mbmRows])

  const colourScale = useMemo(() => models ? createColourScale(models.pre, colourField) : null, [models, colourField])

  const categoryBlocks = useMemo(() => {
    if (!models || !categorySelection) return null
    return models.pre.filter((block) => block.attributes[categorySelection.field] === categorySelection.value)
  }, [models, categorySelection])

  const sectionBlocks = useMemo(() => {
    if (!models || slicePosition === null) return []
    return models.pre.filter((block) => Math.abs(block.y - slicePosition) <= block.depth / 2 + 0.001)
  }, [models, slicePosition])

  const trackedBlocks = useMemo(() => {
    if (!categorySelection) return sectionBlocks
    return sectionBlocks.filter((block) => block.attributes[categorySelection.field] === categorySelection.value)
  }, [sectionBlocks, categorySelection])

  useEffect(() => {
    const controller = new AbortController()

    const loadFiles = async (): Promise<void> => {
      for (const file of csvFiles) {
        const rows = await loadCsv('/' + file, controller.signal)
        if (controller.signal.aborted) return
        console.log(file + ': loaded')
        setData((current) => ({ ...current, [file]: rows }))
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

  return (
    <main className="relative h-full w-full">
      {!isLoading && models && colourScale && (
        <>
          <SceneViewer models={models} blastBoundaries={blastBoundaries} colourScale={colourScale} mode={mode} slicePosition={slicePosition} sectionBlocks={trackedBlocks} categoryBlocks={categoryBlocks} categorySelection={categorySelection} selectedBlock={selectedBlock} onSelectBlock={setSelectedBlock} onSliceChange={setSlicePosition} />
          <div className="absolute top-20 left-6 z-10 flex w-80 max-h-[calc(100%_-_12rem)] max-w-[calc(100%_-_3rem)] flex-col gap-3 overflow-y-auto sm:top-6 sm:max-h-[calc(100%_-_8rem)]">
            <ColourPalette scale={colourScale} onChange={setColourField} collapsed={paletteCollapsed} onToggle={() => setPaletteCollapsed((current) => !current)} />
            <CategoryControls blocks={models.pre} selection={categorySelection} collapsed={categoriesCollapsed} onToggle={() => setCategoriesCollapsed((current) => !current)} onChange={(selection) => { setCategorySelection(selection); setSelectedBlock(null) }} />
            {mode !== 'model' && slicePosition !== null && <CrossSectionPanel blocks={trackedBlocks} scale={colourScale} filtered={categorySelection !== null} onInspect={mode === 'slice' ? () => setMode('inspect') : undefined} />}
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
