import { Box3, MathUtils, Vector3 } from 'three'
import type { PerspectiveCamera } from 'three'

interface CameraFrame {
  position: Vector3
  target: Vector3
  near: number
  far: number
}

function createFrame(target: Vector3, direction: Vector3, distance: number, radius: number): CameraFrame {
  return {
    position: target.clone().addScaledVector(direction, distance),
    target,
    near: Math.max(radius / 1000, 0.01),
    far: distance * 10 + radius,
  }
}

export function frameOverview(bounds: Box3, camera: Pick<PerspectiveCamera, 'fov' | 'aspect'>): CameraFrame {
  const target = bounds.getCenter(new Vector3())
  const radius = Math.max(bounds.getSize(new Vector3()).length() / 2, 1)
  const verticalFov = MathUtils.degToRad(camera.fov)
  const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect)
  const distance = radius / Math.sin(Math.min(verticalFov, horizontalFov) / 2)
  return createFrame(target, new Vector3(1, 0.9, 1.3).normalize(), distance, radius)
}

export function frameInspection(
  boxes: readonly Box3[],
  camera: Pick<PerspectiveCamera, 'fov' | 'up'>,
  viewport: { width: number; height: number; canvasHeight: number },
  minDistance: number,
): CameraFrame {
  const bounds = new Box3()
  for (const box of boxes) bounds.union(box)
  const target = bounds.getCenter(new Vector3())
  const radius = Math.max(bounds.getSize(new Vector3()).length() / 2, 1)
  const tanHalfFov = Math.tan(MathUtils.degToRad(camera.fov) / 2)
  const horizontalLimit = tanHalfFov * viewport.width / viewport.canvasHeight / 1.04
  const verticalLimit = tanHalfFov * viewport.height / viewport.canvasHeight / 1.04
  const direction = new Vector3(1, 0.8, 1.3).normalize()
  const right = new Vector3().crossVectors(camera.up, direction).normalize()
  const up = new Vector3().crossVectors(direction, right)
  const corner = new Vector3()
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity

  for (const box of boxes) {
    for (const x of [box.min.x, box.max.x]) {
      for (const y of [box.min.y, box.max.y]) {
        for (const z of [box.min.z, box.max.z]) {
          corner.set(x, y, z).sub(target)
          const horizontal = corner.dot(right)
          const vertical = corner.dot(up)
          const depth = corner.dot(direction)
          // Nearer corners appear larger in perspective.
          minX = Math.min(minX, horizontal - depth * horizontalLimit)
          maxX = Math.max(maxX, horizontal + depth * horizontalLimit)
          minY = Math.min(minY, vertical - depth * verticalLimit)
          maxY = Math.max(maxY, vertical + depth * verticalLimit)
        }
      }
    }
  }

  const distance = Math.max((maxX - minX) / (2 * horizontalLimit), (maxY - minY) / (2 * verticalLimit), minDistance)
  target.addScaledVector(right, (minX + maxX) / 2).addScaledVector(up, (minY + maxY) / 2)
  return createFrame(target, direction, distance, radius)
}
