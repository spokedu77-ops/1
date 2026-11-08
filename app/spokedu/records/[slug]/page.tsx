import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { RecordsCaseDetail } from '../../components/records-case-detail';
import {
  FIELD_RECORD_CATALOG,
  getFieldRecordOnsitePath,
  hasFieldRecordOnsiteSummary,
  type FieldRecordSlug,
} from '../../data/field-records-catalog';
import { buildSpokeduPageMetadata } from '../../data/seo';
import { fieldRecordsCmsEnabled, getPublishedFieldRecord } from '@/app/lib/server/fieldRecords';
import { FieldRecordDetail } from '../../website/components/FieldRecordDetail';
import { MIGRATED_RECORD_SLUGS, recordMediaSrc } from '@/app/lib/field-records/contract';

export const revalidate = 86400;

type PageProps = {
  params: Promise<{ slug: string }>;
};

function findOnsiteRecord(slug: string) {
  const item = FIELD_RECORD_CATALOG.find((record) => record.slug === slug);
  if (!item || !hasFieldRecordOnsiteSummary(item)) return null;
  return item;
}

export function generateStaticParams() {
  if (fieldRecordsCmsEnabled()) return [];
  return FIELD_RECORD_CATALOG.filter(hasFieldRecordOnsiteSummary).map((item) => ({
    slug: item.slug,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const record = await getPublishedFieldRecord(slug);
  if (record) return buildSpokeduPageMetadata({ title: record.content.seoTitle, description: record.content.seoDescription,
    canonical: `/records/${record.slug}`, pageKey: 'records', ogImage: record.content.hero ? { url: recordMediaSrc(record.content.hero), alt: record.content.hero.alt } : undefined });
  if (fieldRecordsCmsEnabled() && MIGRATED_RECORD_SLUGS.some(item => item === slug)) notFound();
  const item = findOnsiteRecord(slug);
  if (!item) {
    return buildSpokeduPageMetadata({
      title: '수업 사례',
      description: '스포키듀 현장 수업 사례',
      canonical: '/records',
      pageKey: 'records',
    });
  }

  return buildSpokeduPageMetadata({
    title: `${item.venue} · ${item.programLabel}`,
    description: item.onsite.purpose,
    canonical: getFieldRecordOnsitePath(item.slug as FieldRecordSlug),
    keywords: [item.venue, item.programLabel, item.operationType, '수업 사례', '스포키듀'],
    pageKey: 'records',
    ogImage: item.thumbnailSrc
      ? { url: item.thumbnailSrc, alt: `${item.venue} 수업 사례` }
      : undefined,
  });
}

export default async function SpokeduRecordDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const record = await getPublishedFieldRecord(slug);
  if (record) return <FieldRecordDetail content={record.content} />;
  if (fieldRecordsCmsEnabled() && MIGRATED_RECORD_SLUGS.some(item => item === slug)) notFound();
  const item = findOnsiteRecord(slug);
  if (!item) notFound();

  return (
    <div className="site-container py-8 sm:py-10 lg:py-12">
      <RecordsCaseDetail item={item} />
    </div>
  );
}
