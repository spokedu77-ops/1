const TEXT_INDENT_UNIT = '\u00A0\u00A0\u00A0\u00A0';
const BULLET_MARKERS = ['• ', '◦ ', '▪ '] as const;

function parseTextBlockLine(text: string): { body: string; hasBullet: boolean } {
  let remaining = text;
  while (remaining.startsWith(TEXT_INDENT_UNIT)) {
    remaining = remaining.slice(TEXT_INDENT_UNIT.length);
  }
  while (remaining.startsWith('\t')) remaining = remaining.slice(1);
  while (remaining.startsWith('    ')) remaining = remaining.slice(4);

  for (const marker of BULLET_MARKERS) {
    if (!remaining.startsWith(marker)) continue;
    return { body: remaining.slice(marker.length), hasBullet: true };
  }
  return { body: remaining, hasBullet: false };
}

export function bulletMarkerForLevel(level: number): string {
  return BULLET_MARKERS[Math.max(0, level) % BULLET_MARKERS.length];
}

export function stripListItemMarkerPrefix(text: string): string {
  const parsed = parseTextBlockLine(text);
  if (parsed.hasBullet) return parsed.body;
  let body = parsed.body;
  if (body === '-' || body === '*' || body === '.') return '';
  body = body.replace(/^[-*]\s+/, '');
  body = body.replace(/^\d+\.\s+/, '');
  body = body.replace(/^[.\u2022\u25E6\u25AA\u25AB\u00B7•◦▪▫]\s+/, '');
  for (const marker of BULLET_MARKERS) {
    if (body.startsWith(marker)) {
      body = body.slice(marker.length);
      break;
    }
  }
  return body;
}
