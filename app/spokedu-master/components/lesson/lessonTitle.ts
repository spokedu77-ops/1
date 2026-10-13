/** Splits a trailing English parenthetical subtitle while preserving Korean notes. */
export function splitLessonCardTitle(raw: string): { title: string; subtitle: string } {
  const text = raw.trim();
  const matched = text.match(/^(.+?)\s*[（(]([^）)]*[A-Za-z][^）)]*)[）)]\s*$/u);
  if (!matched) return { title: text, subtitle: '' };
  return { title: matched[1]!.trim(), subtitle: matched[2]!.trim() };
}

