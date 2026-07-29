import type { MetadataRoute } from 'next';
import {
  FIELD_RECORD_CATALOG,
  hasFieldRecordOnsiteSummary,
} from './spokedu/data/field-records-catalog';
import { monthlyRecords } from './spokedu/data/monthly';
import { getSpokeduSiteUrl } from './spokedu/lib/site-url';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSpokeduSiteUrl();
  const now = new Date();
  const recordDetailRoutes = FIELD_RECORD_CATALOG.filter(hasFieldRecordOnsiteSummary).map(
    (record) => `/spokedu/records/${record.slug}`,
  );
  const spokeduRoutes = [
    '/spokedu',
    '/spokedu/about',
    '/spokedu/private',
    '/spokedu/dispatch',
    '/spokedu/curriculum',
    '/spokedu/programs',
    '/spokedu/programs/spomove',
    '/spokedu/programs/paps',
    '/spokedu/programs/monthly-newsports',
    '/spokedu/programs/oneday-event',
    '/spokedu/programs/camp',
    '/spokedu/records',
    ...recordDetailRoutes,
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
