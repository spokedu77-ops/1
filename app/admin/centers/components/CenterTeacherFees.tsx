'use client';

import { useEffect, useState } from 'react';
import { cloneTierFeeMap, type TierFeeMap } from '@/app/lib/teacherTierSchedule';
import type { TeacherFeeRow } from '@/app/admin/classes/lib/bulkSessionDefaults';
import { teacherFeePreview, type TierFeeRecord } from '@/app/lib/centers/teacherFeePreview';
import type { CenterTeacherFee, TeacherOption } from '@/app/lib/centers/types';
import { isZeroFeeStaff } from '@/app/lib/staffTeacherFees';
import { totalCenterFee, type CenterBillingBreakdown } from '@/app/lib/centers/feeBreakdown';

export type ResolvedCenterLabor = { assignmentKey: string; fees: CenterTeacherFee[] };

export default function CenterTeacherFees({ ids, overrides = [], onFeesChange, teachers, onTeacherChange, names = [], summary = false, sessionFee, billingBreakdown, onResolvedFees }: {
  ids: (string | null | undefined)[];
  overrides?: CenterTeacherFee[];
  onFeesChange?: (fees: CenterTeacherFee[]) => void;
  teachers?: TeacherOption[];
  onTeacherChange?: (index: number, id: string) => void;
  names?: (string | null | undefined)[];
  summary?: boolean;
  sessionFee?: number | null;
  billingBreakdown?: CenterBillingBreakdown;
  onResolvedFees?: (value: ResolvedCenterLabor) => void;
}) {
  const [extraSlots, setExtraSlots] = useState(0);
  const [data, setData] = useState<{ teachers: TeacherFeeRow[]; tiers: TierFeeRecord[]; map: TierFeeMap } | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const read = async (url: string) => {
      const response = await fetch(url, { cache: 'no-store', signal: controller.signal });
      if (!response.ok) throw new Error('강사 단가 원본을 불러오지 못했습니다.');
      return response.json();
    };
    Promise.all([read('/api/admin/class-ops/reference'), read('/api/admin/teacher-tier-fees')]).then(([reference, fees]) => {
      const map = cloneTierFeeMap();
      for (const row of fees.fees) if (row.tier_id in map) map[row.tier_id as keyof TierFeeMap] = row;
      if (!controller.signal.aborted) { setData({ teachers: reference.teachers.map((row: TeacherFeeRow & { log_count: number }) => ({ ...row, logCount: row.log_count })), tiers: fees.fees, map }); setError(''); }
    }).catch((reason) => { if (!controller.signal.aborted) setError(reason.message); });
    return () => controller.abort();
  }, [retry]);
  const rows = ids.map((id, index) => {
    const role = index === 0 ? 'main' : 'assist';
    const preview = data && id ? teacherFeePreview(id, data.teachers, data.tiers, data.map, role) : { amount: null };
    const staff = isZeroFeeStaff(data?.teachers.find((teacher) => teacher.id === id));
    const override = overrides.find((fee) => fee.teacher_id === id && fee.role === role);
    return { id, index, role, staff, override, amount: staff ? 0 : override?.amount ?? preview.amount,
      name: data?.teachers.find((teacher) => teacher.id === id)?.name ?? names[index] ?? '선택한 강사',
      duplicate: Boolean(id && ids.slice(0, index).includes(id)) };
  });
  const money = (amount: number | null | undefined) => amount == null ? '미설정' : `${amount.toLocaleString()}원`;
  const resolvedSnapshot = JSON.stringify({ assignmentKey: ids.map((id) => id ?? '').join('|'),
    fees: data && !error ? rows.filter((row) => row.id && row.amount != null).map((row) => ({ teacher_id: row.id, role: row.role, amount: row.amount })) : [] });
  useEffect(() => { onResolvedFees?.(JSON.parse(resolvedSnapshot) as ResolvedCenterLabor); }, [resolvedSnapshot, onResolvedFees]);
  if (summary) {
    const assistants = rows.slice(1).filter((row) => row.id);
    const assistTotal = assistants.some((row) => row.amount == null || row.duplicate) ? null : assistants.reduce((sum, row) => sum + (row.amount ?? 0), 0);
    const mainTotal = ids[0] ? rows[0]?.amount : 0;
    const laborTotal = mainTotal == null || assistTotal == null || rows.some((row) => row.duplicate) ? null : mainTotal + assistTotal;
    return <section aria-label="센터 청구 수업료와 지급 강사료" className="min-w-0 space-y-2">
      <div className="min-w-0 rounded-lg bg-indigo-50/70 px-3 py-2">
        <h2 className="mb-2 text-xs font-semibold text-indigo-800">우리가 받는 회당 수업료</h2>
        <dl className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-3">
          {([['주강사비', billingBreakdown?.mainCharge], ['보조강사비', billingBreakdown?.assistCharge], ['대여비', billingBreakdown?.rentalCharge]] as const).map(([label, amount]) => <div key={label} className="flex min-w-0 justify-between gap-2 text-xs sm:block"><dt className="text-slate-500">{label}</dt><dd className="min-w-0 break-words font-semibold tabular-nums text-slate-800 sm:mt-1">{money(amount)}</dd></div>)}
        </dl>
        <div className="mt-2 flex min-w-0 flex-wrap items-center justify-between gap-2 border-t border-indigo-100 pt-2 text-sm font-semibold text-indigo-700"><span>총 회당 수업료{!billingBreakdown ? ' (기존 저장 금액)' : ''}</span><span className="min-w-0 break-words tabular-nums">{money(billingBreakdown ? totalCenterFee(billingBreakdown) : sessionFee)}</span></div>
      </div>
      <div className="min-w-0 rounded-lg bg-emerald-50/70 px-3 py-2">
        <h2 className="mb-2 text-xs font-semibold text-emerald-800">선생님이 받는 강사료</h2>
        <dl className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
          {[
            { label: '메인 선생님 수업료', amount: mainTotal, name: ids[0] ? rows[0]?.name : '미배정' },
            { label: '보조 선생님 수업료 합계', amount: assistTotal, name: assistants.map((row) => row.name).join(', ') || '미배정' },
          ].map((item) => <div key={item.label} className="min-w-0 text-xs"><dt className="text-slate-500">{item.label}</dt><dd className="mt-1 flex min-w-0 justify-between gap-2"><span className="min-w-0 break-words text-slate-500">{item.name}</span><span className="min-w-0 break-words font-semibold tabular-nums text-slate-800">{money(item.amount)}</span></dd></div>)}
        </dl>
        <div className="mt-2 flex min-w-0 flex-wrap items-center justify-between gap-2 border-t border-emerald-100 pt-2 text-sm font-semibold text-emerald-800"><span>강사료 합계 (인건비 / 회)</span><span className="min-w-0 break-words tabular-nums">{money(laborTotal)}</span></div>
      </div>
      {rows.some((row) => row.duplicate) ? <p role="alert" className="text-xs text-red-600">중복 배정 확인 · 강사 배정을 수정해 주세요.</p> : null}
      {error ? <p role="alert" className="text-xs text-red-600">기본 단가 조회 실패 <button type="button" onClick={() => setRetry((n) => n + 1)} className="underline">다시 시도</button></p> : null}
    </section>;
  }
  if (onTeacherChange && teachers) {
    const visibleSlots = Math.max(1, ids[2] ? 3 : ids[1] ? 2 : 1, extraSlots + 1);
    const control = 'h-10 w-full min-w-0 max-w-full rounded-md border border-slate-200 bg-white px-3 text-sm';
    return <section aria-label="강사 배정 및 회당 강사료" className="min-w-0 rounded-lg border border-slate-200">
      <div className="hidden grid-cols-[4rem_minmax(0,1fr)_minmax(0,1fr)] gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-500 sm:grid"><span>역할</span><span>강사</span><span>선생님 수업료 / 회</span></div>
      {rows.slice(0, visibleSlots).map((row) => <div key={row.index} className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center gap-3 border-b border-slate-100 px-3 py-3 sm:grid-cols-[4rem_minmax(0,1fr)_minmax(0,1fr)]">
        <span className="col-span-2 text-xs text-slate-500 sm:col-span-1">{row.index === 0 ? '메인' : `보조 ${row.index}`}</span>
        <select aria-label={row.index === 0 ? '메인 강사' : `보조 강사 ${row.index}`} className={control} value={row.id ?? ''} onChange={(event) => onTeacherChange(row.index, event.target.value)}>
          <option value="">미배정</option>
          {row.id && !teachers.some((teacher) => teacher.id === row.id) ? <option value={row.id}>{row.name}</option> : null}
          {teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}
        </select>
        <label className="flex min-w-0 items-center gap-1 text-xs text-slate-500"><input aria-label={row.index === 0 ? '메인 선생님 수업료' : `보조 선생님 ${row.index} 수업료`} type="number" min={0} step={1} max={Number.MAX_SAFE_INTEGER}
          disabled={!row.id || row.staff} value={row.staff ? 0 : row.override?.amount ?? ''} placeholder={row.amount == null ? '직접 입력' : String(row.amount)}
          onChange={(event) => {
            const remaining = overrides.filter((fee) => !(fee.teacher_id === row.id && fee.role === row.role));
            if (event.target.value === '') { onFeesChange?.(remaining); return; }
            const amount = Number(event.target.value);
            if (row.id && Number.isSafeInteger(amount) && amount >= 0) onFeesChange?.([...remaining, { teacher_id: row.id, role: row.index === 0 ? 'main' : 'assist', amount }]);
          }} className={control + ' text-right tabular-nums disabled:bg-slate-50'} /><span className="shrink-0">원</span></label>
        {row.duplicate ? <p role="alert" className="col-span-2 text-xs text-red-600 sm:col-span-3">동일 강사가 중복 배정되어 있습니다.</p> : null}
      </div>)}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
        {visibleSlots < 3 ? <button type="button" onClick={() => setExtraSlots(visibleSlots)} className="min-h-8 text-xs font-medium text-indigo-600">+ 보조 강사 추가</button> : null}
        <span className="text-xs text-slate-500">금액을 비워두면 기본 단가 사용</span>
      </div>
      {error ? <p role="alert" className="px-3 pb-2 text-xs text-red-600">기본 단가 조회 실패 · 직접 입력 가능 <button type="button" className="underline" onClick={() => setRetry((n) => n + 1)}>다시 시도</button></p> : null}
    </section>;
  }
  return <section className="rounded-lg border border-slate-200 bg-white" aria-label="강사료 참고">
    <div className="flex flex-wrap items-baseline justify-between gap-1 border-b border-slate-100 px-3 py-2">
      <h3 className="text-sm font-semibold text-slate-900">강사료</h3>
      <p className="text-xs text-slate-500">{onFeesChange ? '센터별 회당 금액 · 비워두면 기본 단가 사용' : '센터별 회당 금액 · 수업·정산은 별도 저장'}</p>
    </div>
    {error ? <p role="alert" className="px-3 py-2 text-xs text-red-600">기본 단가를 불러오지 못했습니다. 직접 입력은 가능합니다. <button type="button" className="underline" onClick={() => setRetry((n) => n + 1)}>다시 시도</button></p> : null}
    {!data && !onFeesChange && !overrides.length && !error ? <p role="status" className="px-3 py-2 text-xs text-slate-500">불러오는 중…</p> : <dl className="divide-y divide-slate-100">
      {ids.map((id, index) => {
        if (!id) return null;
        const preview = data ? teacherFeePreview(id, data.teachers, data.tiers, data.map, index === 0 ? 'main' : 'assist') : { amount: null };
        const role = index === 0 ? 'main' : 'assist';
        const staff = isZeroFeeStaff(data?.teachers.find((teacher) => teacher.id === id));
        const override = staff ? undefined : overrides.find((fee) => fee.teacher_id === id && fee.role === role);
        const amount = staff ? 0 : override?.amount ?? preview.amount;
        const duplicate = ids.slice(0, index).includes(id);
        return <div key={index} className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
          <dt className="text-slate-600"><span className="mr-2 text-slate-400">{index === 0 ? '메인' : `보조 ${index}`}</span>{data?.teachers.find((teacher) => teacher.id === id)?.name ?? '선택한 강사'}</dt>
          <dd className="font-medium tabular-nums text-slate-900">{duplicate ? '중복 배정 확인' : onFeesChange ? <label className="inline-flex items-center gap-1.5">
            <input type="number" min={0} step={1} max={Number.MAX_SAFE_INTEGER} aria-label={`${index === 0 ? '메인' : `보조 ${index}`} 회당 강사료`}
              disabled={staff} value={staff ? 0 : override?.amount ?? ''} placeholder={preview.amount == null ? '직접 입력' : String(preview.amount)}
              onChange={(event) => {
                const remaining = overrides.filter((fee) => !(fee.teacher_id === id && fee.role === role));
                if (event.target.value === '') { onFeesChange(remaining); return; }
                const next = Number(event.target.value);
                if (Number.isSafeInteger(next) && next >= 0) onFeesChange([...remaining, { teacher_id: id, role, amount: next }]);
              }} className="h-8 w-28 rounded-md border border-slate-200 px-2 text-right text-sm tabular-nums" />원
          </label> : amount == null ? '단가 확인 필요' : `${amount.toLocaleString()}원`}</dd>
        </div>;
      })}
      {!ids.some(Boolean) ? <div className="px-3 py-2 text-xs text-slate-400">강사 미배정</div> : null}
    </dl>}
  </section>;
}
