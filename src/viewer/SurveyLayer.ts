import { BufferAttribute, BufferGeometry, DoubleSide, Mesh, MeshLambertMaterial, Scene } from 'three'
import type { AmbientLight, DirectionalLight, Plane, Vector3 } from 'three'
import type { SurveySurfaces } from '../data/surveySurfaces'

const stages = ['pre', 'post'] as const
const opacity = 0.7

export class SurveyLayer extends Scene {
  private readonly surfaces = stages.map(() => new Mesh(
    new BufferGeometry(),
    new MeshLambertMaterial({ color: 0x8096aa, side: DoubleSide, opacity, flatShading: true, transparent: true, depthWrite: false, forceSinglePass: true }),
  ))

  constructor(private readonly origin: Vector3, ambientLight: AmbientLight, light: DirectionalLight) {
    super()
    this.visible = false
    for (const surface of this.surfaces) surface.visible = false
    this.add(...this.surfaces, ambientLight.clone(), light.clone())
  }

  public get hasVisibleSurfaces(): boolean {
    return this.visible && this.surfaces.some((surface) => surface.visible)
  }

  public setSurfaces(surfaces: SurveySurfaces): void {
    stages.forEach((stage, index) => {
      const mesh = this.surfaces[index]
      const { origin: [x, y, z], positions } = surfaces[stage]
      mesh.geometry.dispose()
      mesh.geometry = new BufferGeometry().setAttribute('position', new BufferAttribute(positions, 3))
      mesh.position.set(x - this.origin.x, z - this.origin.z, this.origin.y - y)
    })
  }

  public setProgress(progress: number, dimmed: boolean): void {
    const baseOpacity = opacity * (dimmed ? 0.35 : 1)
    this.surfaces.forEach((mesh, index) => {
      const weight = index === 0 ? 1 - progress : progress
      mesh.material.opacity = baseOpacity * weight
      mesh.material.depthWrite = weight === 1
      mesh.visible = weight > 0 && mesh.geometry.hasAttribute('position')
    })
  }

  public setClippingPlanes(planes: Plane[]): void {
    for (const surface of this.surfaces) surface.material.clippingPlanes = planes
  }

  public dispose(): void {
    for (const surface of this.surfaces) {
      surface.geometry.dispose()
      surface.material.dispose()
    }
    this.clear()
  }
}
