import { Box3, BoxGeometry, DynamicDrawUsage, InstancedMesh, Matrix4, MeshLambertMaterial, Sphere, Vector3 } from 'three'
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js'
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js'
import { LineMaterial } from 'three/addons/lines/LineMaterial.js'
import { blockColourAttribute } from './blockColourAttribute'
import type { ColourScale } from '../data/blockColours'
import type { Block } from '../data/blockModels'

export class SectionMovement extends InstancedMesh<BoxGeometry, MeshLambertMaterial> {
  private readonly connectionCounts: number[] = []
  public readonly connections = new LineSegments2(
    new LineSegmentsGeometry(),
    new LineMaterial({ color: 0xa3a3a3, linewidth: 1.5, transparent: true, opacity: 0.25, depthTest: false, depthWrite: false }),
  )

  constructor(
    public readonly blocks: readonly Block[],
    private readonly origin: Vector3,
    includeConnections: boolean,
  ) {
    super(new BoxGeometry(1, 1, 1), new MeshLambertMaterial(), blocks.length)
    this.instanceMatrix.setUsage(DynamicDrawUsage)
    this.renderOrder = 1
    // Reveal the moving section through the context, keeping depth between its blocks.
    this.onBeforeRender = (renderer) => renderer.clearDepth()
    this.geometry.computeBoundingBox()
    const bounds = new Box3()
    const corner = new Vector3()
    const positions: number[] = []
    for (const start of blocks) {
      const end = start.predicted
      const halfWidth = start.width / 2
      const halfHeight = start.height / 2
      const halfDepth = start.depth / 2
      bounds.expandByPoint(corner.set(
        Math.min(start.x, end.x) - origin.x - halfWidth,
        Math.min(start.z, end.z) - origin.z - halfHeight,
        origin.y - Math.max(start.y, end.y) - halfDepth,
      ))
      bounds.expandByPoint(corner.set(
        Math.max(start.x, end.x) - origin.x + halfWidth,
        Math.max(start.z, end.z) - origin.z + halfHeight,
        origin.y - Math.min(start.y, end.y) + halfDepth,
      ))
      if (includeConnections) {
        if (start.movementDistance > 0) {
          positions.push(
            start.x - origin.x, start.z - origin.z, origin.y - start.y,
            end.x - origin.x, end.z - origin.z, origin.y - end.y,
          )
        }
        this.connectionCounts.push(positions.length / 6)
      }
    }
    this.boundingBox = bounds
    this.boundingSphere = bounds.getBoundingSphere(new Sphere())
    if (includeConnections) {
      this.connections.geometry.setPositions(positions)
      this.connections.renderOrder = 3
      this.add(this.connections)
    }
  }

  public setCount(count: number): void {
    this.count = count
    this.connections.geometry.instanceCount = this.connectionCounts[count - 1] ?? 0
  }

  public setProgress(progress: number, fromIndex = 0): void {
    if (fromIndex >= this.count) return
    const matrix = new Matrix4()
    const start = new Vector3()
    const end = new Vector3()
    for (let index = fromIndex; index < this.count; index += 1) {
      const pre = this.blocks[index]
      const post = pre.predicted
      start.set(pre.x - this.origin.x, pre.z - this.origin.z, this.origin.y - pre.y)
      end.set(post.x - this.origin.x, post.z - this.origin.z, this.origin.y - post.y)
      matrix.makeScale(pre.width, pre.height, pre.depth)
      matrix.setPosition(start.lerp(end, progress))
      this.setMatrixAt(index, matrix)
    }
    this.instanceMatrix.addUpdateRange(fromIndex * 16, (this.count - fromIndex) * 16)
    this.instanceMatrix.needsUpdate = true
  }

  public setColourScale(scale: ColourScale): void {
    this.instanceColor = blockColourAttribute(this.blocks, scale)
  }

  public blockBounds(index: number) {
    const matrix = new Matrix4()
    this.getMatrixAt(index, matrix)
    return this.geometry.boundingBox!.clone().applyMatrix4(matrix)
  }

  public override dispose(): void {
    super.dispose()
    this.geometry.dispose()
    this.material.dispose()
    this.connections.geometry.dispose()
    this.connections.material.dispose()
  }
}
