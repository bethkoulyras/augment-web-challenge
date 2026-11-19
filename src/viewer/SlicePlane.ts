import {
  Box3,
  BoxGeometry,
  BufferGeometry,
  DoubleSide,
  Group,
  Line,
  LineBasicMaterial,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  Plane,
  Raycaster,
  Vector2,
  Vector3,
} from 'three'
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js'

export class SlicePlane extends Group {
  private readonly bounds: Box3
  private readonly canvas: HTMLCanvasElement
  private readonly events = new AbortController()
  private readonly raycaster = new Raycaster()
  private readonly pointer = new Vector2()
  private readonly hit = new Vector3()
  private drag: { pointerId: number; offset: number; plane: Plane; controlsEnabled: boolean } | null = null
  private readonly plane = new Mesh(
    new BoxGeometry(1, 1, 1),
    new MeshBasicMaterial({
      color: '#ffffff',
      side: DoubleSide,
      transparent: true,
      opacity: 0.025,
      depthWrite: false,
    }),
  )
  private readonly frame = new Line(
    new BufferGeometry(),
    new LineBasicMaterial({
      color: '#ffffff',
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
    }),
  )

  constructor(
    bounds: Box3,
    public readonly step: number,
    private readonly controls: OrbitControls,
    private readonly onDrag: (position: number) => void,
  ) {
    super()
    this.bounds = bounds.clone()
    this.canvas = controls.domElement as HTMLCanvasElement
    this.plane.renderOrder = 2
    this.frame.renderOrder = 1
    this.add(this.plane, this.frame)
    this.visible = false
    this.setBounds(bounds)
    this.moveTo(bounds.getCenter(new Vector3()).z)

    const { signal } = this.events
    this.canvas.addEventListener('pointerdown', this.pointerDown, { capture: true, signal })
    this.canvas.addEventListener('pointermove', this.pointerMove, { signal })
    this.canvas.addEventListener('pointerup', this.pointerUp, { signal })
    this.canvas.addEventListener('pointercancel', this.pointerUp, { signal })
    this.canvas.addEventListener('lostpointercapture', this.pointerUp, { signal })
    window.addEventListener('blur', this.finishDrag, { signal })
  }

  public setEnabled(enabled: boolean): void {
    if (!enabled) this.finishDrag()
    this.visible = enabled
    this.canvas.style.cursor = ''
  }

  public moveTo(position: number): void {
    this.position.z = MathUtils.clamp(
      Math.round(position / this.step) * this.step,
      this.bounds.min.z + this.step / 2,
      this.bounds.max.z - this.step / 2,
    )
  }

  public setBounds(bounds: Box3): void {
    this.bounds.copy(bounds)
    const size = bounds.getSize(new Vector3())
    const centre = bounds.getCenter(new Vector3())
    this.position.x = centre.x
    this.position.y = centre.y
    this.plane.scale.set(size.x + 12, size.y + 24, this.step)
    const halfWidth = this.plane.scale.x / 2
    const halfHeight = this.plane.scale.y / 2
    this.frame.geometry.dispose()
    this.frame.geometry = new BufferGeometry().setFromPoints([
      new Vector3(-halfWidth, -halfHeight, 0),
      new Vector3(halfWidth, -halfHeight, 0),
      new Vector3(halfWidth, halfHeight, 0),
      new Vector3(-halfWidth, halfHeight, 0),
      new Vector3(-halfWidth, -halfHeight, 0),
    ])
    this.moveTo(this.position.z)
  }

  public dispose(): void {
    this.finishDrag()
    this.events.abort()
    this.canvas.style.cursor = ''
    this.plane.geometry.dispose()
    this.plane.material.dispose()
    this.frame.geometry.dispose()
    this.frame.material.dispose()
  }

  private setRay(event: PointerEvent): boolean {
    const rect = this.canvas.getBoundingClientRect()
    if (!rect.width || !rect.height) return false
    this.pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, 1 - ((event.clientY - rect.top) / rect.height) * 2)
    this.controls.object.updateMatrixWorld()
    this.raycaster.setFromCamera(this.pointer, this.controls.object)
    return true
  }

  private readonly pointerDown = (event: PointerEvent): void => {
    if (!this.visible || !event.isPrimary || event.button !== 0 || this.drag) return
    if (!this.setRay(event)) return
    this.updateMatrixWorld(true)
    const hit = this.raycaster.intersectObject(this.plane)[0]
    if (!hit) return

    const normal = this.raycaster.ray.origin.clone().sub(hit.point)
    normal.z = 0
    if (normal.lengthSq() < 0.000001) return
    this.drag = {
      pointerId: event.pointerId,
      offset: hit.point.z - this.position.z,
      plane: new Plane().setFromNormalAndCoplanarPoint(normal.normalize(), hit.point),
      controlsEnabled: this.controls.enabled,
    }
    this.controls.enabled = false
    this.canvas.setPointerCapture(event.pointerId)
    this.canvas.style.cursor = 'grabbing'
    event.preventDefault()
    event.stopImmediatePropagation()
  }

  private readonly pointerMove = (event: PointerEvent): void => {
    if (!this.visible || !this.setRay(event)) return
    if (this.drag) {
      if (this.drag.pointerId === event.pointerId && this.raycaster.ray.intersectPlane(this.drag.plane, this.hit)) {
        this.onDrag(this.hit.z - this.drag.offset)
      }
    } else if (!event.buttons) {
      this.updateMatrixWorld(true)
      this.canvas.style.cursor = this.raycaster.intersectObject(this.plane).length ? 'grab' : ''
    }
  }

  private readonly pointerUp = (event: PointerEvent): void => {
    if (this.drag?.pointerId === event.pointerId) this.finishDrag()
  }

  private readonly finishDrag = (): void => {
    const drag = this.drag
    if (!drag) return
    this.drag = null
    if (this.canvas.hasPointerCapture(drag.pointerId)) this.canvas.releasePointerCapture(drag.pointerId)
    this.canvas.style.cursor = ''
    this.controls.enabled = drag.controlsEnabled
  }
}
