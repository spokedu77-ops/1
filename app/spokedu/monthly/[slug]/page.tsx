import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { MonthlyDetailLanding } from '../../components/monthly-detail-landing';
import { buildSpokeduPageMetadata } from '../../data/seo';
import { getMonthlyRecordBySlug, monthlyRecords } from '../../data/monthly';

type MonthlyDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return monthlyRecords.map((record) => ({ slug: record.slug }));
}

export async function generateMetadata({ params }: MonthlyDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const record = getMonthlyRecordBySlug(slug);
  if (!record) {
    return {
      title: '월간형 체육수업',
      description: '월별 테마형 기관 체육 커리큘럼',
    };
  }

  return buildSpokeduPageMetadata({
    title: `${record.title} | 월간형 체육수업 · SPOKEDU`,
    description: `${record.month} 월간형 수업 흐름. ${record.institutions.slice(0, 2).join(', ')} 등 기관 정규·방과후 프로그램 운영을 정리합니다.`,
    canonical: `/spokedu/monthly/${record.slug}`,
    pageKey: 'monthly',
    keywords: ['월간형 체육수업', '월별 테마', '기관 정규수업', '아동 체육교육'],
  });
}

export default async function SpokeduMonthlyDetailPage({ params }: MonthlyDetailPageProps) {
  const { slug } = await params;
  const record = getMonthlyRecordBySlug(slug);
  if (!record) {
    notFound();
  }

  return <MonthlyDetailLanding record={record} />;
}
