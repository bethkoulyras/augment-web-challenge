import { categoryFields } from './Block'
import type { AttributeField } from './Block'
import type { BlockModel } from './BlockModel'

export const missingColour = 0x8c939e
export const gradientStops = [0x440154, 0x3b528b, 0x21918c, 0x5ec962, 0xfde725]
const categoryPalette = [0x56b4e9, 0xe69f00, 0x009e73, 0xcc79a7, 0xf0e442, 0x0072b2]

export type ColourScale = { field: AttributeField; missingCount: number } & (
  | { kind: 'category'; entries: { value: number; colour: number }[] }
  | { kind: 'numeric'; min: number | null; max: number | null }
)

export function createColourScale(model: BlockModel, indices: readonly number[], field: AttributeField): ColourScale {
  const categorical = (categoryFields as readonly string[]).includes(field)
  const values = new Set<number>()
  let min = Infinity
  let max = -Infinity
  let missingCount = 0
  for (const index of indices) {
    const value = model.before[index].attributes[field]
    if (value === null) { missingCount += 1; continue }
    if (categorical) values.add(value)
    else { min = Math.min(min, value); max = Math.max(max, value) }
  }
  if (categorical) return { field, missingCount, kind: 'category', entries: [...values].sort((a, b) => a - b).map((value, index) => ({ value, colour: categoryPalette[index % categoryPalette.length] })) }
  return { field, missingCount, kind: 'numeric', min: Number.isFinite(min) ? min : null, max: Number.isFinite(max) ? max : null }
}

export function colourForValue(scale: ColourScale, value: number | null): number {
  if (value === null) return missingColour
  if (scale.kind === 'category') return scale.entries.find((entry) => entry.value === value)?.colour ?? missingColour
  if (scale.min === null || scale.max === null) return missingColour
  const fraction = scale.min === scale.max ? 0.5 : Math.max(0, Math.min(1, (value - scale.min) / (scale.max - scale.min)))
  const position = fraction * (gradientStops.length - 1)
  const index = Math.min(Math.floor(position), gradientStops.length - 2)
  const blend = position - index
  const from = gradientStops[index]
  const to = gradientStops[index + 1]
  const channel = (shift: number): number => Math.round(((from >> shift) & 255) * (1 - blend) + ((to >> shift) & 255) * blend)
  return (channel(16) << 16) | (channel(8) << 8) | channel(0)
}

export const colourCss = (hex: number): string => '#' + hex.toString(16).padStart(6, '0')
