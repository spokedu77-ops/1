'use client';

import Link from 'next/link';
import { LandingSection } from './landing-section';
import { HeroCtaStack } from './hero-cta-stack';
import { RecordPhoto } from './record-photo';
import { getCaseBySlug } from '../data/cases';
import { programDetailBlocks } from '../data/program-details';
import { getProgramBySlug, type ProgramSlug } from '../data/programs';
import { cardInteractive, landingH1, landingHeroShell, landingPageStack, linkMuted } from '../lib/ui-classes';
import { inferTrackFromHref } from '../lib/tracking';

type ProgramDetailLandingProps = {
  slug: Extract<ProgramSlug, 'spomove' | 'paps' | 'oneday-event' | 'camp'>;
};

export function ProgramDetailLanding({ slug }: ProgramDetailLandingProps) {
  const program = getProgramBySlug(slug);
  const detail = programDetailBlocks[slug];
  const relatedCases = detail.caseSlugs
    .map((caseSlug) => getCaseBySlug(caseSlug))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  if (!program) return null;

  return (
    <div className={landingPageStack}>
      {/* 1. Hero */}
      <LandingSection className={`${landingHeroShell} border-slate-200 bg-gradient-to-br from-indigo-50 via-white to-lime-50`}>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-600">{program.category}</p>
        <h1 className={`mt-2 sm:mt-3 ${landingH1} text-slate-950`}>{program.title}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-700 sm:text-base">{program.description}</p>
        <div className="mt-4 hidden lg:block">
          <div className="relative h-44 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 sm:h-52">
            <RecordPhoto src={program.image} alt={program.imageAlt} category="programs" fill sizes="(max-width: 1024px) 100vw, 50vw" />
          </div>
        </div>
        <div className="mt-4">
          <HeroCtaStack
            primary={{ ...detail.primaryCta, track: inferTrackFromHref(detail.primaryCta.href) }}
            secondary={[{ ...detail.secondaryCta, track: inferTrackFromHref(detail.secondaryCta.href) }]}
          />
        </div>
      </LandingSection>

      {/* 2. Why */}
      <LandingSection className="rounded-2xl border border-slate-200 bg-white p-4 sm:rounded-3xl sm:p-6" delay={0.05}>
        <h2 className="text-lg font-bold text-slate-950 sm:text-xl">이 프로그램이 필요한 이유</h2>
        <p className="mt-2 text-sm leading-6 text-slate-700">{detail.why}</p>
      </LandingSection>

      {/* 3. Activities */}
      <LandingSection className="space-y-3" delay={0.08}>
        <h2 className="text-lg font-bold text-slate-950 sm:text-xl">핵심 활동 구성</h2>
        <ul className="grid gap-2 sm:grid-cols-3">
          {detail.activities.map((item, index) => (
            <li key={item} className="rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4">
              <p className="text-xs font-semibold text-indigo-600">0{index + 1}</p>
              <p className="mt-1 text-sm font-medium leading-5 text-slate-800">{item}</p>
            </li>
          ))}
        </ul>
      </LandingSection>

      {/* 4. Targets */}
      <LandingSection className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-6" delay={0.1}>
        <h2 className="text-lg font-bold text-slate-950 sm:text-xl">적용 대상</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {detail.targets.map((target) => (
            <span key={target} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700">
              {target}
            </span>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-500 sm:text-sm">연결 축 · {program.connectedTracks.join(' / ')}</p>
      </LandingSection>

      {/* 5. Cases */}
      {relatedCases.length > 0 ? (
        <LandingSection className="space-y-3" delay={0.12}>
          <div className="flex items-end justify-between gap-2">
            <h2 className="text-lg font-bold text-slate-950 sm:text-xl">운영 예시</h2>
            <Link href="/spokedu/cases" data-track="cta-records-cases" className={`text-sm ${linkMuted}`}>
              사례 더보기 →
            </Link>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {relatedCases.map((item) => (
              <Link
                key={item.slug}
                href={item.href}
                data-track={inferTrackFromHref(item.href)}
                className={`overflow-hidden rounded-2xl border border-slate-200 bg-white ${cardInteractive}`}
              >
                <div className="relative h-28 sm:h-32">
                  <RecordPhoto
                    src={item.images[0]?.src}
                    alt={item.images[0]?.alt ?? item.title}
                    category="cases"
                    fill
                    sizes="(max-width: 640px) 100vw, 50vw"
                  />
                </div>
                <div className="p-3">
                  <p className="text-xs text-slate-500">{item.institution}</p>
                  <h3 className="mt-0.5 text-sm font-semibold text-slate-900">{item.title}</h3>
                </div>
              </Link>
            ))}
          </div>
        </LandingSection>
      ) : null}

      {/* 6. CTA */}
      <LandingSection
        className="rounded-2xl border border-slate-900 bg-slate-950 px-4 py-6 text-white sm:rounded-3xl sm:px-8 sm:py-8"
        delay={0.15}
      >
        <h2 className="text-xl font-bold sm:text-2xl">{program.title} 도입 상담</h2>
        <p className="mt-2 text-sm text-slate-400">공간·인원·일정을 확인한 뒤 맞는 운영안을 안내합니다.</p>
        <div className="mt-4">
          <HeroCtaStack
            variant="dark"
            primary={{ ...detail.primaryCta, track: inferTrackFromHref(detail.primaryCta.href) }}
            secondary={[{ ...detail.secondaryCta, track: inferTrackFromHref(detail.secondaryCta.href) }]}
          />
        </div>
        <Link
          href="/spokedu/programs"
          data-track="cta-programs"
          className="mt-4 inline-block text-sm text-slate-300 underline-offset-2 hover:text-white hover:underline"
        >
          전체 프로그램 비교 →
        </Link>
      </LandingSection>
    </div>
  );
}
