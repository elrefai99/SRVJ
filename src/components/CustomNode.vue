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
}

// Excalidraw-like pastel palette (light + dark variants baked in).
const colorStyles: Record<NodeColor, ColorStyle> = {
  slate: {
    fill: 'bg-white dark:bg-slate-800',
    border: 'border-slate-300 dark:border-slate-500',
    text: 'text-slate-700 dark:text-slate-100',
  },
  blue: {
    fill: 'bg-sky-100 dark:bg-sky-500/20',
    border: 'border-sky-400 dark:border-sky-400/70',
    text: 'text-sky-900 dark:text-sky-100',
  },
  green: {
    fill: 'bg-emerald-100 dark:bg-emerald-500/20',
    border: 'border-emerald-400 dark:border-emerald-400/70',
    text: 'text-emerald-900 dark:text-emerald-100',
  },
  yellow: {
    fill: 'bg-amber-100 dark:bg-amber-500/20',
    border: 'border-amber-400 dark:border-amber-400/70',
    text: 'text-amber-900 dark:text-amber-100',
  },
  red: {
    fill: 'bg-rose-100 dark:bg-rose-500/20',
    border: 'border-rose-400 dark:border-rose-400/70',
    text: 'text-rose-900 dark:text-rose-100',
  },
  violet: {
    fill: 'bg-violet-100 dark:bg-violet-500/20',
    border: 'border-violet-400 dark:border-violet-400/70',
    text: 'text-violet-900 dark:text-violet-100',
  },
}

const shape = computed(() => props.data.shape)
const color = computed(() => colorStyles[props.data.color])
const hasTarget = computed(() => props.data.variant !== 'input')
const hasSource = computed(() => props.data.variant !== 'output')

// Background-shape modifier classes (radius / rotation per shape).
const shapeClass = computed(() => {
  switch (shape.value) {
    case 'ellipse':
      return 'shape-ellipse rounded-[50%]'
    case 'diamond':
      return 'shape-diamond rotate-45 rounded-lg'
    default:
      return 'shape-rectangle rounded-xl'
  }
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
      :min-width="80"
      :min-height="48"
      :node-id="props.id"
      @resize-start="onResizeStart"
      @resize="onResize"
    />

    <Handle v-if="hasTarget" type="target" :position="Position.Top" class="diagram-handle" />

    <!-- The drawn shape (border + fill) sits behind the label. -->
    <div
      class="diagram-shape absolute inset-0 border-2 transition-shadow duration-150"
      :class="[shapeClass, color.fill, color.border, props.selected ? 'is-selected' : '']"
    />

    <!-- Label overlay, always upright (even on a rotated diamond). -->
    <div class="relative z-10 flex max-w-full flex-col items-center px-4 py-2 text-center">
      <span
        v-if="variantBadge"
        class="mb-0.5 text-[10px] font-semibold uppercase tracking-wider opacity-60"
        :class="color.text"
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
        :class="color.text"
        title="Double-click to edit"
        @dblclick.stop="startEditing"
      >
        {{ props.data.label }}
      </div>
    </div>

    <Handle v-if="hasSource" type="source" :position="Position.Bottom" class="diagram-handle" />
  </div>
</template>
