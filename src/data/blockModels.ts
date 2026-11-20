import type { CsvRow } from '../utils/loadCsv'

export const gradeFields = [
  'grade_01', 'grade_02', 'grade_03', 'grade_04', 'grade_05', 'grade_06',
  'grade_07', 'grade_08', 'grade_09', 'grade_10', 'grade_11',
] as const
export const categoryFields = ['cat_1', 'cat_2', 'cat_3'] as const
export type GradeField = typeof gradeFields[number]
export type AttributeField = GradeField | typeof categoryFields[number]
export type ColourField = AttributeField | 'movementDistance'
const attributeFields = [...gradeFields, ...categoryFields]

export interface Block {
  id: number
  x: number
  y: number
  z: number
  width: number
  depth: number
  height: number
  movementDistance: number
  attributes: Record<AttributeField, number | null>
}

export interface BlockModels {
  pre: Block[]
  post: Block[]
}

export interface CategorySelection {
  field: typeof categoryFields[number]
  value: number
}

export interface GradeFilter {
  field: GradeField
  minimum: number
}

export function matchesGradeFilter(block: Block, filter: GradeFilter | null): boolean {
  if (!filter) return true
  const value = block.attributes[filter.field]
  return value !== null && Number.isFinite(value) && value >= filter.minimum
}

// Blocks are ordered from highest grade to lowest.
export function countGradeMatches(blocks: readonly Block[], filter: GradeFilter | null): number {
  if (!filter) return blocks.length
  let low = 0
  let high = blocks.length
  while (low < high) {
    const middle = Math.floor((low + high) / 2)
    if (matchesGradeFilter(blocks[middle], filter)) low = middle + 1
    else high = middle
  }
  return low
}

export type ModelView = keyof BlockModels

export function createBlockModels(rows: CsvRow[]): BlockModels {
  const models: BlockModels = { pre: [], post: [] }

  for (const row of rows) {
    if (!row.IJK || Number(row.PREN) !== 1) continue

    const attributes = Object.fromEntries(attributeFields.map((field) => [field, row[field]?.trim() ? Number(row[field]) : null])) as Record<AttributeField, number | null>
    const block: Block = {
      id: Number(row.IJK),
      x: Number(row.XC),
      y: Number(row.YC),
      z: Number(row.ZC),
      width: Number(row.Xinc),
      depth: Number(row.Yinc),
      height: Number(row.Zinc),
      movementDistance: Number(row.DISP_A),
      attributes,
    }
    models.pre.push(block)
    models.post.push({ ...block, x: Number(row.XF), y: Number(row.YF), z: Number(row.ZF) })
  }

  return models
}
