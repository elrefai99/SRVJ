<script setup lang="ts">
import { onMounted } from 'vue'
import DiagramToolbar from '@/components/DiagramToolbar.vue'
import DiagramCanvas from '@/components/DiagramCanvas.vue'
import NodePalette from '@/components/NodePalette.vue'
import { useDiagramPersistence } from '@/composables/useDiagramPersistence'
import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts'
import { useDarkMode } from '@/composables/useDarkMode'
import { useSketchMode } from '@/composables/useSketchMode'

const persistence = useDiagramPersistence()
const { init: initDarkMode } = useDarkMode()
const { init: initSketchMode } = useSketchMode()

// Register global Delete / Ctrl+Z / Ctrl+A keyboard shortcuts.
useKeyboardShortcuts()

onMounted(() => {
  initDarkMode()
  initSketchMode()
  persistence.load() // restore previously saved diagram (if any)
  persistence.start() // begin debounced auto-save
})
</script>

<template>
  <div class="flex h-screen w-screen flex-col overflow-hidden bg-slate-50 dark:bg-slate-900">
    <DiagramToolbar />
    <main class="relative min-h-0 flex-1">
      <NodePalette />
      <DiagramCanvas />
    </main>
  </div>
</template>
