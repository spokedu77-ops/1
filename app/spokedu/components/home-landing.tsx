'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { HOME_MEDIA } from '../data/home-media';
import { homePage, type HomeProgramItem } from '../data/home-page';
import type { HomeFieldRecordCardWithThumbnail } from '../lib/resolve-field-records';
import { externalLinkProps, isExternalHref } from '../lib/external-link';
import { inferTrackFromHref } from '../lib/tracking';
import { koreanLineBreak, homePhotoGrade } from '../lib/ui-classes';
import { ExternalPhoto } from './external-photo';
import { MediaPanel } from './visual';

const NAVY = '#0B1220';
const ATHLETIC_BLUE = '#1D4ED8';

const container = 'mx-auto w-full max-w-[1400px] px-5 sm:px-8 lg:px-12';
const sectionPadStrong = 'py-20 sm:py-24 lg:py-28';
const sectionPadMedium = 'py-12 sm:py-16 lg:py-20';

const heroH1 = `font-bold leading-[1.12] tracking-tight ${koreanLineBreak} text-[2.5rem] min-[390px]:text-[3rem] sm:text-[3.375rem] md:text-[4rem] lg:text-[4.5rem] xl:text-[5.25rem]`;
const sectionH2 = `font-bold tracking-tight text-[#0B1220] ${koreanLineBreak} text-[1.75rem] sm:text-[2.625rem] lg:text-[3rem] leading-[1.15]`;
const sectionLead = `mt-3 max-w-2xl text-[15px] leading-relaxed text-slate-600 sm:text-[17px] lg:text-lg ${koreanLineBreak}`;

type SpokeduHomeLandingProps = {
  proofCards: HomeFieldRecordCardWithThumbnail[];
};

export default function SpokeduHomeLanding({ proofCards }: SpokeduHomeLandingProps) {
  const reducedMotion = useReducedMotion();
  const caseCards = mergeCaseCards(proofCards);

  return (
    <div className="w-full overflow-x-clip bg-white text-[#0B1220]">
      <a
        href="#expertise"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-20 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-[#0B1220] focus:shadow-lg focus:outline focus:outline-2 focus:outline-blue-600"
      >
        본문으로 건너뛰기
      </a>

      <HeroSection reducedMotion={reducedMotion} />
      <ExpertiseSection reducedMotion={reducedMotion} />
      <BusinessPathsSection reducedMotion={reducedMotion} />
      <SpomoveSection reducedMotion={reducedMotion} />
      <ProgramsSection reducedMotion={reducedMotion} />
      <CasesSection caseCards={caseCards} reducedMotion={reducedMotion} />
      <EducationSystemSection reducedMotion={reducedMotion} />
      <FinalCtaSection reducedMotion={reducedMotion} />
    </div>
  );
}

function mergeCaseCards(
  resolved: HomeFieldRecordCardWithThumbnail[],
): HomeFieldRecordCardWithThumbnail[] {
  const bySlug = new Map(resolved.map((card) => [card.slug, card]));
  return homePage.cases.cards.map((item) => {
    const resolvedCard = bySlug.get(item.slug);
    if (resolvedCard) return resolvedCard;
    return item as HomeFieldRecordCardWithThumbnail;
  });
}

function FadeIn({
  children,
  className = '',
  reducedMotion,
}: {
  children: ReactNode;
  className?: string;
  reducedMotion: boolean | null;
}) {
  if (reducedMotion) {
    return <div className={className}>{children}</div>;
  }
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

function HeroSection({ reducedMotion }: { reducedMotion: boolean | null }) {
  const media = HOME_MEDIA[homePage.hero.mediaKey];

  return (
    <section id={homePage.hero.id} className="relative w-full">
      {/* Mobile: text → CTA → image */}
      <div className="flex flex-col lg:hidden">
        <div className="px-5 pb-8 pt-24 sm:px-8" style={{ backgroundColor: NAVY }}>
          <HeroCopy variant="mobile" />
        </div>
        <div className="relative aspect-[4/3] w-full sm:aspect-[16/10]">
          <MediaPanel
            media={media}
            className={`absolute inset-0 h-full w-full rounded-none border-0 ${homePhotoGrade}`}
            sizes="heroEditorialMain"
            photoPriority
            priority
          />
        </div>
      </div>

      {/* Desktop: full-bleed image + overlay text */}
      <div className="relative hidden h-[min(820px,calc(100vh-4rem))] min-h-[760px] max-h-[900px] w-full lg:block">
        <MediaPanel
          media={media}
          className={`absolute inset-0 h-full w-full rounded-none border-0 object-[50%_38%] ${homePhotoGrade}`}
          sizes="heroEditorialMain"
          photoPriority
          priority
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(90deg, rgba(11,18,32,0.88) 0%, rgba(11,18,32,0.72) 34%, rgba(11,18,32,0.28) 58%, rgba(11,18,32,0.08) 100%)',
          }}
          aria-hidden
        />
        <div className={`${container} relative z-10 flex h-full items-center pt-24 pb-12`}>
          <FadeIn reducedMotion={reducedMotion} className="max-w-xl lg:max-w-2xl">
            <HeroCopy variant="desktop" />
          </FadeIn>
        </div>
      </div>
    </section>
  );
}

