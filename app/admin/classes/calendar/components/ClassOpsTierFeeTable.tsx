"use client";

import { useState } from "react";
import Link from "next/link";
import { isZeroFeeStaff } from "@/app/lib/staffTeacherFees";
import {
  TEACHER_TIER_IDS,
  computeTier,
  effectiveFees,
  getTierDefaultFees,
  getTier90Fees,
  tierLabelKo,
  totalLessonsFromCounts,
  type TierFeeMap,
} from "@/app/lib/teacherTierSchedule";
import type { ClassOpsTeacher } from "../hooks/useClassOpsReferenceData";

type Props = { teacher: ClassOpsTeacher | null; tierFeeMap: TierFeeMap; feeSource: "db" | "fallback" };
const fields = [
  ["개인", "fee_private"],
  ["그룹", "fee_group"],
  ["센터 메인", "fee_center_main"],
  ["센터 보조", "fee_center_assist"],
] as const;

function money(value: number) { return value.toLocaleString("ko-KR"); }

export function ClassOpsTierFeeTable({ teacher, tierFeeMap, feeSource }: Props) {
  const [minutes, setMinutes] = useState<60 | 90>(60);
  const tier = teacher ? computeTier(totalLessonsFromCounts(teacher.session_count, teacher.log_count)) : null;
  const defaults = tier ? (minutes === 90 ? getTier90Fees(tier, tierFeeMap) : getTierDefaultFees(tier, tierFeeMap)) : null;
  const applied = teacher && tier ? (minutes === 90 && !isZeroFeeStaff(teacher) ? getTier90Fees(tier, tierFeeMap) : effectiveFees(tier, teacher, tierFeeMap)) : null;
  const overrides = minutes === 60 && teacher && defaults && applied ? fields.filter(([, key]) => teacher[key] != null) : [];
  return (
    <section aria-labelledby="class-ops-fees" className="border-t-2 border-slate-800 pt-4">
      <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-extrabold text-blue-600">04</p><h2 id="class-ops-fees" className="mt-1 text-xl font-bold tracking-tight text-slate-950">등급별 기본 수업료</h2></div><Link href="/admin/classes/calendar?workspace=fees" className="mt-1 shrink-0 text-xs font-bold text-blue-600 hover:underline">기존 수업료 설정 →</Link></div>
      <div className="mt-3 flex gap-2" role="group" aria-label="수업료 기준 시간">
        {([60, 90] as const).map(duration => <button key={duration} type="button" aria-pressed={minutes === duration} onClick={() => setMinutes(duration)} className={`min-h-11 rounded-lg px-4 text-sm font-semibold ${minutes === duration ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-600'}`}>{duration}분</button>)}
      </div>
      <div className="mt-3 overflow-x-auto">
        <h3 className="mb-1 text-xs font-semibold text-slate-700">{minutes}분 기준</h3>
        <table className="w-full min-w-[440px] table-fixed border-collapse text-xs"><thead><tr className="bg-slate-50 text-slate-500"><th className="px-1 py-2 text-left">등급</th>{fields.map(([label]) => <th key={label} className="px-1 py-2 text-right">{label}</th>)}</tr></thead>
          <tbody>{TEACHER_TIER_IDS.map(rowTier => { const row = minutes === 90 ? getTier90Fees(rowTier, tierFeeMap) : getTierDefaultFees(rowTier, tierFeeMap); return <tr key={rowTier} className={`border-b border-slate-200 ${tier === rowTier ? 'bg-blue-50' : ''}`}><th className="px-1 py-2 text-left text-slate-800">{tierLabelKo(rowTier)}</th>{fields.map(([, key]) => <td key={key} className="px-1 py-2 text-right tabular-nums text-slate-700">{money(row[key])}원</td>)}</tr>; })}</tbody>
        </table>
      </div>
      {teacher && tier && defaults && applied ? <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-[11px] leading-5 text-blue-950"><strong>{teacher.name} · {tierLabelKo(tier)}</strong>{overrides.length ? <> — {overrides.map(([label, key]) => <span key={key} className="ml-2 inline-block">{label} 기본 {money(defaults[key])}원 → <strong className="text-blue-700">개별 {money(applied[key])}원</strong></span>)}</> : <span> — 모든 유형에 등급 기본값 적용</span>}</div> : <p className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-500">강사를 선택하면 등급 기본값과 개별 지정값을 비교합니다.</p>}
      <p className="mt-2 text-[11px] leading-5 text-slate-500">{feeSource === "fallback" ? "DB 기준표를 확인하지 못해 코드 fallback을 표시 중입니다. " : "DB의 현재 기준표를 표시합니다. "}<strong>null</strong>은 등급 기본값 상속, 실제 <strong>0</strong>은 0원 개별 지정입니다. 90분은 별도 등급표를 적용하며, 120분은 기존 방식을 유지합니다. 기존 수업의 저장 금액은 변경되지 않습니다.</p>
    </section>
  );
}
