import { ref, watch } from 'vue'
import { storage } from '@/utils/storage'
import { THEME_STORAGE_KEY } from '@/utils/constants'

type Theme = 'light' | 'dark'

const isDark = ref(false)

function apply(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

/**
 * Reactive dark-mode controller. Initialises from a saved preference (falling
 * back to the OS setting) and persists changes. Shared module-level state keeps
 * every caller in sync.
 */
export function useDarkMode() {
  function init() {
    const saved = storage.get<Theme>(THEME_STORAGE_KEY)
    if (saved === 'dark' || saved === 'light') {
      isDark.value = saved === 'dark'
    } else if (typeof window !== 'undefined' && window.matchMedia) {
      isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    apply(isDark.value ? 'dark' : 'light')
  }

  function toggle() {
    isDark.value = !isDark.value
  }

  watch(isDark, (value) => {
    const theme: Theme = value ? 'dark' : 'light'
    apply(theme)
    storage.set<Theme>(THEME_STORAGE_KEY, theme)
  })

  return { isDark, init, toggle }
}
