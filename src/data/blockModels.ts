import type { CsvRow } from '../utils/loadCsv'

export interface Block {
  id: number
  x: number
  y: number
  z: number
  width: number
  depth: number
  height: number
}

export interface BlockModels {
  pre: Block[]
  post: Block[]
}

export type ModelView = keyof BlockModels

export function createBlockModels(rows: CsvRow[]): BlockModels {
  const models: BlockModels = { pre: [], post: [] }

  for (const row of rows) {
    if (!row.IJK || Number(row.PREN) !== 1) continue

    const block: Block = {
      id: Number(row.IJK),
      x: Number(row.XC),
      y: Number(row.YC),
      z: Number(row.ZC),
      width: Number(row.Xinc),
      depth: Number(row.Yinc),
      height: Number(row.Zinc),
    }
    models.pre.push(block)
    models.post.push({ ...block, x: Number(row.XF), y: Number(row.YF), z: Number(row.ZF) })
  }

  return models
}
