<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AuthDialog from '@/components/AuthDialog.vue'
import { useSeo } from '@/composables/useSeo'
import { useAuthStore } from '@/stores/auth'

/**
 * Public, gated teaser of the editor: it renders an editor-shaped shell (toolbar
 * + palette + canvas) showing a sample ERD with crow's-foot relationships, blurs
 * the whole thing, and overlays a "Sign in first" lock card. Signing in (or
 * arriving already authenticated) sends the visitor on to the real dashboard.
 *
 * The diagram is **decorative** — static HTML/SVG, not Vue Flow — so the page
 * SSG-renders without `ClientOnly`. It's `noindex` (a locked app preview, not a
 * marketing page).
 */
useSeo({ title: 'Demo — SRVJ Diagram Editor', noindex: true })

const router = useRouter()
const auth = useAuthStore()
const authOpen = ref(false)

onMounted(async () => {
  await auth.init()
  // Already signed in? No reason to look at the locked teaser.
  if (auth.isAuthenticated) router.replace({ name: 'dashboard' })
})

// Once the AuthDialog completes a sign-in, drop the visitor into the real app.
watch(
  () => auth.isAuthenticated,
  (loggedIn) => {
    if (loggedIn) router.replace({ name: 'dashboard' })
  },
)

// --- Sample ERD --------------------------------------------------------------
interface Field {
  name: string
  type: string
  key?: 'PK' | 'FK'
}
interface Table {
  name: string
  accent: string
  pos: string
  fields: Field[]
}

const tables: Table[] = [
  {
    name: 'users',
    accent: '#6366f1',
    pos: 'left:5%;top:13%',
    fields: [
      { name: 'id', type: 'uuid', key: 'PK' },
      { name: 'name', type: 'text' },
      { name: 'email', type: 'text' },
      { name: 'created_at', type: 'timestamptz' },
    ],
  },
  {
    name: 'orders',
    accent: '#10b981',
    pos: 'left:39%;top:30%',
    fields: [
      { name: 'id', type: 'uuid', key: 'PK' },
      { name: 'user_id', type: 'uuid', key: 'FK' },
      { name: 'total', type: 'numeric' },
      { name: 'status', type: 'enum' },
    ],
  },
  {
    name: 'products',
    accent: '#f59e0b',
    pos: 'right:5%;top:12%',
    fields: [
      { name: 'id', type: 'uuid', key: 'PK' },
      { name: 'title', type: 'text' },
      { name: 'price', type: 'numeric' },
      { name: 'stock', type: 'int4' },
    ],
  },
  {
    name: 'order_items',
    accent: '#ec4899',
    pos: 'left:38%;top:64%',
    fields: [
      { name: 'order_id', type: 'uuid', key: 'FK' },
      { name: 'product_id', type: 'uuid', key: 'FK' },
      { name: 'qty', type: 'int4' },
    ],
  },
]
</script>

