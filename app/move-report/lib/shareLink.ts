export type MoveReportSharePayload = {
  v: 1;
  name: string;
  profileName: string;
  catchcopy: string;
  strengths: string[];
  activity: string;
  color?: string;
  emoji?: string;
};

export type MoveReportSharePayloadCompact = {
  v: 3;
  name: string;
  profileKey: string;
  graphCode?: string;
};

type CompactSharePayload = {
  v: 2;
  n: string;
  p: string;
  c: string;
  s: string[];
  a: string;
  o?: string;
  e?: string;
};

type CompactSharePayloadV3 = {
  v: 3;
  n: string;
  k: string;
  g?: string;
};

function encodeBase64(binary: string): string {
  if (typeof btoa === 'function') return btoa(binary);
  return Buffer.from(binary, 'binary').toString('base64');
}

function decodeBase64(base64: string): string {
  if (typeof atob === 'function') return atob(base64);
  return Buffer.from(base64, 'base64').toString('binary');
}

function toBase64Url(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return encodeBase64(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(input: string): string {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4 || 4)) % 4);
  const binary = decodeBase64(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

export function buildMoveReportShareUrl(
  origin: string,
  payload: MoveReportSharePayload | MoveReportSharePayloadCompact
): string {
  const compact: CompactSharePayloadV3 | CompactSharePayload =
    payload.v === 3
      ? {
          v: 3,
          n: payload.name,
          k: payload.profileKey,
          g: payload.graphCode,
        }
      : {
          v: 2,
          n: payload.name,
          p: payload.profileName,
          c: payload.catchcopy,
          s: payload.strengths.slice(0, 3),
          a: payload.activity,
          o: payload.color,
          e: payload.emoji,
        };
  const encoded = toBase64Url(JSON.stringify(compact));
  return `${origin}/move-report/shared?d=${encoded}`;
}

export function parseMoveReportSharePayload(raw: string | null): (MoveReportSharePayload | MoveReportSharePayloadCompact) | null {
  if (!raw) return null;
  try {
    const decoded = fromBase64Url(raw);
    const parsed = JSON.parse(decoded) as Partial<
      MoveReportSharePayload | CompactSharePayload | CompactSharePayloadV3
    >;

    if (parsed.v === 3) {
      if (typeof parsed.n !== 'string') return null;
      if (typeof parsed.k !== 'string') return null;
      if (typeof parsed.g !== 'undefined' && (typeof parsed.g !== 'string' || !/^[0-3]{8}$/.test(parsed.g))) return null;
      return {
        v: 3,
        name: parsed.n,
        profileKey: parsed.k,
        graphCode: parsed.g,
      };
    }

    if (parsed.v === 2) {
      if (typeof parsed.n !== 'string') return null;
      if (typeof parsed.p !== 'string') return null;
      if (typeof parsed.c !== 'string') return null;
      if (!Array.isArray(parsed.s) || !parsed.s.every((v) => typeof v === 'string')) return null;
      if (typeof parsed.a !== 'string') return null;
      if (typeof parsed.o !== 'undefined' && typeof parsed.o !== 'string') return null;
      if (typeof parsed.e !== 'undefined' && typeof parsed.e !== 'string') return null;
      return {
        v: 1,
        name: parsed.n,
        profileName: parsed.p,
        catchcopy: parsed.c,
        strengths: parsed.s.slice(0, 3),
        activity: parsed.a,
        color: parsed.o,
        emoji: parsed.e,
      };
    }

    if (parsed.v === 1) {
      if (typeof parsed.name !== 'string') return null;
      if (typeof parsed.profileName !== 'string') return null;
      if (typeof parsed.catchcopy !== 'string') return null;
      if (!Array.isArray(parsed.strengths) || !parsed.strengths.every((v) => typeof v === 'string')) return null;
      if (typeof parsed.activity !== 'string') return null;
      if (typeof parsed.color !== 'undefined' && typeof parsed.color !== 'string') return null;
      if (typeof parsed.emoji !== 'undefined' && typeof parsed.emoji !== 'string') return null;
      return {
        v: 1,
        name: parsed.name,
        profileName: parsed.profileName,
        catchcopy: parsed.catchcopy,
        strengths: parsed.strengths.slice(0, 3),
        activity: parsed.activity,
        color: parsed.color,
        emoji: parsed.emoji,
      };
    }

    return null;
  } catch {
    return null;
  }
}
