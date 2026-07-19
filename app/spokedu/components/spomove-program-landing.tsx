'use client';

import Image from 'next/image';
import Link from 'next/link';
import { CaseProofCard } from './case-proof-card';
import { LandingFinalCta } from './landing-final-cta';
import { LandingHero } from './landing-hero';
import { MediaPanel } from './visual';
import { getCaseBySlug } from '../data/cases';
import { HOME_MEDIA } from '../data/home-media';
import { SPOKEDU_IMAGES } from '../data/images';
import { spomoveProgramPage } from '../data/spomove-program-page';
import {
  audienceLandingStack,
  koreanText,
  landingCardFrame,
  landingCardPanelPad,
  landingSectionTitle,
  linkMuted,
} from '../lib/ui-classes';
import { inferTrackFromHref } from '../lib/tracking';

/** 스포매트 실물 배치 — 좌상 초록 · 우상 빨강 · 좌하 파랑 · 우하 노랑 */
const PAD_CELLS = [
  { name: 'GREEN', ko: '초록', hex: '#22C55E' },
  { name: 'RED', ko: '빨강', hex: '#EF4444' },
  { name: 'BLUE', ko: '파랑', hex: '#3B82F6' },
  { name: 'YELLOW', ko: '노랑', hex: '#EAB308' },
] as const;

/**
 * SPOMOVE 프로그램 페이지
 * 맥락: 무엇인지 → 어떻게(패드) → 얼마나 깊어지나 → 현장·도입
 * 홈급 풀블리드 히어로는 쓰지 않음 (서브 랜딩 LandingHero)
 */
