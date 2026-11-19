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
  LineSegments,
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
import { SectionMovement } from './SectionMovement'
import sliceVertexShader from './shaders/slice.vert.glsl?raw'
import sliceFragmentShader from './shaders/slice.frag.glsl?raw'
import { colourForValue } from '../data/blockColours'
import type { ColourScale } from '../data/blockColours'
import type { BlastBoundaries } from '../data/blastBoundary'
import type { Block, BlockModels, CategorySelection } from '../data/blockModels'

export type ViewerMode = 'model' | 'slice' | 'inspect'

const inspectionPadding = { top: 104, bottom: 120, sides: 24 }

export class Viewer {
  private readonly scene = new Scene()
  private readonly camera = new PerspectiveCamera(45, 1, 0.1, 100)
  private readonly material = new MeshLambertMaterial({ color: 0xffffff })
  private readonly sliceZ = new Uniform(0)
  private readonly sliceActive = new Uniform(false)
  private mode: ViewerMode = 'model'
  private readonly clippingPlane = new Plane(new Vector3(0, 0, -1), 0)
  private readonly mesh: InstancedMesh
  private readonly origin = new Vector3()
  private readonly renderer: WebGLRenderer
  private readonly controls: OrbitControls
  private readonly resizeObserver: ResizeObserver
  private readonly blastBoundaries = [1, 0].map((opacity) => new LineSegments(
    new BufferGeometry(),
    new LineBasicMaterial({ color: 0xa3a3a3, transparent: true, opacity: 0.4 * opacity, depthTest: false, depthWrite: false }),
  ))
  private readonly hoverHighlight = new Box3Helper(new Box3(), 0xffffff)
  private readonly selectionHighlight = new Box3Helper(new Box3(), 0xffffff)
  private readonly originalPositionHighlight = new Box3Helper(new Box3(), 0xa3a3a3)
  private readonly otherPositionHighlight = new Box3Helper(new Box3(), 0xc4b5fd)
  private readonly otherPositionMaterial = this.otherPositionHighlight.material as LineBasicMaterial
  private readonly movementLine = new Line(
    new BufferGeometry(),
    new LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, depthTest: false, depthWrite: false }),
  )
  private movement: SectionMovement | null = null
  private movementProgress = 0
  private showConnections = false
  private selectedIndex: number | null = null
  private colourScale: ColourScale | null = null
  private readonly pointerDownPosition = new Vector2()
  private readonly raycaster = new Raycaster()
  private readonly pointer = new Vector2()
  private slicer: SlicePlane | null = null
  private savedCamera: { position: Vector3; target: Vector3 } | null = null
  private sidebarWidth = 0
  private cameraMove: {
    fromPosition: Vector3
    toPosition: Vector3
    fromTarget: Vector3
    toTarget: Vector3
    startedAt: number
  } | null = null
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
    this.controls.addEventListener('start', this.cancelCameraMove)
    this.renderer.domElement.addEventListener('pointerdown', this.pointerDown)
    this.renderer.domElement.addEventListener('click', this.clickBlock)
    this.renderer.domElement.addEventListener('pointermove', this.pointerMove)
    this.renderer.domElement.addEventListener('pointerleave', this.clearHover)

    this.configureBlockHighlight()
    this.mesh = this.createBlockMesh()
    const light = new DirectionalLight(0xffffff, 1.8)
    light.position.set(1, 3, 2)
    this.hoverHighlight.visible = false
    this.selectionHighlight.visible = false
    this.originalPositionHighlight.visible = false
    const originalMaterial = this.originalPositionHighlight.material as LineBasicMaterial
    originalMaterial.transparent = true
    originalMaterial.opacity = 0.35
    originalMaterial.depthTest = false
    originalMaterial.depthWrite = false
    this.originalPositionHighlight.renderOrder = 2
    this.otherPositionHighlight.visible = false
    this.otherPositionMaterial.transparent = true
    this.otherPositionMaterial.opacity = 0.7
    this.otherPositionMaterial.depthTest = false
    this.otherPositionMaterial.depthWrite = false
    this.hoverHighlight.renderOrder = 2
    this.selectionHighlight.renderOrder = 2
    const selectionMaterial = this.selectionHighlight.material as LineBasicMaterial
    selectionMaterial.depthTest = false
    selectionMaterial.depthWrite = false
    this.movementLine.visible = false
    this.movementLine.frustumCulled = false
    this.scene.add(this.originalPositionHighlight, this.otherPositionHighlight, this.movementLine)
    this.scene.add(this.mesh, this.hoverHighlight, this.selectionHighlight, new AmbientLight(0xffffff, 0.8), light)

    const bounds = this.mesh.boundingBox!
    for (const boundary of this.blastBoundaries) {
      boundary.visible = false
      boundary.renderOrder = 2
    }
    this.scene.add(...this.blastBoundaries)

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

  private createBlockMesh(): InstancedMesh {
    const mesh = new InstancedMesh(new BoxGeometry(1, 1, 1), this.material, this.models.pre.length)
    const matrix = new Matrix4()
    this.models.pre.forEach((block, index) => {
      matrix.makeScale(block.width, block.height, block.depth)
      // Mining Z is elevation; Three.js uses Y as the vertical axis.
      matrix.setPosition(block.x - this.origin.x, block.z - this.origin.z, this.origin.y - block.y)
      mesh.setMatrixAt(index, matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingBox()
    mesh.computeBoundingSphere()
    return mesh
  }

  public setBlastBoundaries(boundaries: BlastBoundaries): void {
    const stages = [boundaries.pre, boundaries.post]
    this.blastBoundaries.forEach((boundary, index) => {
      boundary.geometry.dispose()
      boundary.geometry = new BufferGeometry().setFromPoints(stages[index].map((point) => new Vector3(
        point.x - this.origin.x, point.z - this.origin.z, this.origin.y - point.y,
      )))
    })
    this.render()
  }

  public setColourScale(scale: ColourScale, categorySelection: CategorySelection | null = null): void {
    this.colourScale = scale
    const colour = new Color()
    this.models.pre.forEach((block, index) => {
      colour.setHex(colourForValue(scale, block.attributes[scale.field]))
      if (categorySelection && block.attributes[categorySelection.field] !== categorySelection.value) colour.multiplyScalar(0.2)
      this.mesh.setColorAt(index, colour)
    })
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true
    this.movement?.setColourScale(scale)
    this.render()
  }

  public setMode(mode: ViewerMode, sidebarWidth = 0): void {
    const inspecting = mode === 'inspect'
    if (mode !== this.mode) this.setMovementProgress(0)
    this.slicer?.setEnabled(mode === 'slice')
    this.sliceActive.value = mode === 'slice'
    this.mode = mode
    if (!inspecting) this.setSection([])
    this.material.color.setScalar(inspecting ? 0.2 : 1)
    this.material.clippingPlanes = inspecting ? [this.clippingPlane] : []
    this.sidebarWidth = sidebarWidth
    this.resize()

    if (inspecting && !this.savedCamera) {
      this.savedCamera = {
        position: this.camera.position.clone(),
        target: this.controls.target.clone(),
      }
    } else if (!inspecting && this.savedCamera) {
      this.cameraMove = null
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
      if (offset !== 0) this.cameraMove = null
      this.camera.position.z += offset
      this.controls.target.z += offset
      this.controls.update()
    }
    this.render()
  }

  public setSection(blocks: readonly Block[]): void {
    this.cameraMove = null
    this.clearHover()
    this.movement?.removeFromParent()
    this.movement?.dispose()
    this.movement = null
    this.selectedIndex = null
    this.movementLine.visible = false
    if (blocks.length) {
      const ids = new Set(blocks.map((block) => block.id))
      const pre: Block[] = []
      const post: Block[] = []
      this.models.pre.forEach((block, index) => {
        if (ids.has(block.id)) {
          pre.push(block)
          post.push(this.models.post[index])
        }
      })
      this.movement = new SectionMovement(pre, post, this.origin)
      if (this.colourScale) this.movement.setColourScale(this.colourScale)
      this.scene.add(this.movement)
    }
    this.setMovementProgress(!blocks.length && this.mode !== 'inspect' ? 0 : this.movementProgress)
    const focused = this.movement !== null || this.mode === 'inspect'
    this.material.transparent = focused
    this.material.opacity = focused ? 0.01 : 1
    this.material.depthWrite = !focused
    this.material.color.setScalar(focused ? 0.1 : 1)
    this.material.needsUpdate = true
    for (const boundary of this.blastBoundaries) {
      boundary.visible = focused
      boundary.material.clippingPlanes = this.mode === 'inspect' ? [this.clippingPlane] : []
    }
    this.render()
  }

  public setSelectedBlock(block: Block | null): void {
    const wasSelected = this.selectedIndex !== null
    const index = block && this.movement ? this.movement.pre.indexOf(block) : -1
    this.selectedIndex = index === -1 ? null : index
    this.movementLine.visible = false
    if (this.selectedIndex !== null && this.movement) {
      const pre = this.movement.pre[this.selectedIndex]
      const post = this.movement.post[this.selectedIndex]
      const start = this.blockBounds(pre).getCenter(new Vector3())
      const end = this.blockBounds(post).getCenter(new Vector3())
      this.originalPositionHighlight.box.copy(this.blockBounds(pre))
      this.otherPositionHighlight.box.copy(this.blockBounds(post))
      if (!start.equals(end)) {
        this.movementLine.geometry.setFromPoints([start, end])
        this.movementLine.visible = true
      }
      this.updateSelection()
      this.frameBlocks([pre, post])
    } else {
      this.updateSelection()
      if (wasSelected && this.savedCamera) this.frameSection()
    }
    this.render()
  }

  public setMovementProgress(progress: number): void {
    this.movementProgress = MathUtils.clamp(progress, 0, 1)
    this.movement?.setProgress(this.movementProgress)
    this.blastBoundaries[0].material.opacity = 0.4 * (1 - this.movementProgress)
    this.blastBoundaries[1].material.opacity = 0.4 * this.movementProgress
    this.clearHover()
    this.updateSelection()
    this.render()
  }

  public setConnectionsVisible(show: boolean): void {
    this.showConnections = show
    this.updateSelection()
    this.render()
  }

  private updateSelection(): void {
    const selected = this.selectedIndex !== null && this.movement !== null
    if (this.movement) this.movement.connections.visible = this.mode === 'inspect' && this.showConnections && !selected
    this.selectionHighlight.visible = selected
    this.originalPositionHighlight.visible = selected && this.movementLine.visible && this.movementProgress > 0
    this.otherPositionHighlight.visible = selected && this.movementLine.visible && this.movementProgress < 1
    if (this.selectedIndex !== null && this.movement) {
      this.selectionHighlight.box.copy(this.movement.blockBounds(this.selectedIndex)).expandByScalar(0.005)
    }
  }

  private blockBounds(block: Block): Box3 {
    return new Box3().setFromCenterAndSize(
      new Vector3(block.x - this.origin.x, block.z - this.origin.z, this.origin.y - block.y),
      new Vector3(block.width, block.height, block.depth),
    )
  }

  private frameBounds(bounds: Box3): void {
    const centre = bounds.getCenter(new Vector3())
    const radius = Math.max(bounds.getSize(new Vector3()).length() / 2, 1)
    const verticalFov = MathUtils.degToRad(this.camera.fov)
    const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * this.camera.aspect)
    const distance = radius / Math.sin(Math.min(verticalFov, horizontalFov) / 2) * 1.1
    this.camera.position.copy(centre).addScaledVector(new Vector3(1, 0.9, 1.3).normalize(), distance)
    this.camera.near = Math.min(this.camera.near, Math.max(radius / 1000, 0.01))
    this.camera.far = Math.max(this.camera.far, distance * 10 + radius)
    this.camera.updateProjectionMatrix()
    this.controls.target.copy(centre)
    this.controls.update()
  }

  private frameBlocks(blocks: readonly Block[]): void {
    const { clientWidth: width, clientHeight: height } = this.container
    if (!blocks.length || !width || !height) return
    const boxes = blocks.map((block) => this.blockBounds(block))
    const bounds = new Box3()
    for (const box of boxes) bounds.union(box)
    const centre = bounds.getCenter(new Vector3())
    const radius = Math.max(bounds.getSize(new Vector3()).length() / 2, 1)
    const availableWidth = Math.max(width - Math.min(this.sidebarWidth, width * 0.45) - inspectionPadding.sides * 2, 1)
    const availableHeight = Math.max(height - inspectionPadding.top - inspectionPadding.bottom, 1)
    const tanHalfFov = Math.tan(MathUtils.degToRad(this.camera.fov) / 2)
    const horizontalLimit = tanHalfFov * availableWidth / height / 1.04
    const verticalLimit = tanHalfFov * availableHeight / height / 1.04
    const direction = new Vector3(1, 0.8, 1.3).normalize()
    const right = new Vector3().crossVectors(this.camera.up, direction).normalize()
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
            corner.set(x, y, z).sub(centre)
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

    const minDistance = this.selectionHighlight.visible ? 25 : 5
    const distance = Math.max((maxX - minX) / (2 * horizontalLimit), (maxY - minY) / (2 * verticalLimit), minDistance)
    centre.addScaledVector(right, (minX + maxX) / 2).addScaledVector(up, (minY + maxY) / 2)
    this.camera.near = Math.min(this.camera.near, Math.max(radius / 1000, 0.01))
    this.camera.far = Math.max(this.camera.far, distance * 10 + radius)
    this.camera.updateProjectionMatrix()
    this.flyTo(centre.clone().addScaledVector(direction, distance), centre)
  }

  private flyTo(position: Vector3, target: Vector3): void {
    this.clearHover()
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.cameraMove = null
      this.camera.position.copy(position)
      this.controls.target.copy(target)
      this.controls.update()
      return
    }
    this.cameraMove = {
      fromPosition: this.camera.position.clone(),
      toPosition: position.clone(),
      fromTarget: this.controls.target.clone(),
      toTarget: target.clone(),
      startedAt: performance.now(),
    }
    this.render()
  }

  private readonly cancelCameraMove = (): void => {
    this.cameraMove = null
  }

  public dispose(): void {
    if (this.disposed) return
    this.disposed = true
    if (this.renderFrame !== null) cancelAnimationFrame(this.renderFrame)
    for (const boundary of this.blastBoundaries) {
      boundary.geometry.dispose()
      boundary.material.dispose()
    }
    this.hoverHighlight.dispose()
    this.selectionHighlight.dispose()
    this.originalPositionHighlight.dispose()
    this.otherPositionHighlight.dispose()
    this.movementLine.geometry.dispose()
    this.movementLine.material.dispose()
    this.movement?.dispose()
    this.slicer?.dispose()
    this.resizeObserver.disconnect()
    this.controls.removeEventListener('change', this.render)
    this.controls.removeEventListener('change', this.clearHover)
    this.controls.removeEventListener('start', this.cancelCameraMove)
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
    if (this.mode !== 'inspect' || this.cameraMove || !this.movement || event.button !== 0) return
    const distance = Math.hypot(event.clientX - this.pointerDownPosition.x, event.clientY - this.pointerDownPosition.y)
    if (distance > 4) return
    const index = this.pick(event)
    this.onSelectBlock(index === null ? null : this.movement.pre[index])
  }

  private readonly pointerMove = (event: PointerEvent): void => {
    if (this.mode !== 'inspect' || this.cameraMove || !this.movement) return
    if (event.buttons) return this.clearHover()
    const index = this.pick(event)
    if (index === null || index === this.selectedIndex) return this.clearHover()
    this.hoverHighlight.box.copy(this.movement.blockBounds(index)).expandByScalar(0.005)
    this.hoverHighlight.visible = true
    this.render()
  }

  private pick(event: MouseEvent): number | null {
    if (!this.movement) return null
    const rect = this.renderer.domElement.getBoundingClientRect()
    if (!rect.width || !rect.height) return null
    this.pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, 1 - ((event.clientY - rect.top) / rect.height) * 2)
    this.camera.updateMatrixWorld()
    this.raycaster.setFromCamera(this.pointer, this.camera)
    return this.raycaster.intersectObject(this.movement, false)[0]?.instanceId ?? null
  }

  public frameSection(): void {
    if (this.movement) this.frameBlocks([...this.movement.pre, ...this.movement.post])
  }

  private readonly resize = (): void => {
    if (this.disposed) return
    const { clientWidth: width, clientHeight: height } = this.container
    if (width === 0 || height === 0) return
    this.camera.aspect = width / height
    const sidebarWidth = Math.min(this.sidebarWidth, width * 0.45)
    const rightOffset = this.mode === 'inspect' ? Math.max(width - sidebarWidth - inspectionPadding.sides * 2, 1) * 0.015 : 0
    const verticalOffset = this.mode === 'inspect' ? (inspectionPadding.bottom - inspectionPadding.top) / 2 : 0
    if (sidebarWidth) this.camera.setViewOffset(width, height, -sidebarWidth / 2 - rightOffset, verticalOffset, width, height)
    else this.camera.clearViewOffset()
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height)
    this.clearHover()
    this.render()
  }

  private readonly render = (): void => {
    if (this.disposed || this.renderFrame !== null) return
    this.renderFrame = requestAnimationFrame((time) => {
      this.renderFrame = null
      if (this.disposed) return
      const move = this.cameraMove
      if (move) {
        const progress = Math.min((time - move.startedAt) / 650, 1)
        const eased = progress * progress * (3 - 2 * progress)
        this.camera.position.lerpVectors(move.fromPosition, move.toPosition, eased)
        this.controls.target.lerpVectors(move.fromTarget, move.toTarget, eased)
        this.controls.update()
        if (progress === 1) this.cameraMove = null
      }
      this.renderer.render(this.scene, this.camera)
      if (this.cameraMove) this.render()
    })
  }
}
