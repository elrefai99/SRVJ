<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import {
  BaseEdge,
  EdgeLabelRenderer,
  getStraightPath,
  type EdgeProps,
} from '@vue-flow/core'
import { useDiagramStore } from '@/stores/diagram'
import type { EdgeCardinality } from '@/types/diagram'

// A single straight-line edge with an inline-editable text label sitting on the
// midpoint (the "Push work" / "Delegate" labels in the reference diagram).
// Double-click the line (or the label) to edit; Enter / blur commits, Esc cancels.
const props = defineProps<EdgeProps>()
const store = useDiagramStore()

// ---- Crow's-foot cardinality markers ----------------------------------------
// `none` keeps the plain directed arrow (the default flow connector); the ERD
// cardinalities swap in bar / crow's-foot end markers (defined in DiagramCanvas)
// and drop the arrowhead, the way draw.io / dbdiagram render relationships.
const ONE = 'url(#erd-one)'
const MANY = 'url(#erd-many)'
const cardinality = computed<EdgeCardinality>(() => props.data?.cardinality ?? 'none')

const markerStartUrl = computed(() => {
  switch (cardinality.value) {
    case 'one-to-one':
    case 'one-to-many':
      return ONE
    case 'many-to-many':
      return MANY
    default:
      return undefined
  }
})

const markerEndUrl = computed(() => {
  switch (cardinality.value) {
    case 'one-to-one':
      return ONE
    case 'one-to-many':
    case 'many-to-many':
      return MANY
    default:
      // Plain connector: keep Vue Flow's default arrowhead marker.
      return props.markerEnd
  }
})

const geometry = computed(() =>
  getStraightPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    targetX: props.targetX,
    targetY: props.targetY,
  }),
)
const path = computed(() => geometry.value[0])
const labelX = computed(() => geometry.value[1])
const labelY = computed(() => geometry.value[2])

const label = computed(() => (typeof props.label === 'string' ? props.label : ''))

const editing = ref(false)
const draft = ref('')
const inputRef = ref<HTMLInputElement | null>(null)

async function startEditing() {
  if (editing.value) return
  draft.value = label.value
  editing.value = true
  await nextTick()
  inputRef.value?.focus()
  inputRef.value?.select()
}

function commitEditing() {
  if (!editing.value) return
  store.updateEdgeLabel(props.id, draft.value.trim())
  editing.value = false
}

function cancelEditing() {
  editing.value = false
}
</script>

<template>
  <BaseEdge
    :id="id"
    :path="path"
    :marker-start="markerStartUrl"
    :marker-end="markerEndUrl"
    :style="style"
  />

  <EdgeLabelRenderer>
    <div
      class="edge-label nodrag nopan"
      :class="{ 'edge-label--empty': !label && !editing }"
      :style="{
        transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
      }"
      @dblclick.stop="startEditing"
    >
      <input
        v-if="editing"
        ref="inputRef"
        v-model="draft"
        type="text"
        class="edge-label__input"
        placeholder="Label"
        @keydown.enter.prevent="commitEditing"
        @keydown.esc.prevent="cancelEditing"
        @blur="commitEditing"
        @pointerdown.stop
      />
      <span v-else-if="label" class="edge-label__text">{{ label }}</span>
      <span v-else class="edge-label__hint">+ label</span>
    </div>
  </EdgeLabelRenderer>
</template>
