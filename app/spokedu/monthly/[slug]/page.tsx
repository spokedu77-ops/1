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
      title: '월간 스포키듀',
      description: '월간 운영 기록',
    };
  }

  return buildSpokeduPageMetadata({
    title: `${record.title} | 월간 스포키듀 · SPOKEDU`,
    description: `${record.month} 운영 기록. ${record.institutions.slice(0, 2).join(', ')} 등 현장 프로그램을 정리합니다.`,
    canonical: `/spokedu/monthly/${record.slug}`,
    pageKey: 'monthly',
    keywords: ['월간 스포키듀', '현장기록', '아동 체육교육'],
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
