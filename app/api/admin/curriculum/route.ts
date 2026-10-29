import { NextResponse } from 'next/server';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';
import { invalidateSpokeduMasterProgramSourceCache } from '@/app/lib/server/spokeduMasterProgramSourceCache';

type CurriculumWriteRow = {
  title: string;
  url: string;
  month: number;
  week: number;
  equipment: string[];
  steps: string[];
  type: string;
  thumbnail: string;
  is_sub: boolean;
  equipment_tag_numbers: number[] | null;
  display_order?: number;
};

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function parseCurriculumWriteRow(body: Record<string, unknown>): CurriculumWriteRow | null {
  if (typeof body.title !== 'string' || typeof body.url !== 'string') return null;
  if (typeof body.month !== 'number' || typeof body.week !== 'number') return null;
  if (typeof body.type !== 'string' || typeof body.thumbnail !== 'string') return null;
  if (typeof body.is_sub !== 'boolean') return null;
  if (!isStringArray(body.equipment) || !isStringArray(body.steps)) return null;

  const tagNumbers = body.equipment_tag_numbers;
  const equipment_tag_numbers =
    tagNumbers == null
      ? null
      : Array.isArray(tagNumbers) && tagNumbers.every((n) => typeof n === 'number')
        ? tagNumbers
        : null;

  const row: CurriculumWriteRow = {
    title: body.title,
    url: body.url,
    month: body.month,
    week: body.week,
    equipment: body.equipment,
    steps: body.steps,
    type: body.type,
    thumbnail: body.thumbnail,
    is_sub: body.is_sub,
    equipment_tag_numbers,
  };

  if (typeof body.display_order === 'number' && Number.isFinite(body.display_order)) {
    row.display_order = body.display_order;
  }

  return row;
}

type ReorderEntry = { id: number; display_order: number };

function parseReorder(body: Record<string, unknown>): ReorderEntry[] | null {
  if (!Array.isArray(body.reorder)) return null;
  const entries: ReorderEntry[] = [];
  for (const item of body.reorder) {
    if (!item || typeof item !== 'object') return null;
    const id = Number((item as { id?: unknown }).id);
    const display_order = Number((item as { display_order?: unknown }).display_order);
    if (!Number.isInteger(id) || id <= 0) return null;
    if (!Number.isInteger(display_order) || display_order < 0) return null;
    entries.push({ id, display_order });
  }
  return entries;
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const row = parseCurriculumWriteRow(body);
  if (!row || typeof row.display_order !== 'number') {
    return NextResponse.json({ error: 'invalid curriculum payload' }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('curriculum')
    .insert([row])
    .select('id')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  invalidateSpokeduMasterProgramSourceCache();
  return NextResponse.json({ ok: true, id: (data as { id: number }).id });
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const reorder = parseReorder(body);
  if (reorder) {
    // Not a single DB transaction: Supabase row updates run sequentially. Rollback is best-effort only.
    const supabase = getServiceSupabase();
    const ids = reorder.map((entry) => entry.id);
    const { data: beforeRows, error: readError } = await supabase
      .from('curriculum')
      .select('id, display_order')
      .in('id', ids);
    if (readError) {
      return NextResponse.json({ error: readError.message }, { status: 500 });
    }
    const beforeOrder = new Map(
      (beforeRows ?? []).map((row) => [(row as { id: number }).id, (row as { display_order: number }).display_order]),
    );
    const applied: ReorderEntry[] = [];
    try {
      for (const entry of reorder) {
        const { error } = await supabase
          .from('curriculum')
          .update({ display_order: entry.display_order })
          .eq('id', entry.id);
        if (error) throw new Error(error.message);
        applied.push(entry);
      }
    } catch (reorderError) {
      let rollbackFailed = false;
      for (let index = applied.length - 1; index >= 0; index -= 1) {
        const entry = applied[index]!;
        const previous = beforeOrder.get(entry.id);
        if (previous == null) continue;
        const { error: revertError } = await supabase
          .from('curriculum')
          .update({ display_order: previous })
          .eq('id', entry.id);
        if (revertError) rollbackFailed = true;
      }
      // Partial writes may remain; invalidate even when rollback fails so readers re-sync from DB.
      invalidateSpokeduMasterProgramSourceCache();
      const message = reorderError instanceof Error ? reorderError.message : 'reorder failed';
      return NextResponse.json(
        { error: message, partialApplied: applied.length, rollbackFailed },
        { status: 500 },
      );
    }
    invalidateSpokeduMasterProgramSourceCache();
    return NextResponse.json({ ok: true, updated: reorder.length });
  }

  const id = Number(body.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'invalid curriculum id' }, { status: 400 });
  }

  const row = parseCurriculumWriteRow(body);
  if (!row) {
    return NextResponse.json({ error: 'invalid curriculum payload' }, { status: 400 });
  }

  const { display_order: _ignored, ...patch } = row;
  const supabase = getServiceSupabase();
  const { error } = await supabase.from('curriculum').update(patch).eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  invalidateSpokeduMasterProgramSourceCache();
  return NextResponse.json({ ok: true, id });
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const id = Number(new URL(request.url).searchParams.get('id'));
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'invalid curriculum id' }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  const { data, error } = await supabase.from('curriculum').delete().eq('id', id).select('id');
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data?.length) {
    return NextResponse.json({ error: 'not deleted' }, { status: 404 });
  }

  invalidateSpokeduMasterProgramSourceCache();
  return NextResponse.json({ ok: true, id });
}
