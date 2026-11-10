import { requireSpokeduMasterCapability } from '@/app/lib/server/spokeduMasterAccess';
import { privateNoStoreJson, withPrivateNoStore } from '@/app/lib/server/privateNoStore';
import { loadSpomoveCatalogNewStatus } from '@/app/lib/server/spomoveCatalogPublication';

export async function GET() {
  const access = await requireSpokeduMasterCapability('libraryBrowse');
  if (!access.ok) return withPrivateNoStore(access.response);
  try {
    return privateNoStoreJson(await loadSpomoveCatalogNewStatus());
  } catch {
    // Optional presentation metadata must never break browsing or access checks.
    // A metadata query failure is distinguishable from having no new items.
    return privateNoStoreJson({ newForMs: {}, unavailable: true }, { status: 503 });
  }
}
