import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { privateNoStoreJson, withPrivateNoStore } from '@/app/lib/server/privateNoStore';
import {
  SPOMOVE_GUIDE_VIDEO_PACK_ID,
  SPOMOVE_PREMIUM_MEDIA_BUCKET,
  normalizeSpomoveGuideVideoMap,
} from '@/app/lib/spomove/spomoveOfficialAssets';
import { requireSpokeduMasterCapability } from '@/app/lib/server/spokeduMasterAccess';
import { findOfficialSpomovePreset } from '@/app/spokedu-master/spomove/officialSpomovePresets';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SIGNED_URL_TTL_SECONDS = 300;

function resolvePrivateObjectPath(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^https?:\/\//i.test(trimmed)) {
    const prefix = `${SPOMOVE_PREMIUM_MEDIA_BUCKET}/`;
    const path = trimmed.startsWith(prefix) ? trimmed.slice(prefix.length) : trimmed;
    return path && !path.startsWith('/') && !path.includes('..') ? path : null;
  }
  try {
    const url = new URL(trimmed);
    const marker = `/storage/v1/object/authenticated/${SPOMOVE_PREMIUM_MEDIA_BUCKET}/`;
    const index = url.pathname.indexOf(marker);
    if (index < 0) return null;
    const path = decodeURIComponent(url.pathname.slice(index + marker.length));
    return path && !path.startsWith('/') && !path.includes('..') ? path : null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const access = await requireSpokeduMasterCapability('spomove');
  if (!access.ok) return withPrivateNoStore(access.response);

  const presetId = new URL(request.url).searchParams.get('preset')?.trim() ?? '';
  if (!presetId || !findOfficialSpomovePreset(presetId)) {
    return privateNoStoreJson({ error: '유효하지 않은 SPOMOVE 활동입니다.' }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  const { data: pack, error: packError } = await supabase
    .from('think_asset_packs')
    .select('assets_json')
    .eq('id', SPOMOVE_GUIDE_VIDEO_PACK_ID)
    .maybeSingle();
  if (packError) return privateNoStoreJson({ error: '가이드 영상을 불러오지 못했습니다.' }, { status: 500 });

  const configuredValue = normalizeSpomoveGuideVideoMap(pack?.assets_json)[presetId];
  const objectPath = configuredValue ? resolvePrivateObjectPath(configuredValue) : null;
  if (!configuredValue) return privateNoStoreJson({ data: null });
  if (!objectPath) {
    return privateNoStoreJson(
      { error: 'Premium 가이드 영상이 private media로 이전되지 않았습니다.', code: 'PREMIUM_MEDIA_NOT_MIGRATED' },
      { status: 503 },
    );
  }

  const { data, error } = await supabase.storage
    .from(SPOMOVE_PREMIUM_MEDIA_BUCKET)
    .createSignedUrl(objectPath, SIGNED_URL_TTL_SECONDS);
  if (error || !data?.signedUrl) {
    return privateNoStoreJson({ error: '가이드 영상을 불러오지 못했습니다.' }, { status: 500 });
  }
  return privateNoStoreJson({ data: { url: data.signedUrl, expiresIn: SIGNED_URL_TTL_SECONDS } });
}
