import {
  AmbientLight,
  Box3,
  BoxGeometry,
  Color,
  DirectionalLight,
  InstancedMesh,
  MathUtils,
  Matrix4,
  MeshLambertMaterial,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer,
} from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { colourForValue } from '../data/blockColours'
import type { ColourScale } from '../data/blockColours'
import type { BlockModels, ModelView } from '../data/blockModels'

export class Viewer {
  private readonly container: HTMLElement
  private readonly models: BlockModels
  private readonly scene = new Scene()
  private readonly camera = new PerspectiveCamera(45, 1, 0.1, 100)
  private readonly geometry = new BoxGeometry(1, 1, 1)
  private readonly material = new MeshLambertMaterial({ color: 0xffffff })
  private readonly mesh: InstancedMesh
  private readonly origin = new Vector3()
  private readonly bounds = new Box3()
  private readonly renderer: WebGLRenderer
  private readonly controls: OrbitControls
  private readonly resizeObserver: ResizeObserver
  private disposed = false

  constructor(container: HTMLElement, models: BlockModels) {
    this.container = container
    this.models = models
    const first = models.pre[0]
    if (first) this.origin.set(first.x, first.y, first.z)

    this.renderer = new WebGLRenderer({ antialias: true, alpha: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(this.renderer.domElement)
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.addEventListener('change', this.render)

    this.mesh = new InstancedMesh(this.geometry, this.material, models.pre.length)
    const light = new DirectionalLight(0xffffff, 1.8)
    light.position.set(1, 3, 2)
    this.scene.add(this.mesh, new AmbientLight(0xffffff, 0.8), light)

    this.setView('pre')
    this.bounds.setFromObject(this.mesh)

    this.resizeObserver = new ResizeObserver(this.resize)
    this.resizeObserver.observe(container)
    this.resize()
    this.resetCamera()
  }

  public setView(view: ModelView): void {
    const matrix = new Matrix4()
    this.models[view].forEach((block, index) => {
      matrix.makeScale(block.width, block.height, block.depth)
      // Mining Z is elevation; Three.js uses Y as the vertical axis.
      matrix.setPosition(block.x - this.origin.x, block.z - this.origin.z, -(block.y - this.origin.y))
      this.mesh.setMatrixAt(index, matrix)
    })
    this.mesh.instanceMatrix.needsUpdate = true
    this.mesh.computeBoundingBox()
    this.mesh.computeBoundingSphere()
    this.render()
  }

  public setColourScale(scale: ColourScale): void {
    const firstUpdate = this.mesh.instanceColor === null
    const colour = new Color()
    this.models.pre.forEach((block, index) => {
      colour.setHex(colourForValue(scale, block.attributes[scale.field]))
      this.mesh.setColorAt(index, colour)
    })
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true
    if (firstUpdate) this.material.needsUpdate = true
    this.render()
  }

  public resetCamera(): void {
    const centre = this.bounds.getCenter(new Vector3())
    const radius = Math.max(this.bounds.getSize(new Vector3()).length() / 2, 1)
    const verticalFov = MathUtils.degToRad(this.camera.fov)
    const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * this.camera.aspect)
    const distance = radius / Math.sin(Math.min(verticalFov, horizontalFov) / 2) * 1.1
    this.camera.position.copy(centre).addScaledVector(new Vector3(1, 0.9, 1.3).normalize(), distance)
    this.camera.near = Math.max(radius / 1000, 0.01)
    this.camera.far = distance * 10 + radius
    this.camera.updateProjectionMatrix()
    this.controls.target.copy(centre)
    this.controls.update()
  }

  public dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.resizeObserver.disconnect()
    this.controls.removeEventListener('change', this.render)
    this.controls.dispose()
    this.mesh.dispose()
    this.geometry.dispose()
    this.material.dispose()
    this.scene.clear()
    this.renderer.dispose()
    this.renderer.domElement.remove()
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
    if (!this.disposed) this.renderer.render(this.scene, this.camera)
  }
}
