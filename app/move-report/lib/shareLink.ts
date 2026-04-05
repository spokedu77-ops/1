export type MoveReportSharePayload = {
  v: 1;
  name: string;
  profileName: string;
  catchcopy: string;
  strengths: string[];
  activity: string;
};

function toBase64Url(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(input: string): string {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4 || 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

export function buildMoveReportShareUrl(origin: string, payload: MoveReportSharePayload): string {
  const encoded = toBase64Url(JSON.stringify(payload));
  return `${origin}/move-report/shared?d=${encodeURIComponent(encoded)}`;
}

export function parseMoveReportSharePayload(raw: string | null): MoveReportSharePayload | null {
  if (!raw) return null;
  try {
    const decoded = fromBase64Url(raw);
    const parsed = JSON.parse(decoded) as Partial<MoveReportSharePayload>;
    if (parsed.v !== 1) return null;
    if (typeof parsed.name !== 'string') return null;
    if (typeof parsed.profileName !== 'string') return null;
    if (typeof parsed.catchcopy !== 'string') return null;
    if (!Array.isArray(parsed.strengths) || !parsed.strengths.every((v) => typeof v === 'string')) return null;
    if (typeof parsed.activity !== 'string') return null;
    return {
      v: 1,
      name: parsed.name,
      profileName: parsed.profileName,
      catchcopy: parsed.catchcopy,
      strengths: parsed.strengths.slice(0, 3),
      activity: parsed.activity,
    };
  } catch {
    return null;
  }
}
