function extractSectionLines(source: string | null | undefined, label: string) {
  const lines = (source ?? '').split('\n');
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

export function parseVariationMethod(source: string | null | undefined) {
  return extractSectionLines(source, '변형 방법');
}

export function serializeVariationMethod(value: string) {
  const lines = value.split('\n').map((line) => line.trim()).filter(Boolean);
  return lines.length > 0 ? ['[변형 방법]', ...lines].join('\n') : null;
}
