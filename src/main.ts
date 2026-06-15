import { ViteSSG } from 'vite-ssg'
import { createPinia } from 'pinia'
import App from './App.vue'
import { routes } from './router'

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
  ({ app }) => {
    app.use(createPinia())
  },
)
