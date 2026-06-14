import type { DiagramSnapshot } from '@/types/diagram'
import { DIAGRAM_VERSION } from './constants'

/** Trigger a browser download of the given diagram as a JSON file. */
export function downloadDiagram(snapshot: DiagramSnapshot, filename = 'diagram.json'): void {
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

/**
 * Validate and parse a raw JSON string into a `DiagramSnapshot`.
 * Throws a descriptive error when the payload is malformed.
 */
export function parseDiagram(raw: string): DiagramSnapshot {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('File does not contain valid JSON.')
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Diagram JSON must be an object.')
  }

  const candidate = parsed as Partial<DiagramSnapshot>
  if (!Array.isArray(candidate.nodes) || !Array.isArray(candidate.edges)) {
    throw new Error('Diagram JSON must contain "nodes" and "edges" arrays.')
  }

  return {
    version: typeof candidate.version === 'number' ? candidate.version : DIAGRAM_VERSION,
    nodes: candidate.nodes,
    edges: candidate.edges,
  }
}

/** Read a `File` (e.g. from an `<input type="file">`) as text. */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('Could not read the selected file.'))
    reader.readAsText(file)
  })
}
