export const LESSON_THEME_OPTIONS = ['조절형', '술래형', '도전형', '경쟁형', '협동형'] as const;

export type LessonThemeOption = (typeof LESSON_THEME_OPTIONS)[number];

const LEGACY_THEME_MAP: Record<string, LessonThemeOption | ''> = {
  '육상 놀이체육': '조절형',
  '술래형(대결)': '술래형',
  '도전형(챌린지)': '도전형',
  '경쟁형(개인 또는 팀 간)': '경쟁형',
  '협동형(팀 내)': '협동형',
  일반: '',
};

function stripThemeParenthesis(value: string) {
  return value.replace(/\s*\([^)]*\)\s*$/, '').trim();
}

export function normalizeLessonTheme(value?: string | null): string {
  const text = String(value ?? '').trim();
  if (!text) return '';

  const legacy = LEGACY_THEME_MAP[text];
  if (legacy !== undefined) return legacy;

  const withoutParens = stripThemeParenthesis(text);
  if ((LESSON_THEME_OPTIONS as readonly string[]).includes(withoutParens)) {
    return withoutParens;
  }

  const matched = LESSON_THEME_OPTIONS.find(
    (option) => text.startsWith(option) || withoutParens.startsWith(option),
  );
  return matched ?? withoutParens;
}
