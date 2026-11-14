import type { Block } from '../src/data/Block.ts'
import { readCsvRows, readNumber } from './readCsvRows.ts'

export const blockFields = ['IJK', 'XC', 'YC', 'ZC', 'Xinc', 'Yinc', 'Zinc'] as const

export async function readBlocksFromCsv(filePath: string): Promise<Block[]> {
  const blocks: Block[] = []
  const ids = new Set<number>()

  await readCsvRows(filePath, blockFields, (row) => {
    const block: Block = {
      IJK: readNumber(row, 'IJK'),
      XC: readNumber(row, 'XC'),
      YC: readNumber(row, 'YC'),
      ZC: readNumber(row, 'ZC'),
      Xinc: readNumber(row, 'Xinc'),
      Yinc: readNumber(row, 'Yinc'),
      Zinc: readNumber(row, 'Zinc'),
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
