import { ref, watch } from 'vue'
import { storage } from '@/utils/storage'
import { SKETCH_STORAGE_KEY } from '@/utils/constants'

// Shared module-level state so every caller stays in sync.
const isSketch = ref(true)

function apply(value: boolean) {
  document.documentElement.classList.toggle('sketch-mode', value)
}

/**
 * Reactive "hand-drawn" (Excalidraw-style) mode controller. Toggling adds a
 * `.sketch-mode` class on <html>, which swaps in the handwriting font and the
 * wobbly shape borders. The preference is persisted to localStorage.
 */
export function useSketchMode() {
  function init() {
    const saved = storage.get<boolean>(SKETCH_STORAGE_KEY)
    if (typeof saved === 'boolean') isSketch.value = saved
    apply(isSketch.value)
  }

  function toggle() {
    isSketch.value = !isSketch.value
  }

  watch(isSketch, (value) => {
    apply(value)
    storage.set<boolean>(SKETCH_STORAGE_KEY, value)
  })

  return { isSketch, init, toggle }
}