function HeroCopy({ variant }: { variant: 'mobile' | 'desktop' }) {
  const onDark = variant === 'desktop' || variant === 'mobile';
  const titleClass = `${heroH1} ${onDark ? 'text-white' : 'text-[#0B1220]'}`;
  const supportClass = `mt-5 max-w-xl text-[15px] leading-relaxed sm:text-base sm:leading-7 lg:text-[17px] ${onDark ? 'text-white/85' : 'text-slate-600'} ${koreanLineBreak}`;

  return (
    <div>
      <h1 className={titleClass}>
        {homePage.hero.lines.map((line) => (
          <span key={line} className="block">
            {line}
          </span>
        ))}
      </h1>
      <p className={supportClass}>{homePage.hero.support}</p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <TrackedLink
          href={homePage.hero.primaryCta.href}
          trackLabel={homePage.hero.primaryCta.trackLabel}
          className="inline-flex min-h-11 items-center justify-center rounded-md px-6 py-3 text-sm font-semibold text-white transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          style={{ backgroundColor: ATHLETIC_BLUE }}
        >
          {homePage.hero.primaryCta.label}
        </TrackedLink>
        <TrackedLink
          href={homePage.hero.secondaryCta.href}
          trackLabel={homePage.hero.secondaryCta.trackLabel}
          className={`inline-flex min-h-11 items-center justify-center rounded-md border px-6 py-3 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
            onDark
              ? 'border-white/50 text-white hover:bg-white/10 focus-visible:outline-white'
              : 'border-slate-300 text-[#0B1220] hover:border-slate-500 focus-visible:outline-blue-600'
          }`}
        >
          {homePage.hero.secondaryCta.label}
        </TrackedLink>
      </div>
      <TrackedLink
        href={homePage.hero.spomoveLink.href}
        trackLabel={homePage.hero.spomoveLink.trackLabel}
        className={`mt-4 inline-flex min-h-11 items-center text-sm font-semibold underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
          onDark ? 'text-white/80 focus-visible:outline-white' : 'text-[#1D4ED8] focus-visible:outline-[#1D4ED8]'
        }`}
      >
        {homePage.hero.spomoveLink.label} →
      </TrackedLink>
    </div>
  );
}

