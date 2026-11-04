/** Official public figures verified and confirmed by the user on 2026-11-04.
 * Approval date is not a measurement period. Render labels verbatim.
 */
export const PUBLIC_METRICS = {
  classes: { value: '10,000+', label: '누적 운영 수업' },
  institutions: { value: '500+', label: '출강 학교·기관' },
  instructors: { value: '30+', label: '전문 지도자' },
  renewal: { value: '98%', label: '파트너 기관 재계약률' },
} as const;
export const PUBLIC_OPERATING_METRICS = [PUBLIC_METRICS.classes, PUBLIC_METRICS.institutions, PUBLIC_METRICS.instructors, PUBLIC_METRICS.renewal] as const;
/** Compatibility exports share the approved figures. */
export const PUBLIC_V0_METRICS = {
  ...PUBLIC_METRICS,
  region: { value: '서울·경기', label: '중심 출강 · 전국 협의', note: '원거리·타 권역은 일정·비용 협의' },
} as const;
export const PUBLIC_V0_METRICS_HERO_ROW = [PUBLIC_METRICS.institutions, PUBLIC_METRICS.classes, PUBLIC_V0_METRICS.region] as const;
