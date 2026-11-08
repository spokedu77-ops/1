import type { MetadataRoute } from 'next';
import {
  FIELD_RECORD_CATALOG,
  hasFieldRecordOnsiteSummary,
} from './spokedu/data/field-records-catalog';
import { SPOKEDU_PATHS } from './spokedu/data/public-routes';
import { getSpokeduSiteUrl } from './spokedu/lib/site-url';
import { fieldRecordsCmsEnabled, listPublishedFieldRecords } from './lib/server/fieldRecords';
import { MIGRATED_RECORD_SLUGS } from './lib/field-records/contract';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSpokeduSiteUrl();
  const published = await listPublishedFieldRecords();
  const cmsEnabled = fieldRecordsCmsEnabled();
  const recordDetailRoutes = FIELD_RECORD_CATALOG.filter(hasFieldRecordOnsiteSummary).filter(record => !cmsEnabled || !MIGRATED_RECORD_SLUGS.some(slug => slug === record.slug)).map(
    (record) => `${SPOKEDU_PATHS.records}/${record.slug}`,
  );
  const spokeduRoutes = [
    SPOKEDU_PATHS.home,
    SPOKEDU_PATHS.about,
    SPOKEDU_PATHS.education,
    SPOKEDU_PATHS.private,
    SPOKEDU_PATHS.spomove,
    SPOKEDU_PATHS.spomoveCatalog,
    SPOKEDU_PATHS.subscription,
    SPOKEDU_PATHS.records,
    ...new Set([...recordDetailRoutes, ...published.map(record => `/records/${record.slug}`)]),
    SPOKEDU_PATHS.contact,
    SPOKEDU_PATHS.spomat,
    SPOKEDU_PATHS.partners,
  ] as const;

  return [
    ...spokeduRoutes.map(
      (path): MetadataRoute.Sitemap[number] => ({
        url: path === '/' ? `${base}/` : `${base}${path}`,
        changeFrequency: path === '/' ? 'weekly' : 'monthly',
        priority: path === '/' ? 1 : 0.8,
      }),
    ),
  ];
}
