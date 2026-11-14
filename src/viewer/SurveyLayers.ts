import { Box3, BufferAttribute, BufferGeometry, DoubleSide, Group, LineBasicMaterial, LineSegments, MathUtils, Mesh, MeshLambertMaterial, Points, PointsMaterial, Vector3 } from 'three'
import { Line2 } from 'three/addons/lines/Line2.js'
import { LineGeometry } from 'three/addons/lines/LineGeometry.js'
import { LineMaterial } from 'three/addons/lines/LineMaterial.js'
import type { SceneLayers, LayerVisibility } from '../data/SceneLayers'
import type { ModelView } from '../data/BlockModel'

export class SurveyLayers {
  public readonly group = new Group()
  public readonly bounds = new Box3()
  private readonly surfaces: Record<ModelView, Mesh>
  private readonly boundaries: Record<ModelView, Group> = { before: new Group(), after: new Group() }
  private readonly holes = new Group()
  private readonly geometries: BufferGeometry[] = []
  private readonly surfaceMaterial = new MeshLambertMaterial({ color: '#8096aa', side: DoubleSide, flatShading: true })
  private readonly boundaryMaterial = new LineMaterial({ color: '#c4b5fd', linewidth: 2.5, transparent: true, depthTest: false, depthWrite: false })
  private readonly holeMaterial = new LineBasicMaterial({ color: '#fbbf24', transparent: true, depthTest: false, depthWrite: false })
  private readonly collarMaterial = new PointsMaterial({ color: '#fbbf24', size: 4, sizeAttenuation: false, depthTest: false, depthWrite: false, transparent: true })

  constructor(data: SceneLayers, origin: Vector3) {
    const convert = (x: number, y: number, z: number): number[] => [x - origin.x, z - origin.z, -(y - origin.y)]
    const surfaceMeshes: Mesh[] = []
    for (const view of ['before', 'after'] as const) {
      const input = data.surfaces[view]
      const positions = new Float32Array(input.length)
      for (let i = 0; i < input.length; i += 3) {
        positions[i] = input[i] - origin.x
        positions[i + 1] = input[i + 2] - origin.z
        positions[i + 2] = -(input[i + 1] - origin.y)
      }
      const geometry = new BufferGeometry()
      geometry.setAttribute('position', new BufferAttribute(positions, 3))
      geometry.computeVertexNormals()
      geometry.computeBoundingBox()
      if (geometry.boundingBox) this.bounds.union(geometry.boundingBox)
      const mesh = new Mesh(geometry, this.surfaceMaterial)
      mesh.renderOrder = 2
      this.geometries.push(geometry)
      surfaceMeshes.push(mesh)
      for (const boundary of data.boundaries[view]) {
        const lineGeometry = new LineGeometry().setPositions(boundary.flatMap((point) => convert(point.X, point.Y, point.Z)))
        const line = new Line2(lineGeometry, this.boundaryMaterial)
        line.renderOrder = 4
        this.boundaries[view].add(line)
        this.geometries.push(lineGeometry)
      }
    }
    this.surfaces = { before: surfaceMeshes[0], after: surfaceMeshes[1] }
    const segments: number[] = []
    const collars: number[] = []
    for (const hole of data.holes) {
      const angle = MathUtils.degToRad(hole.Angle)
      const bearing = MathUtils.degToRad(hole.Bearing)
      const horizontal = hole.DEPTH * Math.cos(angle)
      const start = convert(hole.XCOLLAR, hole.YCOLLAR, hole.ZCOLLAR)
      const end = convert(hole.XCOLLAR + horizontal * Math.sin(bearing), hole.YCOLLAR + horizontal * Math.cos(bearing), hole.ZCOLLAR + hole.DEPTH * Math.sin(angle))
      segments.push(...start, ...end)
      collars.push(...start)
    }
    const lineGeometry = new BufferGeometry().setAttribute('position', new BufferAttribute(new Float32Array(segments), 3))
    const collarGeometry = new BufferGeometry().setAttribute('position', new BufferAttribute(new Float32Array(collars), 3))
    this.geometries.push(lineGeometry, collarGeometry)
    this.holes.add(new LineSegments(lineGeometry, this.holeMaterial), new Points(collarGeometry, this.collarMaterial))
    this.holes.renderOrder = 5
    this.group.add(this.surfaces.before, this.surfaces.after, this.boundaries.before, this.boundaries.after, this.holes)
  }

  public update(view: ModelView, visibility: LayerVisibility): void {
    for (const state of ['before', 'after'] as const) {
      this.surfaces[state].visible = state === view && visibility.surface
      this.boundaries[state].visible = state === view && visibility.boundary
    }
    this.holes.visible = view === 'before' && visibility.holes
  }

  public dispose(): void {
    for (const geometry of this.geometries) geometry.dispose()
    for (const material of [this.surfaceMaterial, this.boundaryMaterial, this.holeMaterial, this.collarMaterial]) material.dispose()
    this.group.clear()
  }
}
