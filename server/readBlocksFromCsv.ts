import { categoryFields, gradeFields } from '../src/data/Block.ts'
import type { BlockAttributes, SourceBlock } from '../src/data/Block.ts'
import { readCsvRows, readNumber } from './readCsvRows.ts'

export const blockFields = ['IJK', 'XC', 'YC', 'ZC', 'Xinc', 'Yinc', 'Zinc'] as const

export async function readBlocksFromCsv(filePath: string): Promise<SourceBlock[]> {
  const blocks: SourceBlock[] = []
  const ids = new Set<number>()

  const attributeFields = [...gradeFields, ...categoryFields]
  await readCsvRows(filePath, [...blockFields, ...attributeFields], (row) => {
    const attributes = Object.fromEntries(attributeFields.map((field) => [field, row[field]?.trim() ? readNumber(row, field) : null])) as BlockAttributes
    const block: SourceBlock = {
      IJK: readNumber(row, 'IJK'),
      XC: readNumber(row, 'XC'),
      YC: readNumber(row, 'YC'),
      ZC: readNumber(row, 'ZC'),
      Xinc: readNumber(row, 'Xinc'),
      Yinc: readNumber(row, 'Yinc'),
      Zinc: readNumber(row, 'Zinc'),
      attributes,
    }
    if (!Number.isSafeInteger(block.IJK)) throw new Error('IJK must be a safe integer.')
    if (ids.has(block.IJK)) throw new Error('Duplicate IJK: ' + block.IJK + '.')
    if (block.Xinc <= 0 || block.Yinc <= 0 || block.Zinc <= 0) {
      throw new Error('Block dimensions must be greater than zero.')
    }
    ids.add(block.IJK)
    blocks.push(block)
  })

  return blocks
}
