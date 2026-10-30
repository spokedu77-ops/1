'use client';

import { useEffect, useState } from 'react';
import { cloneTierFeeMap, type TierFeeMap } from '@/app/lib/teacherTierSchedule';
import type { TeacherFeeRow } from '@/app/admin/classes/lib/bulkSessionDefaults';
import { teacherFeePreview, type TierFeeRecord } from '@/app/lib/centers/teacherFeePreview';

export default function CenterTeacherFees({ ids }: { ids: (string | null | undefined)[] }) {
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
  return <section className="space-y-3" aria-label="강사료 자동 표시">
    <h3 className="text-lg font-semibold">강사료 · UUID 기준 조회</h3>
    <p className="text-sm text-slate-600">센터 수업(regular_center) 기준: 개별 users 단가 → DB 등급별 단가 순서입니다. 공동 주강사는 각각 주강사 역할이며 합산하지 않습니다. 수업·정산 저장 금액에 자동 반영되지 않습니다.</p>
    {error ? <p role="alert">{error} <button type="button" className="min-h-11 underline" onClick={() => setRetry((n) => n + 1)}>다시 시도</button></p> : !data ? <p role="status">단가 원본 확인 중…</p> : ids.map((id, index) => {
      const duplicate = Boolean(id && ids.slice(0, index).includes(id));
      return <div key={index} className="border-t border-slate-200 py-3 text-sm">
        <p className="font-semibold">{index === 0 ? '주강사' : `공동 주강사 ${index + 1}`} · {data.teachers.find((t) => t.id === id)?.name ?? (id ? '조회 확인 필요' : '미선택')}</p>
        {duplicate ? <p role="alert">동일 강사 중복 배정 · 중복 계산하지 않습니다.</p> : (['main', 'assist'] as const).map((role) => {
          const preview = teacherFeePreview(id, data.teachers, data.tiers, data.map, role);
          return <p key={role} className="mt-1 break-words text-slate-600">{role === 'main' ? '주강사료' : '보조 역할 참고 단가 (현재 배정 아님)'}: {preview.amount == null ? preview.label : `${preview.amount.toLocaleString()}원 · ${preview.label}`}</p>;
        })}
      </div>;
    })}
    <p className="text-sm text-slate-500">보조/백업 이름 문자열은 UUID 배정이 아니므로 이름으로 단가를 추정하지 않습니다.</p>
  </section>;
}
