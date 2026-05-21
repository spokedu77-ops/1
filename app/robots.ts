import type { MetadataRoute } from 'next';
import { getSpokeduSiteUrl } from './spokedu/lib/site-url';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getSpokeduSiteUrl();

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/'],
        disallow: ['/admin/', '/api/', '/login', '/teacher/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
