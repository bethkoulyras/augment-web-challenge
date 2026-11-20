// @vitest-environment happy-dom

import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { parseBlocks } from '../src/data/blockModels'
import { useBlockFilters } from '../src/data/useBlockFilters'

afterEach(cleanup)

test('changing the cutoff keeps the block order stable and changing the colour field clears it', () => {
  const row = { PREN: '1', XC: '10', YC: '20', ZC: '30', XF: '14', YF: '20', ZF: '30', Xinc: '2', Yinc: '2', Zinc: '2', DISP_A: '4' }
  const blocks = parseBlocks([
    { ...row, IJK: '1', grade_01: '2', cat_1: '1' },
    { ...row, IJK: '2', grade_01: '10', cat_1: '2' },
  ])
  const onFilterChange = vi.fn()
  const { result } = renderHook(() => useBlockFilters(blocks, onFilterChange))

  act(() => result.current.changeMinimum(5))
  const sorted = result.current.orderedBlocks
  expect(sorted).toEqual([blocks[1], blocks[0]])
  expect(result.current.visibleCount).toBe(1)

  act(() => result.current.changeMinimum(1))
  expect(result.current.orderedBlocks).toBe(sorted)
  expect(result.current.visibleCount).toBe(2)

  act(() => result.current.changeColourField('cat_1'))
  expect(result.current.orderedBlocks).toBe(blocks)
  expect(result.current.minimum).toBeNull()
  expect(onFilterChange).toHaveBeenCalledTimes(3)

  act(() => result.current.changeCategoryCode(2))
  expect(result.current.modelBlocks).toEqual([blocks[1]])
  act(() => result.current.changeColourField('grade_01'))
  expect(result.current.categorySelection).toBeNull()
  expect(result.current.modelBlocks).toBe(blocks)
})
