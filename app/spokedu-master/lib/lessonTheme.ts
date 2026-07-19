export const LESSON_THEME_OPTIONS = ['조절형', '술래형', '도전형', '경쟁형', '협동형'] as const;

export type LessonThemeOption = (typeof LESSON_THEME_OPTIONS)[number];

const LEGACY_THEME_MAP: Record<string, LessonThemeOption | ''> = {
  '육상 놀이체육': '조절형',
  육상놀이체육: '조절형',
  '술래형(대결)': '술래형',
  '도전형(챌린지)': '도전형',
  '경쟁형(개인 또는 팀 간)': '경쟁형',
  '협동형(팀 내)': '협동형',
  일반: '',
};

function stripThemeParenthesis(value: string) {
  return value.replace(/\s*\([^)]*\)\s*$/, '').trim();
}

function resolveSingleThemeToken(value: string): LessonThemeOption | '' {
  const text = value.trim();
  if (!text) return '';

  const legacy = LEGACY_THEME_MAP[text];
  if (legacy !== undefined) return legacy;

  const withoutParens = stripThemeParenthesis(text);
  if ((LESSON_THEME_OPTIONS as readonly string[]).includes(withoutParens)) {
    return withoutParens as LessonThemeOption;
  }

  const matched = LESSON_THEME_OPTIONS.find(
    (option) => text === option || withoutParens === option || text.startsWith(`${option}(`) || withoutParens.startsWith(`${option}(`),
  );
  return matched ?? '';
}

/**
 * 공식 테마만 반환. CSV/자유입력(`민첩성 발동작, 도전형`)은 공식 토큰만 남긴다.
 * 공식 테마가 없으면 빈 문자열(비공식 값 passthrough 금지).
 */
export function normalizeLessonTheme(value?: string | null): string {
  const text = String(value ?? '').trim();
  if (!text) return '';

  const tokens = text
    .split(/[,|/]/)
    .map((token) => token.trim())
    .filter(Boolean);

  let resolved: LessonThemeOption | '' = '';
  for (const token of tokens.length > 0 ? tokens : [text]) {
    const next = resolveSingleThemeToken(token);
    if (next) resolved = next;
  }

  return resolved;
}

export function isCanonicalLessonTheme(value?: string | null): value is LessonThemeOption {
  return (LESSON_THEME_OPTIONS as readonly string[]).includes(String(value ?? '').trim());
}
