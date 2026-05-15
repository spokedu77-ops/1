import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import catalog from '@/app/lib/spomove/core5Catalog';
import type { Drill } from '@/app/spokedu-master/types';

const SESSION_CUES = [
  { symbol: 'L', label: '왼쪽', bgColor: '#1a0a3a' },
  { symbol: 'R', label: '오른쪽', bgColor: '#0a1a3a' },
  { symbol: 'F', label: '앞으로', bgColor: '#022c1a' },
  { symbol: 'B', label: '뒤로', bgColor: '#1c0a00' },
  { symbol: 'S', label: '멈춤', bgColor: '#1a0a1a' },
  { symbol: 'J', label: '점프', bgColor: '#0a1628' },
];

const SERIES_COLORS: Record<string, string> = {
  SR: '#312e81',
  IC: '#064e3b',
  RS: '#713f12',
  SM: '#1e1b4b',
  RC: '#1c1917',
};

export async function GET() {
  const serverSupabase = await createServerSupabaseClient();
  const { data: { user } } = await serverSupabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getServiceSupabase();

  type MetaRow = {
    drill_id: string;
    display_name: string | null;
    sm_tags: string[] | null;
    is_pro: boolean;
    is_visible: boolean;
    display_order: number;
    engine_mode: string | null;
    engine_level: number | null;
  };

  const { data: metaRows } = await supabase
    .from('spokedu_master_drill_meta')
    .select('drill_id,display_name,sm_tags,is_pro,is_visible,display_order,engine_mode,engine_level');

  const metaByDrillId = new Map<string, MetaRow>();
  for (const m of (metaRows ?? []) as MetaRow[]) {
    metaByDrillId.set(m.drill_id, m);
  }

  const drills: Drill[] = [];

  for (const series of catalog) {
    const seriesBg = SERIES_COLORS[series.code] ?? '#312e81';
    for (const program of series.programs) {
      const meta = metaByDrillId.get(program.programId);
      if (meta && !meta.is_visible) continue;

      const firstEngine = program.stages.find((s) => s.engine != null)?.engine ?? null;
      const engineMode = meta?.engine_mode ?? firstEngine?.mode ?? null;
      const engineLevel = meta?.engine_level ?? firstEngine?.level ?? null;

      drills.push({
        id: program.programId,
        name: meta?.display_name ?? program.title,
        category: series.title,
        cues: SESSION_CUES,
        isPro: meta?.is_pro ?? false,
        bgColor: seriesBg,
        engine: engineMode != null && engineLevel != null
          ? { mode: engineMode, level: engineLevel }
          : undefined,
      });
    }
  }

  drills.sort((a, b) => {
    const orderA = metaByDrillId.get(a.id)?.display_order ?? 999;
    const orderB = metaByDrillId.get(b.id)?.display_order ?? 999;
    return orderA - orderB;
  });

  return NextResponse.json({ data: drills, total: drills.length });
}

export async function PATCH(request: Request) {
  const { searchParams } = new URL(request.url);
  const drillId = (searchParams.get('id') ?? '').trim();
  if (!drillId) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const serverSupabase = await createServerSupabaseClient();
  const { data: { user } } = await serverSupabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const allowed = ['display_name', 'sm_tags', 'is_pro', 'is_visible', 'display_order', 'engine_mode', 'engine_level'];
  const patch: Record<string, unknown> = {};
  for (const key of allowed) { if (key in body) patch[key] = body[key]; }

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('spokedu_master_drill_meta')
    .upsert({ drill_id: drillId, ...patch }, { onConflict: 'drill_id' })
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
