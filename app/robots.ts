import type { MetadataRoute } from 'next'

const BASE_URL = 'https://www.linksvault.online'

// Force static generation at build time
export const dynamic = 'force-static'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/app/'],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}
