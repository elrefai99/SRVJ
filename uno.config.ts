import {
  defineConfig,
  presetUno,
  presetAttributify,
  presetIcons,
  transformerDirectives,
  transformerVariantGroup,
} from 'unocss'

export default defineConfig({
  presets: [
    // Tailwind/Windi-compatible utilities (`dark:` uses the `.dark` class).
    presetUno({ dark: 'class' }),
    presetAttributify(),
    // Pure-CSS icons resolved from the installed `@iconify-json/*` collections.
    // Use as classes, e.g. `i-carbon-add`, `i-mdi-trash-can-outline`.
    presetIcons({
      scale: 1.2,
      extraProperties: {
        display: 'inline-block',
        'vertical-align': 'middle',
      },
    }),
  ],
  transformers: [transformerDirectives(), transformerVariantGroup()],
  // Safelist icons referenced dynamically via `:class` bindings (so they're
  // always generated — UnoCSS can't see them as literal class strings).
  safelist: [
    // Theme toggle (navBar / DiagramToolbar)
    'i-solar-moon-bold',
    'i-solar-sun-2-bold',
    // Home page feature cards (`:class="f.icon"`)
    'i-carbon-flow',
    'i-mdi-draw',
    'i-mdi-sticky-note-outline',
    'i-mdi-folder-multiple-outline',
    'i-mdi-cloud-check-outline',
    'i-mdi-share-variant-outline',
    // Dashboard project-visibility badges (`:class="VISIBILITY_ICON[...]"`)
    'i-mdi-lock-outline',
    'i-mdi-earth',
    'i-mdi-link-variant',
    // Invite error cards (`:class="errorCopy.icon"` in InviteView)
    'i-mdi-link-variant-off',
    'i-mdi-clock-alert-outline',
    'i-mdi-email-remove-outline',
    'i-mdi-wifi-off',
  ],
  theme: {
    colors: {
      canvas: {
        light: '#f8fafc',
        dark: '#0f172a',
      },
    },
  },
})
