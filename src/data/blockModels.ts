import { csvNumber } from '../utils/loadCsv'
import type { CsvRow } from '../utils/loadCsv'

export const gradeFields = [
  'grade_01', 'grade_02', 'grade_03', 'grade_04', 'grade_05', 'grade_06',
  'grade_07', 'grade_08', 'grade_09', 'grade_10', 'grade_11',
] as const
export const categoryFields = ['cat_1', 'cat_2', 'cat_3'] as const
type AttributeField = typeof gradeFields[number] | typeof categoryFields[number]
export type ColourField = AttributeField | 'movementDistance'
const attributeFields = [...gradeFields, ...categoryFields]

export interface Position {
  x: number
  y: number
  z: number
}

export interface Block extends Position {
  id: number
  predicted: Position
  width: number
  depth: number
  height: number
  movementDistance: number
  attributes: Record<AttributeField, number | null>
}

export interface CategorySelection {
  field: typeof categoryFields[number]
  value: number
}

export function parseBlocks(rows: readonly CsvRow[]): Block[] {
  const blocks: Block[] = []

  for (const [index, row] of rows.entries()) {
    if (!row.IJK?.trim() || Number(row.PREN) !== 1) continue

    const id = csvNumber(row.IJK)
    const x = csvNumber(row.XC)
    const y = csvNumber(row.YC)
    const z = csvNumber(row.ZC)
    const predicted = { x: csvNumber(row.XF), y: csvNumber(row.YF), z: csvNumber(row.ZF) }
    const width = csvNumber(row.Xinc)
    const depth = csvNumber(row.Yinc)
    const height = csvNumber(row.Zinc)
    const movementDistance = csvNumber(row.DISP_A)
    if (
      !Number.isSafeInteger(id) ||
      ![x, y, z, predicted.x, predicted.y, predicted.z, width, depth, height, movementDistance].every(Number.isFinite) ||
      width <= 0 || depth <= 0 || height <= 0 || movementDistance < 0
    ) {
      throw new Error('Invalid geometry or movement in block model record ' + (index + 1) + '.')
    }

    const attributes = {} as Block['attributes']
    for (const field of attributeFields) {
      const value = csvNumber(row[field])
      attributes[field] = Number.isFinite(value) ? value : null
    }
    blocks.push({ id, x, y, z, predicted, width, depth, height, movementDistance, attributes })
  }

  if (!blocks.length) throw new Error('The block model file contains no usable blocks.')
  return blocks
}
