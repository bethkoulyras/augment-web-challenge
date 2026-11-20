import { useMemo, useState } from 'react'
import { countMinimumMatches, createColourScales, sortBlocksByColour } from './blockColours'
import { categoryFields } from './blockModels'
import type { Block, ColourField } from './blockModels'

export function useBlockFilters(blocks: readonly Block[], onFilterChange: () => void) {
  const [colourField, setColourField] = useState<ColourField>('grade_01')
  const [minimum, setMinimum] = useState<number | null>(null)
  const [categoryCode, setCategoryCode] = useState<number | null>(null)

  const colourScales = useMemo(() => createColourScales(blocks), [blocks])
  const colourScale = colourScales.get(colourField)
  const hasMinimum = minimum !== null
  const filtered = hasMinimum || categoryCode !== null
  const orderedBlocks = useMemo(
    () => hasMinimum ? sortBlocksByColour(blocks, colourField) : blocks,
    [blocks, colourField, hasMinimum],
  )
  const categoryField = categoryFields.find((field) => field === colourField)
  const categorySelection = useMemo(
    () => categoryField && categoryCode !== null ? { field: categoryField, value: categoryCode } : null,
    [categoryField, categoryCode],
  )
  const categoryBlocks = useMemo(() => categorySelection
    ? orderedBlocks.filter((block) => block.attributes[categorySelection.field] === categorySelection.value)
    : null, [orderedBlocks, categorySelection])
  const visibleCount = countMinimumMatches(orderedBlocks, colourField, minimum)

  const changeColourField = (field: ColourField): void => {
    if (field === colourField) return
    setColourField(field)
    setMinimum(null)
    setCategoryCode(null)
    if (filtered) onFilterChange()
  }

  const changeCategoryCode = (value: number | null): void => {
    if (!categoryField || categoryCode === value) return
    setCategoryCode(value)
    onFilterChange()
  }

  const changeMinimum = (value: number | null): void => {
    setMinimum(value)
    onFilterChange()
  }

  return {
    colourField, colourScale, minimum, filtered, orderedBlocks, categorySelection, visibleCount,
    modelBlocks: categoryBlocks ?? orderedBlocks,
    modelCount: categoryBlocks?.length ?? visibleCount,
    changeColourField, changeCategoryCode, changeMinimum,
  }
}
