'use client';

import { useEffect, useState } from 'react';
import { cloneTierFeeMap, type TierFeeMap } from '@/app/lib/teacherTierSchedule';
import type { TeacherFeeRow } from '@/app/admin/classes/lib/bulkSessionDefaults';
import { teacherFeePreview, type TierFeeRecord } from '@/app/lib/centers/teacherFeePreview';
import type { CenterTeacherFee } from '@/app/lib/centers/types';
import { isZeroFeeStaff } from '@/app/lib/staffTeacherFees';

export default function CenterTeacherFees({ ids, overrides = [], onFeesChange }: {
  ids: (string | null | undefined)[];
  overrides?: CenterTeacherFee[];
  onFeesChange?: (fees: CenterTeacherFee[]) => void;
}) {
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
