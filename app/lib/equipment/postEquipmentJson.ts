export class EquipmentApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'EquipmentApiError';
    this.status = status;
    this.code = code;
  }
}

export async function postEquipmentJson<T = Record<string, unknown>>(
  url: string,
  payload: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  let body: { error?: string; message?: string; code?: string } = {};
  try {
    body = (await res.json()) as typeof body;
  } catch {
    body = {};
  }
  if (!res.ok) {
    const message =
      (typeof body.error === 'string' && body.error) ||
      (typeof body.message === 'string' && body.message) ||
      (body.code ? `처리 실패 (${body.code})` : null) ||
      `요청 실패 (HTTP ${res.status})`;
    throw new EquipmentApiError(message, res.status, body.code);
  }
  return body as T;
}
