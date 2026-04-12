/**
 * Challenge 스튜디오(/admin/iiwarmup/challenge)와 SPOMOVE 임베드가 같은 템플릿 정의를 쓰도록 공유합니다.
 */

export type ChallengeTemplate = {
  id: string;
  title: string;
  bpm: number;
  level: number;
  grid: string[];
  gridsByLevel?: Record<number, string[]>;
  notes?: string;
};

const DEFAULT_GRID_LEVEL1 = ['앞', '뒤', '앞', '뒤', '앞', '뒤', '앞', '뒤'];

export const CHALLENGE_TEMPLATE_COUNT = 12;

export const CHALLENGE_TEMPLATE_IDS: string[] = Array.from({ length: CHALLENGE_TEMPLATE_COUNT }, (_, i) => `tpl_${i + 1}`);

export const CHALLENGE_TEMPLATES: ChallengeTemplate[] = Array.from({ length: CHALLENGE_TEMPLATE_COUNT }, (_, i) => {
  const n = i + 1;
  return {
    id: `tpl_${n}`,
    title: `포맷 ${n}`,
    bpm: 100,
    level: 1,
    grid: [...DEFAULT_GRID_LEVEL1],
    notes: '',
  };
});

export function getChallengeTemplateById(id: string): ChallengeTemplate {
  return CHALLENGE_TEMPLATES.find((t) => t.id === id) ?? CHALLENGE_TEMPLATES[0]!;
}

export function normalizeChallengeTemplateId(id: string | null | undefined): string {
  const t = (id ?? '').trim();
  return CHALLENGE_TEMPLATE_IDS.includes(t) ? t : 'tpl_1';
}

/**
 * 코드 프리셋(buildEmbeddedChallengeLevelData) 위에 스튜디오 템플릿을 얹습니다.
 * gridsByLevel이 있으면 단계별로, 없으면 level·grid 한 세트만 해당 단계에 반영합니다.
 */
export function buildLevelDataFromChallengeTemplate(
  template: ChallengeTemplate,
  preset: Record<number, string[]>
): Record<number, string[]> {
  const out: Record<number, string[]> = {};
  const g = template.gridsByLevel;
  const focusLv = Math.min(4, Math.max(1, template.level ?? 1));
  for (let lv = 1; lv <= 4; lv++) {
    const row = g?.[lv];
    if (Array.isArray(row) && row.length > 0) {
      out[lv] = row.slice(0, 8).map((c) => String(c));
    } else if (lv === focusLv && Array.isArray(template.grid) && template.grid.length > 0) {
      out[lv] = template.grid.slice(0, 8).map((c) => String(c));
    } else {
      out[lv] = [...(preset[lv] ?? [])];
    }
  }
  return out;
}
