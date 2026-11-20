import type { GradeField, GradeFilter } from '../data/blockModels'
import type { ColourScale } from '../data/blockColours'

interface GradeFilterControlsProps {
  scale: ColourScale
  field: GradeField
  filter: GradeFilter | null
  onChange: (filter: GradeFilter | null) => void
}

export default function GradeFilterControls({ scale, field, filter, onChange }: GradeFilterControlsProps) {
  if (scale.kind !== 'grade') return null
  const { min, max } = scale
  const minimum = filter?.minimum ?? min
  const step = min === null || max === null || min === max ? 1 : (max - min) / 20

  return (
    <div role="group" aria-label="Grade filter" className="space-y-3 border-t border-white/10 pt-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-neutral-100">Grade filter</h2>
        <button type="button" disabled={!filter} onClick={() => onChange(null)} className="cursor-pointer rounded text-neutral-400 hover:text-white focus-visible:outline-2 focus-visible:outline-neutral-300 disabled:cursor-default disabled:opacity-40">Reset</button>
      </div>
      <label htmlFor="minimum-grade" className="flex items-center justify-between gap-3">
        <span>Minimum {field}</span>
        <output className="tabular-nums">{filter ? '≥ ' + filter.minimum.toLocaleString(undefined, { maximumSignificantDigits: 4 }) : 'All values'}</output>
      </label>
      <input
        id="minimum-grade"
        type="range"
        min={min ?? 0}
        max={max ?? 0}
        step={step}
        value={minimum ?? 0}
        disabled={min === null || max === null || min === max}
        onChange={(event) => onChange({ field, minimum: event.currentTarget.valueAsNumber })}
        className="block w-full cursor-pointer accent-neutral-300 disabled:cursor-default disabled:opacity-40"
      />
    </div>
  )
}
