/**
 * SPOMOVE 스크린플레이(프로그램 뱅크 · 브레인체육) 발행용 행 생성.
 *
 * 단일 소스: `app/admin/memory-game/constants.ts` 의 MODES (실제 iframe 엔진과 동일).
 * DB `spokedu_pro_screenplays`는 GET /api/spokedu-pro/screenplays 가 읽는 공식 카탈로그.
 *
 * mode_id 값은 `getSpomoveLaunchParams` 의 역매핑과 일치해야 함.
 */
import { MODES } from '@/app/admin/memory-game/constants';

export type SpomoveMemoryModeScreenplayMap = {
  modeKey: string;
  modeId: string;
  sortBase: number;
};

/** memory-game MODES 키 → DB mode_id(한글·영문 혼용, 런처 매핑 고정) */
export const SPOMOVE_MEMORY_MODE_SCREENPLAY_MAP: readonly SpomoveMemoryModeScreenplayMap[] = [
  { modeKey: 'basic', modeId: '반응인지', sortBase: 1000 },
  { modeKey: 'stroop', modeId: '스트룹', sortBase: 2000 },
  { modeKey: 'simon', modeId: '사이먼효과', sortBase: 2500 },
  { modeKey: 'flanker', modeId: '플랭커', sortBase: 2600 },
  { modeKey: 'gonogo', modeId: 'GoNoGo', sortBase: 2650 },
  { modeKey: 'taskswitch', modeId: 'TaskSwitching', sortBase: 2675 },
  { modeKey: 'spatial', modeId: '순차기억', sortBase: 3000 },
  { modeKey: 'dual', modeId: '이중과제', sortBase: 4000 },
  { modeKey: 'flow', modeId: 'FLOW', sortBase: 5000 },
  { modeKey: 'reactTrain', modeId: '시지각반응', sortBase: 5100 },
  { modeKey: 'challenge', modeId: 'CHALLENGE', sortBase: 5200 },
] as const;

export type SpomoveScreenplayUpsertRow = {
  mode_id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  sort_order: number;
  preset_ref: string;
  thumbnail_url: null;
  is_published: true;
};

export function buildSpomoveScreenplayRowsFromMemoryModes(): SpomoveScreenplayUpsertRow[] {
  const rows: SpomoveScreenplayUpsertRow[] = [];
  for (const map of SPOMOVE_MEMORY_MODE_SCREENPLAY_MAP) {
    const mode = MODES[map.modeKey];
    if (!mode) continue;
    for (const level of mode.levels) {
      rows.push({
        mode_id: map.modeId,
        title: `${mode.title} ${level.name}`,
        subtitle: `${mode.title} · ${level.enName}`,
        description: level.desc ?? mode.desc ?? null,
        sort_order: map.sortBase + level.id,
        preset_ref: String(level.id),
        thumbnail_url: null,
        is_published: true,
      });
    }
  }
  return rows;
}
