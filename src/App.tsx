import { useEffect, useState } from 'react'
import SceneViewer from './components/SceneViewer'
import { csvFiles } from './data/csvFiles'
import { loadCsv } from './utils/loadCsv'
import type { CsvRow } from './utils/loadCsv'

export default function App() {
  const [data, setData] = useState<Record<string, CsvRow[]>>({})
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    const loadFiles = async (): Promise<void> => {
      for (const file of csvFiles) {
        const rows = await loadCsv('/' + file, controller.signal)
        if (controller.signal.aborted) return
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
      <SceneViewer />
      <div className="absolute top-4 left-4 rounded border border-neutral-700 bg-neutral-900/90 px-4 py-3 text-sm">
        {error ? <p role="alert">{error}</p> : (
          <ul role="status" className="space-y-1">
            {csvFiles.map((file) => (
              <li key={file}>{file}: {data[file] ? 'Loaded' : 'Loading…'}</li>
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}
