function normalizedContentLines(value: string | null | undefined) {
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

export function replaceExactSection(
  source: string | null | undefined,
  label: string,
  value: string | null | undefined,
) {
  const lines = (source ?? '').split(/\r?\n/);
  const content = normalizedContentLines(value);
  const start = lines.findIndex((line) => line.trim() === `[${label}]`);

  if (start >= 0) {
    let end = start + 1;
    while (end < lines.length && !/^\[[^\]]+\]$/.test(lines[end].trim())) end += 1;
    lines.splice(start, end - start, ...(content.length > 0 ? [`[${label}]`, ...content] : []));
  } else if (content.length > 0) {
    while (lines.length > 0 && !lines.at(-1)?.trim()) lines.pop();
    if (lines.length > 0) lines.push('');
    lines.push(`[${label}]`, ...content);
  }

  while (lines.length > 0 && !lines[0].trim()) lines.shift();
  while (lines.length > 0 && !lines.at(-1)?.trim()) lines.pop();
  return lines.join('\n') || null;
}

export function parseVariationMethod(source: string | null | undefined) {
  return extractExactSectionLines(source, '변형 방법');
}

export function serializeVariationMethod(value: string) {
  const lines = normalizedContentLines(value);
  return lines.length > 0 ? ['[변형 방법]', ...lines].join('\n') : null;
}
