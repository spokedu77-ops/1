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

/** 개인·기관·커리큘럼 랜딩 공통 신뢰 스트립 — 배지 + 운영 방식 수치 */
export function AudienceTrustStrip({ badge, eyebrow, items }: AudienceTrustStripProps) {
  return (
    <div className="px-1 sm:px-2">
      <span className="inline-flex items-center rounded-full bg-teal-600/10 px-3.5 py-1.5 text-xs font-semibold text-teal-900">
        {badge}
      </span>
      <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.2em] text-stone-600">{eyebrow}</p>
      <dl className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-8">
        {items.map((item) => (
          <div key={item.id ?? `${item.value}-${item.label}`} className="min-w-0">
            <dt className={`text-2xl font-bold tracking-tight text-stone-950 sm:text-[1.75rem] ${koreanLineBreak}`}>
              {item.value}
            </dt>
            <dd className={`mt-1.5 text-sm leading-relaxed text-stone-600 ${koreanLineBreak}`}>{item.label}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
