<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useDiagramStore } from '@/stores/diagram'
import { useEditorTool, type ShapeTool } from '@/composables/useEditorTool'
import type { NodeColor } from '@/types/diagram'

const store = useDiagramStore()
const { hasSelection, selectionColor } = storeToRefs(store)
const { activeColor, isSelectTool, setTool, resetTool, setColor, isActive } = useEditorTool()

interface Tool extends ShapeTool {
  key: string
  label: string
  icon: string
}

const tools: Tool[] = [
  { key: 'rectangle', label: 'Rectangle', icon: 'i-mdi-rectangle-outline', shape: 'rectangle', variant: 'default' },
  { key: 'ellipse', label: 'Ellipse', icon: 'i-mdi-ellipse-outline', shape: 'ellipse', variant: 'default' },
  { key: 'diamond', label: 'Diamond', icon: 'i-mdi-rhombus-outline', shape: 'diamond', variant: 'default' },
  { key: 'sticky', label: 'Sticky note', icon: 'i-mdi-sticky-note-outline', shape: 'sticky', variant: 'default' },
  { key: 'text', label: 'Text', icon: 'i-mdi-format-text', shape: 'text', variant: 'default' },
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

// Sticky notes default to yellow (Miro-style) unless a colour was chosen.
function colorFor(tool: Tool): NodeColor {
  if (tool.shape === 'sticky' && activeColor.value === 'slate') return 'yellow'
  return activeColor.value
}

function pickTool(tool: Tool) {
  setTool({ shape: tool.shape, variant: tool.variant })
}

function onDragStart(event: DragEvent, tool: Tool) {
  if (!event.dataTransfer) return
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData(
    'application/diagram-node',
    JSON.stringify({ variant: tool.variant, shape: tool.shape, color: colorFor(tool) }),
  )
}

function pickColor(color: NodeColor) {
  setColor(color)
  // If nodes are selected, recolour them immediately (Excalidraw behaviour).
  if (store.selectedNodeIds.length > 0) store.updateNodeColor(color)
}
</script>

<template>
  <aside
    class="pointer-events-auto absolute left-4 top-4 z-10 flex w-[68px] flex-col items-center gap-1.5 rounded-2xl border border-slate-200/80 bg-white/85 p-2 shadow-xl backdrop-blur-md dark:border-slate-700/80 dark:bg-slate-800/85"
  >
    <!-- Select / cursor tool -->
    <button
      type="button"
      title="Select & move (V)"
      aria-label="Select tool"
      class="flex h-11 w-11 items-center justify-center rounded-xl border text-xl transition-colors active:scale-95"
      :class="
        isSelectTool
          ? 'border-indigo-300 bg-indigo-50 text-indigo-600 dark:border-indigo-500/40 dark:bg-indigo-500/15 dark:text-indigo-300'
          : 'border-transparent text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
      "
      @click="resetTool"
    >
      <span class="i-mdi-cursor-default-outline" aria-hidden="true" />
    </button>

    <span class="my-0.5 h-px w-9 bg-slate-200 dark:bg-slate-700" />

    <button
      v-for="tool in tools"
      :key="tool.key"
      type="button"
      draggable="true"
      :title="`${tool.label} — click to pick, then drag on the canvas to draw`"
      :aria-label="tool.label"
      :aria-pressed="isActive(tool)"
      class="flex h-11 w-11 items-center justify-center rounded-xl border text-xl transition-colors active:scale-95"
      :class="
        isActive(tool)
          ? 'border-indigo-300 bg-indigo-50 text-indigo-600 dark:border-indigo-500/40 dark:bg-indigo-500/15 dark:text-indigo-300'
          : 'border-transparent text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
      "
      @click="pickTool(tool)"
      @dragstart="onDragStart($event, tool)"
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
