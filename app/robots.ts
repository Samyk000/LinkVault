import type { MetadataRoute } from 'next'

const BASE_URL = 'https://www.linksvault.online'

export const dynamic = 'force-static'
export const revalidate = 86400 // Revalidate once per day

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
