import type { Block } from './Block'
import type { SceneLayers } from './SceneLayers'

export type ModelView = 'before' | 'after'

export type LocationClassification = -1 | 0 | 1 | null

export interface PredictedBlock extends Block {
  PREN: LocationClassification
  PSTN: LocationClassification
}

export interface BlockModel {
  layers: SceneLayers
  before: Block[]
  after: PredictedBlock[]
}
