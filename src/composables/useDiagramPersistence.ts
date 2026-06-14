import { watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useDiagramStore } from '@/stores/diagram'
import { storage } from '@/utils/storage'
import type { DiagramSnapshot } from '@/types/diagram'
import { AUTOSAVE_DELAY, STORAGE_KEY } from '@/utils/constants'

/**
 * Wires the diagram store to localStorage:
 *  - `load()` restores a previously saved diagram (call once on startup).
 *  - a debounced watcher auto-saves whenever nodes or edges change.
 */
export function useDiagramPersistence() {
  const store = useDiagramStore()
  const { nodes, edges } = storeToRefs(store)

  let timer: ReturnType<typeof setTimeout> | undefined

  function save() {
    storage.set<DiagramSnapshot>(STORAGE_KEY, store.snapshot)
  }

  function load(): boolean {
    const saved = storage.get<DiagramSnapshot>(STORAGE_KEY)
    if (!saved || !Array.isArray(saved.nodes) || !Array.isArray(saved.edges)) {
      return false
    }
    store.applySnapshot(saved)
    return true
  }

  function start() {
    watch(
      [nodes, edges],
      () => {
        if (timer) clearTimeout(timer)
        timer = setTimeout(save, AUTOSAVE_DELAY)
      },
      { deep: true },
    )
  }

  return { load, save, start }
}
