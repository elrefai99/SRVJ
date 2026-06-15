<script setup lang="ts">
import { onMounted, ref } from 'vue'

/**
 * Renders its default slot only in the browser (after mount), falling back to
 * the optional `#fallback` slot during static generation and the first client
 * render. Used to keep DOM-only libraries — chiefly Vue Flow — out of the
 * `vite-ssg` Node render pass, where `window`/`document` don't exist.
 *
 * Rendering the fallback on both server and initial client paint keeps
 * hydration in sync (no mismatch); the real content swaps in `onMounted`.
 */
const mounted = ref(false)
onMounted(() => {
  mounted.value = true
})
</script>

<template>
  <slot v-if="mounted" />
  <slot v-else name="fallback" />
</template>
