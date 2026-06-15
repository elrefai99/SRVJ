<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useGoogleAuth } from '@/composables/useGoogleAuth'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const auth = useAuthStore()
const google = useGoogleAuth()

type Mode = 'login' | 'register'
const mode = ref<Mode>('login')
const form = reactive({ fullname: '', email: '', password: '' })
const emailInput = ref<HTMLInputElement | null>(null)
const googleButton = ref<HTMLElement | null>(null)

const isRegister = computed(() => mode.value === 'register')
const title = computed(() => (isRegister.value ? 'Create your account' : 'Welcome back'))
const submitLabel = computed(() => (isRegister.value ? 'Sign up' : 'Sign in'))

/** Exchange the Google ID token from the popup for an SRVJ session. */
async function onGoogleCredential(credential: string) {
  try {
    await auth.loginWithGoogleCredential(credential)
    emit('close')
  } catch {
    // Error surfaced via auth.error; keep the dialog open for a retry.
  }
}

/**
 * Boot Google Identity Services once the dialog is open and its button slot has
 * mounted: render the official button and surface the One Tap account-chooser
 * popup. Failures (script blocked, misconfigured origin) are swallowed — the
 * email form and redirect fallback still work.
 */
async function mountGoogleSignIn() {
  if (!google.isConfigured || !googleButton.value) return
  try {
    await google.init(onGoogleCredential)
    google.renderButton(googleButton.value)
    google.prompt()
  } catch {
    // GIS unavailable; the rest of the dialog remains usable.
  }
}

// Reset transient state and focus the first field whenever the dialog opens.
watch(
  () => props.open,
  (open) => {
    if (!open) {
      google.cancel() // dismiss the One Tap card when closing
      return
    }
    mode.value = 'login'
    form.fullname = ''
    form.email = ''
    form.password = ''
    auth.error = null
    nextTick(() => {
      emailInput.value?.focus()
      void mountGoogleSignIn()
    })
  },
)

function switchMode(next: Mode) {
  mode.value = next
  auth.error = null
}

async function onSubmit() {
  try {
    if (isRegister.value) {
      await auth.register({ fullname: form.fullname, email: form.email, password: form.password })
    } else {
      await auth.login({ email: form.email, password: form.password })
    }
    emit('close')
  } catch {
    // Error surfaced via auth.error; keep the dialog open for a retry.
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="props.open"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      @click.self="emit('close')"
    >
      <div
        role="dialog"
        aria-modal="true"
        :aria-label="title"
        class="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-800"
        @keydown.esc="emit('close')"
      >
        <div class="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 class="text-lg font-bold text-slate-800 dark:text-slate-100">{{ title }}</h2>
            <p class="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              {{ isRegister ? 'Sign up to sync your work.' : 'Sign in to your SRVJ account.' }}
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            class="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-200"
            @click="emit('close')"
          >
            <span class="i-mdi-close text-lg" aria-hidden="true" />
          </button>
        </div>

        <div class="mb-4 flex rounded-lg bg-slate-100 p-1 dark:bg-slate-900">
          <button
            type="button"
            class="flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
            :class="
              !isRegister
                ? 'bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-slate-100'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            "
            @click="switchMode('login')"
          >
            Sign in
          </button>
          <button
            type="button"
            class="flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
            :class="
              isRegister
                ? 'bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-slate-100'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            "
            @click="switchMode('register')"
          >
            Sign up
          </button>
        </div>

        <form class="flex flex-col gap-3" @submit.prevent="onSubmit">
          <label v-if="isRegister" class="flex flex-col gap-1 text-sm">
            <span class="font-medium text-slate-600 dark:text-slate-300">Full name</span>
            <input
              v-model="form.fullname"
              type="text"
              required
              autocomplete="name"
              placeholder="Jane Doe"
              class="rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>

          <label class="flex flex-col gap-1 text-sm">
            <span class="font-medium text-slate-600 dark:text-slate-300">Email</span>
            <input
              ref="emailInput"
              v-model="form.email"
              type="email"
              required
              autocomplete="email"
              placeholder="you@example.com"
              class="rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>

          <label class="flex flex-col gap-1 text-sm">
            <span class="font-medium text-slate-600 dark:text-slate-300">Password</span>
            <input
              v-model="form.password"
              type="password"
              required
              :autocomplete="isRegister ? 'new-password' : 'current-password'"
              placeholder="••••••••"
              class="rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>

          <p
            v-if="auth.error"
            class="flex items-center gap-1.5 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-900/30 dark:text-rose-400"
          >
            <span class="i-mdi-alert-circle-outline shrink-0" aria-hidden="true" />
            {{ auth.error }}
          </p>

          <button
            type="submit"
            :disabled="auth.loading"
            class="mt-1 inline-flex items-center justify-center gap-2 rounded-md border border-indigo-600 bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400"
          >
            <span
              v-if="auth.loading"
              class="i-mdi-loading animate-spin"
              aria-hidden="true"
            />
            {{ auth.loading ? 'Please wait…' : submitLabel }}
          </button>
        </form>

        <div class="my-4 flex items-center gap-3" aria-hidden="true">
          <span class="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
          <span class="text-xs font-medium uppercase tracking-wide text-slate-400">or</span>
          <span class="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
        </div>

        <!-- Google Identity Services button (renders the account-chooser popup
             on click; the One Tap card is also prompted when the dialog opens). -->
        <div v-show="google.isConfigured" ref="googleButton" class="flex justify-center" />

        <!-- Fallback when no Google client ID is configured: server-redirect flow. -->
        <button
          v-if="!google.isConfigured"
          type="button"
          :disabled="auth.loading"
          class="inline-flex w-full items-center justify-center gap-2.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          @click="auth.loginWithGoogle()"
        >
          <span class="i-logos-google-icon text-base" aria-hidden="true" />
          Continue with Google
        </button>
      </div>
    </div>
  </Teleport>
</template>
