'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState, type ReactNode } from 'react';
import { ArrowRight, MessageCircle } from 'lucide-react';
import { brandProfile } from '../data/brand';
import { KAKAO_CHANNEL_URL } from '../data/external-channels';
import {
  getRecordsV0CardTheme,
  getRecordsV0Category,
  RECORDS_V0_FILTERS,
  sortRecordsForV0,
  type RecordsV0Filter,
} from '../data/records-v0-categories';
import { recordsPage } from '../data/records-page';
import { SPOKEDU_PATHS } from '../data/public-routes';
import type { FieldRecordWithThumbnail } from '../lib/resolve-field-records';
import { koreanLineBreak } from '../lib/ui-classes';

const principles = [
  ['공간에 맞춘 동선 재설계', '교실·활동실·강당·운동장'],
  ['대기 시간을 없애는 인원 분배', '소그룹 밀착 케어부터 다인원 순환까지'],
  ['소외 없는 규칙 튜닝', '연령 격차 및 특수·통합 환경을 고려한 난이도 조절'],
] as const;

const heroStats = [
  ...recordsPage.hero.stats,
  { value: '전국', label: brandProfile.serviceArea },
] as const;

function RecordCardLink({
  href,
  external,
  className,
  children,
}: {
  href: string;
  external: boolean;
  className?: string;
  children: ReactNode;
}) {
  if (external) {
    return (
      <a className={className} href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  }
  return (
    <Link className={className} href={href}>
      {children}
    </Link>
  );
}

export function RecordsV0Landing({ fieldRecords }: { fieldRecords: FieldRecordWithThumbnail[] }) {
  const [activeFilter, setActiveFilter] = useState<RecordsV0Filter>('전체 보기');

  const cards = useMemo(() => {
    return sortRecordsForV0(fieldRecords).map((record) => {
      const categoryBadge = getRecordsV0Category(record.slug);
      const theme = getRecordsV0CardTheme(record, categoryBadge);
      const image =
        record.thumbnailSrc?.trim() ||
        `/images/spokedu/records/${record.slug}.jpg`;
      const external = record.href.startsWith('http');
      return {
        slug: record.slug,
        venue: record.venue,
        categoryBadge,
        theme,
        description: record.description,
        meta: record.meta,
        image,
        href: record.href,
        external,
      };
    });
  }, [fieldRecords]);

  const visibleCases = useMemo(() => {
    if (activeFilter === '전체 보기') return cards;
    return cards.filter((item) => item.categoryBadge === activeFilter);
  }, [activeFilter, cards]);

  return (
    <main className={`break-keep bg-white text-slate-950 ${koreanLineBreak}`}>
      <section className="px-6 py-20 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-5xl text-center">
          <span className="inline-flex rounded-full bg-blue-50 px-4 py-2 text-xs font-bold tracking-[0.18em] text-blue-600">
            FIELD RECORDS ARCHIVE
          </span>
          <h1
            id="records-title"
            className="mt-7 text-balance text-4xl font-black leading-[1.14] tracking-[-0.05em] sm:text-5xl md:text-6xl lg:text-7xl"
          >
            서로 다른 현장에
            <br />
            <span className="text-blue-600">서로 다른 수업</span>을 설계합니다.
          </h1>
          <p className="mx-auto mt-7 max-w-2xl text-base leading-7 text-slate-500 sm:text-lg">
            {recordsPage.hero.subtitle}
          </p>
          <div className="mx-auto mt-10 grid max-w-4xl grid-cols-2 overflow-hidden rounded-2xl border border-slate-200/70 bg-slate-50 p-2 sm:grid-cols-4 sm:p-3">
            {heroStats.map(({ value, label }) => (
              <div
                key={label}
                className="flex flex-col gap-1 border-slate-200/70 px-3 py-4 sm:border-r last:border-0"
              >
                <strong className="text-xl font-black tracking-tight sm:text-2xl">{value}</strong>
                <span className="text-xs font-medium text-slate-500 sm:text-sm">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-50 px-6 py-20 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 flex flex-col items-center gap-5 text-center">
            <p className="text-sm font-bold text-blue-600">SPOKEDU CASE FILES</p>
            <h2 className="text-3xl font-black tracking-[-0.04em] sm:text-4xl">현장마다 다른 답을 만들었습니다.</h2>
            <div className="flex w-full gap-2 overflow-x-auto pb-2 sm:flex-wrap sm:justify-center sm:overflow-visible">
              {RECORDS_V0_FILTERS.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setActiveFilter(filter)}
                  className={`shrink-0 rounded-full border px-4 py-2.5 text-sm font-semibold transition break-keep ${
                    activeFilter === filter
                      ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-600'
                  }`}
                  aria-pressed={activeFilter === filter}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {visibleCases.map((item) => (
              <RecordCardLink
                key={item.slug}
                href={item.href}
                external={item.external}
                className="group flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <div>
                  <div className="relative aspect-[16/9] overflow-hidden">
                    <Image
                      src={item.image}
                      alt={`${item.venue} 수업 현장`}
                      fill
                      className="object-cover transition duration-500 group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                    <span className="absolute left-4 top-4 max-w-[calc(100%-2rem)] rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm break-keep">
                      {item.categoryBadge}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2 p-6">
                    <h3 className="text-lg font-extrabold leading-snug tracking-tight break-keep">{item.venue}</h3>
                    <p className="text-sm font-bold text-blue-600 break-keep">{item.theme}</p>
                    <p className="text-sm leading-6 text-slate-500 break-keep">{item.description}</p>
                  </div>
                </div>
                <div className="border-t border-slate-100 bg-slate-50 px-6 py-4">
                  <p className="text-xs font-semibold leading-5 text-slate-500 break-keep">{item.meta}</p>
                  <p className="mt-2 text-xs font-bold text-blue-600">
                    {item.external ? '현장 후기 보기 ↗' : '사례 보기 →'}
                  </p>
                </div>
              </RecordCardLink>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-20 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10">
            <p className="text-sm font-bold text-blue-600">DESIGN PRINCIPLES</p>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] sm:text-4xl">
              왜 모든 현장의 수업 모습이 다를까요?
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {principles.map(([title, detail], index) => (
              <div key={title} className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
                <div className="mb-8 flex size-9 items-center justify-center rounded-full bg-blue-600 text-sm font-black text-white sm:mb-10">
                  0{index + 1}
                </div>
                <h3 className="text-lg font-extrabold leading-snug break-keep">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500 break-keep">{detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-900 px-6 py-20 text-white sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
          <div>
            <p className="text-sm font-bold text-blue-400">YOUR NEXT CASE FILE</p>
            <h2 className="mt-3 max-w-2xl text-3xl font-black leading-tight tracking-[-0.04em] sm:text-4xl">
              우리 기관과 비슷한 사례를 찾으셨나요?
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">{recordsPage.cta.description}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href={`${SPOKEDU_PATHS.education}#contact`}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 px-5 py-3.5 text-sm font-bold transition hover:bg-blue-500"
            >
              {recordsPage.cta.label}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
            {KAKAO_CHANNEL_URL ? (
              <a
                href={KAKAO_CHANNEL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-700 px-5 py-3.5 text-sm font-bold text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
              >
                <MessageCircle className="size-4" aria-hidden />
                카카오톡 간편 문의
              </a>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}
