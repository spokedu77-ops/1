'use client';

import { homePage } from '../data/home-page';
import { homeBleedBand, koreanLineBreak, landingSectionLead } from '../lib/ui-classes';
import { HomeSectionHeading } from './home-section-heading';

export function HomeTrustStrip() {
  const { trustStrip } = homePage;

  return (
    <section className={homeBleedBand} aria-label="스포키듀 운영 현장 요약">
      <HomeSectionHeading eyebrow={trustStrip.eyebrow} titleLines={trustStrip.titleLines} />
      <ul className="mt-5 grid w-full grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {trustStrip.items.map((item, index) => (
          <li
            key={item.label}
            className={`flex min-h-[4.25rem] w-full min-w-0 flex-col rounded-2xl border border-slate-200/90 bg-white px-3.5 py-2.5 shadow-sm sm:min-h-[4.5rem] sm:px-4 sm:py-3 ${
              index === trustStrip.items.length - 1 && trustStrip.items.length % 2 === 1
                ? 'col-span-2 sm:col-span-1 lg:col-span-1'
                : ''
            }`}
          >
            <span className={`text-sm font-bold text-slate-950 ${koreanLineBreak}`}>{item.label}</span>
            <span className={`mt-0.5 text-xs font-medium text-slate-500 ${koreanLineBreak}`}>
              {item.detail}
            </span>
          </li>
        ))}
      </ul>
      <p className={`${landingSectionLead} mt-4 w-full text-slate-500 ${koreanLineBreak}`}>
        아래 현장 기록과 프로그램에서 사례·사진을 확인할 수 있습니다.
      </p>
    </section>
  );
}
