'use client';

import type { LeadSummaryView } from '@/app/lib/admin/leadInboxSummary';
import { leadRouteBadgeClass } from '@/app/lib/admin/leadRouteStyles';
import { leadRouteLabel } from '@/app/spokedu/data/lead-envelope';

type LeadSummaryProps = {
  summary: LeadSummaryView;
  /** list: 칩 위주 / detail: 라벨 행 */
  variant?: 'list' | 'inquiry' | 'conditions' | 'detail';
  className?: string;
};

function Chip({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex max-w-full truncate rounded px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ${className}`}
    >
      {children}
    </span>
  );
}

const FACT_CHIP = 'bg-slate-800 text-slate-200 ring-slate-600/80';
const NEUTRAL_CHIP = 'bg-slate-800/80 text-slate-300 ring-slate-700';

function inquirySubtitle(summary: LeadSummaryView): string | undefined {
  if (summary.subtitle && summary.subtitle !== leadRouteLabel(summary.route)) {
    return summary.subtitle;
  }
  const stripped = summary.title.replace(/^(개인수업|기관수업|커리큘럼|기타 문의)\s*·\s*/, '').trim();
  if (stripped && stripped !== leadRouteLabel(summary.route) && stripped !== summary.title) {
    return stripped;
  }
  return undefined;
}

export function LeadSummary({ summary, variant = 'list', className = '' }: LeadSummaryProps) {
  const routeBadge = leadRouteBadgeClass(summary.route);

  if (variant === 'inquiry') {
    const sub = inquirySubtitle(summary);
    return (
      <div className={className}>
        <div className="flex flex-wrap items-center gap-1.5">
          <Chip className={routeBadge}>{leadRouteLabel(summary.route)}</Chip>
        </div>
        {sub ? <p className="mt-1 text-sm font-medium text-slate-100">{sub}</p> : null}
      </div>
    );
  }

  if (variant === 'conditions') {
    const factChips: string[] = [];
    if (summary.facts.location) factChips.push(summary.facts.location);
    if (summary.facts.preferredTime) factChips.push(summary.facts.preferredTime);
    const chips = [...factChips, ...summary.tags].slice(0, 4);
    if (chips.length === 0) {
      return <span className={`text-xs text-slate-500 ${className}`}>조건 없음</span>;
    }
    return (
      <div className={`flex flex-wrap gap-1 ${className}`}>
        {chips.map((c) => (
          <Chip key={c} className={FACT_CHIP}>
            {c}
          </Chip>
        ))}
      </div>
    );
  }

  if (variant === 'detail') {
    const sub = inquirySubtitle(summary);
    return (
      <div className={className}>
        <div className="flex flex-wrap items-center gap-2">
          <Chip className={routeBadge}>{leadRouteLabel(summary.route)}</Chip>
          {sub ? <span className="text-sm font-semibold text-slate-100">{sub}</span> : null}
        </div>
        {summary.detailRows.length > 0 ? (
          <dl className="mt-3 space-y-1.5 text-sm">
            {summary.detailRows.map((row) => (
              <div key={row.label} className="grid grid-cols-[5.5rem_1fr] gap-2">
                <dt className="text-slate-500">{row.label}</dt>
                <dd className="text-slate-200">{row.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        {summary.request ? (
          <div className="mt-3 rounded-lg border border-slate-700/80 bg-slate-950/40 px-3 py-2">
            <p className="text-xs font-medium text-slate-500">핵심 문의</p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-200">{summary.request}</p>
          </div>
        ) : null}
      </div>
    );
  }

  // list default
  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-1.5">
        <Chip className={routeBadge}>{leadRouteLabel(summary.route)}</Chip>
        {inquirySubtitle(summary) ? (
          <span className="text-sm font-medium text-slate-100">{inquirySubtitle(summary)}</span>
        ) : null}
      </div>
      <div className="mt-1 flex flex-wrap gap-1">
        {summary.facts.location ? <Chip className={FACT_CHIP}>{summary.facts.location}</Chip> : null}
        {summary.facts.preferredTime ? (
          <Chip className={FACT_CHIP}>{summary.facts.preferredTime}</Chip>
        ) : null}
        {summary.tags.slice(0, 2).map((t) => (
          <Chip key={t} className={NEUTRAL_CHIP}>
            {t}
          </Chip>
        ))}
      </div>
    </div>
  );
}
