<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { useNotifications } from '@/composables/useNotifications'

/**
 * Notifications widget for the in-app header. Renders the shared notification
 * feed (unread badge + connection status dot) in a dropdown. The live SSE feed
 * is opened/closed app-wide from `App.vue` based on auth state — the bell only
 * reads that shared state and drives pagination / mark-seen.
 */
const {
  notifications,
  status,
  total,
  lastError,
  loadingList,
  loadingMore,
  hasNextPage,
  loadMore,
  markAllRead,
  markSeen,
  clear,
} = useNotifications()

const open = ref(false)

// The scrollable feed container (only in the DOM while the dropdown is open).
const feedRef = ref<HTMLElement | null>(null)

function toggle() {
  open.value = !open.value
  if (open.value) {
    markAllRead()
    // PATCH /notification/seen and zero the badge — no-op when the count is 0.
    void markSeen()
  }
}

// Pull the next page when the feed is scrolled within ~80px of the bottom.
function onScroll() {
  const el = feedRef.value
  if (!el) return
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 80) void loadMore()
}

// A scroll handler only fires when the list actually overflows — but the first
// page (5 short items) often doesn't fill the panel, so there's nothing to
// scroll. Keep loading pages until the feed overflows (or there are no more),
// so there's always something to scroll and short feeds still show everything.
async function fillUntilScrollable() {
  await nextTick()
  let guard = 0
  while (
    open.value &&
    hasNextPage.value &&
    !loadingMore.value &&
    !loadingList.value &&
    guard++ < 20
  ) {
    const el = feedRef.value
    // Stop once the content overflows the container (a scrollbar exists).
    if (el && el.scrollHeight > el.clientHeight + 4) break
    await loadMore()
    await nextTick()
  }
}

// Top up whenever the dropdown opens or a fresh list finishes loading.
watch([open, loadingList], () => {
  if (open.value && !loadingList.value) void fillUntilScrollable()
})

function relativeTime(ts: number): string {
  return new Date(ts).toLocaleTimeString()
}
</script>

<template>
  <div class="relative">
    <button
      type="button"
      :aria-label="`Notifications (${status})`"
      title="Notifications"
      class="relative inline-flex items-center rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-base shadow-sm hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700"
      @click="toggle"
    >
      <span class="i-mdi-bell-outline text-slate-700 dark:text-slate-200" aria-hidden="true" />
      <span
        v-if="total > 0"
        class="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white dark:ring-slate-900"
      >
        {{ total > 9 ? '9+' : total }}
      </span>
    </button>

    <div
      v-if="open"
      class="absolute right-0 z-30 mt-2 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900"
    >
      <!-- header -->
      <div class="flex items-center justify-between border-b border-slate-200 px-3 py-2 dark:border-slate-700">
        <span class="text-sm font-semibold text-slate-800 dark:text-slate-100">Notifications</span>
        <button
          v-if="notifications.length"
          type="button"
          class="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          @click="clear"
        >
          Clear
        </button>
      </div>

      <!-- live feed -->
      <div ref="feedRef" class="max-h-80 overflow-y-auto" @scroll="onScroll">
        <p v-if="lastError && status === 'error'" class="px-3 py-2 text-xs text-red-500">
          Stream error: {{ lastError }}
        </p>
        <p v-if="loadingList" class="px-3 py-6 text-center text-sm text-slate-400">Loading…</p>
        <p
          v-else-if="notifications.length === 0"
          class="px-3 py-6 text-center text-sm text-slate-400"
        >
          No notifications yet.
        </p>
        <ul v-if="!loadingList && notifications.length">
          <li
            v-for="n in notifications"
            :key="n.id"
            class="border-b border-slate-100 px-3 py-2 last:border-b-0 dark:border-slate-800"
          >
            <div class="flex items-baseline justify-between gap-2">
              <span class="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{{ n.title }}</span>
              <span class="shrink-0 text-[11px] text-slate-400">{{ relativeTime(n.receivedAt) }}</span>
            </div>
            <span
              v-if="n.type"
              class="mt-0.5 inline-block max-w-full truncate rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-400"
            >
              {{ n.type }}
            </span>
            <p class="text-sm text-slate-600 dark:text-slate-300">{{ n.message }}</p>
          </li>
        </ul>

        <!-- infinite-scroll footer: spinner while loading the next page, or an
             end marker once everything is loaded -->
        <p v-if="loadingMore" class="px-3 py-3 text-center text-xs text-slate-400">Loading more…</p>
        <p
          v-else-if="!loadingList && !hasNextPage && notifications.length"
          class="px-3 py-3 text-center text-[11px] text-slate-300 dark:text-slate-100"
        >
          That's everything
        </p>
      </div>
    </div>
  </div>
</template>