function ExpertiseSection({ reducedMotion }: { reducedMotion: boolean | null }) {
  const media = HOME_MEDIA[homePage.expertise.mediaKey];

  return (
    <section id={homePage.expertise.id} className={`${sectionPadMedium} bg-white`}>
      <div className={`${container} grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-14`}>
        <FadeIn reducedMotion={reducedMotion}>
          <h2 className={`whitespace-pre-line ${sectionH2}`}>{homePage.expertise.headline}</h2>
          <ul className={`mt-7 space-y-2.5 ${koreanLineBreak}`}>
            {homePage.expertise.proofs.map((proof) => (
              <li key={proof} className="flex gap-3 text-[15px] leading-relaxed text-slate-700 sm:text-base">
                <span className="mt-2.5 h-px w-5 shrink-0 bg-[#1D4ED8]" aria-hidden />
                {proof}
              </li>
            ))}
          </ul>
        </FadeIn>
        <FadeIn reducedMotion={reducedMotion} className="relative aspect-[4/3] w-full overflow-hidden lg:aspect-[5/4]">
          <MediaPanel
            media={media}
            className={`absolute inset-0 h-full w-full border-0 ${homePhotoGrade}`}
            sizes="heroEditorialMain"
          />
        </FadeIn>
      </div>
    </section>
  );
}

function BusinessPathsSection({ reducedMotion }: { reducedMotion: boolean | null }) {
  const [dispatch, privatePath, curriculum] = homePage.businessPaths.items;
  const dispatchMedia = HOME_MEDIA[dispatch.mediaKey];
  const privateMedia = HOME_MEDIA[privatePath.mediaKey];
  const curriculumMedia = HOME_MEDIA[curriculum.mediaKey];

  return (
    <section id={homePage.businessPaths.id} className={`${sectionPadStrong} bg-slate-50`}>
      <div className={container}>
        <FadeIn reducedMotion={reducedMotion}>
          <h2 className={sectionH2}>세 가지 사업 경로</h2>
          <p className={sectionLead}>
            현장 수업에서 시작해 프로그램과 강사교육까지 이어지는 세 가지 운영 방식입니다.
          </p>
        </FadeIn>

        <div className="mt-10 grid gap-6 lg:grid-cols-12 lg:gap-5">
          {/* 기관 — 가장 큰 비중 */}
          <FadeIn reducedMotion={reducedMotion} className="lg:col-span-7">
            <PathBlock
              path={dispatch}
              media={dispatchMedia}
              size="large"
              priority
            />
          </FadeIn>

          <div className="flex flex-col gap-6 lg:col-span-5">
            <FadeIn reducedMotion={reducedMotion}>
              <PathBlock path={privatePath} media={privateMedia} size="compact" />
            </FadeIn>
            <FadeIn reducedMotion={reducedMotion}>
              <PathBlock path={curriculum} media={curriculumMedia} size="compact" />
            </FadeIn>
          </div>
        </div>
      </div>
    </section>
  );
}

