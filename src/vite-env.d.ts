/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}

// UnoCSS virtual stylesheet injected by `unocss/vite`.
declare module 'virtual:uno.css'
