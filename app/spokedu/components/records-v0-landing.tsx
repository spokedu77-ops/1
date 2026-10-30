'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState, type ReactNode } from 'react';
import { ArrowRight, MessageCircle } from 'lucide-react';
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
import {
  koreanLineBreak,
  v0BentoCard,
  v0CardImageHover,
  v0CardInnerPad,
  v0CardMediaFrame,
  v0CardMediaImgCover,
  v0CtaButton,
  v0CtaButtonRow,
  v0FilterChipActive,
  v0FilterChipBase,
  v0FilterChipIdle,
  v0CardTitle,
  v0CardTitleCompact,
  v0CtaTitleOnDark,
  v0GradientText,
  v0HeroTitle,
  v0Lead,
  v0LeadOnBlue,
  v0LeadOnDark,
  v0SectionBand,
  v0SectionKicker,
  v0SectionTitle,
} from '../lib/ui-classes';
import { PUBLIC_V0_METRICS_HERO_ROW, PUBLIC_V0_METRICS } from '../data/marketing-public-metrics';
import { V0_KO } from '../data/v0-korean-labels';
import { V0Eyebrow, V0MetricsNote, V0SectionHeader } from './v0-ui';

const principles = [
  ['공간에 맞춘 동선 재설계', '교실·활동실·강당·운동장'],
  ['대기 시간을 없애는 인원 분배', '소그룹 밀착 케어부터 다인원 순환까지'],
  ['소외 없는 규칙 튜닝', '연령 격차 및 특수·통합 환경을 고려한 난이도 조절'],
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
    <div className={`break-keep bg-white text-slate-950 ${koreanLineBreak}`}>
      <section className={`px-6 sm:px-8 lg:px-12 ${v0SectionBand}`}>
        <div className="mx-auto max-w-5xl text-center">
          <V0Eyebrow>{V0_KO.recordsArchive}</V0Eyebrow>
          <h1
            id="records-title"
            className={`mt-7 ${v0HeroTitle}`}
          >
            서로 다른 현장에
            <br />
            <span className={v0GradientText}>서로 다른 수업</span>을 설계합니다.
          </h1>
          <p className={`mx-auto mt-7 max-w-2xl ${v0Lead}`}>
            {recordsPage.hero.subtitle}
          </p>
          <div className="mx-auto mt-10 grid max-w-3xl grid-cols-1 overflow-hidden rounded-2xl border border-slate-200/70 bg-slate-50 p-2 sm:grid-cols-3 sm:p-3">
            {PUBLIC_V0_METRICS_HERO_ROW.map(({ value, label }) => (
              <div
                key={label}
                className="flex flex-col gap-1 border-slate-200/70 px-3 py-4 sm:border-r last:border-0"
              >
                <strong
                  className={`text-xl font-black tracking-tight sm:text-2xl ${
                    value.includes('+') || value.includes('서울') ? v0GradientText : ''
                  }`}
                >
                  {value}
                </strong>
                <span className="text-xs font-medium text-slate-500 sm:text-sm">{label}</span>
              </div>
            ))}
          </div>
          <V0MetricsNote>
            {PUBLIC_V0_METRICS.institutions.note} · {PUBLIC_V0_METRICS.classes.note}
          </V0MetricsNote>
        </div>
      </section>

      <section className={`bg-slate-50 px-6 sm:px-8 lg:px-12 ${v0SectionBand}`}>
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 flex flex-col items-center gap-5 text-center">
            <p className={v0SectionKicker}>{V0_KO.caseFiles}</p>
            <h2 className={v0SectionTitle}>현장마다 다른 답을 만들었습니다.</h2>
            <div className="flex w-full gap-2 overflow-x-auto pb-2 sm:flex-wrap sm:justify-center sm:overflow-visible">
              {RECORDS_V0_FILTERS.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setActiveFilter(filter)}
                  className={`${v0FilterChipBase} ${
                    activeFilter === filter ? v0FilterChipActive : v0FilterChipIdle
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
                className={`${v0BentoCard} flex h-full flex-col justify-between overflow-hidden rounded-3xl border-slate-200/80 bg-white shadow-sm`}
              >
                <div>
                  <div className={v0CardMediaFrame}>
                    <Image
                      src={item.image}
                      alt={`${item.venue} 수업 현장`}
                      fill
                      className={`${v0CardMediaImgCover} ${v0CardImageHover}`}
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                    <span className="absolute left-4 top-4 max-w-[calc(100%-2rem)] rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm break-keep">
                      {item.categoryBadge}
                    </span>
                  </div>
                  <div className={`flex flex-col gap-2 ${v0CardInnerPad}`}>
                    <h3 className={`${v0CardTitleCompact} break-keep`}>{item.venue}</h3>
                    <p className="text-sm font-bold text-blue-600 break-keep">{item.theme}</p>
                    <p className={v0Lead}>{item.description}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
                  <p className="min-w-0 flex-1 text-xs font-semibold leading-5 text-slate-500 break-keep">
                    {item.meta}
                  </p>
                  <span className="shrink-0 text-xs font-bold text-blue-600">
                    {item.external ? '외부 블로그에서 보기 ↗' : '자세히 보기 →'}
                  </span>
                </div>
              </RecordCardLink>
            ))}
            {activeFilter === '전체 보기' ? (
              <Link
                href={`${SPOKEDU_PATHS.education}#contact`}
                className={`${v0BentoCard} flex min-h-full flex-col justify-between rounded-3xl border-blue-500/20 bg-blue-600 text-white shadow-md hover:bg-blue-700 ${v0CardInnerPad}`}
              >
                <div>
                  <p className="text-xs font-bold tracking-[0.16em] text-blue-200">{V0_KO.customOperation}</p>
                  <h3 className={`mt-4 ${v0CardTitle} break-keep text-white`}>
                    우리 기관도 맞춤 수업이 가능할까요?
                  </h3>
                  <p className={`mt-4 ${v0LeadOnBlue}`}>
                    공간과 인원, 예산만 알려주시면 현장에 최적화된 운영안을 제안해 드립니다.
                  </p>
                  <ul className={`mt-5 space-y-2 text-sm ${v0LeadOnBlue}`}>
                    <li>· 공간·인원·연령에 맞춘 동선·규칙 설계</li>
                    <li>· SPOMOVE·교구 포함 여부 협의</li>
                    <li>· 정기·단기·원데이 등 운영 형태 제안</li>
                  </ul>
                </div>
                <span className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-white">
                  맞춤 운영안 요청하기
                  <ArrowRight className="size-4" aria-hidden />
                </span>
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <section className={`px-6 sm:px-8 lg:px-12 ${v0SectionBand}`}>
        <div className="mx-auto max-w-7xl">
          <V0SectionHeader kicker="설계 원칙" title="왜 모든 현장의 수업 모습이 다를까요?" />
          <div className="grid gap-4 md:grid-cols-3">
            {principles.map(([title, detail], index) => (
              <div
                key={title}
                className={`${v0BentoCard} rounded-3xl border-slate-200 bg-white ${v0CardInnerPad}`}
              >
                <div className="mb-8 flex size-9 items-center justify-center rounded-full bg-blue-600 text-sm font-black text-white sm:mb-10">
                  0{index + 1}
                </div>
                <h3 className={`${v0CardTitleCompact} break-keep`}>{title}</h3>
                <p className={`mt-2 ${v0Lead}`}>{detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={`bg-slate-900 px-6 text-white sm:px-8 lg:px-12 ${v0SectionBand}`}>
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
          <div>
            <p className={`${v0SectionKicker} text-blue-400`}>{V0_KO.nextCase}</p>
            <h2 className={`mt-3 max-w-2xl ${v0CtaTitleOnDark}`}>우리 기관과 비슷한 사례를 찾으셨나요?</h2>
            <p className={`mt-4 max-w-2xl ${v0LeadOnDark}`}>{recordsPage.cta.description}</p>
          </div>
          <div className={v0CtaButtonRow}>
            <Link
              href={`${SPOKEDU_PATHS.education}#contact`}
              className={`${v0CtaButton} gap-2 bg-blue-600 text-white transition hover:bg-blue-500`}
            >
              {recordsPage.cta.label}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
            {KAKAO_CHANNEL_URL ? (
              <a
                href={KAKAO_CHANNEL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={`${v0CtaButton} gap-2 border border-slate-700 text-slate-200 transition hover:border-slate-500 hover:bg-slate-800`}
              >
                <MessageCircle className="size-4" aria-hidden />
                카카오톡 간편 문의
              </a>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
