import { NextResponse } from 'next/server';
import { requireAdmin, getServiceSupabase } from '@/app/lib/server/adminAuth';
import { MODES } from '@/app/admin/memory-game/constants';

type ModeToScreenplay = {
  modeKey: string;
  modeId: string;
  sortBase: number;
};

const MODE_MAP: ModeToScreenplay[] = [
  { modeKey: 'basic', modeId: '반응인지', sortBase: 1000 },
  { modeKey: 'stroop', modeId: '스트룹', sortBase: 2000 },
  { modeKey: 'spatial', modeId: '순차기억', sortBase: 3000 },
  { modeKey: 'dual', modeId: '이중과제', sortBase: 4000 },
  { modeKey: 'flow', modeId: 'FLOW', sortBase: 5000 },
];

export async function POST() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const supabase = getServiceSupabase();
  const errors: Array<{ key: string; message: string }> = [];
  let inserted = 0;
  let updated = 0;

  // 스포무브는 memory-game 기준 16개만 노출해야 하므로,
  // 재이식 시 기존 screenplay를 모두 비공개 처리한 뒤 대상 16개만 다시 공개합니다.
  const { error: hideError } = await supabase
    .from('spokedu_pro_screenplays')
    .update({ is_published: false })
    .neq('id', 0);
  if (hideError) {
    return NextResponse.json({ error: hideError.message }, { status: 500 });
  }

  for (const map of MODE_MAP) {
    const mode = MODES[map.modeKey];
    if (!mode) continue;

    for (const level of mode.levels) {
      const title = `${mode.title} ${level.name}`;
      const subtitle = `${mode.title} · ${level.enName}`;
      const description = level.desc ?? mode.desc ?? null;
      const presetRef = String(level.id);
      const sortOrder = map.sortBase + level.id;

      const { data: existing, error: findError } = await supabase
        .from('spokedu_pro_screenplays')
        .select('id')
        .eq('mode_id', map.modeId)
        .eq('title', title)
        .maybeSingle();

      if (findError) {
        errors.push({ key: `${map.modeId}:${title}`, message: findError.message });
        continue;
      }

      const payload = {
        mode_id: map.modeId,
        title,
        subtitle,
        description,
        sort_order: sortOrder,
        preset_ref: presetRef,
        thumbnail_url: null,
        is_published: true,
      };

      if (existing?.id) {
        const { error } = await supabase
          .from('spokedu_pro_screenplays')
          .update(payload)
          .eq('id', existing.id);
        if (error) errors.push({ key: `${map.modeId}:${title}`, message: error.message });
        else updated += 1;
      } else {
        const { error } = await supabase.from('spokedu_pro_screenplays').insert(payload);
        if (error) errors.push({ key: `${map.modeId}:${title}`, message: error.message });
        else inserted += 1;
      }
    }
  }

  return NextResponse.json({
    ok: true,
    inserted,
    updated,
    failed: errors.length,
    errors: errors.slice(0, 30),
  });
}

