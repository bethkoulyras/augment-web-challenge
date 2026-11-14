import { useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import SceneViewer from './components/SceneViewer'
import type { ModelView } from './data/BlockModel'
import { useBlockModel } from './hooks/useBlockModel'

const views = [
  { key: 'before', label: 'Pre-blast', title: 'Pre-blast model' },
  { key: 'after', label: 'Predicted post-blast', title: 'OMP predicted post-blast model' },
] as const

export default function App() {
  const { model, error, isLoading } = useBlockModel()
  const [view, setView] = useState<ModelView>('before')
  const tabRefs = useRef<Record<ModelView, HTMLButtonElement | null>>({ before: null, after: null })
  const activeView = views.find((item) => item.key === view) ?? views[0]

  const handleTabKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    let next: ModelView
    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowRight': next = view === 'before' ? 'after' : 'before'; break
      case 'Home': next = 'before'; break
      case 'End': next = 'after'; break
      default: return
    }
    event.preventDefault()
    setView(next)
    tabRefs.current[next]?.focus()
  }

  return (
    <main className="relative h-full w-full">
      {error && <p role="alert" className="p-4 text-red-300">{error}</p>}
      {isLoading && <p role="status" className="p-4 text-neutral-300">Loading pre-blast model and OMP predictions…</p>}
      {model && (
        <>
          <div className="absolute top-4 left-4 z-10 rounded-lg border border-neutral-700 bg-neutral-900/90 p-2">
            <div role="tablist" aria-label="Block model view" onKeyDown={handleTabKeyDown} className="flex gap-1">
              {views.map((item) => (
                <button
                  key={item.key}
                  ref={(element) => { tabRefs.current[item.key] = element }}
                  type="button"
                  role="tab"
                  id={'model-tab-' + item.key}
                  aria-selected={view === item.key}
                  aria-controls="block-model-panel"
                  tabIndex={view === item.key ? 0 : -1}
                  onClick={() => setView(item.key)}
                  className="cursor-pointer rounded-md px-3 py-2 text-sm text-neutral-400 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-300 aria-selected:bg-neutral-700 aria-selected:text-white"
                >
                  {item.label}
                </button>
              ))}
            </div>
            <p role="status" className="px-3 pt-3 pb-1 text-xs text-neutral-400">
              {activeView.title} · {model[view].length.toLocaleString()} blocks
            </p>
          </div>
          <section id="block-model-panel" role="tabpanel" aria-labelledby={'model-tab-' + view} tabIndex={0} className="h-full w-full">
            <SceneViewer model={model} view={view} />
          </section>
        </>
      )}
    </main>
  )
}
