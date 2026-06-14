<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useDiagramStore } from '@/stores/diagram'
import { useDarkMode } from '@/composables/useDarkMode'
import type { NodeVariant } from '@/types/diagram'
import { downloadDiagram, parseDiagram, readFileAsText } from '@/utils/exportImport'
import ToolbarButton from './ToolbarButton.vue'

const store = useDiagramStore()
const { canUndo, canRedo, selected, nodeCount, edgeCount } = storeToRefs(store)
const { isDark, toggle: toggleDark } = useDarkMode()

const nodeVariant = ref<NodeVariant>('default')
const fileInput = ref<HTMLInputElement | null>(null)

function addNode() {
  store.addNode(nodeVariant.value)
}

function exportJson() {
  downloadDiagram(store.snapshot, `diagram-${Date.now()}.json`)
}

function triggerImport() {
  fileInput.value?.click()
}

async function onFileSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  try {
    const text = await readFileAsText(file)
    const snapshot = parseDiagram(text)
    store.loadSnapshot(snapshot)
  } catch (error) {
    window.alert(error instanceof Error ? error.message : 'Failed to import diagram.')
  } finally {
    input.value = ''
  }
}

function confirmReset() {
  if (store.nodeCount === 0 && store.edgeCount === 0) return
  if (window.confirm('Clear the entire canvas? This can be undone with Ctrl+Z.')) {
    store.reset()
  }
}
</script>

<template>
  <header
    class="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white/80 px-4 py-2.5 backdrop-blur dark:border-slate-700 dark:bg-slate-900/80"
  >
    <div class="mr-2 flex items-center gap-2">
      <span class="i-carbon-flow-connection text-xl text-indigo-500" aria-hidden="true" />
      <span class="text-lg font-semibold text-slate-800 dark:text-slate-100">SRVJ</span>
      <span class="ml-1 hidden items-center gap-1.5 md:flex" aria-hidden="true">
      </span>
    </div>

    <div class="flex items-center gap-1.5">
      <select
        v-model="nodeVariant"
        aria-label="Node type"
        class="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700 outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
      >
        <option value="default">Default</option>
        <option value="input">Input</option>
        <option value="output">Output</option>
      </select>
      <ToolbarButton label="Add Node" icon="i-carbon-add" variant="primary" @click="addNode" />
    </div>

    <span class="mx-1 h-6 w-px bg-slate-200 dark:bg-slate-700" />

    <ToolbarButton
      label="Delete"
      icon="i-mdi-trash-can-outline"
      variant="danger"
      :disabled="!selected"
      @click="store.deleteSelected()"
    />

    <span class="mx-1 h-6 w-px bg-slate-200 dark:bg-slate-700" />

    <ToolbarButton
      label="Undo"
      icon="i-ri-arrow-go-back-line"
      :disabled="!canUndo"
      @click="store.undo()"
    />
    <ToolbarButton
      label="Redo"
      icon="i-ri-arrow-go-forward-line"
      :disabled="!canRedo"
      @click="store.redo()"
    />

    <span class="mx-1 h-6 w-px bg-slate-200 dark:bg-slate-700" />

    <ToolbarButton label="Export" icon="i-solar-download-minimalistic-linear" @click="exportJson" />
    <ToolbarButton label="Import" icon="i-solar-upload-minimalistic-linear" @click="triggerImport" />
    <ToolbarButton
      label="Reset"
      icon="i-codicon-clear-all"
      variant="danger"
      @click="confirmReset"
    />

    <input
      ref="fileInput"
      type="file"
      accept="application/json,.json"
      class="hidden"
      @change="onFileSelected"
    />

    <div class="ml-auto flex items-center gap-3">
      <span class="hidden items-center gap-1 text-xs text-slate-500 dark:text-slate-400 sm:flex">
        <span class="i-oui-node text-sm" aria-hidden="true" />
        {{ nodeCount }} nodes
        <span class="i-nonicons-git-merge-16 ml-1 text-sm" aria-hidden="true" />
        {{ edgeCount }} edges
      </span>
      <button
        type="button"
        :aria-pressed="isDark"
        aria-label="Toggle dark mode"
        title="Toggle dark mode"
        class="inline-flex items-center rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-base shadow-sm hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700"
        @click="toggleDark"
      >
        <span
          :class="isDark ? 'i-solar-moon-bold text-indigo-300' : 'i-solar-sun-2-bold text-amber-500'"
          aria-hidden="true"
        />
      </button>
    </div>
  </header>
</template>
