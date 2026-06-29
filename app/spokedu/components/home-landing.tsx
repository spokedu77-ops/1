'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { HOME_MEDIA, HOME_SIGNATURE_PROGRAMS, type HomeSignatureProgram } from '../data/home-media';
import { homePage } from '../data/home-page';
import {
  PRIVATE_COUNTER_BASE_DATE,
  PRIVATE_COUNTER_BASE_SESSIONS,
  PRIVATE_COUNTER_BASE_STUDENTS,
  PRIVATE_COUNTER_DAILY_SESSIONS,
  PRIVATE_COUNTER_DAILY_STUDENTS,
} from '../data/private-page';
import type { HomeFieldRecordCardWithThumbnail } from '../lib/resolve-field-records';
import { externalLinkProps, isExternalHref } from '../lib/external-link';
import { inferTrackFromHref } from '../lib/tracking';
import { koreanLineBreak } from '../lib/ui-classes';
import { ExternalPhoto } from './external-photo';
import { MediaPanel } from './visual';

/** 현장 사진·유니폼 톤 — 크림 + 플럼 (teal SaaS 톤 제거) */
const CREAM = '#F4F0EA';
const INK = '#141210';
const PLUM = '#6B5B7A';

const container = 'mx-auto w-full max-w-6xl px-5 sm:px-8';
const sectionPad = 'py-14 sm:py-16 lg:py-20';

function getSessionCount(): number {
  const base = new Date(`${PRIVATE_COUNTER_BASE_DATE}T00:00:00`).getTime();
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const days = Math.max(0, Math.floor((todayStart - base) / (24 * 60 * 60 * 1000)));
  return PRIVATE_COUNTER_BASE_SESSIONS + days * PRIVATE_COUNTER_DAILY_SESSIONS;
}

function getStudentCount(): number {
  const base = new Date(`${PRIVATE_COUNTER_BASE_DATE}T00:00:00`).getTime();
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const days = Math.max(0, Math.floor((todayStart - base) / (24 * 60 * 60 * 1000)));
  return PRIVATE_COUNTER_BASE_STUDENTS + days * PRIVATE_COUNTER_DAILY_STUDENTS;
}

function useCountUp(target: number, active: boolean, durationMs = 1200): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) return;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - t) ** 2;
      setValue(Math.round(target * eased));
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, active, durationMs]);

  return value;
}

type SpokeduHomeLandingProps = {
  proofCards: HomeFieldRecordCardWithThumbnail[];
};

