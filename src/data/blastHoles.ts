import { csvNumber } from '../utils/loadCsv'
import type { CsvRow } from '../utils/loadCsv'

export interface BlastHole {
  x: number
  y: number
  z: number
  depth: number
  angle: number
  bearing: number
}

const fields = ['XCOLLAR', 'YCOLLAR', 'ZCOLLAR', 'DEPTH', 'Angle', 'Bearing']

export function createBlastHoles(rows: readonly CsvRow[]): BlastHole[] {
  const holes: BlastHole[] = []
  for (const row of rows) {
    const values = fields.map((field) => csvNumber(row[field]))
    const [x, y, z, depth, angle, bearing] = values
    if (values.every(Number.isFinite) && depth > 0) holes.push({ x, y, z, depth, angle, bearing })
  }
  return holes
}
