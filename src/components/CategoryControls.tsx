import { useState } from 'react'
import { categoryFields } from '../data/blockModels'
import type { CategorySelection, ColourField } from '../data/blockModels'
import type { ColourScale } from '../data/blockColours'

interface CategoryControlsProps {
  colourScales: ReadonlyMap<ColourField, ColourScale>
  selection: CategorySelection | null
  collapsed: boolean
  onToggle: () => void
  onChange: (selection: CategorySelection | null) => void
}

export default function CategoryControls({ colourScales, selection, collapsed, onToggle, onChange }: CategoryControlsProps) {
  const [field, setField] = useState<CategorySelection['field']>('cat_1')
  const scale = colourScales.get(field)

  return (
    <section aria-label="Select a category" className="shrink-0 space-y-3 rounded-2xl border border-white/10 bg-neutral-900/95 p-4 text-xs text-neutral-300 shadow-2xl">
      <button type="button" aria-expanded={!collapsed} onClick={onToggle} className="flex w-full cursor-pointer items-center justify-between rounded text-left focus-visible:outline-2 focus-visible:outline-neutral-300">
        <span>Select a category</span>
        <span aria-hidden="true">{collapsed ? '▾' : '▴'}</span>
      </button>
      {selection && (
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono">{selection.field} | Code {selection.value}</span>
          <button type="button" onClick={() => onChange(null)} className="cursor-pointer rounded text-neutral-400 hover:text-white focus-visible:outline-2 focus-visible:outline-neutral-300">Show all</button>
        </div>
      )}
      {!collapsed && (
        <>
          <div role="group" aria-label="Category field" className="grid grid-cols-3 gap-1.5">
            {categoryFields.map((category) => (
              <button key={category} type="button" aria-pressed={field === category} onClick={() => { if (field !== category) { setField(category); onChange(null) } }} className="cursor-pointer rounded-md border border-neutral-700 bg-neutral-800/40 px-2 py-2 font-mono text-neutral-400 hover:text-white focus-visible:outline-2 focus-visible:outline-neutral-300 aria-pressed:border-neutral-500 aria-pressed:bg-neutral-700 aria-pressed:text-white">{category}</button>
            ))}
          </div>
          <div role="group" aria-label="Category code" className="flex flex-wrap gap-1.5">
            <button type="button" aria-pressed={!selection} onClick={() => onChange(null)} className="cursor-pointer rounded-md border border-neutral-700 px-3 py-2 text-neutral-400 hover:text-white focus-visible:outline-2 focus-visible:outline-neutral-300 aria-pressed:border-neutral-500 aria-pressed:bg-neutral-700 aria-pressed:text-white">All</button>
            {scale?.kind === 'category' && scale.entries.map(({ value }) => (
              <button key={value} type="button" aria-pressed={selection?.field === field && selection.value === value} onClick={() => onChange({ field, value })} className="cursor-pointer rounded-md border border-neutral-700 px-3 py-2 text-neutral-400 hover:text-white focus-visible:outline-2 focus-visible:outline-neutral-300 aria-pressed:border-neutral-500 aria-pressed:bg-neutral-700 aria-pressed:text-white">Code {value}</button>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
