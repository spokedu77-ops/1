import { NextResponse } from 'next/server';
import { reportError } from '@/app/lib/monitoring/errorReporter';
import { withPrivateNoStore } from '@/app/lib/server/privateNoStore';

const ALLOWED_EVENTS = new Set([
  'auto_redirect_from_login',
  'ephemeral_session_cleared',
  'login_tab_selected',
]);

type LoginUxPayload = {
  event?: unknown;
  pathname?: unknown;
  redirectPath?: unknown;
  activeTab?: unknown;
};

function readSafeString(value: unknown, maxLength = 200): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed;
}

export async function POST(request: Request) {
  let payload: LoginUxPayload;
  try {
    payload = await request.json() as LoginUxPayload;
  } catch {
    return withPrivateNoStore(NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }));
  }

  const event = readSafeString(payload.event, 64);
  if (!event || !ALLOWED_EVENTS.has(event)) {
    return withPrivateNoStore(NextResponse.json({ error: 'Invalid event' }, { status: 400 }));
  }

  await reportError(new Error('Login UX event'), {
    context: 'auth.login_ux',
    tags: {
      source: 'login_ux',
      event,
      pathname: readSafeString(payload.pathname, 200),
      redirectPath: readSafeString(payload.redirectPath, 200),
      activeTab: readSafeString(payload.activeTab, 32),
    },
  });

  return withPrivateNoStore(new NextResponse(null, { status: 204 }));
}
