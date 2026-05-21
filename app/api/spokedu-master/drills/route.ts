import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { MODES, SPOMOVE_CATALOG_SLOT_IDS, isSpomoveCatalogTbdMode } from '@/app/admin/spomove/training/_player/constants';
import type { Drill } from '@/app/spokedu-master/types';

const SESSION_CUES = [
  { symbol: 'L', label: '왼쪽', bgColor: '#1a0a3a' },
  { symbol: 'R', label: '오른쪽', bgColor: '#0a1a3a' },
  { symbol: 'F', label: '앞으로', bgColor: '#022c1a' },
  { symbol: 'B', label: '뒤로', bgColor: '#1c0a00' },
  { symbol: 'S', label: '멈춤', bgColor: '#1a0a1a' },
  { symbol: 'J', label: '점프', bgColor: '#0a1628' },
];

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

type DrillWithOrder = Drill & { _order: number };

export async function GET() {
  const serverSupabase = await createServerSupabaseClient();
  const { data: { user } } = await serverSupabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getServiceSupabase();
  const { data: metaRows } = await supabase
    .from('spokedu_master_drill_meta')
    .select('drill_id,display_name,sm_tags,is_pro,is_visible,display_order,engine_mode,engine_level');

  const metaByDrillId = new Map<string, MetaRow>();
  for (const meta of (metaRows ?? []) as MetaRow[]) {
    metaByDrillId.set(meta.drill_id, meta);
  }

  const drills: Drill[] = SPOMOVE_CATALOG_SLOT_IDS
    .filter((modeId) => !isSpomoveCatalogTbdMode(modeId))
    .map<DrillWithOrder | null>((modeId, index) => {
      const mode = MODES[modeId];
      const meta = metaByDrillId.get(modeId);
      if (meta && !meta.is_visible) return null;
      const firstLevel = mode.levels[0];

      return {
        id: mode.id,
        name: meta?.display_name || `${mode.title} : ${mode.en}`,
        category: mode.title,
        description: mode.desc,
        icon: mode.icon,
        enName: mode.en,
        tag: mode.tag,
        cues: SESSION_CUES,
        isPro: meta?.is_pro ?? false,
        bgColor: mode.accent,
        engine: {
          mode: meta?.engine_mode || mode.id,
          level: meta?.engine_level || firstLevel?.id || 1,
        },
        _order: meta?.display_order ?? index,
      } satisfies DrillWithOrder;
    })
    .filter((drill): drill is DrillWithOrder => drill != null)
    .sort((a, b) => a._order - b._order)
    .map((drillWithOrder) => {
      const drill = { ...drillWithOrder } as Drill & { _order?: number };
      delete drill._order;
      return drill;
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
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const allowed = ['display_name', 'sm_tags', 'is_pro', 'is_visible', 'display_order', 'engine_mode', 'engine_level'];
  const patch: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) patch[key] = body[key];
  }

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('spokedu_master_drill_meta')
    .upsert({ drill_id: drillId, ...patch }, { onConflict: 'drill_id' })
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