export default function SpokeduHomeLanding({ proofCards }: SpokeduHomeLandingProps) {
  const reducedMotion = useReducedMotion();
  const heroMedia = HOME_MEDIA[homePage.hero.mediaKey];
  const sessionTarget = getSessionCount();
  const studentTarget = getStudentCount();
  const statsRef = useRef<HTMLDListElement>(null);
  const [statsActive, setStatsActive] = useState(false);
  const featuredProofCards = proofCards.slice(0, homePage.proof.featuredCount);
  const featuredPrograms = homePage.programs.featuredIds
    .map((id) => HOME_SIGNATURE_PROGRAMS.find((program) => program.id === id))
    .filter((program): program is HomeSignatureProgram => !!program);
  const [heroProgram, ...supportPrograms] = featuredPrograms;

  useEffect(() => {
    const node = statsRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setStatsActive(true);
      },
      { threshold: 0.25 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const sessionCount = useCountUp(sessionTarget, statsActive && !reducedMotion);
  const studentCount = useCountUp(studentTarget, statsActive && !reducedMotion);
  const displaySessions = (statsActive && !reducedMotion ? sessionCount : sessionTarget).toLocaleString();
  const displayStudents = (statsActive && !reducedMotion ? studentCount : studentTarget).toLocaleString();

  return (
    <div className="text-stone-950" style={{ backgroundColor: CREAM }}>
      <a
        href="#programs"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-semibold"
      >
        안내로 건너뛰기
      </a>

      {/* 1. 커버 — 현장 사진이 첫인상 */}
      <section className="relative">
        <div className="relative min-h-[min(52vh,420px)] w-full sm:min-h-[min(58vh,520px)] lg:min-h-[min(64vh,600px)]">
          <MediaPanel
            media={heroMedia}
            className="absolute inset-0 h-full w-full rounded-none border-0"
            sizes="heroEditorialMain"
            photoPriority
            priority
          />
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#141210]/55 via-transparent to-[#141210]/10"
            aria-hidden
          />
          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8 lg:p-10">
            <div className="mx-auto w-full max-w-6xl">
              <p
                className={`max-w-md text-lg font-semibold leading-snug text-white sm:text-xl lg:text-2xl ${koreanLineBreak}`}
              >
                &ldquo;{homePage.hero.fieldQuote}&rdquo;
              </p>
              <p className="mt-2 text-xs font-medium tracking-wide text-white/70 sm:text-sm">
                {homePage.hero.fieldCaption}
              </p>
            </div>
          </div>
        </div>

        <div className="relative z-10 -mt-6 px-5 sm:-mt-8 sm:px-8">
          <div
            className={`${container} rounded-t-[1.75rem] px-6 pb-10 pt-10 shadow-[0_-8px_40px_-12px_rgba(20,18,16,0.12)] sm:rounded-t-[2rem] sm:px-10 sm:pb-12 sm:pt-12 lg:px-12`}
            style={{ backgroundColor: CREAM }}
          >
            <p
              className="text-[11px] font-bold uppercase tracking-[0.32em]"
              style={{ color: PLUM }}
            >
              {homePage.signature}
            </p>
            <h1
              className={`mt-5 text-[2.1rem] font-semibold leading-[1.08] tracking-[-0.035em] min-[390px]:text-[2.45rem] sm:text-[3rem] lg:text-[3.5rem] ${koreanLineBreak}`}
            >
              {homePage.hero.lines.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </h1>
            <p className={`mt-5 max-w-lg text-[15px] leading-relaxed text-stone-600 sm:text-base ${koreanLineBreak}`}>
              {homePage.hero.support[0]}
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {homePage.hero.audienceCtas.map((cta) => (
                <Link
                  key={cta.trackId}
                  href={cta.href}
                  data-track={inferTrackFromHref(cta.href)}
                  data-track-label={cta.trackLabel}
                  className="group flex min-h-[5.5rem] flex-col justify-between rounded-2xl border border-stone-300/80 bg-white/90 px-5 py-4 text-left shadow-sm transition hover:border-stone-950 hover:shadow-md"
                >
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-stone-500">
                    {cta.audience}
                  </span>
                  <span className="mt-2 text-sm font-semibold leading-snug text-stone-950 sm:text-[15px]">
                    {cta.label}
                  </span>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-stone-500 transition group-hover:gap-2 group-hover:text-stone-800">
                    바로가기
                    <span aria-hidden>→</span>
                  </span>
                </Link>
              ))}
            </div>
            <Link
              href={homePage.hero.spomoveLink.href}
              data-track={inferTrackFromHref(homePage.hero.spomoveLink.href)}
              data-track-label={homePage.hero.spomoveLink.trackLabel}
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-stone-600 transition hover:gap-3 hover:text-stone-950"
            >
              {homePage.hero.spomoveLink.label}
              <span aria-hidden>→</span>
            </Link>

            <dl
              ref={statsRef}
              className="mt-10 grid grid-cols-2 gap-6 border-t border-stone-300/70 pt-8 sm:grid-cols-4"
              aria-label="스포키듀 운영 지표"
            >
              {homePage.stats.map((stat) => {
                const value =
                  stat.kind === 'sessions'
                    ? displaySessions
                    : stat.kind === 'students'
                      ? displayStudents
                      : stat.value;
                return (
                  <StatCell key={stat.id} value={value} label={stat.label} active={statsActive} />
                );
              })}
            </dl>
          </div>
        </div>
      </section>

      {/* 2. PLAY · THINK · GROW — KIDDO식 기준·과정 */}
      <section
        id={homePage.philosophy.id}
        className="border-b border-stone-300/50 bg-[#EDE8E0]"
        aria-labelledby="home-philosophy-heading"
      >
        <div className={`${container} ${sectionPad}`}>
          <p className="text-[11px] font-bold uppercase tracking-[0.32em]" style={{ color: PLUM }}>
            {homePage.philosophy.title}
          </p>
          <h2
            id="home-philosophy-heading"
            className={`mt-4 max-w-2xl text-[1.75rem] font-semibold tracking-[-0.03em] text-stone-950 sm:text-[2.25rem] ${koreanLineBreak}`}
          >
            {homePage.philosophy.lead}
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-3 sm:gap-5">
            {homePage.philosophy.items.map((item, index) => (
              <motion.article
                key={item.id}
                initial={reducedMotion ? false : { opacity: 0, y: 10 }}
                whileInView={reducedMotion ? {} : { opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.4, delay: index * 0.06 }}
                className="rounded-2xl border border-stone-300/60 bg-white/90 p-6 sm:p-7"
              >
                <p className="text-[11px] font-bold tracking-[0.28em]" style={{ color: PLUM }}>
                  {item.label}
                </p>
                <h3 className={`mt-3 text-lg font-semibold text-stone-950 ${koreanLineBreak}`}>{item.title}</h3>
                <p className={`mt-2 text-sm leading-relaxed text-stone-600 ${koreanLineBreak}`}>{item.body}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* 3. 브랜드 신뢰 + 가치 3열 */}
      <section className="border-b border-stone-300/50 bg-white" aria-label="스포키듀가 하는 일">
        <div className={`${container} ${sectionPad}`}>
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-stone-500">{homePage.trust.eyebrow}</p>
          <div className="mt-5 flex flex-col gap-4 rounded-2xl border border-stone-200 bg-[#FAF8F5] p-5 sm:flex-row sm:items-center sm:gap-6 sm:p-6">
            <span className="inline-flex w-fit shrink-0 items-center rounded-full bg-stone-950 px-4 py-2 text-xs font-bold tracking-wide text-white">
              {homePage.trust.badge}
            </span>
            <p className={`text-sm leading-relaxed text-stone-700 sm:text-[15px] ${koreanLineBreak}`}>
              {homePage.trust.lead}
            </p>
          </div>
          <div className="mt-10 grid gap-8 sm:grid-cols-3 sm:gap-6">
            {homePage.trust.pillars.map((pillar, index) => (
              <div key={pillar.id} className="relative border-t border-stone-200 pt-6 sm:border-t-0 sm:border-l sm:pl-6 sm:pt-0 first:sm:border-l-0 first:sm:pl-0">
                <span
                  className="text-[2.5rem] font-light leading-none tabular-nums text-stone-300 sm:text-5xl"
                  aria-hidden
                >
                  {String(index + 1).padStart(2, '0')}
                </span>
                <p className="mt-2 text-base font-semibold text-stone-950">{pillar.title}</p>
                <p className={`mt-2 text-sm leading-relaxed text-stone-600 ${koreanLineBreak}`}>{pillar.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. 대표 프로그램 — imoves식 관심 탐색 */}
      {heroProgram ? (
        <section
          id={homePage.programs.id}
          className="border-b border-stone-300/50"
          aria-labelledby="home-programs-heading"
        >
          <div className={`${container} ${sectionPad}`}>
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-stone-500">
              {homePage.programs.eyebrow}
            </p>
            <h2
              id="home-programs-heading"
              className={`mt-3 text-[1.75rem] font-semibold tracking-[-0.03em] text-stone-950 sm:text-[2.25rem] ${koreanLineBreak}`}
            >
              {homePage.programs.title}
            </h2>
            <p className={`mt-3 max-w-xl text-[15px] text-stone-600 sm:text-base ${koreanLineBreak}`}>
              {homePage.programs.lead}
            </p>
            <div className="mt-10 grid gap-4 lg:grid-cols-2 lg:gap-5">
              <ProgramFeatureCard program={heroProgram} priority />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                {supportPrograms.map((program) => (
                  <ProgramCard key={program.id} program={program} />
                ))}
              </div>
            </div>
            <Link
              href={homePage.programs.allHref}
              data-track={inferTrackFromHref(homePage.programs.allHref)}
              data-track-label={homePage.programs.allTrackLabel}
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-stone-800 transition hover:gap-3"
            >
              {homePage.programs.allLabel}
              <span aria-hidden>→</span>
            </Link>
          </div>
        </section>
      ) : null}

      {/* 5. 관객별 증거 */}
      <section
        id={homePage.audienceProof.id}
        className="border-b border-stone-300/50 bg-white"
        aria-labelledby="home-audience-proof-heading"
      >
        <div className={`${container} ${sectionPad}`}>
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-stone-500">
            {homePage.audienceProof.eyebrow}
          </p>
          <h2
            id="home-audience-proof-heading"
            className={`mt-3 text-[1.75rem] font-semibold tracking-[-0.03em] text-stone-950 sm:text-[2.25rem] ${koreanLineBreak}`}
          >
            {homePage.audienceProof.title}
          </h2>
          <p className={`mt-3 max-w-xl text-[15px] text-stone-600 sm:text-base ${koreanLineBreak}`}>
            {homePage.audienceProof.lead}
          </p>
          <div className="mt-10 grid gap-5 lg:grid-cols-3 lg:gap-6">
            {homePage.audienceProof.items.map((item, index) => {
              const portraitSrc = item.portraitSrc;
              const portraitAlt = item.portraitAlt ?? item.attribution;
              return (
              <motion.article
                key={item.trackId}
                initial={reducedMotion ? false : { opacity: 0, y: 10 }}
                whileInView={reducedMotion ? {} : { opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.4, delay: index * 0.06 }}
                className="flex flex-col rounded-2xl border border-stone-200 bg-[#FAF8F5] p-6 sm:p-7"
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: PLUM }}>
                  {item.audience}
                </p>
                <blockquote
                  className={`mt-4 text-base font-semibold leading-snug text-stone-950 sm:text-[17px] ${koreanLineBreak}`}
                >
                  &ldquo;{item.quote}&rdquo;
                </blockquote>
                <p className={`mt-3 flex-1 text-sm leading-relaxed text-stone-600 ${koreanLineBreak}`}>{item.body}</p>
                <div className="mt-6 flex items-center gap-3 border-t border-stone-200/80 pt-5">
                  {portraitSrc ? (
                    <ExternalPhoto
                      src={portraitSrc}
                      alt={portraitAlt}
                      className="h-10 w-10 shrink-0 rounded-full ring-2 ring-white"
                      fit="cover"
                    />
                  ) : null}
                  <p className="text-xs font-medium text-stone-500">{item.attribution}</p>
                </div>
                <Link
                  href={item.href}
                  data-track={inferTrackFromHref(item.href)}
                  data-track-label={item.trackLabel}
                  className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-stone-800 transition hover:gap-3"
                >
                  {item.cta}
                  <span aria-hidden>→</span>
                </Link>
              </motion.article>
            );
            })}
          </div>
        </div>
      </section>

      {/* 6. 관객 경로 — 트니트니 IA, 라이트 카드 */}
      <section
        id={homePage.audiencePaths.id}
        className="scroll-mt-[4.5rem] border-b border-stone-300/50 bg-[#EDE8E0]"
        aria-labelledby="home-paths-heading"
      >
        <div className={`${container} ${sectionPad}`}>
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-stone-500">
            {homePage.audiencePaths.eyebrow}
          </p>
          <h2
            id="home-paths-heading"
            className={`mt-3 text-[1.75rem] font-semibold tracking-[-0.03em] text-stone-950 sm:text-[2.25rem] ${koreanLineBreak}`}
          >
            {homePage.audiencePaths.title}
          </h2>
          <p className={`mt-3 max-w-xl text-[15px] text-stone-600 sm:text-base ${koreanLineBreak}`}>
            {homePage.audiencePaths.lead}
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-3 sm:gap-5">
            {homePage.audiencePaths.items.map((path, index) => (
              <motion.div
                key={path.trackId}
                initial={reducedMotion ? false : { opacity: 0, y: 12 }}
                whileInView={reducedMotion ? {} : { opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.12 }}
                transition={{ duration: 0.45, delay: index * 0.07 }}
              >
                <LightPathCard path={path} priority={index === 0} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. 현장 사례 — 비대칭 에디토리얼 */}
      {featuredProofCards.length > 0 ? (
        <section className="border-b border-stone-300/50" aria-labelledby="home-proof-heading">
          <div className={`${container} ${sectionPad}`}>
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-stone-500">
              {homePage.proof.eyebrow}
            </p>
            <h2
              id="home-proof-heading"
              className={`mt-3 text-[1.75rem] font-semibold tracking-[-0.03em] text-stone-950 sm:text-[2.25rem] ${koreanLineBreak}`}
            >
              {homePage.proof.title}
            </h2>
            <p className={`mt-3 max-w-lg text-[15px] text-stone-600 ${koreanLineBreak}`}>{homePage.proof.lead}</p>
            <div className="mt-8 grid gap-4 lg:grid-cols-12 lg:grid-rows-2 lg:gap-5">
              {featuredProofCards.map((record, index) => (
                <div
                  key={record.slug}
                  className={index === 0 ? 'lg:col-span-7 lg:row-span-2' : 'lg:col-span-5'}
                >
                  <ProofLink href={record.href} trackLabel={record.trackLabel}>
                    {index === 0 ? (
                      <ProofCardFeatured record={record} />
                    ) : (
                      <ProofCardCompact record={record} index={index} />
                    )}
                  </ProofLink>
                </div>
              ))}
            </div>
            <Link
              href={homePage.proof.recordsHref}
              data-track={inferTrackFromHref(homePage.proof.recordsHref)}
              data-track-label={homePage.proof.recordsTrackLabel}
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-stone-800 transition hover:gap-3"
            >
              {homePage.proof.recordsLabel}
              <span aria-hidden>→</span>
            </Link>
          </div>
        </section>
      ) : null}

      {/* 8. 미션 */}
      <section
        className="relative overflow-hidden text-white"
        style={{ backgroundColor: INK }}
        aria-label="스포키듀 미션 및 상담"
      >
        <div
          className="pointer-events-none absolute -right-20 top-0 h-64 w-64 rounded-full opacity-30 blur-3xl"
          style={{ backgroundColor: PLUM }}
          aria-hidden
        />
        <div className={`relative ${container} py-16 sm:py-20 lg:py-24`}>
          <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-white/40">{homePage.signature}</p>
          <p
            className={`mt-8 max-w-3xl text-[1.75rem] font-medium leading-snug tracking-[-0.03em] sm:text-4xl sm:leading-tight ${koreanLineBreak}`}
          >
            {homePage.mission.lines[0]}
            <br />
            <span className="text-white/45">{homePage.mission.lines[1]}</span>
          </p>
          <p className={`mt-8 max-w-xl text-[15px] leading-relaxed text-white/55 ${koreanLineBreak}`}>
            <span className="font-medium text-white/80">{homePage.authority.title}</span>
            <span className="mt-2 block">{homePage.authority.body}</span>
          </p>
          <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-10 sm:flex-row sm:justify-end">
            <Link
              href={homePage.spomove.href}
              data-track={inferTrackFromHref(homePage.spomove.href)}
              data-track-label={homePage.spomove.trackLabel}
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/30 px-7 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              SPOMOVE 알아보기
            </Link>
            <Link
              href={homePage.closingCta.href}
              data-track="cta-contact"
              data-track-label={homePage.closingCta.trackLabel}
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-white px-8 text-sm font-semibold text-stone-950 transition hover:bg-stone-100"
            >
              {homePage.closingCta.label}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function LightPathCard({
  path,
  priority,
}: {
  path: (typeof homePage.audiencePaths.items)[number];
  priority?: boolean;
}) {
  return (
    <Link
      href={path.href}
      data-track={inferTrackFromHref(path.href)}
      data-track-label={path.trackLabel}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-stone-300/70 bg-white shadow-sm transition hover:border-stone-950 hover:shadow-md"
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <MediaPanel
          media={HOME_MEDIA[path.mediaKey]}
          className="absolute inset-0 h-full w-full rounded-none border-0 transition duration-700 group-hover:scale-[1.03]"
          sizes="gateCard"
          photoPriority={priority}
        />
      </div>
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-500">{path.audience}</p>
        <p className="mt-2 text-lg font-semibold text-stone-950 sm:text-xl">{path.title}</p>
        <p className={`mt-2 flex-1 text-sm leading-relaxed text-stone-600 ${koreanLineBreak}`}>{path.lead}</p>
        <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-stone-800 transition group-hover:gap-3">
          자세히 보기
          <span aria-hidden>→</span>
        </span>
      </div>
    </Link>
  );
}

function ProgramFeatureCard({ program, priority }: { program: HomeSignatureProgram; priority?: boolean }) {
  return (
    <Link
      href={program.href}
      data-track={inferTrackFromHref(program.href)}
      data-track-label={program.trackLabel}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-stone-300/70 bg-white shadow-sm transition hover:border-stone-950 hover:shadow-md lg:flex-row"
    >
      <div className="relative aspect-[16/10] shrink-0 overflow-hidden lg:aspect-auto lg:w-[52%] lg:min-h-[240px]">
        <MediaPanel
          media={program.media}
          className="absolute inset-0 h-full w-full rounded-none border-0 transition duration-700 group-hover:scale-[1.02]"
          sizes="heroEditorialMain"
          photoPriority={priority}
          priority={priority}
        />
      </div>
      <div className="flex flex-1 flex-col justify-center p-6 sm:p-8">
        <span className="w-fit rounded-full border border-stone-200 bg-[#FAF8F5] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-stone-600">
          {program.badge}
        </span>
        <h3 className="mt-4 text-2xl font-semibold tracking-tight text-stone-950 sm:text-3xl">{program.name}</h3>
        <p className={`mt-3 text-sm leading-relaxed text-stone-600 sm:text-[15px] ${koreanLineBreak}`}>
          {program.description}
        </p>
        <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-stone-900 transition group-hover:gap-3">
          {program.cta}
          <span aria-hidden>→</span>
        </span>
      </div>
    </Link>
  );
}

function ProgramCard({ program }: { program: HomeSignatureProgram }) {
  return (
    <Link
      href={program.href}
      data-track={inferTrackFromHref(program.href)}
      data-track-label={program.trackLabel}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-stone-300/70 bg-white shadow-sm transition hover:border-stone-950 hover:shadow-md"
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <MediaPanel
          media={program.media}
          className="absolute inset-0 h-full w-full rounded-none border-0 transition duration-700 group-hover:scale-[1.03]"
          sizes="gateCard"
        />
      </div>
      <div className="flex flex-1 flex-col p-5">
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-stone-500">{program.badge}</span>
        <h3 className="mt-2 text-lg font-semibold text-stone-950">{program.name}</h3>
        <p className={`mt-2 flex-1 text-sm leading-relaxed text-stone-600 ${koreanLineBreak}`}>{program.description}</p>
        <span className="mt-3 text-sm font-semibold text-stone-800 transition group-hover:underline">{program.cta}</span>
      </div>
    </Link>
  );
}

function ProofCardMedia({
  record,
  className,
  sizes,
  priority,
}: {
  record: HomeFieldRecordCardWithThumbnail;
  className?: string;
  sizes?: 'gateCard' | 'fieldFeatured' | 'heroEditorialMain';
  priority?: boolean;
}) {
  if (record.thumbnailSrc) {
    return (
      <ExternalPhoto
        src={record.thumbnailSrc}
        alt={`${record.venue} 수업 사례`}
        className={`absolute inset-0 transition duration-700 group-hover:scale-[1.02] ${className ?? ''}`}
        fit="cover"
      />
    );
  }
  return (
    <MediaPanel
      media={HOME_MEDIA[record.mediaKey]}
      className={`absolute inset-0 h-full w-full rounded-none border-0 ${className ?? ''}`}
      sizes={sizes ?? 'gateCard'}
      photoPriority={priority}
      priority={priority}
    />
  );
}

function ProofCardFeatured({ record }: { record: HomeFieldRecordCardWithThumbnail }) {
  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-2xl border border-stone-300/70 bg-white shadow-sm transition hover:shadow-md">
      <div className="relative min-h-[220px] flex-1 overflow-hidden">
        <ProofCardMedia record={record} sizes="fieldFeatured" priority />
      </div>
      <div className="border-t border-stone-100 p-5 sm:p-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-stone-500">{record.tagline}</p>
        <p className="mt-2 text-xl font-semibold text-stone-950 sm:text-2xl">{record.venue}</p>
        <p className={`mt-2 text-sm text-stone-600 ${koreanLineBreak}`}>{record.sessionLine}</p>
      </div>
    </div>
  );
}

function ProofCardCompact({
  record,
  index,
}: {
  record: HomeFieldRecordCardWithThumbnail;
  index: number;
}) {
  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-2xl border border-stone-300/70 bg-white shadow-sm transition hover:shadow-md sm:flex-row lg:flex-col">
      <div className="relative aspect-[16/10] shrink-0 overflow-hidden sm:w-2/5 lg:w-full">
        <ProofCardMedia record={record} priority={index === 1} />
      </div>
      <div className="flex flex-1 flex-col justify-center border-t border-stone-100 p-5 sm:border-l sm:border-t-0 lg:border-l-0 lg:border-t">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-stone-500">{record.tagline}</p>
        <p className="mt-2 text-lg font-semibold leading-snug text-stone-950">{record.venue}</p>
        <p className={`mt-1.5 text-sm text-stone-600 ${koreanLineBreak}`}>{record.sessionLine}</p>
      </div>
    </div>
  );
}

function StatCell({
  value,
  label,
  active = true,
}: {
  value: string;
  label: string;
  active?: boolean;
}) {
  return (
    <div>
      <dt className="sr-only">{label}</dt>
      <dd
        className={`text-xl font-bold tabular-nums tracking-tight text-stone-950 transition-opacity duration-500 sm:text-2xl ${active ? 'opacity-100' : 'opacity-25'}`}
        aria-live="polite"
      >
        {value}
      </dd>
      <dd className="mt-1 text-[11px] font-medium uppercase tracking-[0.12em] text-stone-500">{label}</dd>
    </div>
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
    'block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-stone-900';

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
