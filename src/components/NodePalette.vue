<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useDiagramStore } from '@/stores/diagram'
import type { NodeColor, NodeShape, NodeVariant } from '@/types/diagram'

const store = useDiagramStore()
const { hasSelection, selectionColor } = storeToRefs(store)

interface Tool {
  key: string
  label: string
  icon: string
  shape: NodeShape
  variant: NodeVariant
}

const tools: Tool[] = [
  { key: 'rectangle', label: 'Rectangle', icon: 'i-mdi-rectangle-outline', shape: 'rectangle', variant: 'default' },
  { key: 'ellipse', label: 'Ellipse', icon: 'i-mdi-ellipse-outline', shape: 'ellipse', variant: 'default' },
  { key: 'diamond', label: 'Diamond', icon: 'i-mdi-rhombus-outline', shape: 'diamond', variant: 'default' },
  { key: 'input', label: 'Input node', icon: 'i-mdi-import', shape: 'rectangle', variant: 'input' },
  { key: 'output', label: 'Output node', icon: 'i-mdi-export', shape: 'rectangle', variant: 'output' },
]

const swatches: { key: NodeColor; class: string }[] = [
  { key: 'slate', class: 'bg-white border border-slate-300' },
  { key: 'blue', class: 'bg-sky-300' },
  { key: 'green', class: 'bg-emerald-300' },
  { key: 'yellow', class: 'bg-amber-300' },
  { key: 'red', class: 'bg-rose-300' },
  { key: 'violet', class: 'bg-violet-300' },
]

const activeColor = ref<NodeColor>('slate')

function onDragStart(event: DragEvent, tool: Tool) {
  if (!event.dataTransfer) return
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData(
    'application/diagram-node',
    JSON.stringify({ variant: tool.variant, shape: tool.shape, color: activeColor.value }),
  )
}

function addTool(tool: Tool) {
  store.addNode({ variant: tool.variant, shape: tool.shape, color: activeColor.value })
}

function pickColor(color: NodeColor) {
  activeColor.value = color
  // If nodes are selected, recolour them immediately (Excalidraw behaviour).
  if (store.selectedNodeIds.length > 0) store.updateNodeColor(color)
}
</script>

<template>
  <aside
    class="pointer-events-auto absolute left-4 top-4 z-10 flex w-[68px] flex-col items-center gap-1.5 rounded-2xl border border-slate-200/80 bg-white/85 p-2 shadow-xl backdrop-blur-md dark:border-slate-700/80 dark:bg-slate-800/85"
  >
    <span class="px-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
      Tools
    </span>

    <button
      v-for="tool in tools"
      :key="tool.key"
      type="button"
      draggable="true"
      :title="`${tool.label} — drag onto canvas or click to add`"
      :aria-label="tool.label"
      class="group flex h-11 w-11 items-center justify-center rounded-xl border border-transparent text-xl text-slate-600 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 active:scale-95 dark:text-slate-300 dark:hover:border-indigo-500/40 dark:hover:bg-indigo-500/15 dark:hover:text-indigo-300"
      @dragstart="onDragStart($event, tool)"
      @click="addTool(tool)"
    >
      <span :class="tool.icon" aria-hidden="true" />
    </button>

    <span class="my-1 h-px w-9 bg-slate-200 dark:bg-slate-700" />

    <span class="px-1 pb-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
      {{ hasSelection ? 'Fill' : 'Color' }}
    </span>

    <div class="grid grid-cols-2 gap-1.5">
      <button
        v-for="swatch in swatches"
        :key="swatch.key"
        type="button"
        :title="swatch.key"
        :aria-label="`Colour ${swatch.key}`"
        class="h-6 w-6 rounded-full ring-offset-1 ring-offset-white transition-transform hover:scale-110 dark:ring-offset-slate-800"
        :class="[
          swatch.class,
          (selectionColor ?? activeColor) === swatch.key ? 'ring-2 ring-indigo-500' : '',
        ]"
        @click="pickColor(swatch.key)"
      />
    </div>
  </aside>
</template>
