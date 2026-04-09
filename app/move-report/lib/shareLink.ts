import { P } from '../data/profiles';

export type MoveReportSharePayloadCompactV5 = {
  v: 5;
  profileKey: string;
  graphCode: string;
  /** 공유 링크·OG용 표시 이름 (compact 13자 링크에는 미포함) */
  displayName?: string;
};

type CompactSharePayloadV5 = {
  v: 5;
  k: string;
  g: string;
  /** 표시 이름 (base64 JSON 경로 전용) */
  n?: string;
};

/** v5 + 4자리 유형키 + 8자리 그래프(0–3) = 13자, base64 JSON 대비 짧은 공유 URL */
const COMPACT_V5_RE = /^5([CI][RE][PG][DS])([0-3]{8})$/;

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
  payload: MoveReportSharePayloadCompactV5
): string {
  const { profileKey, graphCode, displayName } = payload;
  const shortCandidate = `5${profileKey}${graphCode}`;
  const includeName =
    typeof displayName === 'string' && displayName.trim() !== '' && displayName !== '아이';

  if (!includeName && COMPACT_V5_RE.test(shortCandidate)) {
    return `${origin}/move-report/shared?d=${encodeURIComponent(shortCandidate)}`;
  }

  const body: CompactSharePayloadV5 = { v: 5, k: profileKey, g: graphCode };
  if (includeName) {
    body.n = displayName;
  }
  const encoded = toBase64Url(JSON.stringify(body));
  return `${origin}/move-report/shared?d=${encodeURIComponent(encoded)}`;
}

export function parseMoveReportSharePayload(
  raw: string | null
): MoveReportSharePayloadCompactV5 | null {
  if (!raw) return null;
  const trimmed = raw.trim();

  const compact = COMPACT_V5_RE.exec(trimmed);
  if (compact) {
    const profileKey = compact[1];
    const graphCode = compact[2];
    if (!(profileKey in P)) return null;
    return { v: 5, profileKey, graphCode };
  }

  try {
    const decoded = fromBase64Url(trimmed);
    const parsed = JSON.parse(decoded) as Partial<CompactSharePayloadV5>;

    if (parsed.v === 5) {
      if (typeof parsed.k !== 'string') return null;
      if (typeof parsed.g !== 'string' || !/^[0-3]{8}$/.test(parsed.g)) return null;
      if (!(parsed.k in P)) return null;
      const n = typeof parsed.n === 'string' ? parsed.n.trim() : '';
      return {
        v: 5,
        profileKey: parsed.k,
        graphCode: parsed.g,
        ...(n ? { displayName: n } : {}),
      };
    }

    return null;
  } catch {
    return null;
  }
}
