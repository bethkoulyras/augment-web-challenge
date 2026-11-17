import {
  AmbientLight,
  Box3,
  Box3Helper,
  BoxGeometry,
  BufferGeometry,
  Color,
  DirectionalLight,
  InstancedMesh,
  Line,
  LineBasicMaterial,
  MathUtils,
  Matrix4,
  MeshLambertMaterial,
  PerspectiveCamera,
  Plane,
  Raycaster,
  Scene,
  Uniform,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { SlicePlane } from './SlicePlane'
import sliceVertexShader from './shaders/slice.vert.glsl?raw'
import sliceFragmentShader from './shaders/slice.frag.glsl?raw'
import { colourForValue } from '../data/blockColours'
import type { ColourScale } from '../data/blockColours'
import type { Block, BlockModels, ModelView } from '../data/blockModels'

export type ViewerMode = 'model' | 'slice' | 'inspect'

export class Viewer {
  private readonly scene = new Scene()
  private readonly camera = new PerspectiveCamera(45, 1, 0.1, 100)
  private readonly material = new MeshLambertMaterial({ color: 0xffffff })
  private readonly sliceZ = new Uniform(0)
  private readonly sliceActive = new Uniform(false)
  private readonly inspectActive = new Uniform(false)
  private readonly clippingPlane = new Plane(new Vector3(0, 0, -1), 0)
  private readonly mesh: InstancedMesh
  private readonly origin = new Vector3()
  private readonly renderer: WebGLRenderer
  private readonly controls: OrbitControls
  private readonly resizeObserver: ResizeObserver
  private readonly hoverHighlight = new Box3Helper(new Box3(), 0xffffff)
  private readonly selectionHighlight = new Box3Helper(new Box3(), 0xffffff)
  private readonly otherPositionHighlight = new Box3Helper(new Box3(), 0xc4b5fd)
  private readonly otherPositionMaterial = this.otherPositionHighlight.material as LineBasicMaterial
  private readonly movementLine = new Line(
    new BufferGeometry(),
    new LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, depthTest: false, depthWrite: false }),
  )
  private readonly pointerDownPosition = new Vector2()
  private readonly raycaster = new Raycaster()
  private readonly pointer = new Vector2()
  private readonly hit = new Vector3()
  private sectionBlocks: readonly Block[] = []
  private sectionBoxes: Box3[] = []
  private currentView: ModelView | null = null
  private slicer: SlicePlane | null = null
  private savedCamera: { position: Vector3; target: Vector3 } | null = null
  private sidebarWidth = 0
  private renderFrame: number | null = null
  private disposed = false

  constructor(
    private readonly container: HTMLElement,
    private readonly models: BlockModels,
    private readonly onSliceChange: (position: number) => void,
    private readonly onSelectBlock: (block: Block | null) => void,
  ) {
    const first = models.pre[0]
    if (first) this.origin.set(first.x, first.y, first.z)

    this.renderer = new WebGLRenderer({ antialias: true, alpha: true })
    this.renderer.localClippingEnabled = true
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(this.renderer.domElement)
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.addEventListener('change', this.render)
    this.controls.addEventListener('change', this.clearHover)
    this.renderer.domElement.addEventListener('pointerdown', this.pointerDown)
    this.renderer.domElement.addEventListener('click', this.clickBlock)
    this.renderer.domElement.addEventListener('pointermove', this.pointerMove)
    this.renderer.domElement.addEventListener('pointerleave', this.clearHover)

    this.configureBlockHighlight()
    this.mesh = new InstancedMesh(new BoxGeometry(1, 1, 1), this.material, models.pre.length)
    const light = new DirectionalLight(0xffffff, 1.8)
    light.position.set(1, 3, 2)
    this.hoverHighlight.visible = false
    this.selectionHighlight.visible = false
    this.otherPositionHighlight.visible = false
    this.otherPositionMaterial.transparent = true
    this.otherPositionMaterial.opacity = 0.7
    this.otherPositionMaterial.depthTest = false
    this.otherPositionMaterial.depthWrite = false
    this.movementLine.visible = false
    this.movementLine.frustumCulled = false
    this.scene.add(this.otherPositionHighlight, this.movementLine)
    this.scene.add(this.mesh, this.hoverHighlight, this.selectionHighlight, new AmbientLight(0xffffff, 0.8), light)

    this.setView('pre')
    const bounds = this.mesh.boundingBox!

    this.resizeObserver = new ResizeObserver(this.resize)
    this.resizeObserver.observe(container)
    this.resize()
    this.frameBounds(bounds)
    this.slicer = new SlicePlane(bounds, first?.depth ?? 1, this.controls, (sceneZ) => {
      this.setSlicePosition(this.origin.y - sceneZ)
      this.onSliceChange(this.origin.y - this.slicer!.position.z)
    })
    this.scene.add(this.slicer)
    const initialPosition = this.origin.y - this.slicer.position.z
    this.setSlicePosition(initialPosition)
    this.onSliceChange(initialPosition)
  }

  public setView(view: ModelView): void {
    if (view === this.currentView) return
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
    this.currentView = view
    if (this.slicer && this.mesh.boundingBox) {
      const previousZ = this.slicer.position.z
      this.slicer.setBounds(this.mesh.boundingBox)
      const position = this.origin.y - this.slicer.position.z
      this.setSlicePosition(position)
      if (this.slicer.position.z !== previousZ) this.onSliceChange(position)
    }
    if (this.savedCamera) this.frameSection()
    this.render()
  }

  public setColourScale(scale: ColourScale): void {
    const colour = new Color()
    this.models.pre.forEach((block, index) => {
      colour.setHex(colourForValue(scale, block.attributes[scale.field]))
      this.mesh.setColorAt(index, colour)
    })
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true
    this.render()
  }

  public setMode(mode: ViewerMode, sidebarWidth = 0): void {
    const inspecting = mode === 'inspect'
    this.slicer?.setEnabled(mode === 'slice')
    this.sliceActive.value = mode === 'slice'
    this.inspectActive.value = inspecting
    this.material.clippingPlanes = inspecting ? [this.clippingPlane] : []
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
  }

  public setSlicePosition(position: number): void {
    if (!this.slicer) return
    const previousZ = this.sliceZ.value
    this.slicer.moveTo(this.origin.y - position)
    const sceneZ = this.slicer.position.z
    this.sliceZ.value = sceneZ
    this.clippingPlane.constant = sceneZ + this.slicer.step / 2 + 0.001

    if (this.savedCamera) {
      const offset = sceneZ - previousZ
      this.camera.position.z += offset
      this.controls.target.z += offset
      this.controls.update()
    }
    this.render()
  }

  public setHoverBlocks(blocks: readonly Block[]): void {
    this.clearHover()
    this.sectionBlocks = blocks
    this.sectionBoxes = blocks.map((block) => new Box3().setFromCenterAndSize(
      new Vector3(block.x - this.origin.x, block.z - this.origin.z, this.origin.y - block.y),
      new Vector3(block.width, block.height, block.depth),
    ))
  }

  public setSelectedBlock(block: Block | null): void {
    const wasSelected = this.selectionHighlight.visible
    const index = block === null ? -1 : this.sectionBlocks.indexOf(block)
    this.selectionHighlight.visible = index !== -1
    this.otherPositionHighlight.visible = false
    this.movementLine.visible = false
    if (index !== -1 && block) {
      this.selectionHighlight.box.copy(this.sectionBoxes[index]).expandByScalar(0.005)
      const otherView = this.currentView === 'pre' ? 'post' : 'pre'
      const other = this.models[otherView].find((candidate) => candidate.id === block.id)
      if (other) {
        const start = this.sectionBoxes[index].getCenter(new Vector3())
        const end = new Vector3(other.x - this.origin.x, other.z - this.origin.z, this.origin.y - other.y)
        if (!start.equals(end)) {
          this.otherPositionHighlight.box.setFromCenterAndSize(end, new Vector3(other.width, other.height, other.depth))
          this.otherPositionMaterial.color.setHex(otherView === 'pre' ? 0xa5f3fc : 0xc4b5fd)
          this.otherPositionHighlight.visible = true
          this.movementLine.geometry.setFromPoints([start, end])
          this.movementLine.visible = true
        }
      }
      const bounds = this.selectionHighlight.box.clone()
      if (this.otherPositionHighlight.visible) bounds.union(this.otherPositionHighlight.box)
      this.frameBounds(bounds)
    } else if (wasSelected && this.savedCamera) {
      this.frameSection()
    }
    this.render()
  }

  private frameBounds(bounds: Box3): void {
    const { clientWidth: width, clientHeight: height } = this.container
    if (!width || !height) return
    const availableWidth = width - Math.min(this.sidebarWidth, width * 0.45)
    const centre = bounds.getCenter(new Vector3())
    const radius = Math.max(bounds.getSize(new Vector3()).length() / 2, 1)
    const verticalFov = MathUtils.degToRad(this.camera.fov)
    const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * availableWidth / height)
    const distance = radius / Math.sin(Math.min(verticalFov, horizontalFov) / 2) * 1.1
    this.camera.position.copy(centre).addScaledVector(new Vector3(1, 0.9, 1.3).normalize(), distance)
    this.camera.near = Math.min(this.camera.near, Math.max(radius / 1000, 0.01))
    this.camera.far = Math.max(this.camera.far, distance * 10 + radius)
    this.camera.updateProjectionMatrix()
    this.controls.target.copy(centre)
    this.controls.update()
  }

  public dispose(): void {
    if (this.disposed) return
    this.disposed = true
    if (this.renderFrame !== null) cancelAnimationFrame(this.renderFrame)
    this.hoverHighlight.dispose()
    this.selectionHighlight.dispose()
    this.otherPositionHighlight.dispose()
    this.movementLine.geometry.dispose()
    this.movementLine.material.dispose()
    this.slicer?.dispose()
    this.resizeObserver.disconnect()
    this.controls.removeEventListener('change', this.render)
    this.controls.removeEventListener('change', this.clearHover)
    this.renderer.domElement.removeEventListener('pointerdown', this.pointerDown)
    this.renderer.domElement.removeEventListener('click', this.clickBlock)
    this.renderer.domElement.removeEventListener('pointermove', this.pointerMove)
    this.renderer.domElement.removeEventListener('pointerleave', this.clearHover)
    this.controls.dispose()
    this.mesh.dispose()
    this.mesh.geometry.dispose()
    this.material.dispose()
    this.scene.clear()
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }

  private configureBlockHighlight(): void {
    // Extend Three's Lambert shaders so lighting and instancing stay intact.
    this.material.onBeforeCompile = (shader) => {
      shader.uniforms.slicePosition = this.sliceZ
      shader.uniforms.sliceActive = this.sliceActive
      shader.uniforms.inspectActive = this.inspectActive
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>\n${sliceVertexShader}`)
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nupdateSliceSelection();')
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>\n${sliceFragmentShader}`)
        .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb = applySliceHighlight(diffuseColor.rgb);')
    }
  }

  private readonly clearHover = (): void => {
    if (!this.hoverHighlight.visible) return
    this.hoverHighlight.visible = false
    this.render()
  }

  private readonly pointerDown = (event: PointerEvent): void => {
    this.pointerDownPosition.set(event.clientX, event.clientY)
  }

  private readonly clickBlock = (event: MouseEvent): void => {
    if (!this.sectionBlocks.length || event.button !== 0) return
    const distance = Math.hypot(event.clientX - this.pointerDownPosition.x, event.clientY - this.pointerDownPosition.y)
    if (distance > 4) return
    const index = this.pick(event)
    this.onSelectBlock(index === null ? null : this.sectionBlocks[index])
  }

  private readonly pointerMove = (event: PointerEvent): void => {
    if (!this.sectionBoxes.length) return
    if (event.buttons) return this.clearHover()
    const index = this.pick(event)
    if (index === null) return this.clearHover()
    this.hoverHighlight.box.copy(this.sectionBoxes[index]).expandByScalar(0.005)
    this.hoverHighlight.visible = true
    this.render()
  }

  private pick(event: MouseEvent): number | null {
    const rect = this.renderer.domElement.getBoundingClientRect()
    if (!rect.width || !rect.height) return null
    this.pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, 1 - ((event.clientY - rect.top) / rect.height) * 2)
    this.camera.updateMatrixWorld()
    this.raycaster.setFromCamera(this.pointer, this.camera)
    let nearest: number | null = null
    let distance = Infinity
    for (const [index, box] of this.sectionBoxes.entries()) {
      if (!this.raycaster.ray.intersectBox(box, this.hit)) continue
      const hitDistance = this.raycaster.ray.origin.distanceToSquared(this.hit)
      if (hitDistance < distance) {
        nearest = index
        distance = hitDistance
      }
    }
    return nearest
  }

  private frameSection(): void {
    const bounds = this.mesh.boundingBox
    const width = this.container.clientWidth
    const height = this.container.clientHeight
    if (!bounds || !this.slicer || !width || !height) return

    const centre = bounds.getCenter(new Vector3())
    centre.z = this.slicer.position.z
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
    this.clearHover()
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
