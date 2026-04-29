/** 프로그램별 상세 — 신체 기능·활동 테마 및 모달 필드 */
export type ProgramDetail = {
  title?: string;
  /** 한 줄 부제(스크린플레이 DB subtitle 등) */
  subtitle?: string;
  videoUrl?: string;
  /** 기능 종류(복수 선택) */
  functionTypes?: string[];
  /** 기능 종류(구버전/호환) */
  functionType?: string;
  /** 메인테마 */
  mainTheme?: string;
  /** (레거시) DB·과거 JSON 호환용 — UI에서는 미사용 */
  groupSize?: string;
  /** 사전 체크리스트 */
  checklist?: string;
  /** 필요 교구리스트 */
  equipment?: string;
  /** 활동방법 */
  activityMethod?: string;
  /** 활동 팁 */
  activityTip?: string;
};
