export type MoveReportSharePayloadCompactV5 = {
  v: 5;
  profileKey: string;
  graphCode: string;
};

type CompactSharePayloadV5 = {
  v: 5;
  k: string;
  g: string;
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
  payload: MoveReportSharePayloadCompactV5
): string {
  const compact: CompactSharePayloadV5 = {
    v: 5,
    k: payload.profileKey,
    g: payload.graphCode,
  };
  const encoded = toBase64Url(JSON.stringify(compact));
  return `${origin}/move-report/shared?d=${encoded}`;
}

export function parseMoveReportSharePayload(
  raw: string | null
): MoveReportSharePayloadCompactV5 | null {
  if (!raw) return null;
  try {
    const decoded = fromBase64Url(raw);
    const parsed = JSON.parse(decoded) as Partial<CompactSharePayloadV5>;

    if (parsed.v === 5) {
      if (typeof parsed.k !== 'string') return null;
      if (typeof parsed.g !== 'string' || !/^[0-3]{8}$/.test(parsed.g)) return null;
      return {
        v: 5,
        profileKey: parsed.k,
        graphCode: parsed.g,
      };
    }

    return null;
  } catch {
    return null;
  }
}
