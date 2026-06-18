import { fileURLToPath, URL } from 'node:url'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import UnoCSS from 'unocss/vite'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { createSitemapXml } from './src/utils/sitemap'

/**
 * Generates `sitemap.xml` from the typed entries in `src/utils/sitemap.ts`:
 * serves it live at `/sitemap.xml` during `pnpm dev`, and writes it into the
 * build output on `pnpm build`. Skips the SSR pass of the vite-ssg build (its
 * outDir is a throwaway temp dir).
 */
function sitemapPlugin(): Plugin {
  let outDir = 'dist'
  let isSsrBuild = false
  return {
    name: 'srvj:sitemap',
    configResolved(config) {
      outDir = config.build.outDir
      isSsrBuild = Boolean(config.build.ssr)
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/sitemap.xml') {
          res.setHeader('Content-Type', 'application/xml')
          res.end(createSitemapXml())
          return
        }
        next()
      })
    },
    closeBundle() {
      if (isSsrBuild) return
      mkdirSync(outDir, { recursive: true })
      writeFileSync(resolve(outDir, 'sitemap.xml'), createSitemapXml(), 'utf8')
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    UnoCSS(),
    AutoImport({
      imports: ['vue', 'pinia', 'vue-router'],
      dirs: ['src/composables', 'src/stores'],
      dts: 'src/auto-imports.d.ts',
      vueTemplate: true,
    }),
    Components({
      dirs: ['src/components', 'src/views'],
      dts: 'src/components.d.ts',
    }),
    sitemapPlugin(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
