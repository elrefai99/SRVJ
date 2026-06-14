<script setup lang="ts">
import { computed } from 'vue'
import { useVueFlow } from '@vue-flow/core'

// Shares the active flow instance created in DiagramCanvas (this component is
// rendered inside <VueFlow>, so the injection resolves to the same store).
const flow = useVueFlow()

const percent = computed(() => Math.round((flow.viewport.value?.zoom ?? 1) * 100))

function zoomIn() {
  flow.zoomIn()
}
function zoomOut() {
  flow.zoomOut()
}
function reset() {
  flow.fitView({ padding: 0.2, duration: 300 })
}
</script>

<template>
  <div
    class="pointer-events-auto absolute bottom-4 right-4 z-10 flex items-center gap-0.5 rounded-xl border border-slate-200/80 bg-white/90 p-1 shadow-lg backdrop-blur-md dark:border-slate-700/80 dark:bg-slate-800/90"
  >
    <button
      type="button"
      title="Zoom out"
      aria-label="Zoom out"
      class="flex h-8 w-8 items-center justify-center rounded-lg text-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
      @click="zoomOut"
    >
      <span class="i-mdi-minus" aria-hidden="true" />
    </button>

    <button
      type="button"
      title="Fit to screen"
      aria-label="Fit to screen"
      class="min-w-[3.25rem] rounded-lg px-2 py-1 text-center text-xs font-semibold tabular-nums text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
      @click="reset"
    >
      {{ percent }}%
    </button>

    <button
      type="button"
      title="Zoom in"
      aria-label="Zoom in"
      class="flex h-8 w-8 items-center justify-center rounded-lg text-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
      @click="zoomIn"
    >
      <span class="i-mdi-plus" aria-hidden="true" />
    </button>
  </div>
</template>
