import {
  AmbientLight,
  DirectionalLight,
  Box3,
  BoxGeometry,
  InstancedMesh,
  MathUtils,
  Matrix4,
  MeshLambertMaterial,
  Color,
  MeshBasicMaterial,
  PerspectiveCamera,
  Scene,
  Sphere,
  Vector3,
  WebGLRenderer,
} from 'three'
import { classifyBlocks } from '../data/classifyBlocks'
import { colourForValue } from '../data/blockColours'
import type { ColourScale } from '../data/blockColours'
import type { BlockGroups } from '../data/classifyBlocks'
import { SurveyLayers } from './SurveyLayers'
import type { LayerVisibility } from '../data/SceneLayers'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import type { Block } from '../data/Block'
import type { BlockModel, ModelView } from '../data/BlockModel'

export class Viewer {
  private readonly container: HTMLElement
  private readonly model: BlockModel
  private readonly groups: BlockGroups
  private readonly origin = new Vector3()
  private readonly scene = new Scene()
  private readonly camera = new PerspectiveCamera(45, 1, 0.1, 100)
  private readonly modelBounds = new Box3()
  private readonly geometry = new BoxGeometry(1, 1, 1)
  private readonly material = new MeshLambertMaterial({ color: 0xffffff })
  private readonly contextMaterial = new MeshBasicMaterial({ color: 0x7b8490, transparent: true, opacity: 0.12, depthWrite: false })
  private contextMesh: InstancedMesh<BoxGeometry, MeshBasicMaterial> | null = null
  private readonly renderer: WebGLRenderer
  private readonly controls: OrbitControls
  private readonly resizeObserver: ResizeObserver
  private blockMesh: InstancedMesh<BoxGeometry, MeshLambertMaterial> | null = null
  private view: ModelView = 'before'
  private readonly surveyLayers: SurveyLayers
  private visibility: LayerVisibility = { blocks: true, context: false, surface: true, boundary: true, holes: true }
  private disposed = false

  constructor(container: HTMLElement, model: BlockModel) {
    this.container = container
    this.model = model
    this.groups = classifyBlocks(model.after)
    const first = model.before[0]
    if (first) this.origin.set(first.XC, first.YC, first.ZC)
    this.renderer = new WebGLRenderer({ antialias: true, alpha: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.container.appendChild(this.renderer.domElement)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.addEventListener('change', this.render)
    this.createBlocks()
    this.surveyLayers = new SurveyLayers(model.layers, this.origin)
    this.surveyLayers.update(this.view, this.visibility)
    const light = new DirectionalLight(0xffffff, 1.8)
    light.position.set(1, 3, 2)
    this.scene.add(this.surveyLayers.group, new AmbientLight(0xffffff, 0.8), light)
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
    this.surveyLayers.update(view, this.visibility)
    this.render()
  }

  public setLayerVisibility(visibility: LayerVisibility): void {
    this.visibility = visibility
    if (this.blockMesh) this.blockMesh.visible = visibility.blocks
    if (this.contextMesh) this.contextMesh.visible = visibility.context
    this.surveyLayers.update(this.view, visibility)
    this.render()
  }

  public setColourScale(scale: ColourScale): void {
    const mesh = this.blockMesh
    if (!mesh) return
    const firstUpdate = mesh.instanceColor === null
    const colour = new Color()
    this.groups.material.forEach((sourceIndex, instance) => {
      colour.setHex(colourForValue(scale, this.model.before[sourceIndex].attributes[scale.field]))
      mesh.setColorAt(instance, colour)
    })
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    if (firstUpdate) this.material.needsUpdate = true
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
    this.camera.far = Math.max(distance * 10 + radius, this.surveyLayers.bounds.getSize(new Vector3()).length() * 4)
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
    this.contextMesh?.dispose()
    this.contextMaterial.dispose()
    this.surveyLayers.dispose()
    this.geometry.dispose()
    this.material.dispose()
    this.scene.clear()
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }

  private createBlocks(): void {
    const mesh = new InstancedMesh(this.geometry, this.material, this.groups.material.length)
    const context = new InstancedMesh(this.geometry, this.contextMaterial, this.groups.context.length)
    context.visible = this.visibility.context
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
    context.boundingBox = this.modelBounds.clone()
    context.boundingSphere = this.modelBounds.getBoundingSphere(new Sphere())
    this.contextMesh = context
    this.updateBlocks(this.model.before)
    this.scene.add(mesh, context)
  }

  private updateBlocks(blocks: readonly Block[]): void {
    const matrix = new Matrix4()
    const position = new Vector3()
    const updateMesh = (mesh: InstancedMesh | null, indices: readonly number[]): void => {
      if (!mesh) return
      indices.forEach((sourceIndex, instance) => {
        const block = blocks[sourceIndex]
        matrix.makeScale(block.Xinc, block.Zinc, block.Yinc)
        matrix.setPosition(this.positionFor(block, position))
        mesh.setMatrixAt(instance, matrix)
      })
      mesh.instanceMatrix.needsUpdate = true
    }
    updateMesh(this.blockMesh, this.groups.material)
    updateMesh(this.contextMesh, this.groups.context)
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
