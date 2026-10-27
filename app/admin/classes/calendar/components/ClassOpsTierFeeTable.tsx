import Link from "next/link";
import {
  TEACHER_TIER_IDS,
  computeTier,
  effectiveFees,
  getTierDefaultFees,
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
  const tier = teacher ? computeTier(totalLessonsFromCounts(teacher.session_count, teacher.log_count)) : null;
  const defaults = tier ? getTierDefaultFees(tier, tierFeeMap) : null;
  const applied = teacher && tier ? effectiveFees(tier, teacher, tierFeeMap) : null;
  const overrides = teacher && defaults && applied ? fields.filter(([, key]) => teacher[key] != null) : [];
  return (
    <section aria-labelledby="class-ops-fees" className="border-t-2 border-slate-800 pt-4">
      <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-extrabold text-blue-600">04</p><h2 id="class-ops-fees" className="mt-1 text-xl font-bold tracking-tight text-slate-950">RANK별 시간당 수업료</h2></div><Link href="/admin/users" className="mt-1 shrink-0 text-xs font-bold text-blue-600 hover:underline">기존 수업료 설정 →</Link></div>
      <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[350px] table-fixed border-collapse text-[11px]"><thead><tr className="bg-slate-50 text-[9px] text-slate-500"><th className="px-1 py-2 text-left">RANK</th>{fields.map(([label]) => <th key={label} className="px-1 py-2 text-right">{label}</th>)}</tr></thead><tbody>{TEACHER_TIER_IDS.map((rowTier) => <tr key={rowTier} className={`border-b border-slate-200 ${tier === rowTier ? "bg-blue-50" : ""}`}><td className="px-1 py-2 text-left font-bold text-slate-800">{tierLabelKo(rowTier)}</td>{fields.map(([, key]) => <td key={key} className="px-1 py-2 text-right tabular-nums text-slate-700">{money(tierFeeMap[rowTier][key])}</td>)}</tr>)}</tbody></table></div>
      {teacher && tier && defaults && applied ? <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-[11px] leading-5 text-blue-950"><strong>{teacher.name} · {tierLabelKo(tier)}</strong>{overrides.length ? <> — {overrides.map(([label, key]) => <span key={key} className="ml-2 inline-block">{label} 기본 {money(defaults[key])}원 → <strong className="text-blue-700">개별 {money(applied[key])}원</strong></span>)}</> : <span> — 모든 유형에 등급 기본값 적용</span>}</div> : <p className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-500">강사를 선택하면 등급 기본값과 개별 지정값을 비교합니다.</p>}
      <p className="mt-2 text-[11px] leading-5 text-slate-500">{feeSource === "fallback" ? "DB 기준표를 확인하지 못해 코드 fallback을 표시 중입니다. " : "DB의 현재 기준표를 표시합니다. "}<strong>null</strong>은 등급 기본값 상속, 실제 <strong>0</strong>은 0원 개별 지정입니다. 60·90·120분 환산이나 확정 지급액을 의미하지 않습니다.</p>
    </section>
  );
}
