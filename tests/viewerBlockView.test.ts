// @vitest-environment happy-dom

import { InstancedMesh, Matrix4, Vector3 } from 'three'
import type { Scene } from 'three'
import { expect, test, vi } from 'vitest'
import { parseBlocks } from '../src/data/blockModels'
import { SectionMovement } from '../src/viewer/SectionMovement'
import { Viewer } from '../src/viewer/Viewer'
import type { BlockView } from '../src/viewer/Viewer'

const draw = vi.hoisted(() => vi.fn<(scene: Scene) => void>())

vi.mock('three', async (importOriginal) => ({
  ...await importOriginal<typeof import('three')>(),
  WebGLRenderer: class {
    readonly domElement = document.createElement('canvas')
    render = draw
    setPixelRatio() {}
    dispose() {}
  },
}))

test('block updates apply the cutoff and initialize newly visible movement at the current progress', ({ onTestFinished }) => {
  vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame'] })
  onTestFinished(() => { vi.useRealTimers() })
  const row = { PREN: '1', XC: '10', YC: '20', ZC: '30', XF: '14', YF: '20', ZF: '30', Xinc: '2', Yinc: '2', Zinc: '2', DISP_A: '4' }
  const blocks = parseBlocks([{ ...row, IJK: '1' }, { ...row, IJK: '2', XC: '16', XF: '20' }])
  const ordered = [blocks[1], blocks[0]]
  const viewer = new Viewer(document.createElement('div'), blocks, () => {}, () => {})
  onTestFinished(() => viewer.dispose())
  const view: BlockView = {
    mode: 'model',
    visibleBlocks: ordered,
    visibleCount: 1,
    movementBlocks: ordered,
    movementCount: 1,
    colourScale: { kind: 'movement', field: 'movementDistance', min: 0, max: 4 },
    categorySelection: null,
    selectedBlock: null,
  }

  viewer.setBlockView(view)
  vi.advanceTimersToNextFrame()
  const [scene] = draw.mock.lastCall!
  const context = scene.children.find((child) => child instanceof InstancedMesh)!
  const movement = scene.children.find((child) => child instanceof SectionMovement)!
  const matrix = new Matrix4()
  expect(context.count).toBe(1)
  context.getMatrixAt(0, matrix)
  expect(new Vector3().setFromMatrixPosition(matrix).x).toBe(6)
  expect(movement.count).toBe(1)
  expect(movement.instanceColor).not.toBeNull()

  viewer.setMovementProgress(0.5)
  const matrixVersion = context.instanceMatrix.version
  viewer.setBlockView({ ...view, visibleCount: 2, movementCount: 2 })

  expect(context.count).toBe(2)
  expect(context.instanceMatrix.version).toBe(matrixVersion)
  expect(scene.children).toContain(movement)
  expect(movement.count).toBe(2)
  movement.getMatrixAt(1, matrix)
  expect(new Vector3().setFromMatrixPosition(matrix).x).toBe(2)
})
