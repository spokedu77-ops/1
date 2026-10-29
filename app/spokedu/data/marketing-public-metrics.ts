/**
 * Public v0 마케팅 수치·캡션 SSOT.
 * 페이지마다 다른 표현을 쓰지 않는다. 각주(note)는 히어로·지표 바로 아래 1줄로 노출한다.
 */
export const PUBLIC_V0_METRICS = {
  institutions: {
    value: '500+',
    label: '누적 출강 학교·기관',
    note: '2015년 이후 출강·협력 사례 내부 집계',
  },
  classes: {
    value: '2,500+',
    label: '누적 운영 클래스',
    note: '현장 수업 회기 내부 집계',
  },
  region: {
    value: '서울·경기',
    label: '중심 출강 · 전국 협의',
    note: '원거리·타 권역은 일정·비용 협의',
  },
  instructors: {
    value: '30+',
    label: '검증·교육받은 전문 지도자',
    note: '소속·파트너 지도자 포함(내부 기준)',
  },
} as const;

export const PUBLIC_V0_METRICS_HERO_ROW = [
  PUBLIC_V0_METRICS.institutions,
  PUBLIC_V0_METRICS.classes,
  PUBLIC_V0_METRICS.region,
] as const;
