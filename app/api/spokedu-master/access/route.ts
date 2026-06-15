import { NextResponse } from 'next/server';
import { requireSpokeduMasterAccess } from '@/app/lib/server/spokeduMasterAccess';

function accessErrorCode(status: number) {
  if (status === 401) return 'UNAUTHORIZED';
  if (status === 403) return 'ACCESS_DENIED';
  return 'ACCESS_CHECK_FAILED';
}

export async function GET() {
  const access = await requireSpokeduMasterAccess();

  if (access.ok) {
    return NextResponse.json({ ok: true, allowed: true });
  }

  return NextResponse.json(
    {
      ok: false,
      allowed: false,
      code: accessErrorCode(access.response.status),
    },
    { status: access.response.status },
  );
}
