import type { Block, ColourField } from '../data/blockModels'

interface BlockInspectorProps {
  block: Block | null
  field: ColourField
  onClear: () => void
}

export default function BlockInspector({ block, field, onClear }: BlockInspectorProps) {
  const value = block ? block.attributes[field] : null

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
        </>
      ) : (
        <p>Click a block in the section to inspect it.</p>
      )}
    </section>
  )
}
