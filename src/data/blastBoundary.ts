import type { CsvRow } from '../utils/loadCsv'

export interface BoundaryPoint {
  x: number
  y: number
  z: number
}

export interface BlastBoundaries {
  pre: readonly BoundaryPoint[]
  post: readonly BoundaryPoint[]
}

export function createBlastBoundarySegments(rows: readonly CsvRow[]): BoundaryPoint[] {
  const strings = new Map<string, CsvRow[]>()
  for (const row of rows) {
    if (!row.SID?.trim() || !['PID', 'X', 'Y', 'Z'].every((field) => row[field]?.trim() && Number.isFinite(Number(row[field])))) return []
    const points = strings.get(row.SID) ?? []
    points.push(row)
    strings.set(row.SID, points)
  }

  const segments: BoundaryPoint[] = []
  for (const points of strings.values()) {
    points.sort((a, b) => Number(a.PID) - Number(b.PID))
    const vertices = points.map((row) => ({ x: Number(row.X), y: Number(row.Y), z: Number(row.Z) }))
    for (let index = 1; index < vertices.length; index++) segments.push(vertices[index - 1], vertices[index])
  }
  return segments
}
