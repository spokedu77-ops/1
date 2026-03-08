/** 프로그램별 상세 (영상 링크·상세설명). API program_details[id] 형태 */
export type ProgramDetail = {
  videoUrl?: string;
  description?: string;
  targetBrain?: string;
  targetPhysic?: string;
  tool?: string;
  setupGuideText?: string;
  title?: string;
};
