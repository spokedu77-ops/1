import type { ProgramLessonDetail, ProgramLessonDetailLite } from '@/app/lib/spokedu-pro/programLessonDetail';

/** programs 목록·드로어에 실린 lesson_detail (전체 폼 또는 카드 스냅샷) */
export type ProgramLessonDetailInList = ProgramLessonDetail | ProgramLessonDetailLite | null;

/**
 * onOpenDetail / drawerContext.row 공통 스냅샷.
 * Roadmap·라이브러리·로드맵에서 row 필드가 늘면 여기만 맞추면 됩니다.
 */
export type SpokeduProDrawerRowSnapshot = {
  id?: number;
  title?: string;
  video_url?: string | null;
  function_type?: string | null;
  function_types?: string[] | null;
  main_theme?: string | null;
  group_size?: string | null;
  equipment?: string | null;
  mode_id?: string | null;
  preset_ref?: string | null;
  thumbnail_url?: string | null;
  lesson_detail?: ProgramLessonDetailInList;
};

export type SpokeduProOpenDetailContext = {
  role?: string;
  themeKey?: string;
  screenplay?: boolean;
  row?: SpokeduProDrawerRowSnapshot;
};
