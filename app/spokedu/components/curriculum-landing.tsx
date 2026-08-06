'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import { useCallback, useEffect, useMemo, type ReactNode } from 'react';
import { HOME_MEDIA } from '../data/home-media';
import { curriculumPage } from '../data/curriculum-page';
import {
  curriculumCommercialModes,
  curriculumModeList,
  curriculumModeLabel,
  curriculumSubmitLabel,
  resolveCurriculumMode,
  type CurriculumCommercialMode,
  type CurriculumModeConfig,
} from '../data/curriculum-commercial-modes';
import type { EvidenceSource } from '../data/conversion-evidence';
import { MASTER_HANDOFF } from '../data/site';
import { trackCommercialEvent } from '../lib/commercial-events';
import { captureAcquisitionFromLocation } from '../lib/acquisition';
import { btnPrimary, btnSecondary, koreanLineBreak } from '../lib/ui-classes';
import { inferTrackFromHref } from '../lib/tracking';
import { CurriculumInquiryForm } from './curriculum-inquiry-form';
import { LandingAnchorNav } from './landing-anchor-nav';
import { LandingFinalCta } from './landing-final-cta';
import { LandingSectionHeading } from './landing-section-heading';
import { LandingFloatingCta } from './landing-floating-cta';
import { LandingHero } from './landing-hero';
import { LandingProcessOnePager } from './landing-process-one-pager';
import { MediaPanel } from './visual';

const premiumPanel =
  'overflow-hidden rounded-[1.5rem] border border-stone-200/70 bg-white shadow-[0_18px_50px_-36px_rgba(15,23,42,0.45)]';
const axisCardShell = 'flex h-full flex-col rounded-2xl border border-stone-200/80 bg-stone-50/70 px-4 py-3.5';
const productCardShell = `flex h-full flex-col ${premiumPanel}`;
const historyCardShell = `flex h-full flex-col ${premiumPanel}`;

const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#245DFF]';

const curriculumHeroNeeds = ['자료·패키지', '교육·도입', 'MASTER', '라이선스'] as const;
const curriculumAnchorItems = [
  { href: '#modes', label: '도입 모드' },
  { href: '#products', label: '제공물' },
  { href: '#history', label: '운영 이력' },
  { href: '#process', label: '도입 절차' },
  { href: '#inquiry', label: '문의' },
] as const;

