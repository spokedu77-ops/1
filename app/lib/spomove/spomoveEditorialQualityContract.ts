/**
 * SPOMOVE paid pre-start briefing — editorial quality contract (SSOT).
 * Admin QA / pilot writing only. Do not surface these labels on Public UI.
 *
 * coachScript = what the instructor says to children
 * teachingPoints = instructor-facing coaching notes (not child speech)
 */

export const SPOMOVE_EDITORIAL_OBJECTIVE_RULES = [
  '활동에서 실제로 훈련하는 판단·움직임을 말한다.',
  '단순 기능 나열·과장된 교육 효과 단정 금지.',
  '센서·자동 성과측정이 없으면 “향상시킨다/측정한다” 단정 금지.',
  '1문장 중심. 강사가 목적을 바로 이해해야 한다.',
] as const;

export const SPOMOVE_EDITORIAL_TEACHING_POINT_RULES = [
  '강사가 수업에서 바로 행동할 수 있는 조언(관찰·오류 수정·cue)만 쓴다.',
  '1~3개. 프로그램 mechanics와 직접 연결한다.',
  'generic filler 금지(안전에 유의, 아동 수준에 맞게, 정확하게 지도 등).',
  'coachScript와 역할을 섞지 않는다.',
] as const;

export const SPOMOVE_EDITORIAL_THEME_VARIANT_RULE =
  '테마만 다른 활동은 mechanics가 같으면 objective·지도 원칙을 억지로 다르게 만들지 않는다. uniqueness보다 accuracy.';

export const SPOMOVE_EDITORIAL_ADMIN_HELPER = {
  objective:
    '좋은 예: “화면에 제시되는 방향을 빠르게 구분하고 해당 위치로 정확하게 이동합니다.” / 나쁜 예: “신체·인지 능력을 향상시키는 활동입니다.”',
  teachingPoints:
    '아이에게 하는 말(coachScript)과 분리하세요. 관찰·오류 수정·cue 제공 방식만 1~3줄로 적습니다.',
} as const;
