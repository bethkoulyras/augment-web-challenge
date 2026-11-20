import { Matrix4, Vector3 } from 'three'
import { expect, test, vi } from 'vitest'
import { createBlockModels } from '../src/data/blockModels'
import { countMinimumMatches } from '../src/data/blockColours'
import { createBlastBoundarySegments } from '../src/data/blastBoundary'
import { SectionMovement } from '../src/viewer/SectionMovement'
import { loadCsv } from '../src/utils/loadCsv'

const blockRow = {
  IJK: '101',
  PREN: '1',
  XC: '10',
  YC: '20',
  ZC: '30',
  XF: '14',
  YF: '26',
  ZF: '32',
  Xinc: '2',
  Yinc: '3',
  Zinc: '4',
  DISP_A: '7.48',
  grade_01: '0.6',
}

test('OMP rows produce paired pre-blast and predicted post-blast blocks', () => {
  const { pre, post } = createBlockModels([
    blockRow,
    { ...blockRow, IJK: '102', PREN: '0' },
    { ...blockRow, IJK: '' },
    { ...blockRow, IJK: '103', XC: '12', XF: '16' },
  ])

  expect(pre.map(({ id, x, y, z }) => [id, x, y, z])).toEqual([
    [101, 10, 20, 30],
    [103, 12, 20, 30],
  ])
  expect(post.map(({ id, x, y, z }) => [id, x, y, z])).toEqual([
    [101, 14, 26, 32],
    [103, 16, 26, 32],
  ])
  expect(post[0].movementDistance).toBe(7.48)
  expect(post[0].attributes.grade_01).toBe(0.6)
  expect(post[0].attributes.grade_02).toBeNull()
})

test('playback interpolates the block position while preserving its dimensions', ({ onTestFinished }) => {
  const { pre, post } = createBlockModels([blockRow])
  const movement = new SectionMovement(pre, post, new Vector3(10, 20, 30), false)
  onTestFinished(() => movement.dispose())

  const matrix = new Matrix4()
  const position = new Vector3()
  const samples = [
    [0, [0, 0, 0]],
    [0.5, [2, 1, -3]],
    [1, [4, 2, -6]],
  ] as const
  for (const [progress, expectedPosition] of samples) {
    movement.setProgress(progress)
    movement.getMatrixAt(0, matrix)
    expect(position.setFromMatrixPosition(matrix).toArray()).toEqual(expectedPosition)
  }
  expect(new Vector3().setFromMatrixScale(matrix).toArray()).toEqual([2, 4, 3])
})

test('grade filtering includes the cutoff, excludes missing grades, and resets to all blocks', () => {
  const { pre } = createBlockModels([
    { ...blockRow, grade_01: '0.9' },
    { ...blockRow, IJK: '102', grade_01: '0.4' },
    { ...blockRow, IJK: '103', grade_01: '0' },
    { ...blockRow, IJK: '104', grade_01: '' },
  ])

  expect(countMinimumMatches(pre, 'grade_01', 1)).toBe(0)
  expect(countMinimumMatches(pre, 'grade_01', 0.4)).toBe(2)
  expect(countMinimumMatches(pre, 'grade_01', 0)).toBe(3)
  expect(countMinimumMatches(pre, 'grade_01', null)).toBe(4)
})

test('blast boundaries follow point order and keep separate outlines apart', () => {
  const segments = createBlastBoundarySegments([
    { SID: 'A', PID: '10', X: '2', Y: '0', Z: '4' },
    { SID: 'B', PID: '2', X: '7', Y: '5', Z: '6' },
    { SID: 'A', PID: '1', X: '0', Y: '0', Z: '4' },
    { SID: 'B', PID: '1', X: '6', Y: '5', Z: '6' },
    { SID: 'A', PID: '2', X: '1', Y: '0', Z: '4' },
  ])

  expect(segments.map(({ x, y, z }) => [x, y, z])).toEqual([
    [0, 0, 4], [1, 0, 4],
    [1, 0, 4], [2, 0, 4],
    [6, 5, 6], [7, 5, 6],
  ])
})

test('a failed CSV request reports which file could not be loaded', async ({ onTestFinished }) => {
  const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 503 }))
  onTestFinished(() => { fetch.mockRestore() })

  const { signal } = new AbortController()
  await expect(loadCsv('/synthetic.csv', signal)).rejects.toThrow('Could not load /synthetic.csv')
})
