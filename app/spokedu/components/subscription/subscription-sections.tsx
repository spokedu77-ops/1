'use client';

import Image from 'next/image';
import {
  ArrowRight,
  BookOpen,
  Check,
  ClipboardList,
  ListOrdered,
  MonitorPlay,
  Search,
  Shuffle,
  Timer,
  Trophy,
  Users,
  Wrench,
} from 'lucide-react';
import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { curriculumPage } from '../../data/curriculum-page';
import {
  curriculumModeList,
  type CurriculumCommercialMode,
} from '../../data/curriculum-commercial-modes';
import { getPublicProductContract } from '../../data/public-product-contract';
import { SPOKEDU_PATHS } from '../../data/public-routes';
import {
  marketingBandNavy,
  marketingBandSoft,
  marketingBandWhite,
  marketingBody,
  marketingButtonPrimary,
  marketingButtonPrimaryOnDark,
  marketingButtonSecondary,
  marketingButtonSecondaryOnDark,
  marketingCaption,
  marketingCardPadding,
  marketingCardStatic,
  marketingCompactDisplay,
  marketingEyebrow,
  marketingEyebrowOnDark,
  marketingHeroDisplay,
  marketingLightHeroSurface,
  marketingMediaFrame,
  marketingPanelEmphasized,
  marketingSectionDisplay,
  marketingSectionLead,
  marketingSectionPad,
  marketingSectionPadCompact,
  siteContainer,
} from '../../lib/ui-classes';
import { TrackedLink } from '../home/tracked-link';
import { ProductVisualFrame } from '../product-visual-frame';

const publicProduct = getPublicProductContract();
const page = curriculumPage.subscription;

const pillarIcons = [BookOpen, MonitorPlay, Wrench, ClipboardList] as const;
const toolIcons = {
  stopwatch: Timer,
  'return-timer': Timer,
  scoreboard: Trophy,
  picker: Shuffle,
  teams: Users,
  order: ListOrdered,
} as const;

type ModeHandler = (mode: CurriculumCommercialMode, hash?: string) => void;

function SectionHeading({
  eyebrow,
  title,
  lead,
  dark = false,
}: {
  eyebrow: string;
  title: string;
  lead: string;
  dark?: boolean;
}) {
  return (
    <div>
      <p className={dark ? marketingEyebrowOnDark : marketingEyebrow}>{eyebrow}</p>
      <h2 className={`${marketingSectionDisplay} mt-3 whitespace-pre-line ${dark ? 'text-white' : '[color:var(--spokedu-marketing-color-navy)]'}`}>
        {title}
      </h2>
      <p className={`${marketingSectionLead} mt-5 ${dark ? '!text-white/72' : ''}`}>{lead}</p>
    </div>
  );
}

