'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import { spokeduImageManifest } from '../data/content';
import { inferTrackFromHref } from '../lib/tracking';

const heroLines = ['우리 아이에게 맞는', '개인·소그룹', '체육수업을 제안합니다'];

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
  {
    title: '기초 움직임',
    description: '달리기, 점프, 균형, 협응의 기본 기능을 탄탄히 만듭니다.',
  },
];

const locationItems = ['스포키듀 LAB', '아파트 커뮤니티', '대관 체육공간', '협의 가능한 생활권 공간'];

const consultFlow = ['아이 연령·성향 확인', '현재 운동 경험 확인', '1:1/소그룹 제안', '장소·시간 조율', '수업 시작'];

const parentBenefits = [
  {
    title: '부모가 안심하는 수업',
    description: '아이가 무리 없이 참여할 수 있는 난이도부터 시작합니다.',
  },
  {
    title: '생활에 연결되는 변화',
    description: '수업에서 익힌 움직임이 학교·일상 활동으로 이어집니다.',
  },
  {
    title: '운영이 쉬운 상담 구조',
    description: '상담 단계에서 일정·장소·형태를 한 번에 정리합니다.',
  },
];

function Section({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reducedMotion = useReducedMotion();
  return (
    <motion.section
      initial={reducedMotion ? false : { opacity: 0, y: 24 }}
      whileInView={reducedMotion ? {} : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.55, ease: 'easeOut', delay }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

export default function PrivateLanding() {
  const reducedMotion = useReducedMotion();
  const primaryCta = '/spokedu/contact?type=private';

  return (
    <div className="space-y-10 pb-4 sm:space-y-14">
      <Section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white px-5 pb-6 pt-8 shadow-sm sm:px-10 sm:pb-10 sm:pt-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.12),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(15,23,42,0.08),transparent_44%)]" />
        <div className="relative grid gap-7 lg:grid-cols-[1fr_1.05fr] lg:items-center">
          <div className="space-y-5 sm:space-y-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">For Parents</p>
            <h1 className="text-[2rem] font-black leading-[1.05] text-slate-950 sm:text-6xl">
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
              아이의 성향과 현재 상태를 먼저 확인하고, 가장 적합한 1:1 또는 2~4명 소그룹 수업을 제안합니다.
            </p>
            <div className="grid gap-2.5 sm:flex sm:flex-wrap">
              <Link
                href={primaryCta}
                data-track={inferTrackFromHref(primaryCta)}
                data-track-label="1:1 수업 문의"
                className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800"
              >
                1:1 수업 문의
              </Link>
              <Link
                href={primaryCta}
                data-track={inferTrackFromHref(primaryCta)}
                data-track-label="소그룹 수업 문의"
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5 hover:border-slate-500"
              >
                소그룹 수업 문의
              </Link>
            </div>
          </div>
          <motion.div
            animate={reducedMotion ? {} : { y: [-4, 4, -4] }}
            transition={reducedMotion ? {} : { duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            className="relative h-[240px] overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 sm:h-[360px]"
          >
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${spokeduImageManifest.private.oneToOne})` }}
              role="img"
              aria-label="개인 체육수업 장면"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/45 via-slate-900/5 to-transparent" />
          </motion.div>
        </div>
      </Section>

      <Section className="space-y-5" delay={0.05}>
        <h2 className="text-2xl font-bold leading-tight text-slate-950 sm:text-4xl">아이에게 맞는 수업 구조를 먼저 선택합니다</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {classOptions.map((item) => (
            <article
              key={item.title}
              className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg"
            >
              <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8" delay={0.08}>
        <h2 className="text-2xl font-bold text-slate-950 sm:text-3xl">수업 장소</h2>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {locationItems.map((item) => (
            <div key={item} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
              {item}
            </div>
          ))}
        </div>
      </Section>

      <Section className="space-y-4" delay={0.1}>
        <h2 className="text-2xl font-bold text-slate-950 sm:text-3xl">상담 흐름</h2>
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
        <h2 className="text-2xl font-bold text-slate-950 sm:text-3xl">부모가 체감하는 변화</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {parentBenefits.map((benefit) => (
            <article key={benefit.title} className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="text-base font-semibold text-slate-900">{benefit.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{benefit.description}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section className="rounded-3xl border border-slate-900 bg-slate-950 px-5 py-7 text-white sm:px-8 sm:py-10" delay={0.15}>
        <h2 className="text-2xl font-bold sm:text-3xl">지금, 아이에게 맞는 방식으로 시작하세요</h2>
        <div className="mt-5 grid gap-2.5 sm:flex sm:flex-wrap">
          <Link
            href={primaryCta}
            data-track={inferTrackFromHref(primaryCta)}
            data-track-label="1:1 수업 문의"
            className="inline-flex items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-slate-200"
          >
            1:1 수업 문의
          </Link>
          <Link
            href={primaryCta}
            data-track={inferTrackFromHref(primaryCta)}
            data-track-label="소그룹 수업 문의"
            className="inline-flex items-center justify-center rounded-full border border-slate-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:border-slate-400 hover:bg-slate-900"
          >
            소그룹 수업 문의
          </Link>
        </div>
      </Section>
    </div>
  );
}
