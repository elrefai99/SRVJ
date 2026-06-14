/**
 * Thin, type-safe wrapper around `localStorage` that never throws (storage can
 * be unavailable in private-browsing modes or when quota is exceeded).
 */
export const storage = {
  get<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(key)
      return raw ? (JSON.parse(raw) as T) : null
    } catch (error) {
      console.warn(`[storage] failed to read "${key}"`, error)
      return null
    }
  },

  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.warn(`[storage] failed to write "${key}"`, error)
    }
  },

  remove(key: string): void {
    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.warn(`[storage] failed to remove "${key}"`, error)
    }
  },
}
