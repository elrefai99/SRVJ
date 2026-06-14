<script setup lang="ts">
import { onMounted } from 'vue'
import DiagramToolbar from '@/components/DiagramToolbar.vue'
import DiagramCanvas from '@/components/DiagramCanvas.vue'
import { useDiagramPersistence } from '@/composables/useDiagramPersistence'
import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts'
import { useDarkMode } from '@/composables/useDarkMode'

const persistence = useDiagramPersistence()
const { init: initDarkMode } = useDarkMode()

// Register global Delete / Ctrl+Z keyboard shortcuts.
useKeyboardShortcuts()

onMounted(() => {
  initDarkMode()
  persistence.load() // restore previously saved diagram (if any)
  persistence.start() // begin debounced auto-save
})
</script>

<template>
  <div class="flex h-screen w-screen flex-col overflow-hidden bg-slate-50 dark:bg-slate-900">
    <DiagramToolbar />
    <main class="relative min-h-0 flex-1">
      <DiagramCanvas />
    </main>
  </div>
</template>