function Section({
  children,
  className = '',
  delay = 0,
  id,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  id?: string;
}) {
  const reducedMotion = useReducedMotion();
  return (
    <motion.section
      id={id}
      initial={reducedMotion ? false : { opacity: 0, y: 10 }}
      whileInView={reducedMotion ? {} : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1], delay }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

function evidenceLabel(source: EvidenceSource): string {
  if (source.type === 'missing') return source.note;
  return source.label;
}

function ModeEvidenceList({ mode }: { mode: CurriculumModeConfig }) {
  const historyById = useMemo(
    () => Object.fromEntries(curriculumPage.serviceExamples.items.map((item) => [item.id, item])),
    [],
  );

  return (
    <ul className="mt-4 space-y-2">
      {mode.evidence.map((source, index) => {
        if (source.type === 'missing') {
          return (
            <li
              key={`missing-${index}`}
              className={`rounded-xl border border-dashed border-stone-300 bg-stone-50/80 px-3.5 py-3 text-sm text-stone-600 ${koreanLineBreak}`}
            >
              증거 준비 중 · {source.note}
            </li>
          );
        }
        if (source.type === 'product') {
          return (
            <li key={source.href}>
              <Link
                href={source.href}
                data-track={inferTrackFromHref(source.href)}
                data-track-label={`curriculum-evidence-${mode.id}-product`}
                className={`block rounded-xl border border-teal-200 bg-teal-50/70 px-3.5 py-3 text-sm font-semibold text-teal-900 ${focusRing}`}
              >
                {source.label} →
              </Link>
            </li>
          );
        }
        if (source.type === 'history') {
          const item = historyById[source.historyId];
          if (!item) {
            return (
              <li
                key={source.historyId}
                className={`rounded-xl border border-stone-200 px-3.5 py-3 text-sm text-stone-600 ${koreanLineBreak}`}
              >
                {source.label}
              </li>
            );
          }
          const body = (
            <>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-teal-800">{item.status}</p>
              <p className={`mt-1 text-sm font-semibold text-slate-950 ${koreanLineBreak}`}>{item.title}</p>
              <p className={`mt-1 text-xs text-stone-500 ${koreanLineBreak}`}>{item.venue}</p>
            </>
          );
          if ('href' in item && item.href) {
            return (
              <li key={source.historyId}>
                <Link
                  href={item.href}
                  data-track={inferTrackFromHref(item.href)}
                  data-track-label={`curriculum-evidence-${mode.id}-${source.historyId}`}
                  className={`block rounded-xl border border-stone-200 bg-white px-3.5 py-3 transition hover:border-teal-200 ${focusRing}`}
                >
                  {body}
                </Link>
              </li>
            );
          }
          return (
            <li key={source.historyId} className="rounded-xl border border-stone-200 bg-white px-3.5 py-3">
              {body}
            </li>
          );
        }
        return (
          <li
            key={`${source.type}-${index}`}
            className={`rounded-xl border border-stone-200 px-3.5 py-3 text-sm text-slate-700 ${koreanLineBreak}`}
          >
            {evidenceLabel(source)}
          </li>
        );
      })}
    </ul>
  );
}

export default function CurriculumLanding() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const mode = resolveCurriculumMode(searchParams.get('mode'));
  const active = curriculumCommercialModes[mode];
  const spotlight = curriculumPage.masterSpotlight;

  const setMode = useCallback(
    (next: CurriculumCommercialMode, hash?: string) => {
      trackCommercialEvent({
        name: 'selection_changed',
        route: 'curriculum',
        selectionId: next,
      });
      const params = new URLSearchParams(searchParams.toString());
      params.set('mode', next);
      const qs = params.toString();
      const target = `${pathname}?${qs}${hash ? `#${hash}` : `#mode-${next}`}`;
      router.replace(target, { scroll: false });
      if (typeof window !== 'undefined' && hash) {
        window.requestAnimationFrame(() => {
          document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    captureAcquisitionFromLocation();
  }, []);

  const heroPrimary =
    mode === 'master'
      ? {
          label: active.primaryAction.label,
          href: active.primaryAction.href,
          trackLabel: active.primaryAction.trackingLabel,
        }
      : {
          label: active.primaryAction.label,
          href: '#inquiry',
          trackLabel: active.primaryAction.trackingLabel,
        };

  const heroSecondary =
    mode === 'master' && active.secondaryAction
      ? {
          label: active.secondaryAction.label,
          href: '#inquiry',
          trackLabel: active.secondaryAction.trackingLabel,
        }
      : curriculumPage.heroCtas.secondary;

  return (
    <div className="flex w-full flex-col gap-8 pb-24 sm:gap-10 lg:gap-12">
      <div id="hero">
        <LandingHero
          kicker={curriculumPage.hero.kicker}
          kickerClassName="text-stone-500"
          leading={
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">지도자·교육</p>
              <div className="flex flex-wrap gap-2" aria-label="커리큘럼 도입 모드">
                {curriculumHeroNeeds.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-teal-100 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-900"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          }
          lines={curriculumPage.hero.lines}
          subtitle="필요한 것이 자료인지, 교육인지, 구독 도구인지, 라이선스인지부터 고르면 문의가 그 범위로 이어집니다."
          media={HOME_MEDIA[curriculumPage.hero.mediaKey]}
          visualVariant="editorial"
          priority
          primaryCta={heroPrimary}
          secondaryCta={heroSecondary}
        />
      </div>

      <LandingAnchorNav
        items={curriculumAnchorItems}
        cta={{ href: '#inquiry', label: curriculumSubmitLabel(mode) }}
        ariaLabel="커리큘럼 랜딩 바로가기"
      />

      <Section id="modes" className="scroll-mt-36 space-y-4">
        <LandingSectionHeading
          eyebrow="도입 모드"
          title="무엇을 도입할지 먼저 고릅니다"
          lead="페르소나보다 구매 형태를 고릅니다. 선택하면 CTA·문의 폼이 같은 모드로 잠깁니다. 다른 모드도 아래에서 비교할 수 있습니다."
          accent="teal"
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {curriculumModeList.map((item) => {
            const selected = item.id === mode;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setMode(item.id)}
                className={`rounded-[1.25rem] border px-4 py-4 text-left transition ${focusRing} ${
                  selected
                    ? 'border-teal-600 bg-teal-50 shadow-[0_12px_40px_-28px_rgba(13,148,136,0.55)]'
                    : 'border-stone-200/80 bg-white hover:border-teal-200'
                }`}
                aria-pressed={selected}
              >
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-teal-800">{item.audienceHint}</p>
                <h3 className="mt-2 text-base font-bold text-slate-950">{item.title}</h3>
                <p className={`mt-2 text-sm leading-relaxed text-slate-600 ${koreanLineBreak}`}>{item.promise}</p>
                <p className="mt-3 text-sm font-semibold text-teal-800">
                  {selected ? '선택됨 · 문의에 반영' : '이 모드로 보기'}
                </p>
              </button>
            );
          })}
        </div>
      </Section>

      {curriculumModeList.map((item) => (
        <Section
          key={item.id}
          id={item.sectionId}
          className={`scroll-mt-36 ${premiumPanel} px-5 py-6 sm:px-7 sm:py-7 ${
            item.id === mode ? 'ring-2 ring-teal-600/30' : ''
          }`}
        >
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-teal-800">{item.title}</p>
            {item.id === mode ? (
              <span className="rounded-full bg-teal-600 px-2.5 py-0.5 text-[11px] font-semibold text-white">현재 선택</span>
            ) : null}
          </div>
          <h2 className={`mt-2 text-xl font-semibold text-slate-950 sm:text-2xl ${koreanLineBreak}`}>{item.promise}</h2>
          <p className={`mt-2 text-sm text-stone-600 ${koreanLineBreak}`}>{item.audienceHint}에게 맞는 도입 단위입니다.</p>

          <div className="mt-5 grid gap-6 lg:grid-cols-2">
            <div>
              <p className="text-sm font-bold text-slate-950">제공물</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {item.deliverables.map((deliverable) => (
                  <li
                    key={deliverable}
                    className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-semibold text-slate-700"
                  >
                    {deliverable}
                  </li>
                ))}
              </ul>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                {item.id === 'master' ? (
                  <Link
                    href={item.primaryAction.href}
                    data-track={inferTrackFromHref(item.primaryAction.href)}
                    data-track-label={item.primaryAction.trackingLabel}
                    className={`${btnPrimary} min-h-12 !w-full sm:!w-auto ${focusRing}`}
                  >
                    {item.primaryAction.label}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => setMode(item.id, 'inquiry')}
                    className={`${btnPrimary} min-h-12 !w-full sm:!w-auto ${focusRing}`}
                    data-track-label={item.primaryAction.trackingLabel}
                  >
                    {item.primaryAction.label}
                  </button>
                )}
                {item.secondaryAction ? (
                  item.secondaryAction.intentId === 'master_view' ? (
                    <Link
                      href={item.secondaryAction.href}
                      data-track={inferTrackFromHref(item.secondaryAction.href)}
                      data-track-label={item.secondaryAction.trackingLabel}
                      className={`${btnSecondary} min-h-12 !w-full sm:!w-auto ${focusRing}`}
                    >
                      {item.secondaryAction.label}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setMode(item.id, 'inquiry')}
                      className={`${btnSecondary} min-h-12 !w-full sm:!w-auto ${focusRing}`}
                      data-track-label={item.secondaryAction.trackingLabel}
                    >
                      {item.secondaryAction.label}
                    </button>
                  )
                ) : null}
              </div>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-950">연결 증거</p>
              <ModeEvidenceList mode={item} />
            </div>
          </div>
        </Section>
      ))}

      <Section className={`${premiumPanel} px-5 py-5 sm:px-6 sm:py-6`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <span className="inline-flex w-fit items-center rounded-full border border-teal-100 bg-teal-50 px-3.5 py-1.5 text-xs font-semibold text-teal-900">
            {curriculumPage.hero.trustBadge}
          </span>
          <p className={`max-w-xl text-sm leading-relaxed text-stone-600 sm:text-right ${koreanLineBreak}`}>
            현재 선택: <strong className="font-semibold text-slate-900">{curriculumModeLabel(mode)}</strong> — 문의 폼과
            CTA가 이 모드로 맞춰집니다.
          </p>
        </div>
      </Section>

      <Section id="products" className="scroll-mt-36 space-y-4">
        <LandingSectionHeading
          eyebrow={curriculumPage.contentProducts.eyebrow}
          title="제공물 전체 보기"
          lead="모드와 무관하게 비교할 수 있도록 주요 제공물을 함께 둡니다. 문의는 위에서 고른 모드로 접수됩니다."
          accent="teal"
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {curriculumPage.contentProducts.items.map((item, index) => (
            <article key={item.title} className={productCardShell}>
              <MediaPanel
                media={HOME_MEDIA[item.mediaKey]}
                className="aspect-[5/3] min-h-[110px] shrink-0 rounded-none border-0"
                photoPriority={index === 0}
              />
              <div className="flex flex-1 flex-col border-t border-stone-100 px-4 py-3.5">
                <h3 className="text-sm font-semibold text-slate-950 sm:text-base">{item.title}</h3>
                <p className={`mt-1.5 text-sm leading-relaxed text-slate-600 ${koreanLineBreak}`}>{item.description}</p>
              </div>
            </article>
          ))}
        </div>
      </Section>

      <Section id="history" className="scroll-mt-36 space-y-4">
        <LandingSectionHeading
          eyebrow={curriculumPage.serviceExamples.eyebrow}
          title={curriculumPage.serviceExamples.title}
          lead="강한 이력만 유지합니다. 모드 섹션의 연결 증거와 같은 원천입니다."
          accent="teal"
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {curriculumPage.serviceExamples.items.map((item) => {
            const inner = (
              <>
                <MediaPanel
                  media={HOME_MEDIA[item.mediaKey]}
                  className="aspect-[16/10] shrink-0 rounded-none border-0"
                />
                <div className="flex flex-1 flex-col p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-[11px] font-semibold text-teal-800">
                      {item.status}
                    </span>
                    <span className="text-xs text-stone-500">{item.date}</span>
                  </div>
                  <h3 className={`mt-2 text-[15px] font-semibold text-slate-950 ${koreanLineBreak}`}>{item.title}</h3>
                  <p className={`mt-1 text-sm font-medium text-teal-900 ${koreanLineBreak}`}>{item.venue}</p>
                  <p className={`mt-2 flex-1 text-sm leading-relaxed text-slate-600 ${koreanLineBreak}`}>
                    {item.description}
                  </p>
                  {'href' in item && item.href ? (
                    <span className="mt-3 text-sm font-semibold text-teal-800">자세히 보기 →</span>
                  ) : null}
                </div>
              </>
            );

            return 'href' in item && item.href ? (
              <Link
                key={item.id}
                href={item.href}
                data-track={inferTrackFromHref(item.href)}
                data-track-label={`curriculum-example-${item.id}`}
                className={`${historyCardShell} transition hover:border-teal-200`}
              >
                {inner}
              </Link>
            ) : (
              <article key={item.id} className={historyCardShell}>
                {inner}
              </article>
            );
          })}
        </div>
      </Section>

      <Section id="training" className="scroll-mt-36 space-y-4">
        <LandingSectionHeading
          eyebrow={curriculumPage.trainingTracks.eyebrow}
          title={curriculumPage.trainingTracks.title}
          accent="teal"
        />
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {curriculumPage.trainingTracks.items.map((item) => (
            <article key={item.title} className={axisCardShell}>
              <h3 className="text-sm font-semibold text-slate-950 sm:text-base">{item.title}</h3>
              <p className={`mt-1.5 text-sm leading-relaxed text-slate-600 ${koreanLineBreak}`}>{item.body}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section id="master" className={`${premiumPanel} px-5 py-6 sm:px-7 sm:py-7`}>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-teal-800">{spotlight.eyebrow}</p>
        <h2 className={`mt-2.5 text-xl font-semibold leading-snug text-stone-950 sm:text-2xl ${koreanLineBreak}`}>
          {spotlight.title}
        </h2>
        <p className={`mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-[15px] ${koreanLineBreak}`}>
          {spotlight.lead}
        </p>
        <ul className="mt-4 flex flex-wrap gap-2" aria-label="SPOKEDU MASTER 주요 기능">
          {spotlight.tags.map((tag) => (
            <li key={tag}>
              <span className="rounded-full border border-teal-200/80 bg-teal-50/60 px-3 py-1.5 text-xs font-semibold text-teal-900">
                {tag}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link
            href={spotlight.primary.href}
            data-track={inferTrackFromHref(spotlight.primary.href)}
            data-track-label={spotlight.primary.trackLabel}
            className={`${btnPrimary} min-h-12 !w-full sm:!w-auto ${focusRing}`}
          >
            {spotlight.primary.label}
          </Link>
          <button
            type="button"
            onClick={() => setMode('master', 'inquiry')}
            className={`${btnSecondary} min-h-12 !w-full sm:!w-auto ${focusRing}`}
            data-track-label="curriculum-master-org-inquiry"
          >
            기관·단체 이용 문의
          </button>
        </div>
      </Section>

      <Section id="process" className="scroll-mt-36">
        <LandingProcessOnePager data={curriculumPage.processOnePager} />
      </Section>

      <LandingFinalCta
        eyebrow="교육·콘텐츠"
        title={curriculumPage.finalCta.title}
        description={curriculumPage.finalCta.description}
        backgroundMedia={HOME_MEDIA[curriculumPage.finalCta.mediaKey]}
        links={[
          {
            label: curriculumPage.finalCta.primary.label,
            href: curriculumPage.finalCta.primary.href,
            trackLabel: curriculumPage.finalCta.primary.trackLabel,
          },
        ]}
      />

      <Section>
        <CurriculumInquiryForm
          leadMode={mode}
          formDefaults={active.formDefaults}
          onLeadModeChange={(next) => setMode(next, 'inquiry')}
        />
      </Section>

      <LandingFloatingCta
        primaryHref={mode === 'master' ? MASTER_HANDOFF.landing : '#inquiry'}
        primaryLabel={mode === 'master' ? active.primaryAction.label : curriculumSubmitLabel(mode)}
        showAfterId="hero"
      />
    </div>
  );
}
