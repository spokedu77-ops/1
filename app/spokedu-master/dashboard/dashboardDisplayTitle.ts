const TRAILING_PARENTHETICAL = /^(.*?)\s*\(([^()]*)\)\s*$/;
const LATIN_LETTER = /[A-Za-z]/;
const KOREAN_LETTER = /[가-힣]/;

/**
 * Keeps canonical titles intact while shortening Dashboard summary labels.
 * Only a trailing, Latin-led translation is removed; semantic Korean suffixes stay.
 */
export function getDashboardDisplayTitle(title: string): string {
  const value = title.trim();
  if (!value) return value;

  const match = value.match(TRAILING_PARENTHETICAL);
  if (!match) return value;

  const base = match[1]?.trim() ?? '';
  const suffix = match[2]?.trim() ?? '';
  if (!base || !LATIN_LETTER.test(suffix) || KOREAN_LETTER.test(suffix)) return value;

  return base;
}
