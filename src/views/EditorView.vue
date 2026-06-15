<script setup lang="ts">
import { onMounted } from 'vue'
import ClientOnly from '@/components/ClientOnly.vue'
import DiagramToolbar from '@/components/DiagramToolbar.vue'
import DiagramCanvas from '@/components/DiagramCanvas.vue'
import NodePalette from '@/components/NodePalette.vue'
import { useDiagramPersistence } from '@/composables/useDiagramPersistence'
import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts'
import { useDarkMode } from '@/composables/useDarkMode'
import { useSketchMode } from '@/composables/useSketchMode'
import { useSeo } from '@/composables/useSeo'

useSeo({ title: 'SRVJ — Free Online Diagram Editor & Whiteboard', path: '/' })

const persistence = useDiagramPersistence()
const { init: initDarkMode } = useDarkMode()
const { init: initSketchMode } = useSketchMode()

// Register global Delete / Ctrl+Z / Ctrl+A keyboard shortcuts.
useKeyboardShortcuts()

// Restore the saved diagram synchronously, before DiagramCanvas mounts —
// so Vue Flow's `fit-view-on-init` sees the loaded nodes immediately and
// doesn't fire later when the user creates their first shape (which would
// otherwise auto-zoom onto that single node). No-op during static generation,
// where localStorage is unavailable.
persistence.load()

onMounted(() => {
  initDarkMode()
  initSketchMode()
  persistence.start() // begin debounced auto-save
})
</script>

<template>
  <div class="flex h-screen w-screen flex-col overflow-hidden bg-slate-50 dark:bg-slate-900">
    <ClientOnly>
      <DiagramToolbar />
      <main class="relative min-h-0 flex-1">
        <NodePalette />
        <DiagramCanvas />
      </main>

      <!-- Pre-rendered (static) shell: real, crawler-visible content shown
           during SSG and while Vue Flow boots in the browser. -->
      <template #fallback>
        <main
          class="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-6 text-center"
        >
          <div class="i-carbon-flow text-6xl text-indigo-400" aria-hidden="true" />
          <h1 class="text-3xl font-bold text-slate-800 dark:text-slate-100">
            SRVJ — Free Online Diagram Editor &amp; Whiteboard
          </h1>
          <p class="max-w-prose text-slate-600 dark:text-slate-400">
            A free, browser-based diagram editor and whiteboard. SRVJ blends a Draw.io-style
            flow editor with an Excalidraw hand-drawn look and Miro-style sticky notes —
            no sign-up required, your work is saved locally in your browser.
          </p>
          <p class="text-sm text-slate-400">Loading the editor…</p>
        </main>
      </template>
    </ClientOnly>
  </div>
</template>
