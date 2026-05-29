import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { hasBrokenText } from '@/app/spokedu-master/lib/clean';
import { OFFICIAL_SPOMOVE_PRESETS, isSupportedMasterEngineMode } from '@/app/spokedu-master/lib/spomovePresets';
import type { SpomoveLaunchPreset, SpomovePresetIntent } from '@/app/spokedu-master/types';

type PresetRow = {
  id: string;
  title: string;
  subtitle: string | null;
  intent: string | null;
  drill_id: string;
  engine_mode: string;
  engine_level: number;
  duration_sec: number;
  speed_sec: number;
  launch_mode: string | null;
  tags: string[] | null;
  target: string | null;
  space: string | null;
  use_case: string | null;
  is_visible: boolean;
  display_order: number;
};

const INTENTS = new Set<SpomovePresetIntent>(['warmup', 'focus', 'space', 'finish']);
const LAUNCH_MODES = new Set<SpomoveLaunchPreset['mode']>(['projector', 'mobile', 'class']);

function toPreset(row: PresetRow): SpomoveLaunchPreset {
  const official = OFFICIAL_SPOMOVE_PRESETS.find((preset) => preset.id === row.id);
  const intent = INTENTS.has(row.intent as SpomovePresetIntent) ? row.intent as SpomovePresetIntent : 'focus';
  const mode = LAUNCH_MODES.has(row.launch_mode as SpomoveLaunchPreset['mode']) ? row.launch_mode as SpomoveLaunchPreset['mode'] : 'projector';
  return {
    id: row.id,
    title: hasBrokenText(row.title) ? official?.title ?? row.title : row.title,
    subtitle: hasBrokenText(row.subtitle ?? '') ? official?.subtitle ?? '' : row.subtitle ?? '',
    intent,
    drillId: row.drill_id,
    engineMode: row.engine_mode,
    engineLevel: row.engine_level,
    durationSec: row.duration_sec,
    speedSec: Number(row.speed_sec),
    mode,
    tags: (row.tags ?? []).some(hasBrokenText) ? official?.tags ?? [] : row.tags ?? [],
    target: hasBrokenText(row.target ?? '') ? official?.target ?? '' : row.target ?? '',
    space: hasBrokenText(row.space ?? '') ? official?.space ?? '' : row.space ?? '',
    useCase: hasBrokenText(row.use_case ?? '') ? official?.useCase ?? '' : row.use_case ?? '',
    isVisible: row.is_visible,
    displayOrder: row.display_order,
  };
}

function toRow(preset: SpomoveLaunchPreset, displayOrder = 0) {
  return {
    id: preset.id,
    title: preset.title,
    subtitle: preset.subtitle,
    intent: preset.intent,
    drill_id: preset.drillId,
    engine_mode: preset.engineMode,
    engine_level: preset.engineLevel,
    duration_sec: preset.durationSec,
    speed_sec: preset.speedSec,
    launch_mode: preset.mode,
    tags: preset.tags,
    target: preset.target,
    space: preset.space,
    use_case: preset.useCase,
    is_visible: true,
    display_order: displayOrder,
  };
}

