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
import { SlicePlane } from './SlicePlane'
import { colourForValue } from '../data/blockColours'
import type { ColourScale } from '../data/blockColours'
import type { BlockModels, ModelView } from '../data/blockModels'

export type ViewerMode = 'model' | 'slice' | 'inspect'

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
  private slicer: SlicePlane | null = null
  private savedCamera: { position: Vector3; target: Vector3 } | null = null
  private sidebarWidth = 0
  private renderFrame: number | null = null
  private disposed = false

  constructor(container: HTMLElement, models: BlockModels, onSliceChange: (y: number) => void) {
    this.container = container
    this.models = models
    const first = models.pre[0]
    if (first) this.origin.set(first.x, first.y, first.z)

    this.renderer = new WebGLRenderer({ antialias: true, alpha: true })
    this.renderer.localClippingEnabled = true
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
    this.slicer = new SlicePlane({
      canvas: this.renderer.domElement,
      camera: this.camera,
      controls: this.controls,
      scene: this.scene,
      material: this.material,
      bounds: this.bounds,
      step: models.pre[0]?.depth ?? 1,
      render: this.render,
      onChange: (position) => onSliceChange(this.origin.y - position),
    })
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
    if (this.mesh.boundingBox) this.slicer?.setBounds(this.mesh.boundingBox)
    if (this.savedCamera) this.frameSection()
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

  public setMode(mode: ViewerMode, sidebarWidth = 0): void {
    const inspecting = mode === 'inspect'
    this.slicer?.setEnabled(mode === 'slice')
    this.slicer?.setClippingEnabled(inspecting)
    this.sidebarWidth = inspecting ? sidebarWidth : 0
    this.resize()

    if (inspecting) {
      if (!this.savedCamera) {
        this.savedCamera = {
          position: this.camera.position.clone(),
          target: this.controls.target.clone(),
        }
      }
      this.frameSection()
    } else if (this.savedCamera) {
      this.camera.position.copy(this.savedCamera.position)
      this.controls.target.copy(this.savedCamera.target)
      this.savedCamera = null
      this.controls.update()
    }
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
    if (this.renderFrame !== null) cancelAnimationFrame(this.renderFrame)
    this.slicer?.dispose()
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

  private frameSection(): void {
    const bounds = this.mesh.boundingBox
    const width = this.container.clientWidth
    const height = this.container.clientHeight
    if (!bounds || !this.slicer || !width || !height) return

    const centre = bounds.getCenter(new Vector3())
    centre.z = this.slicer.getPosition()
    const size = bounds.getSize(new Vector3())
    const availableWidth = width - Math.min(this.sidebarWidth, width * 0.45)
    const halfFov = MathUtils.degToRad(this.camera.fov) / 2
    const distance = Math.max(size.x / (availableWidth / height), size.y, 1) / (2 * Math.tan(halfFov)) * 1.15

    this.camera.position.copy(centre).addScaledVector(new Vector3(0, 0.22, 1).normalize(), distance)
    this.controls.target.copy(centre)
    this.controls.update()
  }

  private readonly resize = (): void => {
    if (this.disposed) return
    const { clientWidth: width, clientHeight: height } = this.container
    if (width === 0 || height === 0) return
    this.camera.aspect = width / height
    const sidebarWidth = Math.min(this.sidebarWidth, width * 0.45)
    if (sidebarWidth) this.camera.setViewOffset(width, height, -sidebarWidth / 2, 0, width, height)
    else this.camera.clearViewOffset()
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height)
    this.render()
  }

  private readonly render = (): void => {
    if (this.disposed || this.renderFrame !== null) return
    this.renderFrame = requestAnimationFrame(() => {
      this.renderFrame = null
      if (this.disposed) return
      this.renderer.render(this.scene, this.camera)
    })
  }
}
