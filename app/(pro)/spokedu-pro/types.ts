/** 프로그램별 상세 — 새 분류 구조(기능 종류, 메인테마, 인원구성) 및 모달 필드 */
export type ProgramDetail = {
  title?: string;
  /** 한 줄 부제(스크린플레이 DB subtitle 등) */
  subtitle?: string;
  videoUrl?: string;
  /** 기능 종류 */
  functionType?: string;
  /** 메인테마 */
  mainTheme?: string;
  /** 인원구성 */
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
