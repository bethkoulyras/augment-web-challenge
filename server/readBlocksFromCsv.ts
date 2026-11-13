import { createReadStream } from 'node:fs'
import Papa from 'papaparse'
import type { Block } from '../src/data/Block'

const requiredFields = ['IJK', 'XC', 'YC', 'ZC', 'Xinc', 'Yinc', 'Zinc'] as const

function parseBlockRow(row: Record<string, string>, index: number): Block {
  const readNumber = (field: keyof Block): number => {
    const raw = row[field]?.trim()
    const value = Number(raw)

    if (!raw || !Number.isFinite(value)) {
      throw new Error(`Row ${index + 1}: ${field} must be a number.`)
    }

    return value
  }

  const block: Block = {
    IJK: readNumber('IJK'),
    XC: readNumber('XC'),
    YC: readNumber('YC'),
    ZC: readNumber('ZC'),
    Xinc: readNumber('Xinc'),
    Yinc: readNumber('Yinc'),
    Zinc: readNumber('Zinc'),
  }

  if (!Number.isSafeInteger(block.IJK)) {
    throw new Error(`Row ${index + 1}: IJK must be a safe integer.`)
  }

  if (block.Xinc <= 0 || block.Yinc <= 0 || block.Zinc <= 0) {
    throw new Error(`Row ${index + 1}: block dimensions must be greater than zero.`)
  }

  return block
}

export function readBlocksFromCsv(filePath: string): Promise<Block[]> {
  return new Promise((resolve, reject) => {
    const blocks: Block[] = []
    const stream = createReadStream(filePath, { encoding: 'utf8' })
    let headersChecked = false
    let failed = false

    stream.on('error', () => reject(new Error('Could not read data/private/1_blockmodel.csv. Check that the local file exists.')))

    Papa.parse<Record<string, string>>(stream, {
      header: true,
      delimiter: ',',
      chunkSize: 64 * 1024,
      skipEmptyLines: 'greedy',
      transformHeader: (header) => header.trim(),
      step: (result, parser) => {
        try {
          if (result.errors.length > 0) {
            throw new Error(`Could not read the CSV: ${result.errors[0].message}`)
          }

          if (!headersChecked) {
            const missing = requiredFields.filter((field) => !result.meta.fields?.includes(field))
            if (missing.length > 0) {
              throw new Error(`Missing columns: ${missing.join(', ')}.`)
            }
            headersChecked = true
          }

          blocks.push(parseBlockRow(result.data, blocks.length))
        } catch (error) {
          failed = true
          reject(error)
          parser.abort()
          stream.destroy()
        }
      },
      complete: () => {
        if (failed) return

        if (blocks.length === 0) {
          reject(new Error('The CSV does not contain any blocks.'))
          return
        }

        resolve(blocks)
      },
      error: (error) => {
        failed = true
        stream.destroy()
        reject(error)
      },
    })
  })
}
