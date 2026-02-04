/**
 * Think Asset Pack 목록/로드 (play_scenarios type='think_asset_pack')
 * 크리에이터 스튜디오 Think Studio에서 Pack 선택·로드용
 */

import { getSupabaseClient } from '@/app/lib/supabase/client';

export type ThinkObjectsState = {
  red: string[];
  blue: string[];
  yellow: string[];
  green: string[];
};

export interface ThinkAssetPack {
  id: string;
  name: string;
  theme_ref?: string;
  objects?: ThinkObjectsState;
}

function parseObjects(raw: unknown): ThinkObjectsState {
  if (!raw || typeof raw !== 'object') {
    return { red: [], blue: [], yellow: [], green: [] };
  }
  const o = raw as Record<string, unknown>;
  return {
    red: Array.isArray(o.red) ? (o.red as string[]) : [],
    blue: Array.isArray(o.blue) ? (o.blue as string[]) : [],
    yellow: Array.isArray(o.yellow) ? (o.yellow as string[]) : [],
    green: Array.isArray(o.green) ? (o.green as string[]) : [],
  };
}

/**
 * Think Asset Pack 목록 조회 (id, name, theme_ref)
 */
export async function listThinkAssetPacks(): Promise<ThinkAssetPack[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('play_scenarios')
    .select('id, name, scenario_json')
    .eq('type', 'think_asset_pack')
    .eq('is_active', true)
    .order('name');

  if (error) {
    console.error('listThinkAssetPacks:', error);
    return [];
  }

  return (data || []).map((row: { id: string; name: string | null; scenario_json?: unknown }) => ({
    id: row.id,
    name: row.name ?? row.id,
    theme_ref: (row.scenario_json as { theme_ref?: string } | undefined)?.theme_ref,
  }));
}

/**
 * Think Asset Pack 단건 로드 (objects 포함)
 */
export async function loadThinkAssetPack(id: string): Promise<ThinkAssetPack | null> {
  if (!id) return null;
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('play_scenarios')
    .select('id, name, scenario_json')
    .eq('id', id)
    .eq('type', 'think_asset_pack')
    .single();

  if (error || !data) return null;

  const json = data.scenario_json as { name?: string; theme_ref?: string; assets?: { think?: { objects?: unknown } } } | undefined;
  const objects = json?.assets?.think?.objects;

  return {
    id: data.id,
    name: (data.name ?? json?.name ?? data.id) as string,
    theme_ref: json?.theme_ref,
    objects: parseObjects(objects),
  };
}
