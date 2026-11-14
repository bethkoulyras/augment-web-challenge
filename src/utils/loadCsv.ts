import Papa from 'papaparse'

export type CsvRow = Record<string, string>

export async function loadCsv(path: string, signal: AbortSignal): Promise<CsvRow[]> {
  const response = await fetch(path, { signal })
  if (!response.ok) throw new Error('Could not load ' + path)

  const csv = await response.text()
  const result = Papa.parse<CsvRow>(csv, { header: true, skipEmptyLines: true })
  if (result.errors.length > 0) throw new Error(result.errors[0].message)

  return result.data
}
