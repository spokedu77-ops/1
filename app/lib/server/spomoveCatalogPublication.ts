import { getServiceSupabase } from './adminAuth';
import { findOfficialSpomovePreset } from '@/app/spokedu-master/spomove/officialSpomovePresets';
import { isHubListedPreset } from '@/app/spokedu-master/spomove/movements/isHubVisiblePreset';
import { isLessonCatalogNew, LESSON_CATALOG_NEW_WINDOW_MS } from '@/app/spokedu-master/lib/lessonCatalogNew';
import { SPOMOVE_CONTENT_PACK_ID } from '@/app/lib/spomove/spomoveOfficialAssets';
import { SPOMOVE_NEW_BADGE_LEGACY_IDS } from '@/app/lib/spomove/spomoveNewBadgeBaseline';

type Publication = { state: 'unknown' | 'never' | 'published'; firstPublishedAt?: string };
type ContentPack = { content?: Record<string, { isVisible?: boolean }>; publication?: Record<string, Publication>; [key: string]: unknown };

/** Existing admin upload/save only. Never trust publication dates supplied by a client. */
export function stampSpomoveFirstPublication(previous: ContentPack | null, nextRaw: object, now: string): ContentPack {
  const next = nextRaw as ContentPack;
  const publication = { ...previous?.publication };
  for (const [id, content] of Object.entries(next.content ?? {})) {
    const preset = findOfficialSpomovePreset(id);
    if (!preset || !content || typeof content !== 'object') continue;
    const entry = publication[id] ?? { state: SPOMOVE_NEW_BADGE_LEGACY_IDS.has(id) ? 'unknown' : 'never' };
    publication[id] = entry.state === 'never' && content.isVisible !== false && preset.isReady && isHubListedPreset(preset)
      ? { state: 'published', firstPublishedAt: now } : entry;
  }
  // Preserve the ledger even if an editor deletes an override, hides or republishes it.
  return { ...next, publication };
}

/** Read-only customer metadata. No startup, first-view, or customer-read writes. */
export async function loadSpomoveCatalogNewStatus() {
  const { data, error } = await getServiceSupabase().from('think_asset_packs')
    .select('assets_json').eq('id', SPOMOVE_CONTENT_PACK_ID).maybeSingle();
  if (error) throw error;
  const pack = (data?.assets_json ?? {}) as ContentPack;
  const now = Date.now();
  const newForMs: Record<string, number> = {};
  for (const [id, entry] of Object.entries(pack.publication ?? {})) {
    const preset = findOfficialSpomovePreset(id);
    if (preset?.isReady && isHubListedPreset(preset) && pack.content?.[id]?.isVisible !== false &&
        entry.state === 'published' && isLessonCatalogNew(entry.firstPublishedAt, now)) {
      newForMs[id] = Date.parse(entry.firstPublishedAt!) + LESSON_CATALOG_NEW_WINDOW_MS - now;
    }
  }
  return { newForMs };
}
