import { useMemo } from 'react'
import type { Block, BlockModels, ColourField } from '../data/blockModels'

interface BlockInspectorProps {
  block: Block | null
  models: BlockModels
  field: ColourField
  onClear: () => void
}

export default function BlockInspector({ block, models, field, onClear }: BlockInspectorProps) {
  const value = block ? block.attributes[field] : null
  const positions = useMemo(() => {
    if (!block) return null
    const pre = models.pre.find((candidate) => candidate.id === block.id)
    const post = models.post.find((candidate) => candidate.id === block.id)
    return pre && post ? { pre, post } : null
  }, [models, block])
  const distance = block?.movementDistance ?? null

  return (
    <section aria-label="Block inspector" className="shrink-0 space-y-3 rounded-2xl border border-white/10 bg-neutral-900/95 p-4 text-xs text-neutral-300 shadow-2xl">
      {block ? (
        <>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-medium text-neutral-100">Block {block.id}</h2>
            <button type="button" onClick={onClear} className="cursor-pointer rounded text-neutral-400 hover:text-white focus-visible:outline-2 focus-visible:outline-neutral-300">Clear selection</button>
          </div>
          <dl className="flex justify-between gap-3 font-mono">
            <dt className="text-neutral-400">{field}</dt>
            <dd>{value === null || !Number.isFinite(value) ? '—' : value.toLocaleString(undefined, { maximumFractionDigits: 3 })}</dd>
          </dl>
          {positions && distance !== null && (
            <>
              <div className="border-t border-white/10 pt-3">
                <p className="text-neutral-400">Predicted movement</p>
                <p className="mt-1 text-xl tabular-nums text-neutral-100">{Number.isFinite(distance) ? distance.toFixed(2) + ' m' : '—'}</p>
              </div>
              <table className="w-full text-right tabular-nums">
                <caption className="mb-2 text-left text-neutral-400">Coordinates (m)</caption>
                <thead>
                  <tr>
                    <th scope="col" className="sr-only">Axis</th>
                    <th scope="col" className="pb-2 font-normal">Pre</th>
                    <th scope="col" className="pb-2 font-normal">Predicted post</th>
                  </tr>
                </thead>
                <tbody>
                  {([['x', 'Easting'], ['y', 'Northing'], ['z', 'Elevation']] as const).map(([axis, label]) => (
                    <tr key={axis}>
                      <th scope="row" className="py-1 text-left font-normal text-neutral-400">{label}</th>
                      <td>{positions.pre[axis].toFixed(2)}</td>
                      <td>{positions.post[axis].toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </>
      ) : (
        <p>Click a block in the section to inspect it.</p>
      )}
    </section>
  )
}
