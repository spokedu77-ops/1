import type { MetadataRoute } from 'next';
import { cases } from './spokedu/data/cases';
import { monthlyRecords } from './spokedu/data/monthly';

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
    '/spokedu/programs/oneday-event',
    '/spokedu/programs/camp',
    '/spokedu/records',
    '/spokedu/cases',
    ...cases.map((item) => `/spokedu/cases/${item.slug}`),
    '/spokedu/monthly',
    '/spokedu/insights',
    '/spokedu/contact',
    ...monthlyRecords.map((record) => `/spokedu/monthly/${record.slug}`),
  ] as const;

  return [
    {
      url: `${base}/spokedu-master/landing`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 1,
    },
    ...spokeduRoutes.map(
      (path): MetadataRoute.Sitemap[number] => ({
        url: `${base}${path}`,
        lastModified: now,
        changeFrequency: path === '/spokedu' ? 'weekly' : 'monthly',
        priority: path === '/spokedu' ? 0.95 : 0.8,
      }),
    ),
  ];
}