<template>
  <div class="relative h-screen w-screen overflow-hidden bg-slate-100">
    <!-- ===== Blurred editor preview (decorative, non-interactive) ===== -->
    <div class="pointer-events-none absolute inset-0 select-none blur-[6px]" aria-hidden="true">
      <!-- Toolbar -->
      <header
        class="flex items-center gap-3 border-b border-slate-200 bg-white/85 px-4 py-2 backdrop-blur"
      >
        <img src="/favicon.png" alt="" class="h-10 w-12 rounded-lg shadow-sm" />
        <span class="text-lg font-bold tracking-tight text-slate-900">SRVJ</span>
        <span class="ml-2 h-6 w-px bg-slate-200" />
        <span class="i-ri-arrow-go-back-line text-xl text-slate-500" />
        <span class="i-ri-arrow-go-forward-line text-xl text-slate-300" />
        <span class="h-6 w-px bg-slate-200" />
        <span class="i-mdi-trash-can-outline text-xl text-slate-400" />
        <span class="i-solar-download-minimalistic-linear text-xl text-slate-500" />
        <span class="i-mdi-share-variant-outline text-xl text-slate-500" />
        <div class="ml-auto flex items-center gap-3">
          <span class="rounded-md border border-indigo-500 bg-indigo-500 px-3 py-1.5 text-sm font-semibold text-white">Sketch</span>
          <span class="i-solar-sun-2-bold text-xl text-amber-500" />
          <span class="h-8 w-8 rounded-full bg-gradient-to-br from-pink-400 to-violet-400" />
        </div>
      </header>

      <!-- Canvas -->
      <div
        class="relative h-[calc(100vh-57px)] w-full"
        style="
          background-color: #f1f5f9;
          background-image: radial-gradient(rgba(15, 23, 42, 0.1) 1px, transparent 1px);
          background-size: 22px 22px;
        "
      >
        <!-- Left palette rail -->
        <div
          class="absolute left-4 top-1/2 flex -translate-y-1/2 flex-col gap-2 rounded-2xl border border-slate-200 bg-white/90 p-2 shadow-xl"
        >
          <span class="i-mdi-cursor-default-outline rounded-lg bg-indigo-100 p-2 text-xl text-indigo-600" />
          <span class="i-mdi-rectangle-outline p-2 text-xl text-slate-500" />
          <span class="i-mdi-ellipse-outline p-2 text-xl text-slate-500" />
          <span class="i-mdi-rhombus-outline p-2 text-xl text-slate-500" />
          <span class="i-mdi-table p-2 text-xl text-slate-500" />
          <span class="i-mdi-vector-line p-2 text-xl text-slate-500" />
          <span class="i-mdi-draw p-2 text-xl text-slate-500" />
        </div>

        <!-- Crow's-foot relationship lines -->
        <svg
          class="absolute inset-0 h-full w-full"
          viewBox="0 0 1200 760"
          preserveAspectRatio="none"
        >
          <defs>
            <marker id="crow" markerWidth="24" markerHeight="24" refX="3" refY="11" orient="auto">
              <path d="M22 11 L3 2 M22 11 L3 11 M22 11 L3 20" stroke="#64748b" stroke-width="1.8" fill="none" />
            </marker>
            <marker id="one" markerWidth="16" markerHeight="24" refX="8" refY="11" orient="auto">
              <path d="M8 3 L8 19" stroke="#64748b" stroke-width="1.8" />
            </marker>
          </defs>
          <path
            d="M 245 175 C 340 215, 400 285, 470 320"
            fill="none" stroke="#818cf8" stroke-width="2.5"
            marker-start="url(#one)" marker-end="url(#crow)"
          />
          <path
            d="M 560 470 C 560 510, 555 525, 555 560"
            fill="none" stroke="#34d399" stroke-width="2.5"
            marker-start="url(#one)" marker-end="url(#crow)"
          />
          <path
            d="M 900 230 C 850 380, 760 510, 690 590"
            fill="none" stroke="#fbbf24" stroke-width="2.5"
            marker-start="url(#one)" marker-end="url(#crow)"
          />
        </svg>

        <!-- ERD tables -->
        <div
          v-for="t in tables"
          :key="t.name"
          class="absolute w-[190px] overflow-hidden rounded-xl border-2 bg-white shadow-2xl"
          :style="`${t.pos};border-color:${t.accent}`"
        >
          <div
            class="flex items-center gap-2 px-3 py-2 text-sm font-bold text-white"
            :style="`background:${t.accent}`"
          >
            <span class="i-mdi-table-large text-base" />
            {{ t.name }}
          </div>
          <div class="divide-y divide-slate-100">
            <div
              v-for="f in t.fields"
              :key="f.name"
              class="flex items-center justify-between gap-3 px-3 py-1.5 text-[12px]"
            >
              <span class="flex items-center gap-1.5 font-medium text-slate-700">
                <span v-if="f.key === 'PK'" class="i-mdi-key text-amber-500" />
                <span v-else-if="f.key === 'FK'" class="i-mdi-key-link text-sky-500" />
                <span v-else class="inline-block w-4" />
                {{ f.name }}
              </span>
              <span class="text-slate-400">{{ f.type }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== Dim + lock overlay ===== -->
    <div class="absolute inset-0 bg-slate-900/30" />

    <div class="absolute inset-0 z-10 flex items-center justify-center p-6">
      <div
        class="w-full max-w-md rounded-3xl border border-white/10 bg-[#0b0b12]/90 p-8 text-center shadow-2xl backdrop-blur-md sm:p-10"
      >
        <div
          class="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/15 ring-1 ring-indigo-500/40"
        >
          <span class="i-mdi-lock-outline text-3xl text-indigo-300" aria-hidden="true" />
        </div>
        <h1 class="text-2xl font-bold tracking-tight text-white sm:text-3xl">Sign in first</h1>
        <p class="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-slate-400">
          This is a live preview of the SRVJ editor. Sign in to unlock the canvas and start
          building your own ERDs, flowcharts and whiteboards — it's free.
        </p>
        <div class="mt-7 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            class="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition-all hover:-translate-y-0.5 hover:bg-indigo-400 sm:w-auto"
            @click="authOpen = true"
          >
            <span class="i-mdi-login-variant text-base" aria-hidden="true" />
            Sign in to continue
          </button>
          <RouterLink
            to="/"
            class="inline-flex w-full items-center justify-center rounded-xl border border-white/15 px-6 py-3 text-sm font-semibold text-slate-200 no-underline transition-colors hover:bg-white/10 sm:w-auto"
          >
            Back to home
          </RouterLink>
        </div>
      </div>
    </div>

    <AuthDialog :open="authOpen" @close="authOpen = false" />
  </div>
</template>
