'use client';

import { LandingFinalCta } from './landing-final-cta';
import { LandingHero } from './landing-hero';
import { LandingSection } from './landing-section';
import { ProgramRelatedProof } from './program-related-proof';
import { MediaPanel } from './visual';
import { landingCardShell, type LandingCardVariant } from './visual/card-variants';
import { HOME_MEDIA } from '../data/home-media';
import { programDetailBlocks, type ProgramDetailSlug } from '../data/program-details';
import { getProgramBySlug } from '../data/programs';
import { landingPageStack, landingSectionTitle } from '../lib/ui-classes';

const whyVariants: LandingCardVariant[] = ['glass', 'gradient', 'image'];
const activityVariants: LandingCardVariant[] = ['image', 'gradient', 'glass'];

type ProgramDetailLandingProps = {
  slug: ProgramDetailSlug;
};

export function ProgramDetailLanding({ slug }: ProgramDetailLandingProps) {
  const program = getProgramBySlug(slug);
  const detail = programDetailBlocks[slug];

  if (!program) return null;

  const heroMedia = HOME_MEDIA[detail.mediaKey];

  return (
    <div className={landingPageStack}>
      <LandingHero
        kicker={program.category}
        lines={[program.title]}
        subtitle={detail.heroSubtitle}
        media={heroMedia}
        primaryCta={{
          label: detail.primaryCta.label,
          href: detail.primaryCta.href,
          trackLabel: detail.primaryCta.trackLabel,
        }}
      />

      <LandingSection delay={0.04}>
        <ProgramRelatedProof
          fieldRecordSlugs={detail.fieldRecordSlugs}
          trustLine={detail.trustLine}
          trackPrefix={`program-${slug}`}
        />
      </LandingSection>

      <LandingSection className="space-y-3" delay={0.05}>
        <h2 className={landingSectionTitle}>이 프로그램이 필요한 이유</h2>
        <ul className="grid gap-2.5 sm:grid-cols-3">
          {detail.whyPoints.map((point, index) => (
            <li
              key={point}
              className={`rounded-2xl p-3.5 sm:p-4 ${landingCardShell(whyVariants[index] ?? 'image')}`}
            >
              <p className="text-sm font-medium leading-5 text-slate-800">{point}</p>
            </li>
          ))}
        </ul>
      </LandingSection>

      <LandingSection className="space-y-3" delay={0.08}>
        <h2 className={landingSectionTitle}>핵심 활동 구성</h2>
        <ul className="grid gap-2.5 sm:grid-cols-3">
          {detail.activities.map((item, index) => {
            const variant = activityVariants[index] ?? 'image';
            return (
              <li
                key={item.title}
                className={`overflow-hidden rounded-2xl ${landingCardShell(variant)}`}
              >
                <MediaPanel
                  media={HOME_MEDIA[item.mediaKey]}
                  className="aspect-[16/8] rounded-none border-0 border-b border-slate-200/80"
                  photoPriority={index === 0}
                />
                <div className="p-3.5 sm:p-4">
                  <p
                    className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${variant === 'dark' ? 'text-[#9FC0FF]' : 'text-[#245DFF]'}`}
                  >
                    STEP 0{index + 1}
                  </p>
                  <p className={`mt-1 text-sm font-semibold ${variant === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    {item.title}
                  </p>
                  <p
                    className={`mt-1 line-clamp-2 text-xs leading-5 sm:text-sm ${variant === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}
                  >
                    {item.description}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </LandingSection>

      <LandingSection className={`rounded-2xl p-4 sm:p-5 ${landingCardShell('gradient')}`} delay={0.1}>
        <h2 className={landingSectionTitle}>적용 대상</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {detail.targets.map((target) => (
            <span
              key={target}
              className="rounded-full border border-[#D6E3FF] bg-white/80 px-3 py-1 text-xs font-medium text-slate-700 sm:text-sm"
            >
              {target}
            </span>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-500 sm:text-sm">연결 축 · {program.connectedTracks.join(' / ')}</p>
      </LandingSection>

      <LandingFinalCta
        title={detail.finalCtaTitle}
        description={detail.finalCtaSub}
        tone="light"
        backgroundMedia={heroMedia}
        links={[
          {
            label: detail.primaryCta.label,
            href: detail.primaryCta.href,
            trackLabel: detail.primaryCta.trackLabel,
            variant: 'primary',
          },
          ...(detail.secondaryCta
            ? [
                {
                  label: detail.secondaryCta.label,
                  href: detail.secondaryCta.href,
                  trackLabel: detail.secondaryCta.trackLabel,
                  variant: 'on-light-outline' as const,
                },
              ]
            : []),
          {
            label: '전체 프로그램 보기',
            href: '/spokedu/programs',
            trackLabel: 'program-all-link',
            variant: 'on-light-outline',
          },
        ]}
      />
    </div>
  );
}
