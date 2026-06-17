import { computed, ref, watch } from 'vue'
import { storage } from '@/utils/storage'
import { THEME_STORAGE_KEY } from '@/utils/constants'

type Theme = 'light' | 'dark'

const isDark = ref(false)
// When set, the app is locked to this theme regardless of the user's saved
// preference (the dashboard forces `dark`). `null` follows `isDark`. The saved
// preference is never overwritten by a lock, so the toggle resumes afterwards.
const forcedTheme = ref<Theme | null>(null)

function effectiveTheme(): Theme {
  return forcedTheme.value ?? (isDark.value ? 'dark' : 'light')
}

function apply(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

/**
 * Reactive dark-mode controller. Initialises from a saved preference (falling
 * back to the OS setting) and persists changes. Shared module-level state keeps
 * every caller in sync. A page may `setForcedTheme('dark')` to lock the theme
 * (and `setForcedTheme(null)` to release it on unmount).
 */
export function useDarkMode() {
  function init() {
    const saved = storage.get<Theme>(THEME_STORAGE_KEY)
    if (saved === 'dark' || saved === 'light') {
      isDark.value = saved === 'dark'
    } else if (typeof window !== 'undefined' && window.matchMedia) {
      isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    apply(effectiveTheme())
  }

  function toggle() {
    isDark.value = !isDark.value
  }

  function setForcedTheme(theme: Theme | null) {
    forcedTheme.value = theme
  }

  watch([isDark, forcedTheme], () => {
    apply(effectiveTheme())
    // Persist only the user's own choice — never the forced override.
    storage.set<Theme>(THEME_STORAGE_KEY, isDark.value ? 'dark' : 'light')
  })

  return {
    isDark,
    isForced: computed(() => forcedTheme.value !== null),
    init,
    toggle,
    setForcedTheme,
  }
}
