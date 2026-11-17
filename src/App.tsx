import { useEffect, useMemo, useState } from 'react'
import SceneViewer from './components/SceneViewer'
import ColourPalette from './components/ColourPalette'
import CrossSectionPanel from './components/CrossSectionPanel'
import SectionSlider from './components/SectionSlider'
import BlockInspector from './components/BlockInspector'
import { createColourScale } from './data/blockColours'
import { csvFiles } from './data/csvFiles'
import { createBlockModels } from './data/blockModels'
import type { Block, ColourField, ModelView } from './data/blockModels'
import type { ViewerMode } from './viewer/Viewer'
import { loadCsv } from './utils/loadCsv'
import type { CsvRow } from './utils/loadCsv'

export default function App() {
  const [data, setData] = useState<Record<string, CsvRow[]>>({})
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<ModelView>('pre')
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null)
  const [mode, setMode] = useState<ViewerMode>('model')
  const [slicePosition, setSlicePosition] = useState<number | null>(null)
  const [paletteCollapsed, setPaletteCollapsed] = useState(false)
  const [colourField, setColourField] = useState<ColourField>('grade_01')
  const isLoading = csvFiles.some((file) => !data[file])
  const mbmRows = data['1_mbm.csv']
  const models = useMemo(() => mbmRows ? createBlockModels(mbmRows) : null, [mbmRows])

  const colourScale = useMemo(() => models ? createColourScale(models.pre, colourField) : null, [models, colourField])

  const sectionBlocks = useMemo(() => {
    if (!models || slicePosition === null) return []
    return models[view].filter((block) => Math.abs(block.y - slicePosition) <= block.depth / 2 + 0.001)
  }, [models, view, slicePosition])

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
    setSelectedBlock(null)
  }

  return (
    <main className="relative h-full w-full">
      {!isLoading && models && colourScale && (
        <>
          <SceneViewer models={models} view={view} colourScale={colourScale} mode={mode} slicePosition={slicePosition} sectionBlocks={sectionBlocks} selectedBlock={selectedBlock} onSelectBlock={setSelectedBlock} onSliceChange={setSlicePosition} />
          <div className={"absolute top-20 left-6 z-10 flex max-h-[calc(100%_-_12rem)] max-w-[calc(100%_-_3rem)] flex-col gap-3 overflow-y-auto sm:top-6 sm:max-h-[calc(100%_-_8rem)] " + (mode === 'model' ? "w-72" : "w-80")}>
            <ColourPalette scale={colourScale} onChange={setColourField} collapsed={paletteCollapsed} onToggle={() => setPaletteCollapsed((current) => !current)} />
            {mode !== 'model' && slicePosition !== null && <CrossSectionPanel blocks={sectionBlocks} scale={colourScale} onInspect={mode === 'slice' ? () => setMode('inspect') : undefined} />}
            {mode === 'inspect' && <BlockInspector block={selectedBlock} field={colourField} onClear={() => setSelectedBlock(null)} />}
          </div>
          {mode === 'inspect' && slicePosition !== null && (
            <SectionSlider blocks={models[view]} position={slicePosition} onChange={(position) => { setSlicePosition(position); setSelectedBlock(null) }} />
          )}
          <button
            type="button"
            aria-pressed={mode === 'inspect' ? undefined : mode === 'slice'}
            onClick={mode === 'inspect' ? () => { setMode('slice'); setSelectedBlock(null) } : toggleSlicing}
            className={"absolute top-6 left-6 z-10 cursor-pointer rounded-lg border border-neutral-700 bg-neutral-900/95 px-4 py-2 text-sm text-neutral-300 shadow-lg hover:text-white focus-visible:outline-2 focus-visible:outline-neutral-300 aria-pressed:border-neutral-500 aria-pressed:bg-neutral-800 aria-pressed:text-neutral-100 " + (mode === 'model' ? "sm:left-84" : "sm:left-92")}
          >
            {mode === 'inspect' ? 'Back to slice' : 'Slice model'}
          </button>
        </>
      )}
      {!isLoading && models && (
        <div role="group" aria-label="Block model view" className="absolute bottom-8 left-1/2 flex max-w-[calc(100%_-_2rem)] -translate-x-1/2 gap-2 whitespace-nowrap rounded border border-neutral-700 bg-neutral-900/90 p-2 text-sm">
          <button type="button" aria-pressed={view === 'pre'} onClick={() => { setView('pre'); setSelectedBlock(null) }} className="cursor-pointer rounded px-3 py-2 text-neutral-400 hover:text-white aria-pressed:bg-neutral-700 aria-pressed:text-white">Pre-blast</button>
          <button type="button" aria-pressed={view === 'post'} onClick={() => { setView('post'); setSelectedBlock(null) }} className="cursor-pointer rounded px-3 py-2 text-neutral-400 hover:text-white aria-pressed:bg-neutral-700 aria-pressed:text-white">Predicted post-blast</button>
        </div>
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
