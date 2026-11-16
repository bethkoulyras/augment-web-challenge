import { useMemo } from 'react'
import type { Block } from '../data/blockModels'

interface SectionSliderProps {
  blocks: readonly Block[]
  position: number
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

  return (
    <div className="absolute right-6 bottom-28 left-6 z-10 mx-auto max-w-lg rounded-xl border border-neutral-700 bg-neutral-900/95 px-4 py-3 text-xs text-neutral-300 shadow-lg sm:left-92">
      <div className="mb-2 flex justify-between">
        <label htmlFor="section-position">Northing</label>
        <span className="tabular-nums">{position.toFixed(1)} m</span>
      </div>
      <input
        id="section-position"
        type="range"
        min={range.min}
        max={range.max}
        step={range.step}
        value={Math.min(range.max, Math.max(range.min, position))}
        onChange={(event) => onChange(event.currentTarget.valueAsNumber)}
        disabled={range.min === range.max}
        className="block w-full cursor-pointer accent-neutral-300"
      />
      <div className="mt-2 flex justify-between text-neutral-500 tabular-nums">
        <span>{range.min.toFixed(1)} m</span>
        <span>{range.max.toFixed(1)} m</span>
      </div>
    </div>
  )
}
