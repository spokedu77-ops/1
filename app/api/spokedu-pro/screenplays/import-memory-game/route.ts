import { NextResponse } from 'next/server';
import { requireAdmin, getServiceSupabase } from '@/app/lib/server/adminAuth';
import { buildSpomoveScreenplayRowsFromMemoryModes } from '@/app/lib/spomove/spomoveScreenplaysFromMemoryModes';

export async function POST() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  let supabase;
  try {
    supabase = getServiceSupabase();
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Supabase service client init failed';
    return NextResponse.json({ error: msg }, { status: 503 });
  }

  const errors: Array<{ key: string; message: string }> = [];
  let inserted = 0;
  let updated = 0;

  // 스포무브 Pro: memory-game MODES(레벨마다 1 screenplays)에 맞춰 동기화합니다.
  // 재이식 시 기존 screenplay를 모두 비공개 처리한 뒤, MODE_MAP 대상만 다시 공개합니다.
  const { error: hideError } = await supabase
    .from('spokedu_pro_screenplays')
    .update({ is_published: false })
    .neq('id', 0);
  if (hideError) {
    return NextResponse.json({ error: hideError.message }, { status: 500 });
  }

  const rows = buildSpomoveScreenplayRowsFromMemoryModes();
  if (rows.length === 0) {
    return NextResponse.json(
      { error: 'Built 0 screenplay rows (MODES import failed or empty).', built: 0 },
      { status: 500 }
    );
  }

  for (const payload of rows) {
    const { data: found, error: findError } = await supabase
      .from('spokedu_pro_screenplays')
      .select('id')
      .eq('mode_id', payload.mode_id)
      .eq('preset_ref', payload.preset_ref)
      .limit(1);

    if (findError) {
      errors.push({ key: `${payload.mode_id}:${payload.preset_ref}`, message: findError.message });
      continue;
    }

    const existingId = found?.[0]?.id;

    if (existingId != null) {
      const { error } = await supabase.from('spokedu_pro_screenplays').update(payload).eq('id', existingId);
      if (error) errors.push({ key: `${payload.mode_id}:${payload.preset_ref}`, message: error.message });
      else updated += 1;
    } else {
      const { error } = await supabase.from('spokedu_pro_screenplays').insert(payload);
      if (error) errors.push({ key: `${payload.mode_id}:${payload.preset_ref}`, message: error.message });
      else inserted += 1;
    }
  }

  return NextResponse.json({
    ok: true,
    built: rows.length,
    inserted,
    updated,
    failed: errors.length,
    errors: errors.slice(0, 30),
  });
}

