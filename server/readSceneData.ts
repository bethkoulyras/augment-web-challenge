import { join } from 'node:path'
import type { BlastHole, SurveyPoint, SceneMetadata } from '../src/data/SceneLayers.ts'
import { readCsvRows, readNumber } from './readCsvRows.ts'

export async function readSurface(filePath: string): Promise<Float32Array> {
  const positions: number[] = []
  let facet: number | null = null
  let vertices = 0
  await readCsvRows(filePath, ['PID', 'FID', 'X', 'Y', 'Z'], (row) => {
    const id = readNumber(row, 'FID')
    if (!Number.isSafeInteger(id)) throw new Error('FID must be an integer.')
    if (vertices % 3 === 0) {
      if (id === facet) throw new Error('A facet must contain exactly three consecutive vertices.')
      facet = id
    } else if (id !== facet) throw new Error('Incomplete triangle for FID: ' + facet)
    positions.push(readNumber(row, 'X'), readNumber(row, 'Y'), readNumber(row, 'Z'))
    vertices += 1
  })
  if (vertices % 3 !== 0) throw new Error('The surface ends with an incomplete triangle.')
  return new Float32Array(positions)
}

export async function readBoundary(filePath: string): Promise<SurveyPoint[][]> {
  const groups = new Map<number, { PID: number; X: number; Y: number; Z: number }[]>()
  await readCsvRows(filePath, ['PID', 'SID', 'X', 'Y', 'Z'], (row) => {
    const id = readNumber(row, 'SID')
    const points = groups.get(id) ?? []
    points.push({ PID: readNumber(row, 'PID'), X: readNumber(row, 'X'), Y: readNumber(row, 'Y'), Z: readNumber(row, 'Z') })
    groups.set(id, points)
  })
  return [...groups.values()].map((points) => {
    points.sort((a, b) => a.PID - b.PID)
    const first = points[0]
    const last = points[points.length - 1]
    if (points.length < 4 || first.X !== last.X || first.Y !== last.Y || first.Z !== last.Z) {
      throw new Error('The boundary must be a closed outline.')
    }
    return points.map(({ X, Y, Z }) => ({ X, Y, Z }))
  })
}

async function readHoles(filePath: string): Promise<BlastHole[]> {
  const holes: BlastHole[] = []
  const fields = ['BHID', 'XCOLLAR', 'YCOLLAR', 'ZCOLLAR', 'DEPTH', 'Angle', 'Bearing', 'Diameter', 'KG', 'TIMING', 'HoleType', 'MatType'] as const
  const ids = new Set<number>()
  await readCsvRows(filePath, [...fields, 'Subdrill', 'STEM'], (row) => {
    const values = Object.fromEntries(fields.map((field) => [field, readNumber(row, field)])) as Record<typeof fields[number], number>
    if (ids.has(values.BHID)) throw new Error('Duplicate blast hole ID: ' + values.BHID)
    if (values.DEPTH <= 0 || values.Diameter <= 0) throw new Error('Hole depth and diameter must be positive.')
    ids.add(values.BHID)
    holes.push({ ...values, Subdrill: row.Subdrill.trim() ? readNumber(row, 'Subdrill') : null, STEM: row.STEM.trim() ? readNumber(row, 'STEM') : null })
  })
  return holes
}

export async function readSceneMetadata(directory: string): Promise<SceneMetadata> {
  const [before, after, holes] = await Promise.all([
    readBoundary(join(directory, '1_pre_string.csv')),
    readBoundary(join(directory, '1_pst_string.csv')),
    readHoles(join(directory, '1_blastholes.csv')),
  ])
  return { boundaries: { before, after }, holes }
}
