/**
 * True only in a browser with `localStorage`. False during `vite-ssg` static
 * generation (Node), where the API is absent — guarding on it keeps the build
 * log clean instead of catching a `ReferenceError` per access.
 */
const hasLocalStorage = typeof localStorage !== 'undefined'

/**
 * Thin, type-safe wrapper around `localStorage` that never throws (storage can
 * be unavailable in private-browsing modes or when quota is exceeded) and is a
 * no-op during server-side static generation.
 */
export const storage = {
  get<T>(key: string): T | null {
    if (!hasLocalStorage) return null
    try {
      const raw = localStorage.getItem(key)
      return raw ? (JSON.parse(raw) as T) : null
    } catch (error) {
      console.warn(`[storage] failed to read "${key}"`, error)
      return null
    }
  },

  set<T>(key: string, value: T): void {
    if (!hasLocalStorage) return
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.warn(`[storage] failed to write "${key}"`, error)
    }
  },

  remove(key: string): void {
    if (!hasLocalStorage) return
    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.warn(`[storage] failed to remove "${key}"`, error)
    }
  },
}
