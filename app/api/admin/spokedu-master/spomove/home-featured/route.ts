import { NextResponse } from 'next/server';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';
import {
  normalizeSpomoveHomeFeaturedSlots,
  SPOMOVE_HOME_FEATURED_PACK_ID,
  SPOMOVE_HOME_FEATURED_PACK_NAME,
  SPOMOVE_HOME_FEATURED_SLOT_COUNT,
} from '@/app/lib/spomove/spomoveOfficialAssets';
import { findOfficialSpomovePreset } from '@/app/spokedu-master/spomove/officialSpomovePresets';

function normalizeSlotIds(value: unknown): Array<string | null> {
  const source = Array.isArray(value) ? value.slice(0, SPOMOVE_HOME_FEATURED_SLOT_COUNT) : [];
  const slots = Array.from({ length: SPOMOVE_HOME_FEATURED_SLOT_COUNT }, (_, index) => {
    const raw = source[index];
    if (raw == null || raw === '') return null;
    if (typeof raw !== 'string') return null;
    const id = raw.trim();
    return id || null;
  });

  const selectedIds = slots.filter((id): id is string => id != null);
  if (new Set(selectedIds).size !== selectedIds.length) {
    throw new Error('같은 SPOMOVE를 여러 추천 슬롯에 선택할 수 없습니다.');
  }

  for (const id of selectedIds) {
    const preset = findOfficialSpomovePreset(id);
    if (!preset) {
      throw new Error('선택한 SPOMOVE 중 공식 라이브러리에 없는 항목이 있습니다.');
    }
    if (!preset.isReady) {
      throw new Error(`「${preset.title}」은(는) 아직 홈 추천에 쓸 수 없습니다.`);
    }
  }

  return slots;
}

async function loadHomeFeaturedSlots() {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('think_asset_packs')
    .select('assets_json')
    .eq('id', SPOMOVE_HOME_FEATURED_PACK_ID)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') throw error;
  return normalizeSpomoveHomeFeaturedSlots(data?.assets_json);
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    return NextResponse.json({ slots: await loadHomeFeaturedSlots() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'SPOMOVE 추천 슬롯을 불러오지 못했습니다.' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json()) as { slots?: unknown };
    const slots = normalizeSlotIds(body.slots);
    const supabase = getServiceSupabase();
    const updatedAt = new Date().toISOString();

    const { error } = await supabase.from('think_asset_packs').upsert(
      {
        id: SPOMOVE_HOME_FEATURED_PACK_ID,
        name: SPOMOVE_HOME_FEATURED_PACK_NAME,
        theme: null,
        assets_json: { slots },
        updated_at: updatedAt,
      },
      { onConflict: 'id' },
    );
    if (error) throw error;

    return NextResponse.json({
      ok: true,
      slots,
      message: '홈 SPOMOVE 추천 슬롯을 저장했습니다.',
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'SPOMOVE 추천 슬롯 저장에 실패했습니다.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
