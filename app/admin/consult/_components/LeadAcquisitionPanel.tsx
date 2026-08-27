'use client';

import type { LeadEnvelope } from '@/app/spokedu/data/lead-envelope';

type LeadAcquisitionPanelProps = {
  leadContext: LeadEnvelope | null | undefined;
};

function row(label: string, value: string | undefined | null) {
  if (!value?.trim()) return null;
  return (
    <div className="grid grid-cols-[5.5rem_1fr] gap-2 text-xs">
      <dt className="text-slate-500">{label}</dt>
      <dd className="break-all text-slate-300">{value}</dd>
    </div>
  );
}

/** 상세 modal 하단 — 유입 정보 (접힘) */
export function LeadAcquisitionPanel({ leadContext }: LeadAcquisitionPanelProps) {
  const acq = leadContext?.acquisition;
  const cta = leadContext?.ctaIntentId;
  const hasAny =
    Boolean(acq?.submitPath) ||
    Boolean(acq?.entryPath) ||
    Boolean(acq?.utmSource) ||
    Boolean(acq?.utmCampaign) ||
    Boolean(acq?.entrySurface) ||
    Boolean(acq?.referrer) ||
    Boolean(cta);

  if (!hasAny) return null;

  const utm =
    acq?.utmSource || acq?.utmCampaign
      ? [acq.utmSource, acq.utmCampaign].filter(Boolean).join(' / ')
      : undefined;

  return (
    <details className="rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3">
      <summary className="cursor-pointer select-none text-sm font-medium text-slate-400">
        유입 정보
      </summary>
      <dl className="mt-3 space-y-1.5">
        {row('신청 경로', acq?.submitPath)}
        {row('최초 유입', acq?.entryPath)}
        {row('표면', acq?.entrySurface)}
        {row('UTM', utm)}
        {row('CTA', cta)}
        {row('referrer', acq?.referrer)}
        {row('entryId', acq?.entryId)}
      </dl>
    </details>
  );
}
