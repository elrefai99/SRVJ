<script setup lang="ts">
interface Props {
  label: string
  /** UnoCSS icon class, e.g. `i-carbon-add`. Rendered before the label. */
  icon?: string
  disabled?: boolean
  variant?: 'default' | 'primary' | 'danger'
  /** Toggle-style buttons render a highlighted "on" appearance when true. */
  active?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  icon: '',
  disabled: false,
  variant: 'default',
  active: false,
})

const variantClasses: Record<NonNullable<Props['variant']>, string> = {
  default:
    'border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700',
  primary:
    'border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700 dark:border-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400',
  danger:
    'border-rose-300 bg-white text-rose-600 hover:bg-rose-50 dark:border-rose-500/60 dark:bg-slate-800 dark:text-rose-400 dark:hover:bg-rose-900/30',
}

// Pressed/toggled appearance, shared by any toggle button (e.g. the arrow tool).
const ACTIVE_CLASS =
  'border-indigo-500 bg-indigo-500 text-white hover:bg-indigo-600 dark:border-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400'
</script>

<template>
  <button
    type="button"
    :disabled="props.disabled"
    :title="props.label"
    :aria-pressed="props.active ? 'true' : undefined"
    class="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40"
    :class="props.active ? ACTIVE_CLASS : variantClasses[props.variant]"
  >
    <span v-if="props.icon" :class="props.icon" aria-hidden="true" />
    <span>{{ props.label }}</span>
  </button>
</template>
