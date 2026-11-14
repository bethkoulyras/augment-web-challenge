import type { BlockModel, PredictedBlock, LocationClassification } from '../src/data/BlockModel.ts'
import { blockFields, readBlocksFromCsv } from './readBlocksFromCsv.ts'
import { readCsvRows, readNumber } from './readCsvRows.ts'

function readClassification(row: Record<string, string>, field: 'PREN' | 'PSTN'): LocationClassification {
  if (!row[field]?.trim()) return null
  const value = readNumber(row, field)
  if (value !== -1 && value !== 0 && value !== 1) throw new Error(field + ' must be -1, 0, 1, or blank.')
  return value
}

export async function readBlockModelFromCsv(blockModelPath: string, muckpileModelPath: string): Promise<Omit<BlockModel, 'layers'>> {
  const before = await readBlocksFromCsv(blockModelPath)
  const originalById = new Map(before.map((block) => [block.IJK, block]))
  const predictedById = new Map<number, PredictedBlock>()

  await readCsvRows(muckpileModelPath, [...blockFields, 'XF', 'YF', 'ZF', 'PREN', 'PSTN'], (row) => {
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
      IJK: original.IJK,
      Xinc: original.Xinc,
      Yinc: original.Yinc,
      Zinc: original.Zinc,
      XC: readNumber(row, 'XF'),
      YC: readNumber(row, 'YF'),
      ZC: readNumber(row, 'ZF'),
      PREN: readClassification(row, 'PREN'),
      PSTN: readClassification(row, 'PSTN'),
    })
  })

  const after = before.map((block) => {
    const predicted = predictedById.get(block.IJK)
    if (!predicted) throw new Error('No OMP prediction for IJK: ' + block.IJK + '.')
    return predicted
  })

  return { before, after }
}
