import {
  AmbientLight,
  Box3,
  Box3Helper,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  DirectionalLight,
  DoubleSide,
  InstancedBufferAttribute,
  InstancedMesh,
  Line,
  LineBasicMaterial,
  LineSegments,
  MathUtils,
  Matrix4,
  Mesh,
  MeshLambertMaterial,
  PerspectiveCamera,
  Plane,
  Points,
  PointsMaterial,
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
import { blockColourAttribute } from './blockColourAttribute'
import { frameInspection, frameOverview } from './cameraFraming'
import type { ColourScale } from '../data/blockColours'
import type { BlastBoundaries } from '../data/blastBoundary'
import type { BlastHole } from '../data/blastHoles'
import type { Block, CategorySelection, Position } from '../data/blockModels'
import type { SurveySurfaces } from '../data/surveySurfaces'

export type ViewerMode = 'model' | 'slice' | 'inspect'

const inspectionPadding = { top: 64, bottom: 216, sides: 24 }
const surveyStages = ['pre', 'post'] as const

export class Viewer {
  private readonly scene = new Scene()
  private readonly surveyScene = new Scene()
  private readonly camera = new PerspectiveCamera(45, 1, 0.1, 100)
  private readonly material = new MeshLambertMaterial({ color: 0xffffff })
  private readonly sliceZ = new Uniform(0)
  private readonly sliceActive = new Uniform(false)
  private mode: ViewerMode = 'model'
  private readonly clippingPlane = new Plane(new Vector3(0, 0, -1), 0)
  private readonly mesh: InstancedMesh
  private visibleBlocks: readonly Block[] = []
  private readonly origin = new Vector3()
  private readonly renderer: WebGLRenderer
  private readonly controls: OrbitControls
  private readonly events = new AbortController()
  private readonly resizeObserver: ResizeObserver
  private readonly blastBoundaries = [1, 0].map((opacity) => new LineSegments(
    new BufferGeometry(),
    new LineBasicMaterial({ color: 0xa3a3a3, transparent: true, opacity: 0.4 * opacity, depthTest: false, depthWrite: false }),
  ))
  private readonly surveySurfaces = surveyStages.map(() => new Mesh(
    new BufferGeometry(),
    new MeshLambertMaterial({ color: 0x8096aa, side: DoubleSide, opacity: 0.7, flatShading: true, transparent: true, depthWrite: false, forceSinglePass: true }),
  ))
  private readonly surveyOpacity = this.surveySurfaces[0].material.opacity
  private readonly blastHoleLines = new LineSegments(
    new BufferGeometry(),
    new LineBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.65, depthTest: false, depthWrite: false }),
  )
  private readonly blastHoleCollars = new Points(
    new BufferGeometry(),
    new PointsMaterial({ color: 0xfbbf24, size: 4, sizeAttenuation: false, transparent: true, depthTest: false, depthWrite: false }),
  )
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
  private showSurveySurfaces = false
  private showConnections = false
  private selectedIndex: number | null = null
  private readonly pointerDownPosition = new Vector2()
  private readonly raycaster = new Raycaster()
  private readonly pointer = new Vector2()
  private readonly slicer: SlicePlane
  private savedCamera: { position: Vector3; target: Vector3 } | null = null
  private sidebarWidth = 0
  private sidebarProgress = 1
  private sidebarMove: { from: number; to: number; startedAt: number } | null = null
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
    private readonly blocks: readonly Block[],
    private readonly onSliceChange: (position: number) => void,
    private readonly onSelectBlock: (block: Block | null) => void,
  ) {
    const first = blocks[0]
    this.origin.set(first.x, first.y, first.z)

    this.renderer = new WebGLRenderer({ antialias: true, alpha: true })
    this.renderer.localClippingEnabled = true
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(this.renderer.domElement)
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.addEventListener('change', this.render)
    this.controls.addEventListener('change', this.clearHover)
    this.controls.addEventListener('start', this.cancelCameraMove)
    const { signal } = this.events
    this.renderer.domElement.addEventListener('pointerdown', this.pointerDown, { signal })
    this.renderer.domElement.addEventListener('click', this.clickBlock, { signal })
    this.renderer.domElement.addEventListener('pointermove', this.pointerMove, { signal })
    this.renderer.domElement.addEventListener('pointerleave', this.clearHover, { signal })

    this.configureBlockHighlight()
    this.mesh = new InstancedMesh(new BoxGeometry(1, 1, 1), this.material, blocks.length)
    this.setVisibleBlocks(blocks)
    this.mesh.computeBoundingBox()
    this.mesh.computeBoundingSphere()
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
    const ambientLight = new AmbientLight(0xffffff, 0.8)
    this.scene.add(this.mesh, this.hoverHighlight, this.selectionHighlight, ambientLight, light)

    const bounds = this.mesh.boundingBox!
    for (const boundary of this.blastBoundaries) boundary.renderOrder = 2
    this.scene.add(...this.blastBoundaries)
    for (const surface of this.surveySurfaces) surface.visible = false
    this.surveyScene.add(...this.surveySurfaces, ambientLight.clone(), light.clone())
    this.blastHoleLines.visible = false
    this.blastHoleLines.renderOrder = 4
    this.blastHoleCollars.renderOrder = 5
    this.blastHoleLines.add(this.blastHoleCollars)
    this.scene.add(this.blastHoleLines)

    this.resizeObserver = new ResizeObserver(this.resize)
    this.resizeObserver.observe(container)
    this.resize()
    this.frameBounds(bounds)
    this.slicer = new SlicePlane(bounds, first.depth, this.controls, (sceneZ) => {
      this.setSlicePosition(this.origin.y - sceneZ)
      this.onSliceChange(this.origin.y - this.slicer.position.z)
    })
    this.scene.add(this.slicer)
    const initialPosition = this.origin.y - this.slicer.position.z
    this.setSlicePosition(initialPosition)
    this.onSliceChange(initialPosition)
  }

  public setVisibleBlocks(blocks: readonly Block[]): void {
    if (blocks === this.visibleBlocks) return
    this.visibleBlocks = blocks
    this.mesh.count = blocks.length
    const matrix = new Matrix4()
    blocks.forEach((block, index) => {
      matrix.makeScale(block.width, block.height, block.depth)
      // Mining Z is elevation; Three.js uses Y as the vertical axis.
      matrix.setPosition(block.x - this.origin.x, block.z - this.origin.z, this.origin.y - block.y)
      this.mesh.setMatrixAt(index, matrix)
    })
    this.mesh.instanceMatrix.needsUpdate = true
    this.render()
  }

  public setBlockCounts(visibleCount: number, movementCount: number): void {
    this.mesh.count = visibleCount
    if (this.movement) {
      const previousCount = this.movement.count
      this.movement.setCount(movementCount)
      if (movementCount > previousCount) this.movement.setProgress(this.movementProgress, previousCount)
    }
    this.clearHover()
    this.render()
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

  public setSurveySurfaces(surfaces: SurveySurfaces): void {
    surveyStages.forEach((stage, index) => {
      const mesh = this.surveySurfaces[index]
      const { origin: [x, y, z], positions } = surfaces[stage]
      mesh.geometry.dispose()
      mesh.geometry = new BufferGeometry().setAttribute('position', new BufferAttribute(positions, 3))
      mesh.position.set(x - this.origin.x, z - this.origin.z, this.origin.y - y)
    })
    this.updateSurveySurfaces()
    this.render()
  }

  public setSurveySurfacesVisible(visible: boolean): void {
    this.showSurveySurfaces = visible
    this.updateSurveySurfaces()
    this.render()
  }

  private updateSurveySurfaces(): void {
    const opacity = this.surveyOpacity * (this.mode === 'model' ? 1 : 0.35)
    this.surveySurfaces.forEach((mesh, index) => {
      const weight = index === 0 ? 1 - this.movementProgress : this.movementProgress
      mesh.material.opacity = opacity * weight
      mesh.material.depthWrite = weight === 1
      mesh.visible = this.showSurveySurfaces && weight > 0 && mesh.geometry.hasAttribute('position')
    })
  }

  public setBlastHoles(holes: readonly BlastHole[]): void {
    const collars: Vector3[] = []
    const segments: Vector3[] = []
    for (const hole of holes) {
      const angle = MathUtils.degToRad(hole.angle)
      const bearing = MathUtils.degToRad(hole.bearing)
      const horizontal = hole.depth * Math.cos(angle)
      const collar = new Vector3(hole.x - this.origin.x, hole.z - this.origin.z, this.origin.y - hole.y)
      collars.push(collar)
      segments.push(collar, collar.clone().add(new Vector3(
        horizontal * Math.sin(bearing),
        hole.depth * Math.sin(angle),
        -horizontal * Math.cos(bearing),
      )))
    }
    this.blastHoleLines.geometry.dispose()
    this.blastHoleCollars.geometry.dispose()
    this.blastHoleLines.geometry = new BufferGeometry().setFromPoints(segments)
    this.blastHoleCollars.geometry = new BufferGeometry().setFromPoints(collars)
    this.render()
  }

  public setBlastHolesVisible(visible: boolean): void {
    this.blastHoleLines.visible = visible
    this.render()
  }

  public setColourScale(scale: ColourScale, categorySelection: CategorySelection | null = null): void {
    const colours = blockColourAttribute(this.visibleBlocks, scale)
    this.mesh.instanceColor = categorySelection ? new InstancedBufferAttribute(colours.array.slice(), 3) : colours
    if (categorySelection) {
      const colour = new Color()
      this.visibleBlocks.forEach((block, index) => {
        if (block.attributes[categorySelection.field] !== categorySelection.value) {
          colour.fromBufferAttribute(colours, index).multiplyScalar(0.2)
          this.mesh.instanceColor!.setXYZ(index, colour.r, colour.g, colour.b)
        }
      })
    }
    this.movement?.setColourScale(scale)
    this.render()
  }

  private setMode(mode: ViewerMode): void {
    if (mode === this.mode) return
    const inspecting = mode === 'inspect'
    this.movementProgress = 0
    this.slicer.setEnabled(mode === 'slice')
    this.sliceActive.value = mode === 'slice'
    this.mode = mode
    this.material.clippingPlanes = inspecting ? [this.clippingPlane] : []
    for (const surface of this.surveySurfaces) surface.material.clippingPlanes = this.material.clippingPlanes
    this.blastHoleLines.material.clippingPlanes = this.material.clippingPlanes
    this.blastHoleCollars.material.clippingPlanes = this.material.clippingPlanes
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

  public setMovementBlocks(mode: ViewerMode, blocks: readonly Block[]): void {
    this.setMode(mode)
    this.cameraMove = null
    this.clearHover()
    this.movement?.removeFromParent()
    this.movement?.dispose()
    this.movement = null
    this.selectedIndex = null
    this.movementLine.visible = false
    if (blocks.length) {
      this.movement = new SectionMovement(blocks, this.origin, this.mode === 'inspect')
      // setBlockCounts initializes the transforms for the visible instances.
      this.movement.setCount(0)
      this.scene.add(this.movement)
    }
    this.setMovementProgress(!blocks.length && this.mode !== 'inspect' ? 0 : this.movementProgress)
    const focused = this.movement !== null || this.mode === 'inspect'
    this.mesh.visible = this.mode !== 'model' || blocks !== this.blocks || this.movement === null
    this.material.transparent = focused
    this.material.opacity = focused ? 0.01 : 1
    this.material.depthWrite = !focused
    this.material.color.setScalar(focused ? 0.1 : 1)
    this.material.needsUpdate = true
    for (const boundary of this.blastBoundaries) {
      boundary.material.clippingPlanes = this.mode === 'inspect' ? [this.clippingPlane] : []
    }
    this.render()
  }

  public setSelectedBlock(block: Block | null): void {
    const wasSelected = this.selectedIndex !== null
    const index = block && this.movement ? this.movement.blocks.indexOf(block) : -1
    this.selectedIndex = index >= 0 && this.movement && index < this.movement.count ? index : null
    this.movementLine.visible = false
    if (this.selectedIndex !== null && this.movement) {
      const selected = this.movement.blocks[this.selectedIndex]
      const pre = this.blockBounds(selected)
      const post = this.blockBounds(selected, selected.predicted)
      const start = pre.getCenter(new Vector3())
      const end = post.getCenter(new Vector3())
      this.originalPositionHighlight.box.copy(pre)
      this.otherPositionHighlight.box.copy(post)
      if (!start.equals(end)) {
        this.movementLine.geometry.setFromPoints([start, end])
        this.movementLine.visible = true
      }
      this.updateSelection()
      this.frameBoxes([pre, post])
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
    this.updateSurveySurfaces()
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

  private blockBounds(block: Block, position: Position = block): Box3 {
    return new Box3().setFromCenterAndSize(
      new Vector3(position.x - this.origin.x, position.z - this.origin.z, this.origin.y - position.y),
      new Vector3(block.width, block.height, block.depth),
    )
  }

  private frameBounds(bounds: Box3): void {
    const frame = frameOverview(bounds, this.camera)
    this.camera.position.copy(frame.position)
    this.updateCameraClipping(frame.near, frame.far)
    this.controls.target.copy(frame.target)
    this.controls.update()
  }

  private frameBoxes(boxes: readonly Box3[]): void {
    const { clientWidth: width, clientHeight: height } = this.container
    if (!boxes.length || !width || !height) return
    const viewport = {
      width: Math.max(width - this.getSidebarWidth(width) - inspectionPadding.sides * 2, 1),
      height: Math.max(height - inspectionPadding.top - inspectionPadding.bottom, 1),
      canvasHeight: height,
    }
    const minDistance = this.selectionHighlight.visible ? 25 : 5
    const frame = frameInspection(boxes, this.camera, viewport, minDistance)
    this.updateCameraClipping(frame.near, frame.far)
    this.flyTo(frame.position, frame.target)
  }

  private updateCameraClipping(near: number, far: number): void {
    this.camera.near = Math.min(this.camera.near, near)
    this.camera.far = Math.max(this.camera.far, far)
    this.camera.updateProjectionMatrix()
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
    for (const surface of this.surveySurfaces) {
      surface.geometry.dispose()
      surface.material.dispose()
    }
    this.blastHoleLines.geometry.dispose()
    this.blastHoleCollars.geometry.dispose()
    this.blastHoleLines.material.dispose()
    this.blastHoleCollars.material.dispose()
    this.hoverHighlight.dispose()
    this.selectionHighlight.dispose()
    this.originalPositionHighlight.dispose()
    this.otherPositionHighlight.dispose()
    this.movementLine.geometry.dispose()
    this.movementLine.material.dispose()
    this.movement?.dispose()
    this.slicer.dispose()
    this.resizeObserver.disconnect()
    this.controls.removeEventListener('change', this.render)
    this.controls.removeEventListener('change', this.clearHover)
    this.controls.removeEventListener('start', this.cancelCameraMove)
    this.events.abort()
    this.controls.dispose()
    this.mesh.dispose()
    this.mesh.geometry.dispose()
    this.material.dispose()
    this.scene.clear()
    this.surveyScene.clear()
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
    this.onSelectBlock(index === null ? null : this.movement.blocks[index])
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
    if (!this.movement) return
    const blocks = this.movement.blocks.slice(0, this.movement.count)
    this.frameBoxes(blocks.flatMap((block) => [this.blockBounds(block), this.blockBounds(block, block.predicted)]))
  }

  public resetView(): void {
    if (this.mode === 'inspect' && this.movement?.count) {
      this.frameSection()
      return
    }
    this.cameraMove = null
    this.clearHover()
    this.frameBounds(this.mesh.boundingBox!)
    this.render()
  }

  public setSidebarOpen(open: boolean): void {
    const to = open ? 1 : 0
    if (this.sidebarMove?.to === to) return
    if (this.sidebarProgress === to) {
      this.sidebarMove = null
      return
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.sidebarMove = null
      this.sidebarProgress = to
      this.resize()
      return
    }
    this.sidebarMove = { from: this.sidebarProgress, to, startedAt: performance.now() }
    this.render()
  }

  private getSidebarWidth(width: number): number {
    return width < 640 ? 0 : Math.min(this.sidebarWidth, width * 0.45)
  }

  private updateViewportProjection(width: number, height: number): void {
    const fullSidebarWidth = this.getSidebarWidth(width)
    const sidebarWidth = fullSidebarWidth * this.sidebarProgress
    const rightOffset = this.mode === 'inspect' ? Math.max(width - sidebarWidth - inspectionPadding.sides * 2, 1) * 0.015 : 0
    const verticalOffset = (inspectionPadding.bottom - inspectionPadding.top) / 2
    this.camera.zoom = 1 + (fullSidebarWidth - sidebarWidth) / width
    this.camera.setViewOffset(width, height, -sidebarWidth / 2 - rightOffset, verticalOffset, width, height)
  }

  private readonly resize = (): void => {
    if (this.disposed) return
    const { clientWidth: width, clientHeight: height } = this.container
    if (width === 0 || height === 0) return
    const style = getComputedStyle(this.container)
    const sidebarWidth = Number.parseFloat(style.getPropertyValue('--viewer-sidebar-width')) || 0
    const inset = Number.parseFloat(style.getPropertyValue('--viewer-inset')) || 0
    this.sidebarWidth = sidebarWidth + inset * 2
    this.updateViewportProjection(width, height)
    this.renderer.setSize(width, height)
    this.clearHover()
    this.render()
  }

  private readonly render = (): void => {
    if (this.disposed || this.renderFrame !== null) return
    this.renderFrame = requestAnimationFrame((time) => {
      this.renderFrame = null
      if (this.disposed) return
      const sidebarMove = this.sidebarMove
      if (sidebarMove) {
        const progress = MathUtils.clamp((time - sidebarMove.startedAt) / 200, 0, 1)
        this.sidebarProgress = MathUtils.lerp(sidebarMove.from, sidebarMove.to, 1 - (1 - progress) ** 3)
        const { clientWidth: width, clientHeight: height } = this.container
        if (width && height) this.updateViewportProjection(width, height)
        if (progress === 1) this.sidebarMove = null
      }
      const move = this.cameraMove
      if (move) {
        const progress = Math.min((time - move.startedAt) / 650, 1)
        const eased = progress * progress * (3 - 2 * progress)
        this.camera.position.lerpVectors(move.fromPosition, move.toPosition, eased)
        this.controls.target.lerpVectors(move.fromTarget, move.toTarget, eased)
        this.controls.update()
        if (progress === 1) this.cameraMove = null
      }
      this.renderer.autoClear = true
      // Keep the survey underneath the block model and its inspection highlights.
      if (this.surveySurfaces.some((surface) => surface.visible)) {
        this.renderer.render(this.surveyScene, this.camera)
        this.renderer.clearDepth()
        this.renderer.autoClear = false
      }
      this.renderer.render(this.scene, this.camera)
      if (this.cameraMove || this.sidebarMove) this.render()
    })
  }
}
