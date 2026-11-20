import { useMemo } from 'react'
import type { Block } from '../data/blockModels'

interface SectionSliderProps {
  blocks: readonly Block[]
  position: number | null
  onChange: (position: number) => void
}

export default function SectionSlider({ blocks, position, onChange }: SectionSliderProps) {
  const range = useMemo(() => {
    let min = blocks[0]?.y ?? 0
    let max = min
    for (const block of blocks) {
      min = Math.min(min, block.y)
      max = Math.max(max, block.y)
    }
    return { min, max, step: blocks[0]?.depth ?? 1 }
  }, [blocks])
  const value = Math.min(range.max, Math.max(range.min, position ?? (range.min + range.max) / 2))
  const valueText = value.toFixed(1) + ' m'

  return (
    <div>
      <div className="flex items-baseline gap-2">
        <label htmlFor="section-position">Northing</label>
        <span className="text-neutral-400 tabular-nums">{valueText}</span>
      </div>
      <input
        id="section-position"
        type="range"
        min={range.min}
        max={range.max}
        step={range.step}
        value={value}
        aria-valuetext={valueText}
        onChange={(event) => onChange(event.currentTarget.valueAsNumber)}
        disabled={position === null || range.min === range.max}
        className="block h-6 w-full cursor-pointer accent-neutral-300 focus-visible:outline-2 focus-visible:outline-neutral-300 disabled:cursor-default disabled:opacity-40"
      />
      <div className="flex justify-between gap-2 text-neutral-400 tabular-nums">
        <span>{range.min.toFixed(1)} m</span>
        <span>{range.max.toFixed(1)} m</span>
      </div>
    </div>
  )
}
