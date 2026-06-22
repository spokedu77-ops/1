import { NextResponse } from 'next/server';
import { reportError } from '@/app/lib/monitoring/errorReporter';
import { withPrivateNoStore } from '@/app/lib/server/privateNoStore';

type ClientErrorPayload = {
  digest?: unknown;
  errorName?: unknown;
  pathname?: unknown;
};

function readSafeString(value: unknown, maxLength = 120): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed;
}

export async function POST(request: Request) {
  let payload: ClientErrorPayload;
  try {
    payload = await request.json() as ClientErrorPayload;
  } catch {
    return withPrivateNoStore(NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }));
  }

  await reportError(new Error('Client runtime error'), {
    context: 'spokedu_master.client',
    tags: {
      source: 'error_boundary',
      digest: readSafeString(payload.digest),
      errorName: readSafeString(payload.errorName),
      pathname: readSafeString(payload.pathname, 200),
    },
  });

  return withPrivateNoStore(new NextResponse(null, { status: 204 }));
}
