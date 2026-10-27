"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import type { SessionEvent } from "@/app/admin/classes-shared/types";
import {
  computeTier,
  effectiveFees,
  getTierDefaultFees,
  tierLabelKo,
  totalLessonsFromCounts,
  type TierFeeMap,
} from "@/app/lib/teacherTierSchedule";
import type { ClassOpsTeacher } from "../hooks/useClassOpsReferenceData";

type Props = {
  teachers: ClassOpsTeacher[];
  selectedTeacherId: string;
  events: SessionEvent[];
  tierFeeMap: TierFeeMap;
  state: "loading" | "ready" | "error";
  onSelect: (teacherId: string) => void;
  onRetry: () => void;
};

const feeFields = [
  ["개인", "fee_private"],
  ["그룹", "fee_group"],
  ["센터 메인", "fee_center_main"],
  ["센터 보조", "fee_center_assist"],
] as const;

function won(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}

export function ClassOpsTeacherDirectory({ teachers, selectedTeacherId, events, tierFeeMap, state, onSelect, onRetry }: Props) {
  const [query, setQuery] = useState("");
  const [activity, setActivity] = useState<"active" | "all">("active");
  const deferredQuery = useDeferredValue(query.trim().toLocaleLowerCase("ko-KR"));
  const visibleTeachers = useMemo(
    () => teachers.filter((teacher) =>
      (activity === "all" || teacher.is_active) &&
      (!deferredQuery || teacher.name.toLocaleLowerCase("ko-KR").includes(deferredQuery))),
    [activity, deferredQuery, teachers],
  );
  const selected = teachers.find((teacher) => teacher.id === selectedTeacherId) ?? null;
  const selectedCount = selected ? totalLessonsFromCounts(selected.session_count, selected.log_count) : 0;
  const selectedTier = selected ? computeTier(selectedCount) : null;
  const defaults = selectedTier ? getTierDefaultFees(selectedTier, tierFeeMap) : null;
  const effective = selected && selectedTier ? effectiveFees(selectedTier, selected, tierFeeMap) : null;
  const assignedCount = selected
    ? events.filter((event) => event.teacherId === selected.id || event.extraTeacherIds?.includes(selected.id)).length
    : 0;

  return (
    <section aria-labelledby="class-ops-teachers" className="mt-10">
      <div className="flex items-end justify-between gap-4 border-b border-slate-200 pb-3">
        <div><p className="text-xs font-extrabold text-blue-600">02</p><h2 id="class-ops-teachers" className="mt-1 text-[22px] font-bold tracking-tight text-slate-950">선생님 DB</h2></div>
        <p className="hidden text-xs text-slate-500 sm:block">선택한 강사가 위 캘린더 필터에 바로 반영됩니다.</p>
      </div>
      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white min-[801px]:grid min-[801px]:grid-cols-[230px_minmax(0,1fr)]">
        <div className="border-b border-slate-200 bg-slate-50 p-3 min-[801px]:border-b-0 min-[801px]:border-r">
          <label className="sr-only" htmlFor="class-ops-teacher-search">강사명 검색</label>
          <input id="class-ops-teacher-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="강사명 검색" className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          <div className="mt-2 flex gap-1.5" aria-label="활동 상태 필터">
            <button type="button" onClick={() => setActivity("active")} className={`min-h-11 rounded-full px-3 text-xs font-bold ${activity === "active" ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-700"}`}>활동</button>
            <button type="button" onClick={() => setActivity("all")} className={`min-h-11 rounded-full px-3 text-xs font-bold ${activity === "all" ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-700"}`}>전체</button>
          </div>
          <div className="mt-3 flex gap-1 overflow-x-auto pb-1 min-[801px]:block min-[801px]:space-y-1" aria-label="강사 목록">
            {visibleTeachers.map((teacher) => {
              const count = totalLessonsFromCounts(teacher.session_count, teacher.log_count);
              const tier = computeTier(count);
              const selectedRow = selectedTeacherId === teacher.id;
              return <button key={teacher.id} data-class-ops-teacher-id={teacher.id} type="button" onClick={() => onSelect(teacher.id)} className={`min-h-14 min-w-[148px] rounded-xl border px-3 py-2 text-left min-[801px]:w-full ${selectedRow ? "border-blue-300 bg-blue-50" : "border-transparent hover:bg-white"}`}><span className="block text-sm font-bold text-slate-900">{teacher.name}</span><span className="mt-0.5 block text-[11px] text-slate-500">{tierLabelKo(tier)} · 인정 {count.toLocaleString("ko-KR")}회</span></button>;
            })}
            {state === "loading" ? <p className="px-2 py-4 text-xs text-slate-500">강사 정보를 불러오는 중입니다.</p> : null}
            {state === "ready" && visibleTeachers.length === 0 ? <p className="px-2 py-4 text-xs text-slate-500">조건에 맞는 강사가 없습니다.</p> : null}
            {state === "error" ? <button type="button" onClick={onRetry} className="min-h-11 w-full rounded-xl border border-rose-200 bg-rose-50 px-3 text-xs font-bold text-rose-800">강사 정보 다시 불러오기</button> : null}
          </div>
        </div>
        <div className="p-4 min-[801px]:p-5">
          {selected && selectedTier && defaults && effective ? <>
            <div className="flex items-start justify-between gap-4"><div className="flex min-w-0 items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-slate-900 text-sm font-extrabold text-white">{selected.name.slice(0, 1)}</span><div className="min-w-0"><h3 className="truncate text-lg font-bold text-slate-950">{selected.name} <span className={`ml-1 align-middle text-[11px] font-bold ${selected.is_active ? "text-emerald-700" : "text-slate-500"}`}>{selected.is_active ? "활동 중" : "비활동"}</span></h3><p className="mt-0.5 text-xs text-slate-500">메인·보조 배정 통합 조회</p></div></div><Link href={`/admin/users?teacher=${encodeURIComponent(selected.id)}`} className="shrink-0 text-xs font-bold text-blue-600 hover:underline">강사 상세 관리 →</Link></div>
            <dl className="mt-4 grid grid-cols-2 overflow-hidden rounded-xl border border-slate-200 min-[1000px]:grid-cols-4"><div className="border-b border-r border-slate-200 p-3 min-[1000px]:border-b-0"><dt className="text-[11px] text-slate-500">누적 인정 회차</dt><dd className="mt-1 text-base font-extrabold text-slate-950">{selectedCount.toLocaleString("ko-KR")}회</dd></div><div className="border-b border-slate-200 p-3 min-[1000px]:border-b-0 min-[1000px]:border-r"><dt className="text-[11px] text-slate-500">현재 RANK</dt><dd className="mt-1 text-base font-extrabold text-slate-950">{tierLabelKo(selectedTier)}</dd></div><div className="border-r border-slate-200 p-3"><dt className="text-[11px] text-slate-500">조회 범위 배정</dt><dd className="mt-1 text-base font-extrabold text-slate-950">{assignedCount.toLocaleString("ko-KR")}건</dd></div><div className="p-3"><dt className="text-[11px] text-slate-500">배정 범위</dt><dd className="mt-1 text-sm font-bold text-slate-800">메인 + 보조</dd></div></dl>
            <div className="mt-4 border-t border-slate-200 pt-3"><h4 className="text-xs font-bold text-slate-800">현재 적용 기준 수업료 <span className="font-normal text-slate-500">· 시간 환산 전 저장 금액</span></h4><div className="mt-2 grid grid-cols-2 gap-2 min-[1000px]:grid-cols-4">{feeFields.map(([label, key]) => { const stored = selected[key]; return <div key={key} className="rounded-xl bg-slate-100 p-2.5"><span className="block text-[10px] text-slate-500">{label}</span><strong className={`mt-1 block text-xs ${stored == null ? "text-slate-900" : "text-blue-700"}`}>{won(effective[key])} · {stored == null ? "등급 기본" : "개별 지정"}</strong>{stored != null ? <span className="mt-1 block text-[10px] text-slate-500">기본 {won(defaults[key])}</span> : null}</div>; })}</div></div>
          </> : <div className="grid min-h-52 place-items-center text-center"><div><p className="text-sm font-bold text-slate-800">강사를 선택해 주세요.</p><p className="mt-1 text-xs text-slate-500">선택하면 캘린더와 인정 회차·RANK·수업료가 함께 연결됩니다.</p></div></div>}
        </div>
      </div>
    </section>
  );
}
