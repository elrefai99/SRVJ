<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import NavBar from '@/components/navBar.vue'
import AuthDialog from '@/components/AuthDialog.vue'
import { useAuthStore } from '@/stores/auth'
import { useDarkMode } from '@/composables/useDarkMode'
import { useSeo } from '@/composables/useSeo'
import { ApiError } from '@/utils/api'
import { acceptInvite, decodeInviteProjectId, getInvite } from '@/utils/projectsApi'
import type { InviteResponse } from '@/utils/projectsApi'
import type { ProjectInvite } from '@/types/project'

useSeo({ title: 'Project invitation | SRVJ', path: '/app/invite', noindex: true })

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const { isAuthenticated } = storeToRefs(auth)
const { init: initDarkMode, setForcedTheme } = useDarkMode()

/**
 * The share-link JWT from the invite URL. Accept it from the path segment
 * (`/app/invite/<jwt>`) *or* a `?token=` query param, since the backend-built
 * invite link may use either form.
 */
const token = computed(() => {
  const fromPath = route.params.token
  const fromQuery = route.query.token
  const raw = (Array.isArray(fromPath) ? fromPath[0] : fromPath) || (Array.isArray(fromQuery) ? fromQuery[0] : fromQuery)
  return String(raw ?? '')
})

/** Project `site_id` decoded from the invite JWT — addresses the accept call. */
const projectId = computed(() => decodeInviteProjectId(token.value))

const invite = ref<ProjectInvite | null>(null)
const loading = ref(true)
/** Reason the invite couldn't be loaded (invalid/expired/network), or null. */
const loadError = ref<string | null>(null)

/** Which response is in flight (`accept`/`reject`), or null when idle. */
const responding = ref<InviteResponse | null>(null)
const responded = ref(false)
const respondError = ref<string | null>(null)
/** Set when sign-in is required mid-response, so we resume after the dialog. */
const pending = ref<InviteResponse | null>(null)

const authDialogOpen = ref(false)

function messageOf(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return 'Something went wrong. Please try again.'
}

/** Fetch the invite preview by its token. */
async function loadInvite() {
  if (!token.value) {
    loadError.value = 'This invitation link is invalid.'
    loading.value = false
    return
  }
  loading.value = true
  loadError.value = null
  try {
    invite.value = await getInvite(token.value, auth.token)
  } catch (error) {
    loadError.value = messageOf(error)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  initDarkMode()
  // The /app surface is locked to dark mode (matches the dashboard/editor chrome).
  setForcedTheme('dark')
  await auth.init()
  await loadInvite()
})

onBeforeUnmount(() => setForcedTheme(null))

async function respond(status: InviteResponse) {
  // Responding identifies the invitee by their access token — prompt sign-in
  // first for guests, then resume the same response once authenticated.
  if (!isAuthenticated.value) {
    pending.value = status
    authDialogOpen.value = true
    return
  }
  if (responding.value || !projectId.value) {
    if (!projectId.value) respondError.value = 'This invitation link is invalid.'
    return
  }
  responding.value = status
  respondError.value = null
  try {
    const project = await acceptInvite(projectId.value, status, auth.token)
    responded.value = true
    if (status === 'reject') {
      router.push({ name: 'dashboard' })
      return
    }
    // Open the joined project's canvas when we can resolve it; otherwise land
    // on the dashboard where the new project now appears.
    const diagramId = project?.diagram?.site_id
    if (diagramId) router.push({ name: 'editor', params: { diagramId } })
    else router.push({ name: 'dashboard' })
  } catch (error) {
    respondError.value = messageOf(error)
  } finally {
    responding.value = null
  }
}

// Once the user signs in (via the dialog), resume the response they intended.
watch(isAuthenticated, (signedIn) => {
  if (signedIn && pending.value) {
    const status = pending.value
    pending.value = null
    authDialogOpen.value = false
    void respond(status)
  }
})
</script>

<template>
  <div class="bg-dots min-h-screen bg-slate-50 text-slate-800 dark:bg-slate-900 dark:text-slate-100">
    <NavBar variant="app" />

    <main class="mx-auto flex max-w-md flex-col px-4 py-16 sm:px-6">
      <!-- Loading the invite -->
      <div v-if="loading" class="py-16 text-center text-slate-400">
        <span class="i-mdi-loading mr-2 animate-spin text-xl align-middle" aria-hidden="true" />
        Loading invitation…
      </div>

      <!-- Invalid / expired invite -->
      <div
        v-else-if="loadError || !invite"
        class="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800"
      >
        <div class="i-mdi-email-remove-outline mx-auto mb-4 text-5xl text-rose-400" aria-hidden="true" />
        <h1 class="text-xl font-bold">Invitation unavailable</h1>
        <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {{ loadError || 'This invitation link is invalid or has expired.' }}
        </p>
        <RouterLink
          :to="{ name: 'dashboard' }"
          class="mt-5 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
        >
          <span class="i-mdi-view-dashboard-outline" aria-hidden="true" />
          Go to dashboard
        </RouterLink>
      </div>

      <!-- The invitation -->
      <div
        v-else
        class="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-white/10 dark:bg-slate-800"
      >
        <div
          class="mx-auto mb-5 inline-flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 text-3xl text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400"
        >
          <span class="i-mdi-account-multiple-plus-outline" aria-hidden="true" />
        </div>

        <h1 class="text-xl font-bold">You've been invited</h1>
        <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
          <span v-if="invite.inviterName" class="font-medium text-slate-700 dark:text-slate-200">{{
            invite.inviterName
          }}</span>
          <span v-else>The owner</span>
          invited you to collaborate on
          <span class="font-medium text-slate-700 dark:text-slate-200">{{ invite.boardName }}</span>
          in {{ invite.workspaceName }}.
        </p>

        <!-- Role + expiry chips -->
        <div class="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs">
          <span
            class="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 font-medium text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300"
          >
            <span class="i-mdi-shield-account-outline" aria-hidden="true" />
            Role: {{ invite.role }}
          </span>
          <span
            v-if="invite.expiresIn"
            class="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-300"
          >
            <span class="i-mdi-clock-outline" aria-hidden="true" />
            Expires in {{ invite.expiresIn }}
          </span>
        </div>

        <p
          v-if="respondError"
          class="mt-5 flex items-center justify-center gap-1.5 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-900/30 dark:text-rose-400"
        >
          <span class="i-mdi-alert-circle-outline shrink-0" aria-hidden="true" />
          {{ respondError }}
        </p>

        <p v-if="!isAuthenticated" class="mt-5 text-xs text-slate-400">
          Sign in (or create an account) to respond.
        </p>

        <div class="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            :disabled="!!responding || responded"
            class="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
            @click="respond('reject')"
          >
            <span
              :class="responding === 'reject' ? 'i-mdi-loading animate-spin' : 'i-mdi-close'"
              aria-hidden="true"
            />
            Decline
          </button>
          <button
            type="button"
            :disabled="!!responding || responded"
            class="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            @click="respond('accept')"
          >
            <span
              :class="responding === 'accept' ? 'i-mdi-loading animate-spin' : 'i-mdi-check'"
              aria-hidden="true"
            />
            {{ isAuthenticated ? 'Accept invitation' : 'Sign in to accept' }}
          </button>
        </div>
      </div>
    </main>

    <AuthDialog :open="authDialogOpen" @close="authDialogOpen = false" />
  </div>
</template>
