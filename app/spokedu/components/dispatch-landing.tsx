'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import { HOME_MEDIA } from '../data/home-media';
import { dispatchPage } from '../data/dispatch-page';
import { inferTrackFromHref } from '../lib/tracking';
import { cardInteractive, fineHover, koreanLineBreak } from '../lib/ui-classes';
import { AudienceTrustStrip } from './audience-trust-strip';
import { DispatchComparisonSection } from './dispatch-comparison-section';
import { DispatchProcessOnePager } from './dispatch-process-one-pager';
import { DispatchProposalForm } from './dispatch-proposal-form';
import { LandingAnchorNav } from './landing-anchor-nav';
import { LandingFaqList } from './landing-faq-list';
import { LandingFinalCta } from './landing-final-cta';
import { LandingFloatingCta } from './landing-floating-cta';
import { LandingSectionHeading } from './landing-section-heading';
import { LandingHero } from './landing-hero';
import { MediaPanel } from './visual';
import { KAKAO_CHANNEL_URL } from '../data/external-channels';

const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#245DFF]';

const premiumPanel =
  'overflow-hidden rounded-[1.5rem] border border-stone-200/70 bg-white shadow-[0_18px_50px_-36px_rgba(15,23,42,0.45)]';const dispatchHeroChecks = ['공간·인원 확인', '운영 목적 설계', '강사·교구 투입'] as const;
