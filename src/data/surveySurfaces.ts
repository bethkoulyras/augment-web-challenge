import Papa from 'papaparse'

interface SurveySurface {
  origin: [x: number, y: number, z: number]
  positions: Float32Array
}

export interface SurveySurfaces {
  pre: SurveySurface
  post: SurveySurface
}

function readNumber(raw: string | undefined): number {
  const value = Number(raw?.trim() || NaN)
  if (!Number.isFinite(value)) throw new Error('Invalid survey coordinate or face number.')
  return value
}

async function loadSurveySurface(path: string, signal: AbortSignal): Promise<SurveySurface> {
  const response = await fetch(path, { signal })
  if (!response.ok || !response.body) throw new Error('Could not load ' + path)

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
  const chunks: Float32Array[] = []
  let columns: number[] | null = null
  let origin: SurveySurface['origin'] | null = null
  let vertexCount = 0
  let face: number | null = null

  const readChunk = (text: string): void => {
    const parsed = Papa.parse<string[]>(text, { delimiter: ',', skipEmptyLines: 'greedy' })
    if (parsed.errors.length) throw new Error(parsed.errors[0].message)
    const rows = parsed.data
    if (!rows.length) return

    if (!columns) {
      const headings = rows.shift()!.map((heading) => heading.trim())
      columns = ['X', 'Y', 'Z', 'FID'].map((field) => headings.indexOf(field))
      if (columns.includes(-1)) throw new Error('Missing survey coordinates or face column.')
    }

    const [xColumn, yColumn, zColumn, faceColumn] = columns
    const positions = new Float32Array(rows.length * 3)
    let offset = 0
    for (const row of rows) {
      const id = readNumber(row[faceColumn])
      const startsFace = vertexCount % 3 === 0
      if (!Number.isSafeInteger(id) || (startsFace ? id === face : id !== face)) {
        throw new Error('Survey faces must contain three consecutive vertices.')
      }
      face = id

      const x = readNumber(row[xColumn])
      const y = readNumber(row[yColumn])
      const z = readNumber(row[zColumn])
      const [originX, originY, originZ] = origin ??= [x, y, z]
      positions[offset++] = x - originX
      positions[offset++] = z - originZ
      positions[offset++] = originY - y
      vertexCount += 1
    }
    chunks.push(positions)
  }

  let remainder = ''
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      const text = remainder + value
      const lineEnd = text.lastIndexOf('\n') + 1
      if (lineEnd) readChunk(text.slice(0, lineEnd))
      remainder = text.slice(lineEnd)
    }
    if (remainder) readChunk(remainder)
  } catch (error) {
    await reader.cancel().catch(() => undefined)
    throw error
  } finally {
    reader.releaseLock()
  }

  if (!origin || vertexCount % 3 !== 0) throw new Error('The survey has no complete surface.')
  const positions = new Float32Array(vertexCount * 3)
  let offset = 0
  for (const chunk of chunks) {
    positions.set(chunk, offset)
    offset += chunk.length
  }
  return { origin, positions }
}

export async function loadSurveySurfaces(signal: AbortSignal): Promise<SurveySurfaces> {
  const pre = await loadSurveySurface('/1_pre_surface.csv', signal)
  const post = await loadSurveySurface('/1_pst_surface.csv', signal)
  return { pre, post }
}
