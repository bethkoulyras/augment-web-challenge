import { csvNumber } from '../utils/loadCsv'
import type { CsvRow } from '../utils/loadCsv'

interface BoundaryPoint {
  x: number
  y: number
  z: number
}

export interface BlastBoundaries {
  pre: readonly BoundaryPoint[]
  post: readonly BoundaryPoint[]
}

export function createBlastBoundarySegments(rows: readonly CsvRow[]): BoundaryPoint[] {
  const strings = new Map<string, (BoundaryPoint & { order: number })[]>()
  for (const row of rows) {
    const stringId = row.SID?.trim()
    const order = csvNumber(row.PID)
    const x = csvNumber(row.X)
    const y = csvNumber(row.Y)
    const z = csvNumber(row.Z)
    if (!stringId || ![order, x, y, z].every(Number.isFinite)) {
      throw new Error('Invalid point in a blast boundary.')
    }
    const points = strings.get(stringId) ?? []
    points.push({ order, x, y, z })
    strings.set(stringId, points)
  }

  const segments: BoundaryPoint[] = []
  for (const points of strings.values()) {
    points.sort((a, b) => a.order - b.order)
    for (let index = 1; index < points.length; index++) segments.push(points[index - 1], points[index])
  }
  if (!segments.length) throw new Error('The blast boundary contains no line segments.')
  return segments
}
