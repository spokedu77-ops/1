/**
 * 에듀 에코 AI 리포트 상수 및 헬퍼.
 */

export const DEVELOPMENT_GOAL_OPTIONS = [
  { value: '인지적 상황 판단력 향상 (Think)', label: '인지적 상황 판단력 향상 (Think)' },
  { value: '신체 대근육 및 순발력 향상 (Play)', label: '신체 대근육 및 순발력 향상 (Play)' },
  { value: '협동심 및 규칙 준수 (Grow)', label: '협동심 및 규칙 준수 (Grow)' },
  { value: '집중력 및 자기조절력 (Focus)', label: '집중력 및 자기조절력 (Focus)' },
  { value: '창의적 표현 및 자신감 (Express)', label: '창의적 표현 및 자신감 (Express)' },
] as const;

export const OPTION_DARK_CLASS = 'bg-slate-800 text-white';

export function getPeriodLabel(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const d = now.getDate();
  const week = Math.ceil(d / 7);
  return `${y}년 ${m}월 ${week}주차`;
}