export function SubscriptionHero({ reducedMotion }: { reducedMotion: boolean | null }) {
  const { hero } = page;
  const titleLines = hero.title.split('\n');
  return (
    <section
      id={hero.id}
      className={`${marketingLightHeroSurface} relative flex min-h-[min(52rem,calc(100svh-1rem))] scroll-mt-20 items-center overflow-hidden pb-20 pt-[calc(3.5rem+env(safe-area-inset-top,0px)+4rem)] sm:pb-24 sm:pt-[calc(3.75rem+env(safe-area-inset-top,0px)+5rem)] lg:pb-24 lg:pt-[calc(3.75rem+env(safe-area-inset-top,0px)+4.5rem)]`}
    >
      <div className="pointer-events-none absolute -right-32 top-20 hidden h-[34rem] w-[34rem] rounded-full border border-[#245DFF]/10 lg:block" aria-hidden />
      <div className="pointer-events-none absolute bottom-[-12rem] left-[42%] h-[24rem] w-[24rem] rounded-full bg-[#245DFF]/8 blur-3xl" aria-hidden />
      <div className={`${siteContainer} relative grid items-center gap-12 lg:grid-cols-[0.92fr_1.08fr] lg:gap-10 xl:gap-14`}>
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 14 }}
          animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <p className="inline-flex items-center gap-2 rounded-full border border-[#C9DAFF] bg-white/75 px-3 py-2 text-xs font-extrabold text-[#245DFF] shadow-[0_8px_24px_rgba(36,93,255,0.08)] backdrop-blur-sm">
            <span className="h-2 w-2 rounded-full bg-[#0CA678]" aria-hidden />{hero.eyebrow}
          </p>
          <h1 className={`${marketingHeroDisplay} mt-5 [color:var(--spokedu-marketing-color-navy)]`}>
            {titleLines.map((line, index) => <span key={line} className={`block ${index === titleLines.length - 1 ? 'text-[#245DFF]' : ''}`}>{line}</span>)}
          </h1>
          <p className={`${marketingSectionLead} mt-6 max-w-[39rem] lg:text-xl lg:leading-[1.75]`}>{hero.lead}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <TrackedLink
              href={publicProduct.handoff.freeStartHref}
              trackLabel="curriculum-hero-free-start"
              commercialRoute="curriculum"
              ctaIntentId="free_start"
              className={marketingButtonPrimary}
            >
              무료로 시작하기 <ArrowRight aria-hidden size={17} />
            </TrackedLink>
            <TrackedLink
              href={publicProduct.handoff.landingHref}
              trackLabel="curriculum-hero-product-view"
              commercialRoute="curriculum"
              ctaIntentId="master_handoff"
              className={marketingButtonSecondary}
            >
              제품 화면 보기
            </TrackedLink>
          </div>
          <ul className="mt-8 grid gap-3 sm:grid-cols-3" aria-label="구독시스템 주요 구성">
            {hero.signals.map((signal, index) => (
              <li key={signal.label} className="relative overflow-hidden rounded-2xl border border-[#DFE6F1] bg-white/80 px-4 pb-4 pt-5 shadow-[var(--spokedu-marketing-shadow-subtle)] backdrop-blur-sm">
                <span className={`absolute inset-x-0 top-0 h-1 ${index === 0 ? 'bg-gradient-to-r from-[#245DFF] to-[#0CA678]' : index === 1 ? 'bg-gradient-to-r from-[#6D5DFB] to-[#245DFF]' : 'bg-gradient-to-r from-[#0CA678] to-[#62C5A6]'}`} aria-hidden />
                <span className="text-[10px] font-extrabold tracking-[0.1em] text-[#728097]">{signal.label}</span>
                <strong className="mt-1 block text-sm text-[#0B1F46]">{signal.title}</strong>
                <span className="mt-1 block text-xs leading-5 text-[#6D7B90]">{signal.body}</span>
              </li>
            ))}
          </ul>
        </motion.div>
        <ProductVisualFrame {...hero.visual} priority emphasis="hero" className="lg:rotate-[0.7deg] motion-reduce:rotate-0" aspectClassName="aspect-[16/10]" />
      </div>
    </section>
  );
}

