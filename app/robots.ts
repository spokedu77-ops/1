import type { MetadataRoute } from 'next';
import { getSpokeduSiteUrl } from './spokedu/lib/site-url';

/**
 * 공식 robots.txt — App Router MetadataRoute만 사용.
 * public/robots.txt 정적 파일과 병행하지 않는다 (Production 노출/검사 불일치 방지).
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = getSpokeduSiteUrl();

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/api',
          '/spokedu-master',
          '/login',
          '/portal',
          '/teacher',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
