export function parseTextareaLines(value: string | null | undefined) {
  return (value ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function extractExactSectionLines(source: string | null | undefined, label: string) {
  const lines = (source ?? '').split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === `[${label}]`);
  if (start < 0) return [];

  const values: string[] = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (/^\[[^\]]+\]$/.test(line)) break;
    if (line) values.push(line);
  }
  return values;
}

export function extractExactSectionText(source: string | null | undefined, label: string) {
  return extractExactSectionLines(source, label).join('\n');
}

export function parseVariationMethod(source: string | null | undefined) {
  return extractExactSectionLines(source, '변형 방법');
}

export function serializeVariationMethod(value: string) {
  const lines = parseTextareaLines(value);
  return lines.length > 0 ? ['[변형 방법]', ...lines].join('\n') : null;
}
