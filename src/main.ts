import { ViteSSG } from 'vite-ssg'
import { createPinia } from 'pinia'
import App from './App.vue'
import { routes } from './router'
import { useAuthStore } from './stores/auth'

// Vue Flow core + addon styles
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'
import '@vue-flow/minimap/dist/style.css'
import '@vue-flow/node-resizer/dist/style.css'

// UnoCSS: reset first, then generated utilities
import '@unocss/reset/tailwind.css'
import 'virtual:uno.css'

// App-level custom styles (kept minimal)
import './style.css'

// `ViteSSG` owns the app + router and pre-renders every static route to HTML at
// build time (`vite-ssg build`), then hydrates in the browser. The returned
// `createApp` is the SSG entry; it is invoked once per route during the build
// and once on the client.
export const createApp = ViteSSG(
  App,
  { routes },
  ({ app, router, isClient }) => {
    const pinia = createPinia()
    app.use(pinia)

    // Auth route guard (client-only — during SSG there's no session, and
    // pre-render must not redirect away from the static routes). It awaits the
    // memoised `auth.init()` first, so a token arriving via the Google OAuth
    // redirect (`/?token=`) is adopted and the profile loaded *before* deciding.
    // Then: signed-out users can't reach `requiresAuth` routes, and signed-in
    // users can't reach the `guestOnly` Home.
    if (isClient) {
      router.beforeEach(async (to) => {
        const auth = useAuthStore(pinia)
        await auth.init()
        const loggedIn = auth.isAuthenticated
        if (to.meta.requiresAuth && !loggedIn) return { name: 'home' }
        if (to.meta.guestOnly && loggedIn) return { name: 'dashboard' }
        return true
      })
    }
  },
)
