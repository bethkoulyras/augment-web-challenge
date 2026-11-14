import {
  Box3,
  BoxGeometry,
  InstancedMesh,
  MathUtils,
  Matrix4,
  MeshNormalMaterial,
  PerspectiveCamera,
  Scene,
  Sphere,
  Vector3,
  WebGLRenderer,
} from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import type { Block } from '../data/Block'
import type { BlockModel, ModelView } from '../data/BlockModel'

export class Viewer {
  private readonly container: HTMLElement
  private readonly model: BlockModel
  private readonly origin = new Vector3()
  private readonly scene = new Scene()
  private readonly camera = new PerspectiveCamera(45, 1, 0.1, 100)
  private readonly modelBounds = new Box3()
  private readonly geometry = new BoxGeometry(1, 1, 1)
  private readonly material = new MeshNormalMaterial()
  private readonly renderer: WebGLRenderer
  private readonly controls: OrbitControls
  private readonly resizeObserver: ResizeObserver
  private blockMesh: InstancedMesh<BoxGeometry, MeshNormalMaterial> | null = null
  private view: ModelView = 'before'
  private disposed = false

  constructor(container: HTMLElement, model: BlockModel) {
    this.container = container
    this.model = model
    const first = model.before[0]
    if (first) this.origin.set(first.XC, first.YC, first.ZC)
    this.renderer = new WebGLRenderer({ antialias: true, alpha: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.container.appendChild(this.renderer.domElement)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.addEventListener('change', this.render)
    this.createBlocks()
    this.resizeObserver = new ResizeObserver(this.resize)
    this.resizeObserver.observe(this.container)
    this.resize()
    this.resetCamera()
    this.render()
  }

  public setView(view: ModelView): void {
    if (view === this.view) return
    this.view = view
    this.updateBlocks(this.model[view])
    this.render()
  }

  public resetCamera(): void {
    const centre = this.modelBounds.getCenter(new Vector3())
    const radius = Math.max(this.modelBounds.getSize(new Vector3()).length() / 2, 1)
    const verticalFov = MathUtils.degToRad(this.camera.fov)
    const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * this.camera.aspect)
    const distance = radius / Math.sin(Math.min(verticalFov, horizontalFov) / 2) * 1.1
    const direction = new Vector3(1, 0.9, 1.3).normalize()

    this.camera.position.copy(centre).addScaledVector(direction, distance)
    this.camera.near = Math.max(radius / 1000, 0.01)
    this.camera.far = distance * 10 + radius
    this.camera.updateProjectionMatrix()
    this.controls.target.copy(centre)
    this.controls.minDistance = radius * 0.01
    this.controls.maxDistance = distance * 5
    this.controls.update()
  }

  public dispose(): void {
    if (this.disposed) return
    this.disposed = true

    this.resizeObserver.disconnect()
    this.controls.removeEventListener('change', this.render)
    this.controls.dispose()
    this.blockMesh?.dispose()
    this.geometry.dispose()
    this.material.dispose()
    this.scene.clear()
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }

  private createBlocks(): void {
    const mesh = new InstancedMesh(this.geometry, this.material, this.model.before.length)
    const position = new Vector3()
    const halfSize = new Vector3()
    for (const blocks of [this.model.before, this.model.after]) {
      for (const block of blocks) {
        this.positionFor(block, position)
        halfSize.set(block.Xinc / 2, block.Zinc / 2, block.Yinc / 2)
        this.modelBounds.expandByPoint(position.sub(halfSize))
        this.modelBounds.expandByPoint(position.addScaledVector(halfSize, 2))
      }
    }
    mesh.boundingBox = this.modelBounds.clone()
    mesh.boundingSphere = this.modelBounds.getBoundingSphere(new Sphere())
    this.blockMesh = mesh
    this.updateBlocks(this.model.before)
    this.scene.add(mesh)
  }

  private updateBlocks(blocks: readonly Block[]): void {
    const mesh = this.blockMesh
    if (!mesh) return
    const matrix = new Matrix4()
    const position = new Vector3()
    mesh.count = blocks.length
    blocks.forEach((block, index) => {
      matrix.makeScale(block.Xinc, block.Zinc, block.Yinc)
      matrix.setPosition(this.positionFor(block, position))
      mesh.setMatrixAt(index, matrix)
    })

    mesh.instanceMatrix.needsUpdate = true
  }

  private positionFor(block: Block, target: Vector3): Vector3 {
    // Mining coordinates use Z-up; map (X, Y, Z) to Three.js (X, Z, -Y).
    return target.set(block.XC - this.origin.x, block.ZC - this.origin.z, -(block.YC - this.origin.y))
  }

  private readonly resize = (): void => {
    if (this.disposed) return

    const { clientWidth: width, clientHeight: height } = this.container
    if (width === 0 || height === 0) return

    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height)
    this.render()
  }

  private readonly render = (): void => {
    if (this.disposed) return
    this.renderer.render(this.scene, this.camera)
  }
}
