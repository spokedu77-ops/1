import type { Metadata } from 'next';
import Link from 'next/link';
import { ProofCard, SectionHeader, SplitCTA } from '../components/blocks';
import { recordsHero, recordsLinkCards, recordsProofItems, seoKeywords, seoMeta, SPOKEDU_BASE_PATH } from '../data/content';

export const metadata: Metadata = {
  title: seoMeta.records.title,
  description: seoMeta.records.description,
  keywords: [...seoKeywords.records],
  alternates: {
    canonical: '/spokedu/records',
  },
};

export default function SpokeduRecordsPage() {
  return (
    <div className="space-y-14">
      <section className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 p-6 text-white sm:p-10">
        <h1 className="whitespace-pre-line text-3xl font-semibold leading-tight sm:text-5xl">{recordsHero.title}</h1>
        <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">{recordsHero.description}</p>
      </section>

      <section className="space-y-7">
        <SectionHeader eyebrow="Record Categories" title="현장기록 아카이브" />
        <div className="grid gap-4 md:grid-cols-3">
          {recordsLinkCards.map((card) => (
            <Link key={card.href} href={card.href} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-300">
              <h3 className="text-lg font-semibold text-slate-900">{card.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{card.description}</p>
              <p className="mt-4 text-sm font-semibold text-indigo-700">바로가기 →</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-7">
        <SectionHeader eyebrow="Living Proof" title="현장에서 운영된 실제 기록" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {recordsProofItems.map((item) => (
            <ProofCard key={item.title} {...item} />
          ))}
        </div>
      </section>

      <SplitCTA
        title="기록이 쌓일수록, 스포키듀의 실행력이 증명됩니다."
        description="수업 사례, 월간 기록, 교육 인사이트를 통해 스포키듀의 운영 방식과 기준을 확인해 보세요."
        buttons={[
          { label: '수업 사례 보기', href: `${SPOKEDU_BASE_PATH}/cases` },
          { label: '월간 스포키듀 보기', href: `${SPOKEDU_BASE_PATH}/monthly` },
          { label: '교육 인사이트 보기', href: `${SPOKEDU_BASE_PATH}/insights` },
        ]}
      />
    </div>
  );
}
