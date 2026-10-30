import { computeTier, totalLessonsFromCounts, type TierFeeMap, type TeacherTierId } from '@/app/lib/teacherTierSchedule';
import { resolveDefaultSessionPrice, resolveDefaultAssistSessionPrice, type TeacherFeeRow } from '@/app/admin/classes/lib/bulkSessionDefaults';

export type TierFeeRecord = { tier_id: TeacherTierId; fee_center_main: number | null; fee_center_assist: number | null };

/** Presentation provenance only. All arithmetic stays in the existing session fee resolvers/effectiveFees. */
export function teacherFeePreview(id: string | null | undefined, teachers: TeacherFeeRow[], tiers: TierFeeRecord[], map: TierFeeMap, role: 'main' | 'assist' = 'main') {
  if (!id) return { state: 'unselected' as const, label: '강사 미선택', amount: null };
  const teacher = teachers.find((item) => item.id === id);
  if (!teacher) return { state: 'unavailable' as const, label: 'UUID 조회 결과 없음 · 단가 확인 필요', amount: null };
  const tier = computeTier(totalLessonsFromCounts(teacher.session_count, teacher.logCount));
  const key = role === 'main' ? 'fee_center_main' : 'fee_center_assist';
  const source = teacher[key] != null ? 'users' : tiers.find((item) => item.tier_id === tier)?.[key] != null ? 'teacher_tier_fees' : null;
  if (!source) return { state: 'unregistered' as const, label: '단가 미등록 · 기본 fallback은 계약 강사료가 아닙니다', amount: null };
  const amount = role === 'main' ? resolveDefaultSessionPrice(teacher, 'regular_center', map) : resolveDefaultAssistSessionPrice(teacher, 'regular_center', map);
  return { state: 'ready' as const, label: `${source}.${key}${source === 'teacher_tier_fees' ? ` (${tier})` : ''} · 회당 참고 단가`, amount };
}