const dispatchAnchorItems = [
  { href: '#fit', label: '조건 판단' },
  { href: '#evidence', label: '운영 사례' },
  { href: '#comparison', label: '차별성' },
  { href: '#programs', label: '프로그램' },
  { href: '#process', label: '도입 절차' },
] as const;
function DispatchDecisionFitSection() {
  const section = dispatchPage.decisionFit;

  return (
    <div className={`${premiumPanel} space-y-5 px-5 py-5 sm:px-6 sm:py-6`}>
      <LandingSectionHeading eyebrow={section.eyebrow} title={section.title} lead={section.lead} accent="teal" />
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {section.items.map((item) => (
          <article
            key={item.label}
            className="flex h-full flex-col rounded-2xl border border-stone-200/80 bg-stone-50/80 p-4"
          >
            <p className="text-xs font-black uppercase tracking-[0.14em] text-teal-800">{item.label}</p>
            <h3 className={`mt-2 text-[15px] font-bold leading-snug text-slate-950 ${koreanLineBreak}`}>
              {item.condition}
            </h3>
            <p className={`mt-2 text-sm leading-relaxed text-slate-600 ${koreanLineBreak}`}>{item.response}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
function DispatchOperationSolutionsSection() {
  const section = dispatchPage.operationSolutions;
  const byId = Object.fromEntries(dispatchPage.programLineup.items.map((item) => [item.id, item]));

  return (
    <div className="space-y-4">
      <LandingSectionHeading eyebrow={section.eyebrow} title={section.title} lead={section.lead} accent="teal" />
      <div className="grid gap-3 lg:grid-cols-3">
        {section.groups.map((group) => (
          <article key={group.title} className={`${premiumPanel} p-4 sm:p-5`}>
            <h3 className={`text-base font-bold text-slate-950 ${koreanLineBreak}`}>{group.title}</h3>
            <p className={`mt-1.5 text-sm leading-relaxed text-slate-600 ${koreanLineBreak}`}>{group.description}</p>
            <ul className="mt-4 space-y-2.5">
              {group.itemIds.map((id) => {
                const item = byId[id];
                if (!item) return null;
                return (
                  <li key={id} className="rounded-xl border border-stone-200/80 bg-stone-50/80 p-3">
                    <p className="text-sm font-bold text-slate-950">{item.name}</p>
                    <p className={`mt-1 text-xs leading-relaxed text-slate-600 ${koreanLineBreak}`}>{item.subtitle}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {item.tags.slice(0, 2).map((tag) => (
                        <span key={tag} className="rounded-full border border-teal-100 bg-white px-2 py-0.5 text-[11px] font-semibold text-teal-800">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </li>
                );
              })}
            </ul>
          </article>
        ))}
      </div>
    </div>
  );
}

function DispatchEvidenceSection() {
  const section = dispatchPage.examples;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <LandingSectionHeading eyebrow={section.eyebrow} title={section.title} accent="teal" />
        <Link
          href={section.href}
          data-track={inferTrackFromHref(section.href)}
          data-track-label={section.trackLabel}
          className={`shrink-0 text-sm font-semibold text-teal-800 ${fineHover}hover:text-teal-900 ${focusRing}`}
        >
          사례 전체 →
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {section.items.map((item, index) => (
          <Link
            key={item.venue}
            href={item.href}
            data-track={inferTrackFromHref(item.href)}
            data-track-label={`dispatch-example-${item.venue}`}
            className={`group overflow-hidden ${premiumPanel} ${cardInteractive} ${focusRing}`}
          >
            <div className="relative aspect-[16/10]">
              <MediaPanel
                media={HOME_MEDIA[item.mediaKey]}
                className="absolute inset-0 h-full w-full rounded-none border-0"
                photoPriority={index === 0}
              />
            </div>
            <div className="p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-teal-800">{item.audience} · {item.operation}</p>
              <p className="mt-1 text-[11px] font-semibold text-stone-500">증명 · {item.proves}</p>
              <h3 className={`mt-1.5 text-base font-bold text-slate-950 ${koreanLineBreak}`}>{item.venue}</h3>
              <p className={`mt-2 text-sm leading-relaxed text-slate-600 ${koreanLineBreak}`}>{item.fitReason}</p>
              <p className={`mt-3 border-t border-stone-100 pt-3 text-sm font-semibold leading-relaxed text-slate-800 ${koreanLineBreak}`}>
                “{item.review}”
              </p>
              <p className="mt-3 text-sm font-semibold text-teal-800">
                {item.recordSlug ? '사례 상세 보기 →' : '관련 사례 목록 →'}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
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

export default function DispatchLanding() {
  return (
    <div className="flex w-full flex-col gap-8 pb-24 sm:gap-10 lg:gap-12">
      <div id="hero">
        <LandingHero
          kicker={dispatchPage.hero.kicker}
          kickerClassName="text-stone-500"
          leading={
            <div className="rounded-2xl border border-teal-100 bg-teal-50/60 p-4 sm:max-w-xl">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-800">기관 담당자</p>
              <ul className="mt-3 grid gap-2 sm:grid-cols-3" aria-label="기관 프로그램 제안 기준">
                {dispatchHeroChecks.map((item) => (
                  <li key={item} className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-700">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          }
          lines={dispatchPage.hero.lines}
          subtitle={dispatchPage.hero.subtitle}
          media={HOME_MEDIA[dispatchPage.hero.mediaKey]}
          visualVariant="editorial"
          priority
          primaryCta={dispatchPage.heroCtas.primary}
          secondaryCta={dispatchPage.heroCtas.secondary}
        />
      </div>

      <LandingAnchorNav
        items={dispatchAnchorItems}
        cta={{ href: '#contact', label: '기관 운영 상담' }}
        ariaLabel="기관 랜딩 바로가기"
      />

      <Section>
        <AudienceTrustStrip
          badge="연세대 체육교육학과 출신 운영진"
          eyebrow={dispatchPage.trustMetrics.eyebrow}
          items={dispatchPage.trustMetrics.items}
        />
      </Section>

      <Section id="fit" className="scroll-mt-36">
        <DispatchDecisionFitSection />
      </Section>

      <Section id="programs" className="scroll-mt-36">
        <DispatchOperationSolutionsSection />
      </Section>

      <Section id="comparison" className="scroll-mt-36">
        <DispatchComparisonSection />
      </Section>

      <Section id="evidence" className="scroll-mt-36">
        <DispatchEvidenceSection />
      </Section>
      <Section id="process" className="scroll-mt-36 space-y-4">
        <DispatchProcessOnePager />
      </Section>

      <Section id="faq" className="scroll-mt-36 space-y-4">
        <LandingSectionHeading eyebrow={dispatchPage.faq.eyebrow} title={dispatchPage.faq.title} accent="teal" />
        <LandingFaqList items={dispatchPage.faq.items} accent="teal" />
      </Section>

      <LandingFinalCta
        eyebrow="운영 상담"
        title={dispatchPage.finalCta.title}
        description={dispatchPage.finalCta.description}
        backgroundMedia={HOME_MEDIA[dispatchPage.finalCta.mediaKey]}
        links={[
          {
            label: dispatchPage.finalCta.primary.label,
            href: dispatchPage.finalCta.primary.href,
            trackLabel: dispatchPage.finalCta.primary.trackLabel,
          },
        ]}
      />

      <Section>
        <DispatchProposalForm />
      </Section>

      <LandingFloatingCta
        primaryHref="#contact"
        primaryLabel="기관 운영 상담"
        secondaryHref={KAKAO_CHANNEL_URL || undefined}
        secondaryLabel={KAKAO_CHANNEL_URL ? '카카오 상담' : undefined}
        showAfterId="hero"
      />
    </div>
  );
}

