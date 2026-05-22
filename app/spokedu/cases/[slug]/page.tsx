import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CaseDetailLanding } from '../../components/case-detail-landing';
import { cases, getCaseBySlug } from '../../data/cases';
import { buildSpokeduPageMetadata } from '../../data/seo';

type CaseDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return cases.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: CaseDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const item = getCaseBySlug(slug);

  if (!item) {
    return {
      title: '수업 사례',
      description: '스포키듀 수업 사례',
    };
  }

  const image = item.images[0];

  return buildSpokeduPageMetadata({
    title: `${item.title} | SPOKEDU 수업 사례`,
    description: `${item.institution} ${item.program} 운영 사례. ${item.cardSummary}`,
    canonical: `/spokedu/cases/${item.slug}`,
    pageKey: 'cases',
    keywords: [item.program, item.institution, '수업 사례', 'SPOMOVE'],
    ogImage: image
      ? { url: image.src, alt: image.alt }
      : undefined,
  });
}

export default async function SpokeduCaseDetailPage({ params }: CaseDetailPageProps) {
  const { slug } = await params;
  const item = getCaseBySlug(slug);

  if (!item) {
    notFound();
  }

  return <CaseDetailLanding item={item} />;
}
