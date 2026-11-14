import { createReadStream } from 'node:fs'
import { basename } from 'node:path'
import Papa from 'papaparse'

export function readCsvRows(
  filePath: string,
  requiredFields: readonly string[],
  onRow: (row: Record<string, string>) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const stream = createReadStream(filePath, { encoding: 'utf8' })
    let headersChecked = false
    let rowNumber = 1
    let failed = false

    const fail = (error: unknown): void => {
      if (failed) return
      failed = true
      stream.destroy()
      reject(error)
    }

    stream.on('error', () => fail(new Error('Could not read data/private/' + basename(filePath) + '. Check that the local file exists.')))

    Papa.parse<Record<string, string>>(stream, {
      header: true,
      delimiter: ',',
      chunkSize: 64 * 1024,
      skipEmptyLines: 'greedy',
      transformHeader: (header) => header.trim(),
      step: (result, parser) => {
        try {
          rowNumber += 1
          if (result.errors.length > 0) throw new Error(result.errors[0].message)
          if (!headersChecked) {
            const missing = requiredFields.filter((field) => !result.meta.fields?.includes(field))
            if (missing.length > 0) throw new Error('Missing columns: ' + missing.join(', ') + '.')
            headersChecked = true
          }
          onRow(result.data)
        } catch (error) {
          fail(new Error(basename(filePath) + ', row ' + rowNumber + ': ' + (error instanceof Error ? error.message : 'Invalid CSV row.')))
          parser.abort()
        }
      },
      complete: () => {
        if (failed) return
        if (!headersChecked) {
          reject(new Error(basename(filePath) + ' does not contain any rows.'))
          return
        }
        resolve()
      },
      error: fail,
    })
  })
}

export function readNumber(row: Record<string, string>, field: string): number {
  const raw = row[field]?.trim()
  const value = Number(raw)
  if (!raw || !Number.isFinite(value)) throw new Error(field + ' must be a number.')
  return value
}
