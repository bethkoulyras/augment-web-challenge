import { Box3, Matrix4, PerspectiveCamera, Vector3 } from 'three'
import { expect, test, vi } from 'vitest'
import { parseBlocks } from '../src/data/blockModels'
import { countMinimumMatches, sortBlocksByColour } from '../src/data/blockColours'
import { createBlastBoundarySegments } from '../src/data/blastBoundary'
import { SectionMovement } from '../src/viewer/SectionMovement'
import { frameInspection } from '../src/viewer/cameraFraming'
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
  const blocks = parseBlocks([
    blockRow,
    { ...blockRow, IJK: '102', PREN: '0' },
    { ...blockRow, IJK: '' },
    { ...blockRow, IJK: '103', XC: '12', XF: '16' },
  ])

  expect(blocks.map(({ id, x, y, z }) => [id, x, y, z])).toEqual([
    [101, 10, 20, 30],
    [103, 12, 20, 30],
  ])
  expect(blocks.map(({ predicted }) => predicted)).toEqual([
    { x: 14, y: 26, z: 32 },
    { x: 16, y: 26, z: 32 },
  ])
  expect(blocks[0].movementDistance).toBe(7.48)
  expect(blocks[0].attributes.grade_01).toBe(0.6)
  expect(blocks[0].attributes.grade_02).toBeNull()
})

test('the block loader rejects missing coordinates and invalid dimensions', () => {
  expect(() => parseBlocks([{ ...blockRow, XF: '' }])).toThrow('Invalid geometry or movement')
  expect(() => parseBlocks([{ ...blockRow, Xinc: '0' }])).toThrow('Invalid geometry or movement')
})

test('playback interpolates the block position while preserving its dimensions', ({ onTestFinished }) => {
  const blocks = parseBlocks([blockRow])
  const movement = new SectionMovement(blocks, new Vector3(10, 20, 30), false)
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

test('inspection framing fits both block positions in the space available', () => {
  const boxes = [
    new Box3(new Vector3(0, 0, 0), new Vector3(5, 5, 5)),
    new Box3(new Vector3(20, -3, 40), new Vector3(25, 2, 45)),
  ]
  const viewport = { width: 540, height: 480, canvasHeight: 740 }
  const canvasWidth = 1000
  const camera = new PerspectiveCamera(45, canvasWidth / viewport.canvasHeight)
  const frame = frameInspection(boxes, camera, viewport, 25)
  camera.position.copy(frame.position)
  camera.lookAt(frame.target)
  camera.updateMatrixWorld()

  for (const { min, max } of boxes) {
    for (const x of [min.x, max.x]) {
      for (const y of [min.y, max.y]) {
        for (const z of [min.z, max.z]) {
          const point = new Vector3(x, y, z).project(camera)
          expect(Math.abs(point.x)).toBeLessThan(viewport.width / canvasWidth)
          expect(Math.abs(point.y)).toBeLessThan(viewport.height / viewport.canvasHeight)
        }
      }
    }
  }
})

test('grade filtering sorts the blocks, includes the cutoff, and restores missing grades on reset', () => {
  const blocks = parseBlocks([
    { ...blockRow, grade_01: '0.4' },
    { ...blockRow, IJK: '102', grade_01: 'NaN' },
    { ...blockRow, IJK: '103', grade_01: '0.9' },
    { ...blockRow, IJK: '104', grade_01: '0' },
  ])
  const ordered = sortBlocksByColour(blocks, 'grade_01')

  expect(ordered.map((block) => block.attributes.grade_01)).toEqual([0.9, 0.4, 0, null])
  expect(countMinimumMatches(ordered, 'grade_01', 1)).toBe(0)
  expect(countMinimumMatches(ordered, 'grade_01', 0.4)).toBe(2)
  expect(countMinimumMatches(ordered, 'grade_01', 0)).toBe(3)
  expect(countMinimumMatches(ordered, 'grade_01', null)).toBe(4)
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

test('empty or invalid blast boundaries are reported as data errors', () => {
  expect(() => createBlastBoundarySegments([])).toThrow('no line segments')
  expect(() => createBlastBoundarySegments([
    { SID: 'A', PID: '1', X: '', Y: '0', Z: '4' },
  ])).toThrow('Invalid point')
})

test('a failed CSV request reports which file could not be loaded', async ({ onTestFinished }) => {
  const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 503 }))
  onTestFinished(() => { fetch.mockRestore() })

  const { signal } = new AbortController()
  await expect(loadCsv('/synthetic.csv', signal)).rejects.toThrow('Could not load /synthetic.csv')
})

test('a missing CSV served as an HTML fallback is reported as unavailable', async ({ onTestFinished }) => {
  const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('<!doctype html>', {
    headers: { 'content-type': 'text/html' },
  }))
  onTestFinished(() => fetch.mockRestore())

  const { signal } = new AbortController()
  await expect(loadCsv('/synthetic.csv', signal)).rejects.toThrow('Could not load /synthetic.csv')
})
