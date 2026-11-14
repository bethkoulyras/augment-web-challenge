import type { Block } from '../src/data/Block.ts'
import type { BlockModel } from '../src/data/BlockModel.ts'
import { blockFields, readBlocksFromCsv } from './readBlocksFromCsv.ts'
import { readCsvRows, readNumber } from './readCsvRows.ts'

export async function readBlockModelFromCsv(blockModelPath: string, muckpileModelPath: string): Promise<BlockModel> {
  const before = await readBlocksFromCsv(blockModelPath)
  const originalById = new Map(before.map((block) => [block.IJK, block]))
  const predictedById = new Map<number, Block>()

  await readCsvRows(muckpileModelPath, [...blockFields, 'XF', 'YF', 'ZF'], (row) => {
    // The output also contains grid locations without an input block ID.
    if (!row.IJK?.trim()) return
    const id = readNumber(row, 'IJK')
    const original = originalById.get(id)
    if (!original) throw new Error('No input block for output IJK: ' + id + '.')
    if (predictedById.has(id)) throw new Error('Duplicate output IJK: ' + id + '.')
    for (const field of blockFields) {
      if (readNumber(row, field) !== original[field]) {
        throw new Error('Input geometry differs for IJK: ' + id + '.')
      }
    }

    predictedById.set(id, {
      ...original,
      XC: readNumber(row, 'XF'),
      YC: readNumber(row, 'YF'),
      ZC: readNumber(row, 'ZF'),
    })
  })

  const after = before.map((block) => {
    const predicted = predictedById.get(block.IJK)
    if (!predicted) throw new Error('No OMP prediction for IJK: ' + block.IJK + '.')
    return predicted
  })

  return { before, after }
}
