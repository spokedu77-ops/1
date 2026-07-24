import { koreanLineBreak } from '../lib/ui-classes';

export type AudienceTrustMetric = {
  id?: string;
  value: string;
  label: string;
};

type AudienceTrustStripProps = {
  badge: string;
  eyebrow: string;
  items: readonly AudienceTrustMetric[];
};

/** 개인·기관·커리큘럼 랜딩 공통 신뢰 스트립 — 배지 pill 최소화 */
export function AudienceTrustStrip({ badge, eyebrow, items }: AudienceTrustStripProps) {
  return (
    <div className="px-1 sm:px-2">
      <p className="text-[13px] font-semibold tracking-[0.04em] text-[#1D4ED8]">{badge}</p>
      <p className="mt-5 text-[13px] font-semibold uppercase tracking-[0.18em] text-slate-500">{eyebrow}</p>
      <dl className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-8">
        {items.map((item) => (
          <div key={item.id ?? `${item.value}-${item.label}`} className="min-w-0">
            <dt className={`text-2xl font-bold tracking-tight text-[#0B1220] sm:text-[1.75rem] ${koreanLineBreak}`}>
              {item.value}
            </dt>
            <dd className={`mt-1.5 text-sm leading-relaxed text-slate-500 ${koreanLineBreak}`}>{item.label}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
