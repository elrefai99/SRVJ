<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { Handle, Position, type NodeProps } from '@vue-flow/core'
import { NodeResizer, type OnResize } from '@vue-flow/node-resizer'
import type { DiagramNodeData, NodeColor } from '@/types/diagram'
import { useDiagramStore } from '@/stores/diagram'

const props = defineProps<NodeProps<DiagramNodeData>>()
const store = useDiagramStore()

const editing = ref(false)
const draft = ref('')
const inputRef = ref<HTMLInputElement | null>(null)

interface ColorStyle {
  fill: string
  border: string
  text: string
  sticky: string // solid Miro-style sticky fill + readable text
}

// Excalidraw-like pastel palette (light + dark variants baked in).
const colorStyles: Record<NodeColor, ColorStyle> = {
  slate: {
    fill: 'bg-white dark:bg-slate-800',
    border: 'border-slate-300 dark:border-slate-500',
    text: 'text-slate-700 dark:text-slate-100',
    sticky: 'bg-slate-200 text-slate-800 dark:bg-slate-300 dark:text-slate-900',
  },
  blue: {
    fill: 'bg-sky-100 dark:bg-sky-500/20',
    border: 'border-sky-400 dark:border-sky-400/70',
    text: 'text-sky-900 dark:text-sky-100',
    sticky: 'bg-sky-200 text-sky-900 dark:bg-sky-300 dark:text-sky-950',
  },
  green: {
    fill: 'bg-emerald-100 dark:bg-emerald-500/20',
    border: 'border-emerald-400 dark:border-emerald-400/70',
    text: 'text-emerald-900 dark:text-emerald-100',
    sticky: 'bg-emerald-200 text-emerald-900 dark:bg-emerald-300 dark:text-emerald-950',
  },
  yellow: {
    fill: 'bg-amber-100 dark:bg-amber-500/20',
    border: 'border-amber-400 dark:border-amber-400/70',
    text: 'text-amber-900 dark:text-amber-100',
    sticky: 'bg-amber-200 text-amber-900 dark:bg-amber-300 dark:text-amber-950',
  },
  red: {
    fill: 'bg-rose-100 dark:bg-rose-500/20',
    border: 'border-rose-400 dark:border-rose-400/70',
    text: 'text-rose-900 dark:text-rose-100',
    sticky: 'bg-rose-200 text-rose-900 dark:bg-rose-300 dark:text-rose-950',
  },
  violet: {
    fill: 'bg-violet-100 dark:bg-violet-500/20',
    border: 'border-violet-400 dark:border-violet-400/70',
    text: 'text-violet-900 dark:text-violet-100',
    sticky: 'bg-violet-200 text-violet-900 dark:bg-violet-300 dark:text-violet-950',
  },
}

const shape = computed(() => props.data.shape)
const palette = computed(() => colorStyles[props.data.color])

// Text nodes are pure labels — no fill, no border, no handles.
const connectable = computed(() => shape.value !== 'text')
const hasTarget = computed(() => connectable.value && props.data.variant !== 'input')
const hasSource = computed(() => connectable.value && props.data.variant !== 'output')

// Per-shape background classes (includes a `shape-*` hook used by sketch CSS).
const shapeClasses = computed(() => {
  const c = palette.value
  switch (shape.value) {
    case 'ellipse':
      return ['shape-ellipse', 'border-2 rounded-[50%]', c.fill, c.border]
    case 'diamond':
      return ['shape-diamond', 'border-2 rotate-45 rounded-lg', c.fill, c.border]
    case 'sticky':
      return ['shape-sticky', 'rounded-md shadow-lg', c.sticky]
    case 'text':
      return ['shape-text', 'border-0 bg-transparent']
    default:
      return ['shape-rectangle', 'border-2 rounded-xl', c.fill, c.border]
  }
})

const labelClasses = computed(() => {
  if (shape.value === 'sticky') return `${palette.value.sticky} bg-transparent dark:bg-transparent`
  if (shape.value === 'text') return `${palette.value.text} text-base`
  return palette.value.text
})

const variantBadge = computed(() => {
  if (props.data.variant === 'input') return 'Input'
  if (props.data.variant === 'output') return 'Output'
  return ''
})

// ---- Resize (mouse-driven, persisted to the store) --------------------------
function onResizeStart() {
  store.commit()
}

function onResize({ params }: OnResize) {
  store.setNodeRect(props.id, {
    x: params.x,
    y: params.y,
    width: params.width,
    height: params.height,
  })
}

// ---- Inline label editing ---------------------------------------------------
async function startEditing() {
  draft.value = props.data.label
  editing.value = true
  await nextTick()
  inputRef.value?.focus()
  inputRef.value?.select()
}

function commitEditing() {
  if (!editing.value) return
  const next = draft.value.trim()
  if (next) store.updateNodeLabel(props.id, next)
  editing.value = false
}

function cancelEditing() {
  editing.value = false
}
</script>

<template>
  <div class="relative flex h-full w-full items-center justify-center">
    <NodeResizer
      v-if="props.selected"
      :min-width="60"
      :min-height="36"
      :node-id="props.id"
      @resize-start="onResizeStart"
      @resize="onResize"
    />

    <Handle v-if="hasTarget" type="target" :position="Position.Top" class="diagram-handle" />

    <!-- The drawn shape (fill / border) sits behind the label. -->
    <div
      class="diagram-shape absolute inset-0 transition-shadow duration-150"
      :class="[...shapeClasses, props.selected ? 'is-selected' : '']"
    />

    <!-- Label overlay, always upright (even on a rotated diamond). -->
    <div class="relative z-10 flex max-w-full flex-col items-center px-3 py-1.5 text-center">
      <span
        v-if="variantBadge"
        class="mb-0.5 text-[10px] font-semibold uppercase tracking-wider opacity-60"
        :class="labelClasses"
      >
        {{ variantBadge }}
      </span>

      <input
        v-if="editing"
        ref="inputRef"
        v-model="draft"
        type="text"
        class="w-full rounded-md border border-indigo-300 bg-white/90 px-1.5 py-0.5 text-center text-sm font-semibold text-slate-900 outline-none focus:border-indigo-500 dark:bg-slate-900/90 dark:text-slate-100"
        @keydown.enter.prevent="commitEditing"
        @keydown.esc.prevent="cancelEditing"
        @blur="commitEditing"
      />
      <div
        v-else
        class="cursor-text select-none break-words text-sm font-semibold leading-snug"
        :class="labelClasses"
        title="Double-click to edit"
        @dblclick.stop="startEditing"
      >
        {{ props.data.label }}
      </div>
    </div>

    <Handle v-if="hasSource" type="source" :position="Position.Bottom" class="diagram-handle" />
  </div>
</template>