function PathBlock({
  path,
  media,
  size,
  priority,
}: {
  path: (typeof homePage.businessPaths.items)[number];
  media: (typeof HOME_MEDIA)[keyof typeof HOME_MEDIA];
  size: 'large' | 'compact';
  priority?: boolean;
}) {
  const imageHeight = size === 'large' ? 'min-h-[240px] sm:min-h-[320px] lg:min-h-[380px]' : 'min-h-[160px] sm:min-h-[180px]';

  return (
    <Link
      href={path.href}
      data-track={inferTrackFromHref(path.href)}
      data-track-label={path.trackLabel}
      className="group flex h-full flex-col bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1D4ED8]"
    >
      <div className={`relative overflow-hidden ${imageHeight}`}>
        <MediaPanel
          media={media}
          className={`absolute inset-0 h-full w-full border-0 transition duration-500 [@media(hover:hover)_and_(pointer:fine)]:group-hover:scale-[1.02] ${homePhotoGrade}`}
          sizes={size === 'large' ? 'heroEditorialMain' : 'gateCard'}
          photoPriority={priority}
          priority={priority}
        />
      </div>
      <div className={`bg-white px-5 py-5 sm:px-6 ${size === 'large' ? 'lg:px-7 lg:py-6' : ''}`}>
        <h3 className={`text-lg font-bold text-[#0B1220] sm:text-xl ${koreanLineBreak}`}>{path.title}</h3>
        <p className={`mt-2 text-sm leading-relaxed text-slate-600 sm:text-[15px] ${koreanLineBreak}`}>{path.lead}</p>
        <ul className={`mt-3 space-y-1 text-sm text-slate-700 ${koreanLineBreak}`}>
          {path.bullets.map((bullet) => (
            <li key={bullet}>· {bullet}</li>
          ))}
        </ul>
        <span className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-[#1D4ED8] transition [@media(hover:hover)_and_(pointer:fine)]:group-hover:underline">
          {path.cta} →
        </span>
      </div>
    </Link>
  );
}

function SpomoveSection({ reducedMotion }: { reducedMotion: boolean | null }) {
  const media = HOME_MEDIA[homePage.spomove.mediaKey];
  const padColors = ['bg-red-500', 'bg-yellow-400', 'bg-green-500', 'bg-blue-600'];

  return (
    <section id={homePage.spomove.id} className={`${sectionPadStrong} bg-[#0B1220] text-white`}>
      <div className={`${container} grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16`}>
        <FadeIn reducedMotion={reducedMotion}>
          <h2 className={`${sectionH2} text-white`}>{homePage.spomove.title}</h2>
          <p className={`mt-4 text-[15px] leading-relaxed text-white/80 sm:text-[17px] lg:text-lg ${koreanLineBreak}`}>
            {homePage.spomove.lead}
          </p>

          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
            {homePage.spomove.flow.map((step, index) => (
              <div key={step} className="min-w-0">
                <div className={`aspect-square ${padColors[index]}`} aria-hidden />
                <p className="mt-2 text-sm font-semibold text-white">{step}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-white/60">{homePage.spomove.flowPlain[index]}</p>
              </div>
            ))}
          </div>

          <ul className={`mt-6 space-y-1.5 text-sm text-white/70 sm:text-[15px] ${koreanLineBreak}`}>
            {homePage.spomove.points.map((point) => (
              <li key={point}>· {point}</li>
            ))}
          </ul>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <TrackedLink
              href={homePage.spomove.primaryCta.href}
              trackLabel={homePage.spomove.primaryCta.trackLabel}
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-cyan-500 px-6 py-3 text-sm font-semibold text-[#0B1220] transition hover:bg-cyan-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
            >
              {homePage.spomove.primaryCta.label}
            </TrackedLink>
            <TrackedLink
              href={homePage.spomove.secondaryCta.href}
              trackLabel={homePage.spomove.secondaryCta.trackLabel}
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-white/40 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              {homePage.spomove.secondaryCta.label}
            </TrackedLink>
          </div>
        </FadeIn>

        <FadeIn reducedMotion={reducedMotion} className="relative aspect-[4/3] overflow-hidden">
          <MediaPanel
            media={media}
            className={`absolute inset-0 h-full w-full border-0 ${homePhotoGrade}`}
            sizes="heroEditorialMain"
          />
        </FadeIn>
      </div>
    </section>
  );
}

function ProgramsSection({ reducedMotion }: { reducedMotion: boolean | null }) {
  const { featured, list } = homePage.programs;
  const featuredMedia = HOME_MEDIA[featured.mediaKey];
  const educationPrograms = list.filter((p) => p.category === 'education');
  const operationPrograms = list.filter((p) => p.category === 'operation');

  return (
    <section id={homePage.programs.id} className={`${sectionPadMedium} bg-white`}>
      <div className={container}>
        <FadeIn reducedMotion={reducedMotion}>
          <h2 className={sectionH2}>{homePage.programs.title}</h2>
          <p className={sectionLead}>{homePage.programs.lead}</p>
        </FadeIn>

        <FadeIn reducedMotion={reducedMotion} className="mt-8">
          <ProgramFeaturedBlock program={featured} media={featuredMedia} />
        </FadeIn>

        {educationPrograms.length > 0 ? (
          <div className="mt-10">
            <p className="text-sm font-semibold text-slate-500">교육 프로그램</p>
            <div className="mt-3">
              {educationPrograms.map((program) => (
                <FadeIn key={program.id} reducedMotion={reducedMotion}>
                  <ProgramListRow program={program} />
                </FadeIn>
              ))}
            </div>
          </div>
        ) : null}

        {operationPrograms.length > 0 ? (
          <div className="mt-10">
            <p className="text-sm font-semibold text-slate-500">운영 형태</p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              {operationPrograms.map((program, index) => (
                <FadeIn key={program.id} reducedMotion={reducedMotion}>
                  <ProgramTile program={program} priority={index === 0} />
                </FadeIn>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function ProgramFeaturedBlock({
  program,
  media,
}: {
  program: HomeProgramItem;
  media: (typeof HOME_MEDIA)[keyof typeof HOME_MEDIA];
}) {
  return (
    <Link
      href={program.href}
      data-track={inferTrackFromHref(program.href)}
      data-track-label={program.trackLabel}
      className="group grid overflow-hidden bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1D4ED8] lg:grid-cols-[1.2fr_1fr]"
    >
      <div className="relative min-h-[220px] lg:min-h-[280px]">
        <MediaPanel
          media={media}
          className={`absolute inset-0 h-full w-full rounded-none border-0 transition duration-500 [@media(hover:hover)_and_(pointer:fine)]:group-hover:scale-[1.02] ${homePhotoGrade}`}
          sizes="heroEditorialMain"
          photoPriority
          priority
        />
      </div>
      <div className="flex flex-col justify-center px-6 py-8 lg:py-10">
        <p className="text-xs font-semibold text-slate-500">교육 프로그램 · {program.audience}</p>
        <h3 className={`mt-2 text-2xl font-bold text-[#0B1220] sm:text-3xl ${koreanLineBreak}`}>{program.name}</h3>
        <p className={`mt-3 text-sm leading-relaxed text-slate-600 sm:text-[15px] ${koreanLineBreak}`}>
          {program.description}
        </p>
        <span className="mt-5 inline-flex min-h-11 items-center text-sm font-semibold text-[#1D4ED8] [@media(hover:hover)_and_(pointer:fine)]:group-hover:underline">
          프로그램 상세 보기 →
        </span>
      </div>
    </Link>
  );
}

function ProgramListRow({ program }: { program: HomeProgramItem }) {
  const media = HOME_MEDIA[program.mediaKey];

  return (
    <Link
      href={program.href}
      data-track={inferTrackFromHref(program.href)}
      data-track-label={program.trackLabel}
      className="group flex flex-col overflow-hidden bg-slate-50 sm:flex-row focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1D4ED8]"
    >
      <div className="relative aspect-[16/9] shrink-0 overflow-hidden sm:w-2/5 lg:w-1/3">
        <MediaPanel
          media={media}
          className={`absolute inset-0 h-full w-full border-0 transition duration-500 [@media(hover:hover)_and_(pointer:fine)]:group-hover:scale-[1.02] ${homePhotoGrade}`}
          sizes="gateCard"
        />
      </div>
      <div className="flex flex-1 flex-col justify-center px-5 py-5 sm:py-6">
        <p className="text-xs font-semibold text-slate-500">{program.audience}</p>
        <h3 className={`mt-1 text-xl font-bold text-[#0B1220] ${koreanLineBreak}`}>{program.name}</h3>
        <p className={`mt-2 text-sm text-slate-600 sm:text-[15px] ${koreanLineBreak}`}>{program.description}</p>
        <span className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-[#1D4ED8] [@media(hover:hover)_and_(pointer:fine)]:group-hover:underline">
          상세 보기 →
        </span>
      </div>
    </Link>
  );
}

function ProgramTile({ program, priority }: { program: HomeProgramItem; priority?: boolean }) {
  const media = HOME_MEDIA[program.mediaKey];

  return (
    <Link
      href={program.href}
      data-track={inferTrackFromHref(program.href)}
      data-track-label={program.trackLabel}
      className="group flex h-full flex-col bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1D4ED8]"
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <MediaPanel
          media={media}
          className={`absolute inset-0 h-full w-full rounded-none border-0 transition duration-500 [@media(hover:hover)_and_(pointer:fine)]:group-hover:scale-[1.02] ${homePhotoGrade}`}
          sizes="gateCard"
          photoPriority={priority}
          priority={priority}
        />
      </div>
      <div className="flex flex-1 flex-col px-4 py-4">
        <p className="text-[11px] font-semibold text-slate-500">운영 형태 · {program.audience}</p>
        <h3 className={`mt-1 text-lg font-bold text-[#0B1220] ${koreanLineBreak}`}>{program.name}</h3>
        <p className={`mt-2 flex-1 text-sm text-slate-600 ${koreanLineBreak}`}>{program.description}</p>
      </div>
    </Link>
  );
}

function CasesSection({
  caseCards,
  reducedMotion,
}: {
  caseCards: HomeFieldRecordCardWithThumbnail[];
  reducedMotion: boolean | null;
}) {
  const featured = caseCards.find((c) => c.slug === homePage.cases.featuredSlug) ?? caseCards[0];
  const rest = caseCards.filter((c) => c.slug !== featured?.slug);

  return (
    <section id={homePage.cases.id} className={`${sectionPadStrong} bg-slate-50`}>
      <div className={container}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <FadeIn reducedMotion={reducedMotion}>
            <h2 className={sectionH2}>{homePage.cases.title}</h2>
            <p className={`${sectionLead} max-w-xl`}>{homePage.cases.lead}</p>
          </FadeIn>
          <TrackedLink
            href={homePage.cases.recordsHref}
            trackLabel={homePage.cases.recordsTrackLabel}
            className="inline-flex min-h-11 shrink-0 items-center text-sm font-semibold text-[#1D4ED8] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8]"
          >
            {homePage.cases.recordsLabel} →
          </TrackedLink>
        </div>

        {featured ? (
          <FadeIn reducedMotion={reducedMotion} className="mt-10">
            <CaseFeatured card={featured} />
          </FadeIn>
        ) : null}

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {rest.map((card, index) => (
            <FadeIn key={card.slug} reducedMotion={reducedMotion}>
              <CaseCompact card={card} priority={index === 0} />
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

function CaseFeatured({ card }: { card: HomeFieldRecordCardWithThumbnail }) {
  const caseMeta = homePage.cases.cards.find((c) => c.slug === card.slug);

  return (
    <ProofLink href={card.href} trackLabel={card.trackLabel}>
      <article className="group grid overflow-hidden bg-white lg:grid-cols-[1.35fr_1fr]">
        <div className="relative min-h-[280px] lg:min-h-[400px]">
          <CaseMedia card={card} sizes="fieldFeatured" priority />
        </div>
        <div className="flex flex-col justify-center px-6 py-8 lg:px-8 lg:py-10">
          <p className="text-xs font-semibold text-slate-500">
            {caseMeta?.tagline} · {caseMeta?.operationType ?? card.tagline}
          </p>
          <h3 className={`mt-2 text-2xl font-bold text-[#0B1220] sm:text-3xl ${koreanLineBreak}`}>{card.venue}</h3>
          <p className={`mt-2 text-sm font-medium text-slate-700 sm:text-[15px] ${koreanLineBreak}`}>
            {card.sessionLine}
          </p>
          {caseMeta?.description ? (
            <p className={`mt-3 text-sm leading-relaxed text-slate-600 sm:text-[15px] ${koreanLineBreak}`}>
              {caseMeta.description}
            </p>
          ) : null}
          <span className="mt-5 inline-flex min-h-11 items-center text-sm font-semibold text-[#1D4ED8] [@media(hover:hover)_and_(pointer:fine)]:group-hover:underline">
            {caseMeta?.ctaLabel ?? '기록 보기'} →
          </span>
        </div>
      </article>
    </ProofLink>
  );
}

function CaseCompact({
  card,
  priority,
}: {
  card: HomeFieldRecordCardWithThumbnail;
  priority?: boolean;
}) {
  const caseMeta = homePage.cases.cards.find((c) => c.slug === card.slug);

  return (
    <ProofLink href={card.href} trackLabel={card.trackLabel}>
      <article className="group flex h-full flex-col bg-white sm:flex-row">
        <div className="relative aspect-[16/10] shrink-0 overflow-hidden sm:w-2/5">
          <CaseMedia card={card} priority={priority} />
        </div>
        <div className="flex flex-1 flex-col justify-center px-4 py-4 sm:py-5">
          <p className="text-[11px] font-semibold text-slate-500">{caseMeta?.operationType ?? card.tagline}</p>
          <h3 className={`mt-1 text-lg font-bold leading-snug text-[#0B1220] ${koreanLineBreak}`}>{card.venue}</h3>
          <p className={`mt-1 text-sm text-slate-600 ${koreanLineBreak}`}>{card.sessionLine}</p>
          <span className="mt-3 text-sm font-semibold text-[#1D4ED8] [@media(hover:hover)_and_(pointer:fine)]:group-hover:underline">
            {caseMeta?.ctaLabel ?? '기록 보기'} →
          </span>
        </div>
      </article>
    </ProofLink>
  );
}

function CaseMedia({
  card,
  sizes = 'gateCard',
  priority,
}: {
  card: HomeFieldRecordCardWithThumbnail;
  sizes?: 'gateCard' | 'fieldFeatured' | 'heroEditorialMain';
  priority?: boolean;
}) {
  if (card.thumbnailSrc) {
    return (
      <ExternalPhoto
        src={card.thumbnailSrc}
        alt={`${card.venue} 수업 사례`}
        className={`absolute inset-0 transition duration-500 [@media(hover:hover)_and_(pointer:fine)]:group-hover:scale-[1.02] ${homePhotoGrade}`}
        fit="cover"
        priority={priority}
      />
    );
  }
  return (
    <MediaPanel
      media={HOME_MEDIA[card.mediaKey]}
      className={`absolute inset-0 h-full w-full rounded-none border-0 ${homePhotoGrade}`}
      sizes={sizes}
      photoPriority={priority}
      priority={priority}
    />
  );
}

function EducationSystemSection({ reducedMotion }: { reducedMotion: boolean | null }) {
  const media = HOME_MEDIA[homePage.educationSystem.mediaKey];
  const { steps } = homePage.educationSystem;

  return (
    <section id={homePage.educationSystem.id} className={`${sectionPadMedium} bg-white`}>
      <div className={container}>
        <FadeIn reducedMotion={reducedMotion}>
          <h2 className={sectionH2}>{homePage.educationSystem.title}</h2>
          <p className={sectionLead}>{homePage.educationSystem.headline}</p>
        </FadeIn>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_1.05fr] lg:items-start lg:gap-12">
          <FadeIn reducedMotion={reducedMotion}>
            <div className="hidden lg:block">
              <div className="grid grid-cols-5 gap-3 border-t-2 border-[#1D4ED8] pt-5">
                {steps.map((step, index) => (
                  <div key={step.label} className={koreanLineBreak}>
                    <p className="text-xs font-semibold tabular-nums text-[#1D4ED8]">
                      {String(index + 1).padStart(2, '0')}
                    </p>
                    <p className="mt-2 text-sm font-bold text-[#0B1220]">{step.label}</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">{step.body}</p>
                  </div>
                ))}
              </div>
            </div>
            <ol className={`space-y-4 lg:hidden ${koreanLineBreak}`}>
              {steps.map((step, index) => (
                <li key={step.label} className="border-l-2 border-[#1D4ED8]/40 pl-4">
                  <p className="text-xs font-semibold text-[#1D4ED8]">{String(index + 1).padStart(2, '0')}</p>
                  <p className="font-bold text-[#0B1220]">{step.label}</p>
                  <p className="mt-1 text-sm text-slate-600">{step.body}</p>
                </li>
              ))}
            </ol>
            <p className={`mt-8 text-sm leading-relaxed text-slate-600 ${koreanLineBreak}`}>
              {homePage.educationSystem.credentials}
            </p>
            <TrackedLink
              href={homePage.educationSystem.cta.href}
              trackLabel={homePage.educationSystem.cta.trackLabel}
              className="mt-6 inline-flex min-h-11 items-center text-sm font-semibold text-[#1D4ED8] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8]"
            >
              {homePage.educationSystem.cta.label} →
            </TrackedLink>
          </FadeIn>

          <FadeIn reducedMotion={reducedMotion} className="relative aspect-[4/3] overflow-hidden lg:aspect-[5/4]">
            <MediaPanel
              media={media}
              className={`absolute inset-0 h-full w-full border-0 ${homePhotoGrade}`}
              sizes="heroEditorialMain"
            />
          </FadeIn>
        </div>
      </div>
    </section>
  );
}

function FinalCtaSection({ reducedMotion }: { reducedMotion: boolean | null }) {
  const media = HOME_MEDIA[homePage.finalCta.mediaKey];

  return (
    <section id={homePage.finalCta.id} className="relative w-full overflow-hidden bg-[#0B1220]">
      <div className="relative min-h-[340px] sm:min-h-[380px]">
        <MediaPanel
          media={media}
          className={`absolute inset-0 h-full w-full border-0 opacity-40 ${homePhotoGrade}`}
          sizes="heroEditorialMain"
        />
        <div className="absolute inset-0 bg-[#0B1220]/75" aria-hidden />
        <div className={`${container} relative flex min-h-[340px] flex-col justify-center py-14 sm:min-h-[380px] sm:py-16`}>
          <FadeIn reducedMotion={reducedMotion} className="max-w-xl">
            <h2 className={`text-2xl font-bold text-white sm:text-4xl ${koreanLineBreak}`}>
              {homePage.finalCta.headline}
            </h2>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <TrackedLink
                href={homePage.finalCta.primary.href}
                trackLabel={homePage.finalCta.primary.trackLabel}
                className="inline-flex min-h-11 items-center justify-center rounded-md px-6 py-3 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                style={{ backgroundColor: ATHLETIC_BLUE }}
              >
                {homePage.finalCta.primary.label}
              </TrackedLink>
              <TrackedLink
                href={homePage.finalCta.secondary.href}
                trackLabel={homePage.finalCta.secondary.trackLabel}
                className="inline-flex min-h-11 items-center justify-center rounded-md border border-white/50 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                {homePage.finalCta.secondary.label}
              </TrackedLink>
            </div>
            <TrackedLink
              href={homePage.finalCta.link.href}
              trackLabel={homePage.finalCta.link.trackLabel}
              className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-white/75 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              {homePage.finalCta.link.label} →
            </TrackedLink>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}

function TrackedLink({
  href,
  trackLabel,
  children,
  className,
  style,
}: {
  href: string;
  trackLabel: string;
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  if (isExternalHref(href)) {
    return (
      <a href={href} data-track-label={trackLabel} className={className} style={style} {...externalLinkProps}>
        {children}
      </a>
    );
  }
  return (
    <Link
      href={href}
      data-track={inferTrackFromHref(href)}
      data-track-label={trackLabel}
      className={className}
      style={style}
    >
      {children}
    </Link>
  );
}

function ProofLink({
  href,
  trackLabel,
  children,
}: {
  href: string;
  trackLabel: string;
  children: ReactNode;
}) {
  const className =
    'block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1D4ED8]';

  if (isExternalHref(href)) {
    return (
      <a href={href} data-track-label={trackLabel} className={className} {...externalLinkProps}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} data-track={inferTrackFromHref(href)} data-track-label={trackLabel} className={className}>
      {children}
    </Link>
  );
}
