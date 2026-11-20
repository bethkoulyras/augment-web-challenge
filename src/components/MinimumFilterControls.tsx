import type { ColourScale } from '../data/blockColours'

interface MinimumFilterControlsProps {
  scale: Exclude<ColourScale, { kind: 'category' }>
  minimum: number | null
  onChange: (minimum: number | null) => void
}

export default function MinimumFilterControls({ scale, minimum, onChange }: MinimumFilterControlsProps) {
  const { min, max } = scale
  const step = min === null || max === null || min === max ? 1 : (max - min) / 20
  const movement = scale.kind === 'movement'
  const title = movement ? 'Movement filter' : 'Grade filter'
  const id = movement ? 'minimum-movement' : 'minimum-grade'
  const allValues = movement ? 'All distances' : 'All values'
  const cutoff = minimum === null
    ? null
    : minimum.toLocaleString(undefined, { maximumSignificantDigits: 4 }) + (movement ? ' m' : '')

  return (
    <div role="group" aria-label={title} className="space-y-3 border-t border-white/10 pt-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-neutral-100">{title}</h2>
        <button type="button" disabled={minimum === null} onClick={() => onChange(null)} className="cursor-pointer rounded text-neutral-400 hover:text-white focus-visible:outline-2 focus-visible:outline-neutral-300 disabled:cursor-default disabled:opacity-40">Reset</button>
      </div>
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id}>{movement ? 'Distance moved' : 'Grade'}</label>
        <output htmlFor={id} className="tabular-nums">{cutoff === null ? allValues : '≥ ' + cutoff}</output>
      </div>
      <input
        id={id}
        type="range"
        min={min ?? 0}
        max={max ?? 0}
        step={step}
        value={minimum ?? min ?? 0}
        disabled={min === null || max === null || min === max}
        aria-valuetext={cutoff === null ? allValues : 'At least ' + cutoff}
        onChange={(event) => onChange(event.currentTarget.valueAsNumber)}
        className="block w-full cursor-pointer accent-neutral-300 disabled:cursor-default disabled:opacity-40"
      />
    </div>
  )
}
