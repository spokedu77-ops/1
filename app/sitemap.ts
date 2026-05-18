import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://spokedu.com';
  const now = new Date();
  const spokeduRoutes = [
    '/spokedu',
    '/spokedu/about',
    '/spokedu/private',
    '/spokedu/dispatch',
    '/spokedu/curriculum',
    '/spokedu/programs',
    '/spokedu/programs/spomove',
    '/spokedu/programs/paps',
    '/spokedu/programs/play-class',
    '/spokedu/programs/oneday-event',
    '/spokedu/programs/camp',
    '/spokedu/programs/curriculum-content',
    '/spokedu/records',
    '/spokedu/cases',
    '/spokedu/monthly',
    '/spokedu/insights',
    '/spokedu/contact',
  ] as const;

  return [
    {
      url: `${base}/spokedu-master/landing`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 1,
    },
    ...spokeduRoutes.map((path) => ({
      url: `${base}${path}`,
      lastModified: now,
      changeFrequency: path === '/spokedu' ? 'weekly' : 'monthly',
      priority: path === '/spokedu' ? 0.95 : 0.8,
    })),
  ];
}