function normalizePreset(input: unknown): SpomoveLaunchPreset | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const obj = input as Partial<SpomoveLaunchPreset>;
  const title = typeof obj.title === 'string' ? obj.title.trim().slice(0, 80) : '';
  const drillId = typeof obj.drillId === 'string' ? obj.drillId.trim() : '';
  const engineMode = typeof obj.engineMode === 'string' ? obj.engineMode.trim() : '';
  const engineLevel = Number(obj.engineLevel);
  const durationSec = Number(obj.durationSec);
  const speedSec = Number(obj.speedSec);
  const intent = INTENTS.has(obj.intent as SpomovePresetIntent) ? obj.intent as SpomovePresetIntent : 'focus';
  const mode = LAUNCH_MODES.has(obj.mode as SpomoveLaunchPreset['mode']) ? obj.mode as SpomoveLaunchPreset['mode'] : 'projector';

  if (!title || !drillId || !engineMode || !isSupportedMasterEngineMode(engineMode)) return null;
  if (!Number.isFinite(engineLevel) || engineLevel < 1 || engineLevel > 20) return null;
  if (!Number.isFinite(durationSec) || durationSec < 5 || durationSec > 900) return null;
  if (!Number.isFinite(speedSec) || speedSec < 0.1 || speedSec > 20) return null;

  return {
    id: typeof obj.id === 'string' && obj.id.trim() ? obj.id.trim().slice(0, 80) : `preset-${Date.now()}`,
    title,
    subtitle: typeof obj.subtitle === 'string' ? obj.subtitle.trim().slice(0, 160) : '',
    intent,
    drillId,
    engineMode,
    engineLevel: Math.round(engineLevel),
    durationSec: Math.round(durationSec),
    speedSec,
    mode,
    tags: Array.isArray(obj.tags) ? obj.tags.filter((tag): tag is string => typeof tag === 'string').map((tag) => tag.trim()).filter(Boolean).slice(0, 8) : [],
    target: typeof obj.target === 'string' ? obj.target.trim().slice(0, 60) : '',
    space: typeof obj.space === 'string' ? obj.space.trim().slice(0, 60) : '',
    useCase: typeof obj.useCase === 'string' ? obj.useCase.trim().slice(0, 160) : '',
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const adminMode = url?.searchParams.get('admin') === '1';

  try {
    if (adminMode) {
      const serverSupabase = await createServerSupabaseClient();
      const { data: { user } } = await serverSupabase.auth.getUser();
      if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getServiceSupabase();
    let query = supabase
      .from('spokedu_master_spomove_presets')
      .select('id,title,subtitle,intent,drill_id,engine_mode,engine_level,duration_sec,speed_sec,launch_mode,tags,target,space,use_case,is_visible,display_order')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (!adminMode) query = query.eq('is_visible', true);

    const { data, error } = await query;

    if (error) throw error;
    const rows = ((data ?? []) as PresetRow[]).map(toPreset);
    const dbPresets = adminMode ? rows : rows.filter((preset) => isSupportedMasterEngineMode(preset.engineMode));
    if (dbPresets.length > 0) return NextResponse.json({ data: dbPresets, source: 'db' });

    await supabase
      .from('spokedu_master_spomove_presets')
      .upsert(OFFICIAL_SPOMOVE_PRESETS.map((preset, index) => toRow(preset, index)), { onConflict: 'id' });

    return NextResponse.json({ data: OFFICIAL_SPOMOVE_PRESETS, source: 'seeded' });
  } catch {
    return NextResponse.json({ data: OFFICIAL_SPOMOVE_PRESETS, source: 'fallback' });
  }
}

export async function PATCH(request: Request) {
  const serverSupabase = await createServerSupabaseClient();
  const { data: { user } } = await serverSupabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const obj = body as Partial<SpomoveLaunchPreset> & { id?: string };
  const id = typeof obj.id === 'string' ? obj.id.trim() : '';
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if (typeof obj.title === 'string') patch.title = obj.title.trim().slice(0, 80);
  if (typeof obj.subtitle === 'string') patch.subtitle = obj.subtitle.trim().slice(0, 160);
  if (INTENTS.has(obj.intent as SpomovePresetIntent)) patch.intent = obj.intent;
  if (typeof obj.drillId === 'string') patch.drill_id = obj.drillId.trim();
  if (typeof obj.engineMode === 'string') {
    const engineMode = obj.engineMode.trim();
    if (!isSupportedMasterEngineMode(engineMode)) return NextResponse.json({ error: 'Unsupported engine mode' }, { status: 400 });
    patch.engine_mode = engineMode;
  }
  if (Number.isFinite(Number(obj.engineLevel))) patch.engine_level = Math.max(1, Math.min(20, Math.round(Number(obj.engineLevel))));
  if (Number.isFinite(Number(obj.durationSec))) patch.duration_sec = Math.max(5, Math.min(900, Math.round(Number(obj.durationSec))));
  if (Number.isFinite(Number(obj.speedSec))) patch.speed_sec = Math.max(0.1, Math.min(20, Number(obj.speedSec)));
  if (LAUNCH_MODES.has(obj.mode as SpomoveLaunchPreset['mode'])) patch.launch_mode = obj.mode;
  if (Array.isArray(obj.tags)) patch.tags = obj.tags.filter((tag): tag is string => typeof tag === 'string').map((tag) => tag.trim()).filter(Boolean).slice(0, 8);
  if (typeof obj.target === 'string') patch.target = obj.target.trim().slice(0, 60);
  if (typeof obj.space === 'string') patch.space = obj.space.trim().slice(0, 60);
  if (typeof obj.useCase === 'string') patch.use_case = obj.useCase.trim().slice(0, 160);
  if (typeof obj.isVisible === 'boolean') patch.is_visible = obj.isVisible;
  if (Number.isFinite(Number(obj.displayOrder))) patch.display_order = Math.max(0, Math.round(Number(obj.displayOrder)));

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('spokedu_master_spomove_presets')
    .update(patch)
    .eq('id', id)
    .select('id,title,subtitle,intent,drill_id,engine_mode,engine_level,duration_sec,speed_sec,launch_mode,tags,target,space,use_case,is_visible,display_order')
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ data: toPreset(data as PresetRow) });
}

export async function DELETE(request: Request) {
  const serverSupabase = await createServerSupabaseClient();
  const { data: { user } } = await serverSupabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = (searchParams.get('id') ?? '').trim();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const supabase = getServiceSupabase();
  const { error } = await supabase.from('spokedu_master_spomove_presets').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  const serverSupabase = await createServerSupabaseClient();
  const { data: { user } } = await serverSupabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const preset = normalizePreset(body);
  if (!preset) return NextResponse.json({ error: 'Invalid preset' }, { status: 400 });

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('spokedu_master_spomove_presets')
    .upsert(toRow(preset, 0), { onConflict: 'id' })
    .select('id,title,subtitle,intent,drill_id,engine_mode,engine_level,duration_sec,speed_sec,launch_mode,tags,target,space,use_case,is_visible,display_order')
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message, fallbackPreset: preset }, { status: 500 });
  return NextResponse.json({ data: toPreset(data as PresetRow) });
}
