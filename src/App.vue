<script setup lang="ts">
import { onBeforeUnmount, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { Analytics } from '@vercel/analytics/vue'
import { useAuthStore } from '@/stores/auth'
import { useNotifications } from '@/composables/useNotifications'

/**
 * App-wide notification stream lifecycle. The SSE feed (`/notification/stream`)
 * is opened **only while signed in** — it starts right after a login/sign-up and
 * is torn down on logout — and lives here at the root so it stays connected on
 * every page, independent of whether the notification bell is mounted.
 */
const auth = useAuthStore()
const { isAuthenticated } = storeToRefs(auth)
const { connect, disconnect, fetchList, clear } = useNotifications()

let stop: (() => void) | null = null

onMounted(async () => {
  // Adopt any persisted/redirect token first so the initial state is correct.
  await auth.init()
  stop = watch(
    isAuthenticated,
    (signedIn) => {
      if (signedIn) {
        void fetchList()
        void connect()
      } else {
        disconnect()
        clear()
      }
    },
    { immediate: true },
  )
})

onBeforeUnmount(() => {
  stop?.()
  disconnect()
})
</script>

<template>
  <Analytics />
  <RouterView />
</template>
