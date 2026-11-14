import { useMemo, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import SceneViewer from './components/SceneViewer'
import type { ModelView } from './data/BlockModel'
import type { LayerVisibility } from './data/SceneLayers'
import { classifyBlocks } from './data/classifyBlocks'
import { useBlockModel } from './hooks/useBlockModel'

const views = [
  { key: 'before', label: 'Pre-blast', title: 'Pre-blast model' },
  { key: 'after', label: 'Predicted post-blast', title: 'OMP predicted post-blast model' },
] as const

export default function App() {
  const { model, error, isLoading } = useBlockModel()
  const [view, setView] = useState<ModelView>('before')
  const [visibility, setVisibility] = useState<LayerVisibility>({ blocks: true, context: false, surface: true, boundary: true, holes: true })
  const tabRefs = useRef<Record<ModelView, HTMLButtonElement | null>>({ before: null, after: null })
  const groups = useMemo(() => model ? classifyBlocks(model.after) : null, [model])
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
      {isLoading && <p role="status" className="p-4 text-neutral-300">Loading block models, survey surfaces and blast data…</p>}
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
              {activeView.title} · {groups?.material.length.toLocaleString()} material blocks
            </p>
          </div>
          <fieldset className="absolute top-32 right-4 z-10 max-h-[calc(100%_-_9rem)] space-y-2 overflow-y-auto rounded-lg border border-neutral-700 bg-neutral-900/95 p-4 text-xs text-neutral-300">
            <legend className="sr-only">Visible data layers</legend>
            <details open>
              <summary className="cursor-pointer font-medium">Data layers</summary>
              <div className="mt-3 space-y-2">
            {([
              ['blocks', 'Blast material'],
              ['context', 'Surrounding grid (context)'],
              ['surface', 'Surveyed surface'],
              ['boundary', 'Boundary footprint'],
              ['holes', 'Blastholes (pre-blast)'],
            ] as const).map(([key, label]) => (
              <label key={key} className="flex cursor-pointer items-center gap-2">
                <input type="checkbox" checked={visibility[key]} disabled={key === 'holes' && view === 'after'} onChange={(event) => setVisibility({ ...visibility, [key]: event.target.checked })} />
                {label}
              </label>
            ))}
              </div>
            </details>
            <details className="border-t border-neutral-700 pt-3">
              <summary className="cursor-pointer text-neutral-400">Dataset details</summary>
            <p className="max-w-52 pt-2 leading-relaxed text-neutral-400">
              {Math.round(model.layers.surfaces[view].length / 9).toLocaleString()} surveyed triangles
              <br />{view === 'before' ? model.layers.holes.length + ' drill holes · amber' : 'Surveyed shape with OMP predicted blocks'}
              <br />{groups?.context.length.toLocaleString()} context cells · optional
              <br />{groups?.airCount.toLocaleString()} air cells excluded
              <br />Boundary footprint · purple · elevation {model.layers.boundaries[view][0]?.[0]?.Z ?? '—'} m
            </p>
            </details>
          </fieldset>
          <section id="block-model-panel" role="tabpanel" aria-labelledby={'model-tab-' + view} tabIndex={0} className="h-full w-full">
            <SceneViewer model={model} view={view} visibility={visibility} />
          </section>
        </>
      )}
    </main>
  )
}
