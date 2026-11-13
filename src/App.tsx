import SceneViewer from './components/SceneViewer'
import { useBlockModel } from './hooks/useBlockModel'

export default function App() {
  const { blocks, error, isLoading } = useBlockModel()

  return (
    <main className="relative h-full w-full">
      {error && <p role="alert" className="p-4 text-red-300">{error}</p>}
      {isLoading && <p role="status" className="p-4">Loading block model…</p>}
      {blocks && (
        <>
          <p role="status" className="pointer-events-none absolute left-4 top-4 z-10 text-sm text-neutral-300">
            Pre-blast model
          </p>
          <SceneViewer blocks={blocks} />
        </>
      )}
    </main>
  )
}
