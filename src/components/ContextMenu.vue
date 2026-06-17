<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

/** A single actionable row in the context menu. */
export interface MenuItem {
  key: string
  label: string
  shortcut?: string
  danger?: boolean
}

const props = defineProps<{
  x: number
  y: number
  /** Groups of items — a divider is drawn between groups. */
  groups: MenuItem[][]
}>()

const emit = defineEmits<{
  (e: 'select', key: string): void
  (e: 'close'): void
}>()

const menuRef = ref<HTMLElement | null>(null)

// Keep the menu fully on-screen: if it would overflow the right / bottom edge,
// flip it back over the click point.
const position = ref({ left: props.x, top: props.y })

function clampToViewport() {
  const el = menuRef.value
  if (!el) return
  const { width, height } = el.getBoundingClientRect()
  const pad = 8
  let left = props.x
  let top = props.y
  if (left + width + pad > window.innerWidth) left = window.innerWidth - width - pad
  if (top + height + pad > window.innerHeight) top = window.innerHeight - height - pad
  position.value = { left: Math.max(pad, left), top: Math.max(pad, top) }
}

watch(() => [props.x, props.y], clampToViewport)

function onSelect(item: MenuItem) {
  emit('select', item.key)
}

// Any outside interaction (click, right-click elsewhere, scroll, Esc) closes it.
function onDocPointerDown(event: PointerEvent) {
  if (!menuRef.value?.contains(event.target as Node)) emit('close')
}
function onKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape') emit('close')
}

const style = computed(() => ({ left: `${position.value.left}px`, top: `${position.value.top}px` }))

onMounted(() => {
  clampToViewport()
  // `capture` so we see the press before it lands on a node / the canvas.
  document.addEventListener('pointerdown', onDocPointerDown, true)
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('resize', () => emit('close'))
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocPointerDown, true)
  window.removeEventListener('keydown', onKeyDown)
})
</script>

<template>
  <div
    ref="menuRef"
    class="context-menu fixed z-[100] min-w-[15rem] select-none rounded-lg border border-slate-700/70 bg-slate-800 p-1 text-sm text-slate-200 shadow-2xl"
    :style="style"
    @contextmenu.prevent
  >
    <template v-for="(group, gi) in groups" :key="gi">
      <div v-if="gi > 0" class="my-1 h-px bg-slate-700/70" />
      <button
        v-for="item in group"
        :key="item.key"
        type="button"
        class="flex w-full items-center justify-between gap-6 rounded px-2.5 py-1.5 text-left transition-colors hover:bg-slate-700/70"
        :class="item.danger ? 'text-rose-400 hover:bg-rose-500/10' : ''"
        @click="onSelect(item)"
      >
        <span>{{ item.label }}</span>
        <span v-if="item.shortcut" class="text-xs text-slate-500">{{ item.shortcut }}</span>
      </button>
    </template>
  </div>
</template>
