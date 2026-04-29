import {
  computeTier,
  effectiveFees,
  totalLessonsFromCounts,
  type TierFeeMap,
} from "@/app/lib/teacherTierSchedule";

export type TeacherFeeRow = {
  id: string;
  name?: string | null;
  session_count?: number | null;
  fee_private?: number | null;
  fee_group?: number | null;
  fee_center_main?: number | null;
  fee_center_assist?: number | null;
};

/** 일괄 적용 시 수업 타입 기본값(가장 많이 등장하는 session_type) */
export function dominantSessionType(rows: { session_type?: string | null }[]): string {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const t = (r.session_type && String(r.session_type).trim()) || "regular_private";
    counts.set(t, (counts.get(t) || 0) + 1);
  }
  let best = "regular_private";
  let n = -1;
  for (const [t, c] of counts) {
    if (c > n) {
      n = c;
      best = t;
    }
  }
  return best;
}

/** 강사 users 행 + 등급표 기준 기본 수업료(리스트 생성·일괄 적용과 동일 규칙) */
export function resolveDefaultSessionPrice(
  teacher: TeacherFeeRow | null | undefined,
  sessionType: string,
  tierFeeMap: TierFeeMap
): number {
  if (!teacher) return 30_000;
  const tier = computeTier(totalLessonsFromCounts(teacher.session_count ?? 0, 0));
  const fees = effectiveFees(
    tier,
    {
      fee_private: teacher.fee_private ?? null,
      fee_group: teacher.fee_group ?? null,
      fee_center_main: teacher.fee_center_main ?? null,
      fee_center_assist: teacher.fee_center_assist ?? null,
    },
    tierFeeMap
  );
  if (sessionType === "regular_center" || sessionType === "one_day_center") return fees.fee_center_main;
  return fees.fee_private;
}

/** 로컬 달력 기준으로 요일만 targetDow(0=일)로 맞춤, 시각·수업 길이는 유지 */
export function shiftSessionToWeekday(startIso: string, endIso: string, targetDow: number): {
  start_at: string;
  end_at: string;
} {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const cur = start.getDay();
  const add = (targetDow - cur + 7) % 7;
  if (add === 0) return { start_at: startIso, end_at: endIso };
  const ns = new Date(start);
  ns.setDate(ns.getDate() + add);
  const ne = new Date(end);
  ne.setDate(ne.getDate() + add);
  return { start_at: ns.toISOString(), end_at: ne.toISOString() };
}
