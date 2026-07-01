import { getSpokeduMasterAccessSnapshot } from '@/app/lib/server/spokeduMasterAccess';
import { privateNoStoreJson } from '@/app/lib/server/privateNoStore';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function accessErrorCode(status: number) {
  if (status === 401) return 'UNAUTHORIZED';
  if (status === 403) return 'ACCESS_DENIED';
  return 'ACCESS_CHECK_FAILED';
}

export async function GET() {
  const access = await getSpokeduMasterAccessSnapshot();

  if (access.ok) {
    return privateNoStoreJson({
      ok: true,
      allowed: true,
      ...access.snapshot,
    });
  }

  return privateNoStoreJson(
    {
      ok: false,
      allowed: false,
      code: accessErrorCode(access.response.status),
    },
    { status: access.response.status },
  );
}
