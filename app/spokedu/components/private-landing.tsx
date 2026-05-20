'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import { SPOKEDU_IMAGES } from '../data/images';
import { cardInteractive, landingH1, landingHeroShell, landingPageStack, linkMuted } from '../lib/ui-classes';
import { inferTrackFromHref } from '../lib/tracking';
import { HeroCtaStack } from './hero-cta-stack';
import { landingCardShell, type LandingCardVariant } from './visual/card-variants';
import { SpokeduHeroVisual } from './spokedu-hero-visual';
import { SpokeduImage } from './spokedu-image';

const heroLines = ['우리 아이에게 맞는', '개인·소그룹', '체육수업'];

const classOptions = [
  {
    title: '1:1 개인수업',
    description: '아이 속도에 맞춰 움직임 습관을 차근히 설계합니다.',
  },
  {
    title: '2~4명 소그룹',
    description: '또래와 함께 참여하며 협동과 자신감을 함께 키웁니다.',
  },
  {
    title: '운동 자신감',
    description: '운동이 낯선 아이도 성공 경험을 반복하도록 설계합니다.',
  },
];

const CTA_1TO1 = '/spokedu/contact?type=private&classType=1to1';
const CTA_SMALL_GROUP = '/spokedu/contact?type=private&classType=small-group';

const locationItems = ['스포키듀 LAB', '아파트 커뮤니티', '대관 체육공간', '협의 가능한 생활권 공간'];

const consultFlow = ['아이 연령·성향', '운동 경험·고민', '1:1/소그룹 제안', '장소·시간 조율', '수업 시작'];

const parentOutcomes = [
  { title: '움직임 자신감', description: '해볼 수 있다는 경험을 먼저 만듭니다.' },
  { title: '생활 연결', description: '학교·일상 활동에도 이어지는 변화를 돕습니다.' },
  { title: '맞춤 상담', description: '형태·장소·일정을 한 번에 정리합니다.' },
];

function Section({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reducedMotion = useReducedMotion();
  return (
    <motion.section
      initial={reducedMotion ? false : { opacity: 0, y: 14 }}
      whileInView={reducedMotion ? {} : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.45, ease: 'easeOut', delay }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

export default function PrivateLanding() {
  const reducedMotion = useReducedMotion();
  return (
    <div className={landingPageStack}>
      <Section className={`${landingHeroShell} border-violet-200/80 bg-gradient-to-b from-violet-50/80 via-white to-amber-50/40`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.14),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(251,191,36,0.1),transparent_44%)]" />
        <div className="relative grid gap-5 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-7">
          <div className="space-y-4 sm:space-y-6">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-600">학부모 · 개인·소그룹 체육수업</p>
            <h1 className={`${landingH1} text-slate-950`}>
              {heroLines.map((line, index) => (
                <motion.span
                  key={line}
                  initial={reducedMotion ? false : { opacity: 0, y: 26 }}
                  animate={reducedMotion ? {} : { opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: 'easeOut', delay: 0.08 * index }}
                  className="block"
                >
                  {line}
                </motion.span>
              ))}
            </h1>
            <p className="max-w-xl text-sm leading-6 text-slate-700 sm:text-base sm:leading-7">
              가정·소그룹 중심 수업입니다. 아이 연령과 운동 경험을 확인한 뒤 1:1 또는 2~4명 소그룹으로 제안합니다.
            </p>
            <div className="lg:hidden">
              <SpokeduHeroVisual
                image={SPOKEDU_IMAGES.private.oneToOne}
                tone="warm"
                className="relative h-[min(48vw,220px)] overflow-hidden rounded-2xl border border-violet-200/80 bg-slate-100 sm:h-[240px]"
              />
            </div>
            <HeroCtaStack
              primary={{ href: CTA_1TO1, label: '1:1 수업 문의', trackLabel: 'private-cta-1to1' }}
              secondary={[{ href: CTA_SMALL_GROUP, label: '소그룹 수업 문의', trackLabel: 'private-cta-small-group' }]}
            />
            <p className="text-xs leading-5 text-slate-500 sm:text-sm">
              기관·단체 파견이 필요하시면{' '}
              <Link href="/spokedu/dispatch" data-track="cta-dispatch" data-track-label="private-to-dispatch" className={linkMuted}>
                기관수업 안내
              </Link>
              를 확인해 주세요.
            </p>
          </div>
          <div className="hidden lg:block">
            <motion.div
              animate={reducedMotion ? {} : { y: [-4, 4, -4] }}
              transition={reducedMotion ? {} : { duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            >
              <SpokeduHeroVisual image={SPOKEDU_IMAGES.private.oneToOne} tone="warm" />
            </motion.div>
          </div>
        </div>
      </Section>

      <Section className="space-y-5" delay={0.05}>
        <h2 className="text-xl font-bold leading-snug text-slate-950 sm:text-3xl">수업 형태</h2>
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          {[SPOKEDU_IMAGES.private.smallGroup, SPOKEDU_IMAGES.private.toolActivity].map((asset) => (
            <div key={asset.id} className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
              <SpokeduImage asset={asset} alt={asset.alt} fill />
            </div>
          ))}
        </div>
        <div className="grid gap-2.5 sm:grid-cols-3 sm:gap-3">
          {classOptions.map((item, index) => {
            const variants: LandingCardVariant[] = ['glass', 'gradient', 'image'];
            const variant = variants[index] ?? 'image';
            return (
            <article
              key={item.title}
              className={`rounded-2xl p-4 sm:p-5 ${landingCardShell(variant)} ${cardInteractive}`}
            >
              <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
            </article>
          );
          })}
        </div>
      </Section>

      <Section className={`rounded-3xl p-6 sm:p-8 ${landingCardShell('glass')}`} delay={0.08}>
        <h2 className="text-xl font-bold text-slate-950 sm:text-2xl">수업 장소</h2>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {locationItems.map((item) => (
            <div key={item} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
              {item}
            </div>
          ))}
        </div>
      </Section>

      <Section className="space-y-4" delay={0.1}>
        <h2 className="text-xl font-bold text-slate-950 sm:text-2xl">상담 흐름</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {consultFlow.map((step, index) => (
            <div key={step} className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-indigo-600">Step {index + 1}</p>
              <p className="mt-1.5 text-sm font-medium leading-6 text-slate-700">{step}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section className="space-y-5" delay={0.12}>
        <h2 className="text-xl font-bold text-slate-950 sm:text-2xl">기대할 수 있는 변화</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {parentOutcomes.map((benefit, index) => (
            <article
              key={benefit.title}
              className={`rounded-2xl p-5 ${landingCardShell((['gradient', 'image', 'glass'] as const)[index] ?? 'image')}`}
            >
              <h3 className="text-base font-semibold text-slate-900">{benefit.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{benefit.description}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section className="rounded-2xl border border-slate-900 bg-slate-950 px-4 py-6 text-white sm:rounded-3xl sm:px-8 sm:py-10" delay={0.15}>
        <h2 className="text-xl font-bold sm:text-3xl">지금, 아이에게 맞는 방식으로 시작하세요</h2>
        <div className="mt-4 sm:mt-5">
          <HeroCtaStack
            variant="dark"
            primary={{ href: CTA_1TO1, label: '1:1 수업 문의', trackLabel: 'private-final-1to1' }}
            secondary={[{ href: CTA_SMALL_GROUP, label: '소그룹 수업 문의', trackLabel: 'private-final-small-group' }]}
          />
        </div>
      </Section>
    </div>
  );
}
