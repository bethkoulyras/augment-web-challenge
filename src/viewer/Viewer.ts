import {
  BoxGeometry,
  Mesh,
  MeshNormalMaterial,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from 'three'

export class Viewer {
  private readonly container: HTMLElement
  private readonly scene = new Scene()
  private readonly camera = new PerspectiveCamera(45, 1, 0.1, 100)
  private readonly cube = new Mesh(new BoxGeometry(1, 1, 1), new MeshNormalMaterial())
  private readonly renderer: WebGLRenderer
  private readonly resizeObserver: ResizeObserver
  private disposed = false

  constructor(container: HTMLElement) {
    this.container = container
    this.renderer = new WebGLRenderer({ antialias: true, alpha: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.container.appendChild(this.renderer.domElement)

    this.scene.add(this.cube)
    this.resetCamera()
    this.resizeObserver = new ResizeObserver(this.resize)
    this.resizeObserver.observe(this.container)
    this.resize()
    this.renderer.setAnimationLoop(this.render)
  }

  public resetCamera(): void {
    this.camera.position.set(0, 0, 5)
    this.camera.lookAt(0, 0, 0)
  }

  public dispose(): void {
    if (this.disposed) return
    this.disposed = true

    this.resizeObserver.disconnect()
    this.renderer.setAnimationLoop(null)
    this.cube.geometry.dispose()
    this.cube.material.dispose()
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
  }

  private readonly render = (time: number): void => {
    this.cube.rotation.x = time * 0.0004
    this.cube.rotation.y = time * 0.0006
    this.renderer.render(this.scene, this.camera)
  }
}
