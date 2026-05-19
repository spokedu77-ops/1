'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import { SPOKEDU_IMAGES } from '../data/images';
import { cardInteractive, landingH1, landingHeroShell, landingPageStack } from '../lib/ui-classes';
import { HeroCtaStack } from './hero-cta-stack';
import { SpokeduHeroVisual } from './spokedu-hero-visual';
import { SpokeduImage } from './spokedu-image';

const heroLines = ['선생님들의 선생님,', '체육수업을', '커리큘럼과 콘텐츠로 만듭니다'];

const productCards = [
  { title: '수업안', description: '연령·목표·난이도 기준이 정리된 실행형 수업안' },
  { title: '운영 매뉴얼', description: '도입-전개-정리 흐름과 운영 체크포인트 문서' },
  { title: '교구 활용 콘텐츠', description: '교구별 세팅과 활동 구조를 표준화한 콘텐츠' },
  { title: '강사 교육', description: '신규/기존 강사 온보딩에 쓰는 교육 자료 세트' },
  { title: '월간 프로그램 패키지', description: '월 단위 운영이 가능한 주차별 커리큘럼 구성' },
  { title: '프로그램 라이선싱', description: '브랜드/기관 확장을 위한 라이선스 협업 모델' },
];

const deliveryPanels = ['PDF 수업안', '운영 매뉴얼 문서', '교구 세팅 가이드', '교육용 시연 자료'];

const rolloutFlow = ['도입 목적 정리', '대상·환경 분석', '콘텐츠 범위 설계', '자료 전달·교육', '파일럿 운영', '정기 업데이트'];

const partnerTargets = [
  {
    title: '선생님',
    description: '수업 품질을 안정적으로 끌어올리고 싶은 현장 강사',
  },
  {
    title: '기관',
    description: '정규/행사 프로그램을 체계적으로 운영하려는 기관',
  },
  {
    title: '교육 파트너',
    description: '콘텐츠 제휴와 라이선싱 확장을 검토하는 파트너',
  },
];

function Section({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reducedMotion = useReducedMotion();
  return (
    <motion.section
      initial={reducedMotion ? false : { opacity: 0, y: 14 }}
      whileInView={reducedMotion ? {} : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.55, ease: 'easeOut', delay }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

export default function CurriculumLanding() {
  const reducedMotion = useReducedMotion();
  const curriculumInquiry = '/spokedu/contact?type=curriculum';

  return (
    <div className={landingPageStack}>
      <Section className={`${landingHeroShell} border-slate-200 bg-white`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.14),transparent_43%),radial-gradient(circle_at_bottom_right,rgba(14,116,144,0.1),transparent_42%)]" />
        <div className="relative grid gap-5 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-7">
          <div className="space-y-4 sm:space-y-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">For Coaches & Partners</p>
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
              현장 수업을 반복 가능한 콘텐츠 시스템으로 정리해 선생님 운영 품질과 기관 실행력을 함께 높입니다.
            </p>
            <HeroCtaStack
              primary={{ href: curriculumInquiry, label: '커리큘럼 문의', trackLabel: '커리큘럼 문의' }}
              secondary={[{ href: curriculumInquiry, label: '콘텐츠 제휴 문의', trackLabel: '콘텐츠 제휴 문의' }]}
            />
          </div>
          <div className="hidden lg:block">
            <motion.div
              animate={reducedMotion ? {} : { y: [-4, 4, -4] }}
              transition={reducedMotion ? {} : { duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            >
              <SpokeduHeroVisual image={SPOKEDU_IMAGES.curriculum.lessonPlan} />
            </motion.div>
          </div>
        </div>
      </Section>

      <Section className="space-y-5" delay={0.05}>
        <h2 className="text-2xl font-bold leading-tight text-slate-950 sm:text-4xl">실제 도입 가능한 콘텐츠 상품</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {productCards.map((item) => (
            <article
              key={item.title}
              className={`rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 ${cardInteractive}`}
            >
              <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section className="space-y-3" delay={0.07}>
        <h2 className="text-2xl font-bold text-slate-950 sm:text-3xl">콘텐츠·교육 자료</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
          {[SPOKEDU_IMAGES.curriculum.lessonPlan, SPOKEDU_IMAGES.curriculum.toolSetup, SPOKEDU_IMAGES.curriculum.instructorTraining].map(
            (asset) => (
              <div key={asset.id} className="relative aspect-[4/3] overflow-hidden rounded-2xl">
                <SpokeduImage asset={asset} alt={asset.alt} fill />
              </div>
            ),
          )}
        </div>
      </Section>

      <Section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8" delay={0.08}>
        <h2 className="text-2xl font-bold text-slate-950 sm:text-3xl">제공 형태</h2>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {deliveryPanels.map((item) => (
            <div key={item} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
              {item}
            </div>
          ))}
        </div>
      </Section>

      <Section className="space-y-4" delay={0.1}>
        <h2 className="text-2xl font-bold text-slate-950 sm:text-3xl">도입 흐름</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {rolloutFlow.map((step, index) => (
            <div key={step} className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-indigo-600">Step {index + 1}</p>
              <p className="mt-1.5 text-sm font-medium leading-6 text-slate-700">{step}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section className="space-y-4" delay={0.12}>
        <h2 className="text-2xl font-bold text-slate-950 sm:text-3xl">적용 대상</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {partnerTargets.map((item) => (
            <article key={item.title} className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section className="rounded-2xl border border-slate-900 bg-slate-950 px-4 py-6 text-white sm:rounded-3xl sm:px-8 sm:py-10" delay={0.15}>
        <h2 className="text-xl font-bold sm:text-3xl">운영 가능한 콘텐츠 체계를 지금 도입하세요</h2>
        <div className="mt-4 sm:mt-5">
          <HeroCtaStack
            variant="dark"
            primary={{ href: curriculumInquiry, label: '커리큘럼 문의', trackLabel: 'curriculum-final-cta' }}
          />
        </div>
      </Section>
    </div>
  );
}
