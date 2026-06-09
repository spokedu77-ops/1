import { NextResponse } from 'next/server';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';

const SLOT_COUNT = 4;

type SlotMetaRow = {
  curriculum_id: number;
  sm_display_order: number | null;
};

function normalizeSlotIds(value: unknown): Array<number | null> {
  const source = Array.isArray(value) ? value.slice(0, SLOT_COUNT) : [];
  const slots = Array.from({ length: SLOT_COUNT }, (_, index) => {
    const raw = source[index];
    if (raw == null || raw === '') return null;
    const id = Number(raw);
    return Number.isInteger(id) && id > 0 ? id : null;
  });
  const selectedIds = slots.filter((id): id is number => id != null);
  if (new Set(selectedIds).size !== selectedIds.length) {
    throw new Error('같은 프로그램을 여러 추천 슬롯에 선택할 수 없습니다.');
  }
  return slots;
}

async function loadWeeklySlots() {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('spokedu_master_program_meta')
    .select('curriculum_id,sm_display_order')
    .eq('sm_is_hot', true)
    .gte('sm_display_order', 1)
    .lte('sm_display_order', SLOT_COUNT)
    .order('sm_display_order', { ascending: true });

  if (error) throw error;

  const slots: Array<number | null> = Array(SLOT_COUNT).fill(null);
  for (const row of (data ?? []) as SlotMetaRow[]) {
    const order = Number(row.sm_display_order);
    if (order >= 1 && order <= SLOT_COUNT && slots[order - 1] == null) {
      slots[order - 1] = row.curriculum_id;
    }
  }
  return slots;
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    return NextResponse.json({ slots: await loadWeeklySlots() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '추천 슬롯을 불러오지 못했습니다.' },
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
    const selectedIds = slots.filter((id): id is number => id != null);
    const currentSlots = await loadWeeklySlots();
    const removedIds = currentSlots.filter(
      (id): id is number => id != null && !selectedIds.includes(id),
    );
    const supabase = getServiceSupabase();

    if (selectedIds.length > 0) {
      const { data, error } = await supabase
        .from('curriculum')
        .select('id')
        .in('id', selectedIds)
        .eq('is_sub', false);
      if (error) throw error;
      if ((data ?? []).length !== selectedIds.length) {
        throw new Error('선택한 프로그램 중 추천에 사용할 수 없는 항목이 있습니다.');
      }
    }

    if (removedIds.length > 0) {
      const { error } = await supabase
        .from('spokedu_master_program_meta')
        .update({ sm_is_hot: false, sm_display_order: 999 })
        .in('curriculum_id', removedIds);
      if (error) throw error;
    }

    const patches = slots.flatMap((curriculumId, index) =>
      curriculumId == null
        ? []
        : [{ curriculum_id: curriculumId, sm_is_hot: true, sm_display_order: index + 1 }],
    );
    if (patches.length > 0) {
      const { error } = await supabase
        .from('spokedu_master_program_meta')
        .upsert(patches, { onConflict: 'curriculum_id' });
      if (error) throw error;
    }

    return NextResponse.json({
      ok: true,
      slots,
      message: '이번주 추천 프로그램 슬롯을 저장했습니다.',
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : '추천 슬롯 저장에 실패했습니다.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
