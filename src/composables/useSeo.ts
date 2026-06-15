import { useHead } from '@unhead/vue'
import { SITE_URL } from '@/utils/constants'

interface SeoOptions {
  /** Document title for the route. */
  title: string
  /** Path of the canonical URL (e.g. `/`). Defaults to the site root. */
  path?: string
  /** When true, emit `noindex, nofollow` (e.g. the 404 page). */
  noindex?: boolean
}

/**
 * Per-route `<head>` management, rendered into the static HTML by `vite-ssg`
 * (via `@unhead/vue`) and kept reactive on the client. Sets the title, the
 * canonical link, and the robots directive; the shared social/Open Graph tags
 * live in `index.html`.
 */
export function useSeo({ title, path = '/', noindex = false }: SeoOptions) {
  useHead({
    title,
    link: [{ rel: 'canonical', href: `${SITE_URL}${path}` }],
    meta: [
      { name: 'robots', content: noindex ? 'noindex, nofollow' : 'index, follow' },
      { property: 'og:title', content: title },
      { property: 'og:url', content: `${SITE_URL}${path}` },
    ],
  })
}
