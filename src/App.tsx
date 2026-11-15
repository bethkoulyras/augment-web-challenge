import { useEffect, useMemo, useState } from 'react'
import SceneViewer from './components/SceneViewer'
import ColourPalette from './components/ColourPalette'
import { createColourScale } from './data/blockColours'
import { csvFiles } from './data/csvFiles'
import { createBlockModels } from './data/blockModels'
import type { ColourField, ModelView } from './data/blockModels'
import { loadCsv } from './utils/loadCsv'
import type { CsvRow } from './utils/loadCsv'

export default function App() {
  const [data, setData] = useState<Record<string, CsvRow[]>>({})
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<ModelView>('pre')
  const [slicing, setSlicing] = useState(false)
  const [colourField, setColourField] = useState<ColourField>('grade_01')
  const isLoading = csvFiles.some((file) => !data[file])
  const mbmRows = data['1_mbm.csv']
  const models = useMemo(() => mbmRows ? createBlockModels(mbmRows) : null, [mbmRows])

  const colourScale = useMemo(() => models ? createColourScale(models.pre, colourField) : null, [models, colourField])

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

  return (
    <main className="relative h-full w-full">
      {!isLoading && models && colourScale && (
        <>
          <SceneViewer models={models} view={view} colourScale={colourScale} slicing={slicing} />
          <ColourPalette scale={colourScale} onChange={setColourField} />
          <button type="button" aria-pressed={slicing} onClick={() => setSlicing((current) => !current)} className="absolute top-6 right-6 z-10 cursor-pointer rounded-lg border border-neutral-700 bg-neutral-900/95 px-4 py-2 text-sm text-neutral-300 shadow-lg hover:text-white focus-visible:outline-2 focus-visible:outline-cyan-300 aria-pressed:border-cyan-300/60 aria-pressed:bg-cyan-300/10 aria-pressed:text-cyan-100">Slice model</button>
        </>
      )}
      {!isLoading && models && (
        <div role="group" aria-label="Block model view" className="absolute bottom-8 left-1/2 flex max-w-[calc(100%_-_2rem)] -translate-x-1/2 gap-2 whitespace-nowrap rounded border border-neutral-700 bg-neutral-900/90 p-2 text-sm">
          <button type="button" aria-pressed={view === 'pre'} onClick={() => setView('pre')} className="cursor-pointer rounded px-3 py-2 text-neutral-400 hover:text-white aria-pressed:bg-neutral-700 aria-pressed:text-white">Pre-blast</button>
          <button type="button" aria-pressed={view === 'post'} onClick={() => setView('post')} className="cursor-pointer rounded px-3 py-2 text-neutral-400 hover:text-white aria-pressed:bg-neutral-700 aria-pressed:text-white">Predicted post-blast</button>
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
