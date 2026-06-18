export const siteUrl = 'https://srvj.elrefai.me'

export const sitePaths = {
  home: '/',
} as const

const staticPagesLastmod = '2026-06-18'

export interface SitemapEntry {
  path: string
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  priority?: string
  lastmod?: string
}

export const sitemapEntries: readonly SitemapEntry[] = [
  {
    path: sitePaths.home,
    changefreq: 'weekly',
    priority: '1.0',
    lastmod: staticPagesLastmod,
  },
] as const

export function createSitemapXml(
  entries: readonly SitemapEntry[] = sitemapEntries,
  baseUrl: string = siteUrl,
): string {
  const urls = entries
    .map((entry) => {
      const loc = entry.path.startsWith('http') ? entry.path : `${baseUrl}${entry.path}`
      const lines = [`    <loc>${loc}</loc>`]
      if (entry.lastmod) lines.push(`    <lastmod>${entry.lastmod}</lastmod>`)
      if (entry.changefreq) lines.push(`    <changefreq>${entry.changefreq}</changefreq>`)
      if (entry.priority) lines.push(`    <priority>${entry.priority}</priority>`)
      return `  <url>\n${lines.join('\n')}\n  </url>`
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
}
