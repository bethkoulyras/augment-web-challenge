import type { Block } from './Block'

export type ModelView = 'before' | 'after'

export interface BlockModel {
  before: Block[]
  after: Block[]
}
