import { NextResponse } from 'next/server';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';
import {
  SPOMOVE_HUB_FAMILY_FEATURED_PACK_ID,
  SPOMOVE_HUB_FAMILY_FEATURED_PACK_NAME,
  SPOMOVE_HUB_FAMILY_FEATURED_SLOT_COUNT,
} from '@/app/lib/spomove/spomoveOfficialAssets';
import { isHubListedPreset } from '@/app/spokedu-master/spomove/movements/isHubVisiblePreset';
import {
  SPOMOVE_CATALOG_FAMILIES,
  resolveSpomoveCatalogFamily,
  type SpomoveCatalogFamilyId,
} from '@/app/spokedu-master/spomove/spomoveCatalogFamilies';
import { findOfficialSpomovePreset } from '@/app/spokedu-master/spomove/officialSpomovePresets';
import {
  emptyHubFamilyFeaturedSlots,
  normalizeHubFamilyFeaturedSlots,
  type SpomoveHubFamilyFeaturedSlots,
} from '@/app/spokedu-master/lib/spomoveHubFamilyFeatured';

function normalizeFamilySlots(value: unknown): SpomoveHubFamilyFeaturedSlots {
  const source =
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const next = emptyHubFamilyFeaturedSlots();

  for (const family of SPOMOVE_CATALOG_FAMILIES) {
    const rowSource = Array.isArray(source[family.id])
      ? (source[family.id] as unknown[]).slice(0, SPOMOVE_HUB_FAMILY_FEATURED_SLOT_COUNT)
      : [];
    const slots = Array.from({ length: SPOMOVE_HUB_FAMILY_FEATURED_SLOT_COUNT }, (_, index) => {
      const raw = rowSource[index];
      if (raw == null || raw === '') return null;
      if (typeof raw !== 'string') return null;
      const id = raw.trim();
      return id || null;
    });

    const selectedIds = slots.filter((id): id is string => id != null);
    if (new Set(selectedIds).size !== selectedIds.length) {
      throw new Error(`「${family.name}」에서 같은 SPOMOVE를 여러 대표 칸에 선택할 수 없습니다.`);
    }

    for (const id of selectedIds) {
      const preset = findOfficialSpomovePreset(id);
      if (!preset || !isHubListedPreset(preset)) {
        throw new Error('선택한 SPOMOVE 중 공식 허브 목록에 없는 항목이 있습니다.');
      }
      if (resolveSpomoveCatalogFamily(preset).id !== family.id) {
        throw new Error(`「${preset.title}」은(는) ${family.name} 테마 대표로 고를 수 없습니다.`);
      }
    }

    next[family.id as SpomoveCatalogFamilyId] = slots;
  }

  return next;
}

async function loadHubFamilyFeaturedSlots() {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('think_asset_packs')
    .select('assets_json')
    .eq('id', SPOMOVE_HUB_FAMILY_FEATURED_PACK_ID)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') throw error;
  return normalizeHubFamilyFeaturedSlots(data?.assets_json);
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    return NextResponse.json({ families: await loadHubFamilyFeaturedSlots() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '테마 대표 슬롯을 불러오지 못했습니다.' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json()) as { families?: unknown };
    const families = normalizeFamilySlots(body.families);
    const supabase = getServiceSupabase();
    const updatedAt = new Date().toISOString();

    const { error } = await supabase.from('think_asset_packs').upsert(
      {
        id: SPOMOVE_HUB_FAMILY_FEATURED_PACK_ID,
        name: SPOMOVE_HUB_FAMILY_FEATURED_PACK_NAME,
        theme: null,
        assets_json: { families },
        updated_at: updatedAt,
      },
      { onConflict: 'id' },
    );
    if (error) throw error;

    return NextResponse.json({
      ok: true,
      families,
      message: '허브 테마 대표 슬롯을 저장했습니다.',
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : '테마 대표 슬롯 저장에 실패했습니다.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
