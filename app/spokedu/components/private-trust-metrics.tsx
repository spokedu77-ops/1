'use client';

import { privatePage } from '../data/private-page';
import { koreanLineBreak } from '../lib/ui-classes';

/** 근거 없는 카운트업 수치 대신 검증 가능한 운영 언어만 표시 */
export function PrivateTrustMetrics() {
  return (
    <div>
      <span className="inline-flex items-center rounded-full bg-teal-600/10 px-3.5 py-1.5 text-xs font-semibold text-teal-900">
        {privatePage.hero.trustBadge}
      </span>
      <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.2em] text-stone-500">
        {privatePage.trustMetrics.eyebrow}
      </p>
      <dl className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-8">
        {privatePage.trustMetrics.items.map((item) => (
          <div key={item.id}>
            <dt className="text-2xl font-bold tracking-tight text-stone-950 sm:text-[1.75rem]">{item.value}</dt>
            <dd className={`mt-1 text-sm text-stone-600 ${koreanLineBreak}`}>{item.label}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
