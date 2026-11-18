import { BoxGeometry, BufferGeometry, Color, DynamicDrawUsage, InstancedMesh, LineBasicMaterial, LineSegments, Matrix4, MeshLambertMaterial, Points, PointsMaterial, Sphere, Vector3 } from 'three'
import { colourForValue } from '../data/blockColours'
import type { ColourScale } from '../data/blockColours'
import type { Block } from '../data/blockModels'

export class SectionMovement extends InstancedMesh<BoxGeometry, MeshLambertMaterial> {
  public readonly connections = new LineSegments(
    new BufferGeometry(),
    new LineBasicMaterial({ color: 0xa3a3a3, transparent: true, opacity: 0.5, depthTest: false, depthWrite: false }),
  )

  private readonly endpoints = new Points(
    new BufferGeometry(),
    new PointsMaterial({ size: 3, sizeAttenuation: false, color: 0xd4d4d4, transparent: true, opacity: 0.9, depthTest: false, depthWrite: false }),
  )

  constructor(
    public readonly pre: readonly Block[],
    public readonly post: readonly Block[],
    private readonly origin: Vector3,
  ) {
    super(new BoxGeometry(1, 1, 1), new MeshLambertMaterial(), pre.length)
    this.instanceMatrix.setUsage(DynamicDrawUsage)
    this.renderOrder = 1
    // Reveal the moving section through the context, keeping depth between its blocks.
    this.onBeforeRender = (renderer) => renderer.clearDepth()
    this.setProgress(0)
    this.computeBoundingBox()
    const bounds = this.boundingBox!.clone()
    this.setProgress(1)
    this.computeBoundingBox()
    bounds.union(this.boundingBox!)
    this.boundingBox = bounds
    this.boundingSphere = bounds.getBoundingSphere(new Sphere())
    this.setProgress(0)

    const points: Vector3[] = []
    const destinations: Vector3[] = []
    pre.forEach((start, index) => {
      if (start.movementDistance > 0) {
        const end = post[index]
        const destination = new Vector3(end.x - origin.x, end.z - origin.z, origin.y - end.y)
        points.push(
          new Vector3(start.x - origin.x, start.z - origin.z, origin.y - start.y),
          destination,
        )
        destinations.push(destination)
      }
    })
    this.connections.geometry.setFromPoints(points)
    this.endpoints.geometry.setFromPoints(destinations)
    this.connections.renderOrder = 3
    this.endpoints.renderOrder = 4
    this.connections.add(this.endpoints)
    this.add(this.connections)
  }

  public setProgress(progress: number): void {
    const matrix = new Matrix4()
    const start = new Vector3()
    const end = new Vector3()
    this.pre.forEach((pre, index) => {
      const post = this.post[index]
      start.set(pre.x - this.origin.x, pre.z - this.origin.z, this.origin.y - pre.y)
      end.set(post.x - this.origin.x, post.z - this.origin.z, this.origin.y - post.y)
      matrix.makeScale(pre.width, pre.height, pre.depth)
      matrix.setPosition(start.lerp(end, progress))
      this.setMatrixAt(index, matrix)
    })
    this.instanceMatrix.needsUpdate = true
  }

  public setColourScale(scale: ColourScale): void {
    const colour = new Color()
    this.pre.forEach((block, index) => {
      colour.setHex(colourForValue(scale, block.attributes[scale.field]))
      this.setColorAt(index, colour)
    })
    if (this.instanceColor) this.instanceColor.needsUpdate = true
    this.material.needsUpdate = true
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
    this.endpoints.geometry.dispose()
    this.endpoints.material.dispose()
  }
}
