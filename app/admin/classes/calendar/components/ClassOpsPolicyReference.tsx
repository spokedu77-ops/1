import Link from "next/link";
import { MILEAGE_ACTIONS } from "@/app/admin/classes-shared/constants/mileage";
import { TEACHER_TIER_IDS, tierLabelKo, type TeacherTierId } from "@/app/lib/teacherTierSchedule";

const tierRanges: Record<TeacherTierId, string> = {
  rookie: "0–50회",
  silver: "51–105회",
  gold: "106–165회",
  diamond: "166–230회",
  partner: "231회 이상",
};

export function ClassOpsPolicyReference() {
  return (
    <section aria-labelledby="class-ops-policy" className="border-t-2 border-slate-800 pt-4">
      <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-extrabold text-blue-600">03</p><h2 id="class-ops-policy" className="mt-1 text-xl font-bold tracking-tight text-slate-950">마일리지 · 랭크 규칙</h2></div><Link href="/admin/users?tab=counting" className="mt-1 shrink-0 text-xs font-bold text-blue-600 hover:underline">회차 관리 →</Link></div>
      <div className="mt-3 grid gap-x-5 sm:grid-cols-2">{MILEAGE_ACTIONS.map((action) => <div key={action.label} className="flex min-h-10 items-center justify-between gap-3 border-b border-slate-200 py-2 text-xs"><strong className="text-slate-800">{action.label}</strong><span className="font-extrabold tabular-nums text-slate-900">{action.val > 0 ? "+" : ""}{action.val.toLocaleString("ko-KR")}P</span></div>)}</div>
      <p className="mt-3 border-l-[3px] border-amber-600 bg-amber-50 px-3 py-2 text-[11px] leading-5 text-amber-900"><strong>공휴일 적용:</strong> 수업일이 한국 공휴일이거나 공휴일 데이터 범위 밖이라 확인할 수 없으면 <strong>수업 연기</strong>와 <strong>당일 연기</strong>의 가산점은 0P로 처리됩니다. 실제 회차별 표시는 기존 공휴일 판정 로직을 따릅니다.</p>
      <div className="mt-4 grid grid-cols-2 gap-1.5 sm:grid-cols-5">{TEACHER_TIER_IDS.map((tier) => <div key={tier} className="rounded-lg bg-slate-100 px-2 py-2"><strong className="block text-[11px] text-slate-900">{tierLabelKo(tier)}</strong><span className="mt-0.5 block text-[10px] text-slate-500">{tierRanges[tier]}</span></div>)}</div>
      <p className="mt-2 text-[11px] leading-5 text-slate-500">수업 등록 건수·완료 건수·인정 회차는 서로 다른 값입니다. 화면은 기존 마일리지 상수와 강사 누적 카운팅 원본을 읽기 전용으로 표시합니다.</p>
    </section>
  );
}
