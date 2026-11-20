import { Color, InstancedBufferAttribute } from 'three'
import { colourForValue, colourValue } from '../data/blockColours'
import type { ColourScale } from '../data/blockColours'
import type { Block } from '../data/blockModels'

const cache = new WeakMap<readonly Block[], WeakMap<ColourScale, InstancedBufferAttribute>>()

export function blockColourAttribute(blocks: readonly Block[], scale: ColourScale): InstancedBufferAttribute {
  let scales = cache.get(blocks)
  if (!scales) {
    scales = new WeakMap()
    cache.set(blocks, scales)
  }
  const cached = scales.get(scale)
  if (cached) return cached

  const attribute = new InstancedBufferAttribute(new Float32Array(blocks.length * 3), 3)
  const colour = new Color()
  blocks.forEach((block, index) => {
    colour.setHex(colourForValue(scale, colourValue(block, scale.field)))
    attribute.setXYZ(index, colour.r, colour.g, colour.b)
  })
  scales.set(scale, attribute)
  return attribute
}
