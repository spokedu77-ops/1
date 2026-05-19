'use client';

import Link from 'next/link';
import { LandingSection } from './landing-section';
import { HeroCtaStack } from './hero-cta-stack';
import { aboutLabHighlights, aboutRepresentativeProfile, philosophyCards } from '../data/content';
import { operationalCaseLinks } from '../data/cases';
import { cardInteractive, landingH1, landingHeroShell, landingPageStack, linkMuted } from '../lib/ui-classes';
import { inferTrackFromHref } from '../lib/tracking';

const trustPillars = [
  { title: '현장 운영', description: '개인·기관·행사 현장에서 수업을 직접 설계·실행합니다.' },
  { title: '커리큘럼화', description: '검증한 수업을 반복 운영 가능한 콘텐츠로 정리합니다.' },
  { title: '강사 교육', description: '운영 기준과 피드백 루프로 수업 품질을 맞춥니다.' },
];

export function AboutLanding() {
  return (
    <div className={landingPageStack}>
      {/* 1. Hero */}
      <LandingSection className={`${landingHeroShell} border-slate-800 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 text-white`}>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">About SPOKEDU</p>
        <h1 className={`mt-2 sm:mt-3 ${landingH1}`}>
          우리는 아이를 가르치고,
          <br />
          선생님을 가르치며,
          <br className="sm:hidden" />
          <span className="hidden sm:inline">
            <br />
          </span>
          체육수업을 콘텐츠로 만듭니다
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">
          단순 수업 업체가 아닌, 아동·청소년 체육교육을 설계·운영·콘텐츠화하는 전문 단체입니다.
        </p>
        <div className="mt-4">
          <HeroCtaStack
            variant="dark"
            primary={{ href: '/spokedu/records', label: '현장기록 보기', track: 'cta-records' }}
            secondary={[
              { href: '/spokedu/contact', label: '문의하기', track: 'cta-contact' },
              { href: '/spokedu/programs', label: '프로그램', track: 'cta-programs' },
            ]}
          />
        </div>
      </LandingSection>

      {/* 2. Method */}
      <LandingSection className="space-y-3" delay={0.05}>
        <h2 className="text-xl font-bold text-slate-950 sm:text-2xl">SPOKEDU Method</h2>
        <div className="grid gap-2.5 sm:grid-cols-3 sm:gap-3">
          {philosophyCards.map((item) => (
            <article key={item.code} className={`rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 ${cardInteractive}`}>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-600">{item.code}</p>
              <h3 className="mt-1.5 text-base font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-1.5 line-clamp-3 text-sm leading-5 text-slate-600">{item.description}</p>
            </article>
          ))}
        </div>
      </LandingSection>

      {/* 3. Trust pillars */}
      <LandingSection className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6" delay={0.08}>
        <h2 className="text-lg font-bold text-slate-950 sm:text-xl">신뢰의 기준</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-3">
          {trustPillars.map((item) => (
            <li key={item.title} className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
              <h3 className="text-sm font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-1 text-xs leading-5 text-slate-600 sm:text-sm">{item.description}</p>
            </li>
          ))}
        </ul>
      </LandingSection>

      {/* 4. LAB */}
      <LandingSection className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-6" delay={0.1}>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-indigo-600">SPOKEDU LAB</p>
        <h2 className="mt-1 text-lg font-bold text-slate-950 sm:text-xl">운영 기준을 만드는 현장 거점</h2>
        <ul className="mt-3 space-y-2">
          {aboutLabHighlights.map((item) => (
            <li key={item} className="text-sm leading-6 text-slate-700">
              · {item}
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          {operationalCaseLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              data-track={item.href.includes('records') ? 'cta-records' : inferTrackFromHref(item.href)}
              data-track-label={item.label}
              className={`rounded-full border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 sm:text-sm ${linkMuted}`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </LandingSection>

      {/* 5. Representative */}
      <LandingSection className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6" delay={0.12}>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Representative</p>
        <h2 className="mt-1 text-lg font-bold text-slate-950 sm:text-xl">{aboutRepresentativeProfile.name}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-700">{aboutRepresentativeProfile.intro}</p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-3">
          {aboutRepresentativeProfile.points.map((point) => (
            <li key={point} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-xs leading-5 text-slate-700 sm:text-sm">
              {point}
            </li>
          ))}
        </ul>
        <div className="mt-4">
          <HeroCtaStack
            primary={{ href: '/spokedu/contact', label: '상담 문의', track: 'cta-contact' }}
            secondary={[{ href: '/spokedu/dispatch', label: '기관 제안', track: 'cta-dispatch' }]}
          />
        </div>
      </LandingSection>
    </div>
  );
}
