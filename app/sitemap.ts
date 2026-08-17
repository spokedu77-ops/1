import type { MetadataRoute } from 'next';
import {
  FIELD_RECORD_CATALOG,
  hasFieldRecordOnsiteSummary,
} from './spokedu/data/field-records-catalog';
import { SPOKEDU_PATHS } from './spokedu/data/public-routes';
import { getSpokeduSiteUrl } from './spokedu/lib/site-url';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSpokeduSiteUrl();
  const recordDetailRoutes = FIELD_RECORD_CATALOG.filter(hasFieldRecordOnsiteSummary).map(
    (record) => `${SPOKEDU_PATHS.records}/${record.slug}`,
  );
  const spokeduRoutes = [
    SPOKEDU_PATHS.home,
    SPOKEDU_PATHS.about,
    SPOKEDU_PATHS.education,
    SPOKEDU_PATHS.dispatch,
    SPOKEDU_PATHS.private,
    SPOKEDU_PATHS.spomove,
    SPOKEDU_PATHS.spomoveCatalog,
    SPOKEDU_PATHS.subscription,
    SPOKEDU_PATHS.records,
    ...recordDetailRoutes,
    SPOKEDU_PATHS.contact,
    SPOKEDU_PATHS.spomat,
    SPOKEDU_PATHS.partners,
  ] as const;

  return [
    {
      url: `${base}/spokedu-master/landing`,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    ...spokeduRoutes.map(
      (path): MetadataRoute.Sitemap[number] => ({
        url: path === '/' ? `${base}/` : `${base}${path}`,
        changeFrequency: path === '/' ? 'weekly' : 'monthly',
        priority: path === '/' ? 1 : 0.8,
      }),
    ),
  ];
}
