'use client';

import { useState } from 'react';
import type { SettlementSettings } from './settlementSheetCore';

export default function SettlementCalculationSettings({ settings, hasLockedMonths, onSave }: {
  settings: SettlementSettings; hasLockedMonths: boolean; onSave: (value: SettlementSettings) => Promise<void>;
}) {
  const [vatMethod, setVatMethod] = useState(settings.vatMethod);
  const [year, setYear] = useState(String(settings.year));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  return <form className="space-y-3 border-t border-slate-100 pt-3" onSubmit={async (event) => {
    event.preventDefault();
    const nextYear = Number(year);
    if (!Number.isInteger(nextYear) || nextYear < 2000 || nextYear > 2200) { setError('연도는 2000~2200으로 입력해 주세요.'); return; }
    setSaving(true); setError('');
    try { await onSave({ vatMethod, year: nextYear }); }
    catch (reason) { setError(reason instanceof Error ? reason.message : '저장하지 못했습니다.'); }
    finally { setSaving(false); }
  }}>
    <p className="text-xs font-semibold text-slate-700">계산 기준·기본 연도</p>
    <label className="block text-xs text-slate-600">부가세 자동 계산<select disabled={saving || hasLockedMonths} value={vatMethod} onChange={(event) => setVatMethod(event.target.value as SettlementSettings['vatMethod'])} className="mt-1 h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-xs disabled:bg-slate-50"><option value="sheet">기존 시트 방식 · 총액 × (1 − 0.9091)</option><option value="div11">총액 ÷ 11</option></select></label>
    {hasLockedMonths ? <p className="text-xs leading-5 text-slate-500">확정된 월의 금액을 보존하기 위해 계산 방식은 변경할 수 없습니다.</p> : null}
    <label className="block text-xs text-slate-600">연간 대시보드 기본 연도<input type="number" min={2000} max={2200} step={1} required value={year} disabled={saving} onChange={(event) => setYear(event.target.value)} className="mt-1 h-8 w-full rounded-md border border-slate-200 px-2 text-xs" /></label>
    {error ? <p role="alert" className="text-xs text-rose-600">{error}</p> : null}
    <button type="submit" disabled={saving} className="h-8 w-full rounded-md bg-emerald-700 px-3 text-xs font-semibold text-white disabled:opacity-50">{saving ? '저장 중…' : '계산 기준 저장'}</button>
  </form>;
}
