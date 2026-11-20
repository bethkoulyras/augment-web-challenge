import { useMemo } from 'react'
import type { Block } from '../data/blockModels'

interface SectionSummaryProps {
  blocks: readonly Block[]
  totalCount: number
}

export default function SectionSummary({ blocks, totalCount }: SectionSummaryProps) {
  const stats = useMemo(() => {
    if (!blocks.length) return null
    let total = 0
    let furthest = 0
    for (const block of blocks) {
      total += block.movementDistance
      furthest = Math.max(furthest, block.movementDistance)
    }
    return { mean: total / blocks.length, furthest }
  }, [blocks])

  return (
    <section aria-label="Section movement summary" className="space-y-2 p-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-neutral-100">Predicted movement</h2>
        <span className="text-neutral-400">{blocks.length.toLocaleString()}{blocks.length !== totalCount && ' of ' + totalCount.toLocaleString()} blocks</span>
      </div>
      <dl className="grid grid-cols-2 gap-3">
        <div>
          <dt className="text-neutral-400">Mean movement</dt>
          <dd className="mt-1 text-lg tabular-nums text-neutral-100">{stats ? stats.mean.toFixed(1) + ' m' : '—'}</dd>
        </div>
        <div>
          <dt className="text-neutral-400">Furthest movement</dt>
          <dd className="mt-1 text-lg tabular-nums text-neutral-100">{stats ? stats.furthest.toFixed(1) + ' m' : '—'}</dd>
        </div>
      </dl>
    </section>
  )
}
