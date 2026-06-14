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
  // Safelist icons referenced dynamically (so they're always generated).
  safelist: ['i-solar-moon-bold', 'i-solar-sun-2-bold'],
  theme: {
    colors: {
      canvas: {
        light: '#f8fafc',
        dark: '#0f172a',
      },
    },
  },
})
