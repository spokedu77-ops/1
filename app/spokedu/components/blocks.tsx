import type { TrustReasonCard } from '../data/content';
import { trustReasonCards } from '../data/content';

type SectionHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
};

function SectionHeader({ eyebrow, title, description }: SectionHeaderProps) {
  return (
    <div className="mx-auto w-full max-w-3xl text-center">
      {eyebrow ? (
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">{eyebrow}</p>
      ) : null}
      <h2 className="text-2xl font-semibold leading-tight text-slate-900 sm:text-3xl">{title}</h2>
      {description ? <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">{description}</p> : null}
    </div>
  );
}

type WhySpokeduTrustSectionProps = {
  cards?: TrustReasonCard[];
};

export function WhySpokeduTrustSection({ cards = trustReasonCards }: WhySpokeduTrustSectionProps) {
  return (
    <section className="space-y-7 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <SectionHeader
        eyebrow="운영 기준"
        title="스포키듀 신뢰 기준"
        description="기록과 실행으로 신뢰를 보여줍니다."
      />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <article key={card.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="text-base font-semibold text-slate-900">{card.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{card.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