export function SubscriptionHowItWorks() {
  const { how } = page;
  const flow = curriculumPage.classFlow.steps;
  return (
    <section id={how.id} className={`${marketingBandSoft} ${marketingSectionPad} scroll-mt-20`}>
      <div className={siteContainer}>
        <SectionHeading {...how} />
        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {how.pillars.map((item, index) => {
            const Icon = pillarIcons[index];
            return (
              <li key={item.label} className={`${marketingCardStatic} ${marketingCardPadding} flex min-h-[15rem] flex-col border-[#D8E1EE]`}>
                <div className="flex items-center justify-between gap-4">
                  <span className="grid h-11 w-11 place-items-center rounded-[0.875rem] bg-[#EAF1FF]"><Icon aria-hidden size={21} className="[color:var(--spokedu-marketing-color-blue)]" /></span>
                  <span className={marketingCaption}>{item.number} · {item.label}</span>
                </div>
                <h3 className="mt-8 text-xl font-extrabold [color:var(--spokedu-marketing-color-navy)]">{item.title}</h3>
                <p className={`${marketingCaption} mt-3 leading-6`}>{item.body}</p>
                <span className="mt-auto pt-6 text-xs font-bold text-[#245DFF]">{String(index + 1).padStart(2, '0')}</span>
              </li>
            );
          })}
        </ul>
        <ol className="mt-10 grid overflow-hidden rounded-[1.75rem] border border-[#D8E1EE] bg-white shadow-[var(--spokedu-marketing-shadow-subtle)] sm:grid-cols-2 lg:grid-cols-5" aria-label="수업 운영 5단계">
          {flow.map((step, index) => (
            <li key={step.title} className="relative min-h-[9rem] border-b border-[#E3E9F2] px-5 py-5 last:border-b-0 sm:[&:nth-child(odd)]:border-r lg:border-b-0 lg:border-r lg:last:border-r-0 lg:[&:nth-child(odd)]:border-r">
              <span className={marketingCaption}>{String(index + 1).padStart(2, '0')} · {step.phase}</span>
              <h3 className="mt-3 font-extrabold [color:var(--spokedu-marketing-color-navy)]">{step.title}</h3>
              <p className="mt-2 text-xs leading-5 text-[#728097]">{step.body}</p>
              {index < flow.length - 1 ? <ArrowRight aria-hidden className="absolute -right-2.5 top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-white p-0.5 [color:var(--spokedu-marketing-color-blue)] lg:block" size={20} /> : null}
            </li>
          ))}
        </ol>
        <div className={`${marketingPanelEmphasized} mt-10 grid gap-px bg-[var(--spokedu-marketing-color-border)] md:grid-cols-2`}>
          <div className="bg-white p-6 sm:p-8">
            <p className={marketingEyebrow}>기존 준비</p>
            <ul className="mt-5 space-y-3">
              {how.comparison.map((row) => <li key={row.before} className={marketingBody}>— {row.before}</li>)}
            </ul>
          </div>
          <div className="bg-[var(--spokedu-marketing-color-soft)] p-6 sm:p-8">
            <p className={marketingEyebrow}>구독시스템</p>
            <ul className="mt-5 space-y-3">
              {how.comparison.map((row) => <li key={row.after} className={`${marketingBody} flex gap-3`}><Check aria-hidden size={18} className="mt-1 shrink-0 [color:var(--spokedu-marketing-color-blue)]" />{row.after}</li>)}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

export function SubscriptionLibrary() {
  const { library } = page;
  return (
    <section id={library.id} className={`${marketingBandWhite} ${marketingSectionPad} scroll-mt-20`}>
      <div className={siteContainer}>
        <SectionHeading {...library} />
        <div className="mt-12 rounded-[2rem] border border-[#DFE6F1] bg-[linear-gradient(135deg,#F5F8FF_0%,#FFFFFF_58%,#EDF3FF_100%)] p-5 shadow-[var(--spokedu-marketing-shadow-media)] sm:p-8 lg:grid lg:grid-cols-[1.18fr_0.82fr] lg:items-center lg:gap-10 lg:p-10">
          <ProductVisualFrame {...library.visuals[0]} emphasis="feature" />
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:mt-0 lg:grid-cols-1">
            <InfoList title="수업을 찾을 때" items={library.find} icon={<Search aria-hidden size={19} />} />
            <InfoList title="현장에서 진행할 때" items={library.run} icon={<BookOpen aria-hidden size={19} />} />
          </div>
        </div>
        <div className="mt-10 grid items-center gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <article className={`${marketingCardStatic} ${marketingCardPadding}`}>
            <p className={marketingEyebrow}>대표 수업 예시</p>
            <h3 className={`${marketingCompactDisplay} mt-3 [color:var(--spokedu-marketing-color-navy)]`}>{library.example.title}</h3>
            <dl className="mt-6 space-y-4">
              <div><dt className="text-sm font-bold [color:var(--spokedu-marketing-color-navy)]">핵심 준비</dt><dd className={`${marketingCaption} mt-1`}>{library.example.preparation}</dd></div>
              <div><dt className="text-sm font-bold [color:var(--spokedu-marketing-color-navy)]">핵심 진행</dt><dd className={`${marketingCaption} mt-1`}>{library.example.progress}</dd></div>
            </dl>
            <p className={`${marketingBody} mt-6 border-t border-[var(--spokedu-marketing-color-border)] pt-5`}>{library.example.proof}</p>
          </article>
          <ProductVisualFrame {...library.visuals[1]} emphasis="feature" />
        </div>
      </div>
    </section>
  );
}

function InfoList({ title, items, icon }: { title: string; items: readonly string[]; icon: ReactNode }) {
  return (
    <div className={`${marketingCardStatic} ${marketingCardPadding}`}>
      <div className="flex items-center gap-2 [color:var(--spokedu-marketing-color-blue)]">{icon}<h3 className="font-bold [color:var(--spokedu-marketing-color-navy)]">{title}</h3></div>
      <ul className="mt-5 flex flex-wrap gap-2">
        {items.map((item) => <li key={item} className="rounded-full bg-[var(--spokedu-marketing-color-soft)] px-3 py-2 text-sm font-semibold [color:var(--spokedu-marketing-color-body)]">{item}</li>)}
      </ul>
    </div>
  );
}

export function SubscriptionSpomove() {
  const { spomove } = page;
  return (
    <section id={spomove.id} className={`${marketingBandNavy} ${marketingSectionPad} relative scroll-mt-20 overflow-hidden`}>
      <div className={siteContainer}>
        <div className="grid items-center gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          <div>
            <SectionHeading {...spomove} dark />
            <p className="mt-7 text-base leading-7 text-white/72">{spomove.relation}</p>
            <p className="mt-3 text-base leading-7 text-white/72">{spomove.spomat}</p>
            <p className="mt-8 text-[clamp(1.75rem,4vw,3.25rem)] font-black leading-none tracking-[-0.045em] text-white">CHECK <span className="text-[#7FA6FF]">→</span> DECIDE <span className="text-[#7FA6FF]">→</span> MOVE</p>
            <ul className="mt-7 flex flex-wrap gap-2" aria-label="SPOMOVE 시리즈">
              {spomove.series.map((series) => <li key={series} className="rounded-full border border-white/18 bg-white/8 px-3 py-2 text-sm font-semibold text-white/88">{series}</li>)}
            </ul>
            <TrackedLink href={SPOKEDU_PATHS.spomove} trackLabel="curriculum-spomove-learn" commercialRoute="curriculum" ctaIntentId="spomove_subscription" className={`${marketingButtonSecondaryOnDark} mt-8`}>
              SPOMOVE 자세히 보기 <ArrowRight aria-hidden size={17} />
            </TrackedLink>
          </div>
          <div className="grid gap-4 sm:grid-cols-[1.25fr_0.75fr]">
            <figure className="overflow-hidden rounded-[1.75rem] border border-white/15 bg-white/8 shadow-[0_24px_64px_rgba(3,12,30,0.3)] sm:row-span-2">
              <div className="relative min-h-[22rem] h-full"><Image src="/spokedu/programs/spomove/assets/edu/edu-01.webp" alt="SPOMOVE 화면과 4색 패드를 보며 움직이는 실제 수업" fill sizes="(min-width: 1024px) 38vw, 92vw" className="object-cover" /></div>
              <figcaption className="px-4 py-3 text-sm text-white/70">화면 신호와 실제 움직임이 연결되는 수업</figcaption>
            </figure>
            <figure className="overflow-hidden rounded-[1.375rem] border border-white/15 bg-white p-4 shadow-[0_16px_38px_rgba(3,12,30,0.24)]">
              <div className="relative aspect-square"><Image src="/images/spokedu/brand/spomat.png" alt="빨강, 노랑, 초록, 파랑 네 영역으로 구성된 SPOMAT" fill sizes="(min-width: 640px) 24vw, 70vw" className="object-contain" /></div>
            </figure>
            <figure className="overflow-hidden rounded-[1.375rem] border border-white/15 bg-white/8 shadow-[0_16px_38px_rgba(3,12,30,0.24)]">
              <div className="relative aspect-square"><Image src="/spokedu/programs/spomove/assets/edu/edu-10.webp" alt="색 타겟을 찾아 반응하는 SPOMOVE 실제 화면" fill sizes="(min-width: 640px) 24vw, 70vw" className="object-cover" /></div>
            </figure>
          </div>
        </div>
      </div>
    </section>
  );
}

export function SubscriptionTools() {
  const { tools } = page;
  return (
    <section id={tools.id} className={`${marketingBandWhite} ${marketingSectionPad} scroll-mt-20`}>
      <div className={siteContainer}>
        <SectionHeading {...tools} />
        <div className="mt-12">
          <ProductVisualFrame {...tools.visual} emphasis="feature" aspectClassName="aspect-[16/7]" />
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tools.items.map((tool) => {
              const Icon = toolIcons[tool.id];
              return <li key={tool.id} className={`${marketingCardStatic} flex min-h-[10.5rem] flex-col p-5 sm:p-6`}><span className="grid h-10 w-10 place-items-center rounded-[0.875rem] bg-[#EAF1FF]"><Icon aria-hidden size={20} className="[color:var(--spokedu-marketing-color-blue)]" /></span><h3 className="mt-5 font-extrabold [color:var(--spokedu-marketing-color-navy)]">{tool.title}</h3><p className={`${marketingCaption} mt-2 leading-6`}>{tool.body}</p></li>;
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}

export function SubscriptionRecords() {
  const { records } = page;
  return (
    <section id={records.id} className={`${marketingBandSoft} ${marketingSectionPad} scroll-mt-20`}>
      <div className={siteContainer}>
        <SectionHeading {...records} />
        <ol className="mt-10 grid overflow-hidden rounded-[1.375rem] border border-[#D8E1EE] bg-white shadow-[var(--spokedu-marketing-shadow-subtle)] sm:grid-cols-2 lg:grid-cols-4">
          {records.steps.map((step, index) => <li key={step} className="border-b border-[#E3E9F2] p-5 last:border-b-0 sm:[&:nth-child(odd)]:border-r lg:border-b-0 lg:border-r lg:last:border-r-0"><span className={marketingCaption}>{String(index + 1).padStart(2, '0')}</span><h3 className="mt-3 font-extrabold [color:var(--spokedu-marketing-color-navy)]">{step}</h3></li>)}
        </ol>
        <div className="mt-8 grid items-start gap-6 lg:grid-cols-2">
          {records.visuals.map((visual) => <ProductVisualFrame key={visual.src} {...visual} emphasis="compact" aspectClassName="aspect-[16/9]" />)}
        </div>
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {records.types.map((type) => <div key={type.eyebrow} className={`${marketingCardStatic} ${marketingCardPadding}`}><p className={marketingEyebrow}>{type.eyebrow}</p><h3 className={`${marketingCompactDisplay} mt-3 [color:var(--spokedu-marketing-color-navy)]`}>{type.title}</h3><p className={`${marketingBody} mt-4`}>{type.body}</p></div>)}
        </div>
        <ul className="mt-8 grid gap-3 sm:grid-cols-3">
          {records.results.map((result) => <li key={result} className="flex items-center gap-3 rounded-[var(--spokedu-marketing-radius-small)] bg-[var(--spokedu-marketing-color-navy)] px-5 py-4 text-sm font-semibold text-white"><Check aria-hidden size={17} className="[color:var(--spokedu-marketing-color-dark-eyebrow)]" />{result}</li>)}
        </ul>
      </div>
    </section>
  );
}

export function SubscriptionTrust() {
  const { trust } = page;
  return (
    <section id={trust.id} className={`${marketingBandWhite} ${marketingSectionPadCompact} scroll-mt-20`}>
      <div className={`${siteContainer} grid items-stretch gap-8 lg:grid-cols-2 lg:gap-10`}>
        <figure className={`${marketingMediaFrame} relative min-h-[22rem]`}><Image src="/images/spokedu/curriculum/curriculum-instructor-training.jpg" alt="스포키듀 지도자 교육이 진행되는 실제 현장" fill sizes="(min-width: 1024px) 48vw, 92vw" className="object-cover" /></figure>
        <div className="flex flex-col justify-center rounded-[2rem] border border-[#DFE6F1] bg-[#F5F8FF] p-6 shadow-[var(--spokedu-marketing-shadow-subtle)] sm:p-9"><SectionHeading {...trust} /><ul className="mt-7 space-y-3">{trust.details.map((detail) => <li key={detail} className={`${marketingBody} flex gap-3`}><Check aria-hidden size={18} className="mt-1 shrink-0 [color:var(--spokedu-marketing-color-blue)]" />{detail}</li>)}</ul><TrackedLink href={SPOKEDU_PATHS.about} trackLabel="curriculum-trust-about" commercialRoute="curriculum" ctaIntentId="about" className={`${marketingButtonSecondary} mt-8`}>스포키듀 소개 보기</TrackedLink></div>
      </div>
    </section>
  );
}

export function SubscriptionPlans({
  mode,
  onModeChange,
  inquiry,
}: {
  mode: CurriculumCommercialMode;
  onModeChange: ModeHandler;
  inquiry?: ReactNode;
}) {
  const { plans } = page;
  return (
    <section id={plans.id} className={`${marketingBandSoft} scroll-mt-20`}>
      <div className={`${siteContainer} ${marketingSectionPad}`}>
        <SectionHeading {...plans} />
        <ul className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {publicProduct.plans.map((plan) => {
            const isPremium = plan.code === 'premium';
            const href = plan.code === 'free' ? publicProduct.handoff.freeStartHref : publicProduct.handoff.paymentPlanHref(plan.code);
            return (
              <li key={plan.code} data-plan-code={plan.code} data-purchasable={String(plan.purchasable)} className={`${marketingCardStatic} ${marketingCardPadding} flex min-h-[31rem] flex-col ${isPremium ? 'border-2 border-[var(--spokedu-marketing-color-blue)] shadow-[var(--spokedu-marketing-shadow-interactive)]' : ''}`}>
                <div className="flex items-center justify-between gap-3"><p className={marketingEyebrow}>{plan.billingCycleLabel}</p>{isPremium ? <span className="rounded-full bg-[var(--spokedu-marketing-color-soft)] px-3 py-1 text-xs font-bold [color:var(--spokedu-marketing-color-blue)]">SPOMOVE</span> : null}</div>
                <h3 className={`${marketingCompactDisplay} mt-4 [color:var(--spokedu-marketing-color-navy)]`}>{plan.displayName}</h3>
                <p className="mt-3 min-h-7 text-lg font-bold [color:var(--spokedu-marketing-color-navy)]">{plan.priceLabel ?? plan.billingCycleLabel}</p>
                <ul className="mt-6 flex-1 space-y-3">{plan.featureSummary.map((feature) => <li key={feature} className={`${marketingBody} flex gap-2`}><Check aria-hidden size={17} className="mt-1 shrink-0 [color:var(--spokedu-marketing-color-blue)]" />{feature}</li>)}</ul>
                <TrackedLink href={href} trackLabel={`curriculum-plan-${plan.code}`} commercialRoute="curriculum" ctaIntentId={plan.code === 'free' ? 'free_start' : 'master_handoff'} className={`${isPremium ? marketingButtonPrimary : marketingButtonSecondary} mt-7 w-full`}>
                  {plan.code === 'free' ? '무료로 시작하기' : `${plan.displayName} 시작하기`}
                </TrackedLink>
              </li>
            );
          })}
        </ul>
        <p className={`${marketingCaption} mt-5`}>{publicProduct.freeScopeNote}</p>
        <div className={`${marketingCardStatic} mt-8 border-[#C9D8EE] p-6 shadow-[var(--spokedu-marketing-shadow-interactive)] sm:flex sm:items-center sm:justify-between sm:gap-8 sm:p-8`} data-center-inquiry="true">
          <div><p className={marketingEyebrow}>{publicProduct.centerInquiry.billingCycleLabel}</p><h3 className="mt-2 text-xl font-bold [color:var(--spokedu-marketing-color-navy)]">{publicProduct.centerInquiry.displayName}</h3><p className={`${marketingBody} mt-2`}>{publicProduct.centerInquiry.summary.join(' · ')}</p></div>
          <button type="button" onClick={() => onModeChange('master', 'inquiry')} className={`${marketingButtonSecondary} mt-5 shrink-0 sm:mt-0`} data-track-label="curriculum-center-inquiry">{publicProduct.centerInquiry.ctaLabel}</button>
        </div>
        <div className="mt-6 rounded-[var(--spokedu-marketing-radius-small)] border border-[var(--spokedu-marketing-color-border)] bg-white/70 px-5 py-4"><p className="text-sm font-bold [color:var(--spokedu-marketing-color-navy)]">이용 환경</p><ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2">{plans.environment.map((item) => <li key={item} className={`${marketingCaption} flex items-center gap-2`}><Check aria-hidden size={15} className="[color:var(--spokedu-marketing-color-blue)]" />{item}</li>)}</ul></div>

        <div className="mt-14 border-t border-[var(--spokedu-marketing-color-border)] pt-10">
          <p className={marketingEyebrow}>교육·라이선스 별도 문의</p>
          <div className="mt-5 flex flex-wrap gap-2" id="modes">
            {curriculumModeList.map((item) => <button key={item.id} type="button" onClick={() => onModeChange(item.id)} aria-pressed={item.id === mode} className={`min-h-11 rounded-full border px-4 py-2 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--spokedu-marketing-color-blue)] ${item.id === mode ? 'border-[var(--spokedu-marketing-color-blue)] bg-[var(--spokedu-marketing-color-soft)] [color:var(--spokedu-marketing-color-blue)]' : 'border-[var(--spokedu-marketing-color-border)] bg-white [color:var(--spokedu-marketing-color-navy)]'}`}>{item.title}</button>)}
          </div>
          {inquiry}
        </div>

        <div className="mt-16 grid gap-10 lg:grid-cols-[0.72fr_1.28fr]">
          <div><p className={marketingEyebrow}>FAQ</p><h2 className={`${marketingSectionDisplay} mt-3 [color:var(--spokedu-marketing-color-navy)]`}>자주 묻는 질문</h2></div>
          <div className="divide-y divide-[var(--spokedu-marketing-color-border)] border-y border-[var(--spokedu-marketing-color-border)]">{plans.faq.map((item) => <details key={item.q} className="group"><summary className="flex min-h-16 list-none items-center justify-between gap-5 py-4 font-bold [color:var(--spokedu-marketing-color-navy)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--spokedu-marketing-color-blue)]">{item.q}<span aria-hidden className="text-xl font-normal [color:var(--spokedu-marketing-color-blue)] group-open:rotate-45">+</span></summary><p className={`${marketingBody} pb-5 pr-8`}>{item.a}</p></details>)}</div>
        </div>
      </div>
      <div className={`${marketingBandNavy} ${marketingSectionPadCompact} relative overflow-hidden`}>
        <div className={`${siteContainer} flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center`}>
          <div><p className={marketingEyebrowOnDark}>{plans.finalCta.eyebrow}</p><h2 className={`${marketingSectionDisplay} mt-3 max-w-3xl whitespace-pre-line text-white`}>{plans.finalCta.title}</h2></div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row"><TrackedLink href={publicProduct.handoff.freeStartHref} trackLabel="curriculum-final-free-start" commercialRoute="curriculum" ctaIntentId="free_start" className={marketingButtonPrimaryOnDark}>무료로 시작하기</TrackedLink><TrackedLink href={publicProduct.handoff.landingHref} trackLabel="curriculum-final-landing" commercialRoute="curriculum" ctaIntentId="master_handoff" className={marketingButtonSecondaryOnDark}>제품 화면 보기</TrackedLink></div>
        </div>
      </div>
    </section>
  );
}
