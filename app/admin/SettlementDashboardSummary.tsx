'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import SettlementProfitSummary from './master/reports/SettlementProfitSummary';
import type { summarize } from './master/reports/settlementSheetCore';
import styles from './master/reports/SettlementSheet.module.css';

type Data = { month: { key: string; label: string; locked: boolean } | null; summary: ReturnType<typeof summarize> | null };

export default function SettlementDashboardSummary({ refreshKey = 0 }: { refreshKey?: number }) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setError(false);
    fetch('/api/admin/settlement-summary', { credentials: 'include', cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        if (response.status === 401 || response.status === 403) return null;
        if (!response.ok) throw new Error();
        return response.json() as Promise<Data>;
      }).then((body) => { if (!controller.signal.aborted) setData(body); })
      .catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [retry, refreshKey]);
  if (error) return <div role="alert" className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">정산 지표를 불러오지 못했습니다. <button type="button" onClick={() => setRetry((value) => value + 1)} className="ml-2 underline">다시 시도</button></div>;
  if (!data?.month || !data.summary) return null;
  return <section className={`${styles.sheet} min-w-0`} aria-label="수업료 정산 요약">
    <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><h2 className="text-sm font-semibold text-slate-800">{data.month.label} <span className="ml-1 text-xs font-normal text-slate-500">{data.month.locked ? '확정' : '미확정'}</span></h2><Link href="/admin/master/reports?tab=sheet" className="text-xs font-semibold text-emerald-700">정산 시트 열기 →</Link></div>
    <SettlementProfitSummary summary={data.summary} />
  </section>;
}