export default function SpomoveProgramLanding() {
  const page = spomoveProgramPage;
  const relatedCases = page.cases.slugs
    .map((slug) => getCaseBySlug(slug))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  return (
    <div className={audienceLandingStack}>
      <LandingHero
        kicker={page.hero.kicker}
        kickerClassName="text-[#1D4ED8]"
        lines={page.hero.lines}
        subtitle={page.hero.subtitle}
        media={HOME_MEDIA[page.hero.mediaKey]}
        visualVariant="editorial"
        priority
        primaryCta={{
          label: page.heroCta.label,
          href: page.heroCta.href,
          trackLabel: page.heroCta.trackLabel,
        }}
        secondaryCta={{
          label: '핵심 구조 보기',
          href: '#how',
          trackLabel: 'program-spomove-how',
        }}
      />

      {/* 1. 무엇인지 */}
      <section className="space-y-5" aria-labelledby="spomove-what">
        <div>
          <p className="text-xs font-bold tracking-[0.14em] text-[#1D4ED8]">01 · 무엇인지</p>
          <h2 id="spomove-what" className={`${landingSectionTitle} mt-2`}>
            {page.overview.title}
          </h2>
          <p className={`mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-[15px] ${koreanText}`}>
            {page.overview.body}
          </p>
        </div>
        <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3" aria-label="움직임 흐름">
          {page.overview.flow.map((step, index) => (
            <li key={step} className={`flex items-center gap-3 ${landingCardPanelPad} ${landingCardFrame}`}>
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: PAD_CELLS[index]?.hex }}
                aria-hidden
              />
              <div className="min-w-0">
                <p className="text-[11px] font-bold tabular-nums text-slate-400">
                  {String(index + 1).padStart(2, '0')}
                </p>
                <p className={`text-sm font-bold text-slate-950 sm:text-base ${koreanText}`}>{step}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* 2. 어떻게 — 페이지의 핵심 비주얼 */}
      <section id="how" className="scroll-mt-28 space-y-6 rounded-2xl border border-slate-200/90 bg-white px-5 py-7 sm:px-7 sm:py-9">
        <div>
          <p className="text-xs font-bold tracking-[0.14em] text-[#1D4ED8]">02 · 어떻게</p>
          <h2 className={`${landingSectionTitle} mt-2`}>{page.padSystem.title}</h2>
          <p className={`mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-[15px] ${koreanText}`}>
            {page.padSystem.body}
          </p>
        </div>

        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] lg:gap-10">
          <ol className="grid gap-3 sm:grid-cols-2">
            {page.padSystem.points.map((point, index) => (
              <li key={point.title} className={`flex gap-3 ${landingCardPanelPad} border border-slate-200/80 bg-[#FAFAF8]`}>
                <span
                  className="mt-1 h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: PAD_CELLS[index]?.hex }}
                  aria-hidden
                />
                <div>
                  <p className={`font-bold text-slate-950 ${koreanText}`}>{point.title}</p>
                  <p className={`mt-1 text-sm text-slate-600 ${koreanText}`}>{point.body}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mx-auto w-full max-w-[18rem] lg:mx-0 lg:max-w-none">
            <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-[#FAFAF8] p-2.5 shadow-sm shadow-slate-900/5">
              <div className="relative aspect-square overflow-hidden rounded-[1.15rem] bg-slate-200">
                <Image
                  src={SPOKEDU_IMAGES.brand.spomat.src}
                  alt={SPOKEDU_IMAGES.brand.spomat.alt}
                  fill
                  sizes="(max-width: 1024px) 18rem, 20rem"
                  className="object-cover"
                />
              </div>
            </div>
            <p className={`mt-2 text-center text-xs font-semibold text-slate-600 ${koreanText}`}>
              스포매트 · 현장 4색 반응 패드
            </p>
            <ul className="mt-2 grid grid-cols-2 gap-1.5" aria-label="스포매트 색 구성">
              {PAD_CELLS.map((pad) => (
                <li
                  key={pad.name}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700"
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: pad.hex }} aria-hidden />
                  {pad.ko}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* 3. 얼마나 깊어지나 */}
      <section className="space-y-5" aria-labelledby="spomove-depth">
        <div>
          <p className="text-xs font-bold tracking-[0.14em] text-[#1D4ED8]">03 · 난이도</p>
          <h2 id="spomove-depth" className={`${landingSectionTitle} mt-2`}>
            {page.reactionLevels.title}
          </h2>
          <p className={`mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-[15px] ${koreanText}`}>
            {page.reactionLevels.lead}
          </p>
        </div>
        <ol className="grid gap-3 sm:grid-cols-2">
          {page.reactionLevels.items.map((item) => (
            <li key={item.title} className={`${landingCardPanelPad} ${landingCardFrame}`}>
              <p className="text-xs font-bold text-[#1D4ED8]">{item.level.padStart(2, '0')}</p>
              <h3 className={`mt-1.5 text-base font-bold text-slate-950 ${koreanText}`}>{item.title}</h3>
              <p className={`mt-1.5 text-sm leading-relaxed text-slate-600 ${koreanText}`}>{item.body}</p>
            </li>
          ))}
        </ol>
        <p className={`text-sm text-slate-500 ${koreanText}`}>
          사이먼·플랭커·스트룹 등 인지 과제를 난이도에 맞춰 섞어 운영합니다.
        </p>
      </section>

      {/* 4. 현장 */}
      <section className="space-y-5" aria-labelledby="spomove-field">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold tracking-[0.14em] text-[#1D4ED8]">04 · 현장</p>
            <h2 id="spomove-field" className={`${landingSectionTitle} mt-2`}>
              {page.activities.title}
            </h2>
          </div>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {page.activities.items.slice(0, 4).map((item, index) => (
            <li key={item.title} className={`overflow-hidden ${landingCardFrame}`}>
              <div className="relative aspect-[16/10]">
                <MediaPanel
                  media={HOME_MEDIA[item.mediaKey]}
                  className="absolute inset-0 h-full w-full rounded-none border-0"
                  photoPriority={index === 0}
                />
              </div>
              <div className={landingCardPanelPad}>
                <h3 className={`font-bold text-slate-950 ${koreanText}`}>{item.title}</h3>
                <p className={`mt-1 text-sm text-slate-600 ${koreanText}`}>{item.description}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {relatedCases.length > 0 ? (
        <section className="space-y-4">
          <div className="flex items-end justify-between gap-2">
            <h2 className={landingSectionTitle}>{page.cases.title}</h2>
            <Link
              href={page.cases.recordsHref}
              data-track={inferTrackFromHref(page.cases.recordsHref)}
              data-track-label="program-spomove-records"
              className={`text-sm ${linkMuted}`}
            >
              현장기록 →
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {relatedCases.map((item, index) => (
              <CaseProofCard
                key={item.slug}
                item={item}
                variant="compact"
                cardVariant={index % 2 === 0 ? 'image' : 'glass'}
                trackPrefix="program-spomove"
              />
            ))}
          </div>
        </section>
      ) : null}

      {/* 도입 */}
      <section className={`space-y-3 ${landingCardPanelPad} ${landingCardFrame}`}>
        <p className="text-xs font-bold tracking-[0.14em] text-[#1D4ED8]">도입</p>
        <h2 className={`text-xl font-bold text-slate-950 sm:text-2xl ${koreanText}`}>{page.institutionFit.title}</h2>
        <p className={`text-base font-semibold text-[#1D4ED8] ${koreanText}`}>{page.institutionFit.lead}</p>
        <p className={`text-sm leading-relaxed text-slate-600 ${koreanText}`}>{page.institutionFit.body}</p>
        <p className={`text-sm text-slate-600 ${koreanText}`}>
          <span className="font-semibold text-slate-800">대상 · </span>
          {page.audience.targets}
        </p>
        <p className={`text-sm text-slate-600 ${koreanText}`}>
          <span className="font-semibold text-slate-800">운영 · </span>
          {page.audience.operations}
        </p>
      </section>

      <LandingFinalCta
        title={page.finalCta.title}
        description={page.finalCta.description}
        tone="light"
        backgroundMedia={HOME_MEDIA[page.hero.mediaKey]}
        links={[
          {
            label: page.finalCta.label,
            href: page.finalCta.href,
            trackLabel: page.finalCta.trackLabel,
            variant: 'primary',
          },
          {
            label: '전체 프로그램 보기',
            href: '/spokedu/programs',
            trackLabel: 'program-spomove-all',
            variant: 'on-light-outline',
          },
        ]}
      />
    </div>
  );
}
