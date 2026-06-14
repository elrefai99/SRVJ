/**
 * Generate a reasonably unique id. Uses the native `crypto.randomUUID` when
 * available and falls back to a timestamp + random suffix otherwise.
 */
export function createId(prefix = ''): string {
  const uuid =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

  return prefix ? `${prefix}_${uuid}` : uuid
}
