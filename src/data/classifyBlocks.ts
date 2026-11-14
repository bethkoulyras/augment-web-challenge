import type { PredictedBlock } from './BlockModel'

export interface BlockGroups {
  material: number[]
  context: number[]
  airCount: number
}

export function classifyBlocks(blocks: readonly PredictedBlock[]): BlockGroups {
  const groups: BlockGroups = { material: [], context: [], airCount: 0 }
  blocks.forEach((block, index) => {
    // PREN defines the material cohort in both views; PSTN describes grid locations.
    if (block.PREN === 1) groups.material.push(index)
    else if (block.PREN === 0) groups.airCount += 1
    else groups.context.push(index)
  })
  return groups
}
