import {
  Box3,
  BoxGeometry,
  InstancedMesh,
  MathUtils,
  Matrix4,
  MeshNormalMaterial,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer,
} from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import type { Block } from '../data/Block'

export class Viewer {
  private readonly container: HTMLElement
  private readonly scene = new Scene()
  private readonly camera = new PerspectiveCamera(45, 1, 0.1, 100)
  private readonly modelBounds = new Box3()
  private readonly geometry = new BoxGeometry(1, 1, 1)
  private readonly material = new MeshNormalMaterial()
  private readonly renderer: WebGLRenderer
  private readonly controls: OrbitControls
  private readonly resizeObserver: ResizeObserver
  private blockMesh: InstancedMesh<BoxGeometry, MeshNormalMaterial> | null = null
  private disposed = false

  constructor(container: HTMLElement, blocks: readonly Block[]) {
    this.container = container
    this.renderer = new WebGLRenderer({ antialias: true, alpha: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.container.appendChild(this.renderer.domElement)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.addEventListener('change', this.render)
    this.createBlocks(blocks)
    this.resizeObserver = new ResizeObserver(this.resize)
    this.resizeObserver.observe(this.container)
    this.resize()
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

  private createBlocks(blocks: readonly Block[]): void {
    const origin = blocks[0]
    if (!origin) return

    const mesh = new InstancedMesh(this.geometry, this.material, blocks.length)
    const matrix = new Matrix4()

    blocks.forEach((block, index) => {
      // Mining coordinates use Z-up; map (X, Y, Z) to Three.js (X, Z, -Y).
      matrix.makeScale(block.Xinc, block.Zinc, block.Yinc)
      matrix.setPosition(block.XC - origin.XC, block.ZC - origin.ZC, -(block.YC - origin.YC))
      mesh.setMatrixAt(index, matrix)
    })

    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingBox()
    mesh.computeBoundingSphere()
    if (mesh.boundingBox) this.modelBounds.copy(mesh.boundingBox)
    this.blockMesh = mesh
    this.scene.add(mesh)
  }

  private readonly resize = (): void => {
    if (this.disposed) return

    const { clientWidth: width, clientHeight: height } = this.container
    if (width === 0 || height === 0) return

    this.camera.aspect = width / height
    this.renderer.setSize(width, height)
    this.resetCamera()
    this.render()
  }

  private readonly render = (): void => {
    if (this.disposed) return
    this.renderer.render(this.scene, this.camera)
  }
}
