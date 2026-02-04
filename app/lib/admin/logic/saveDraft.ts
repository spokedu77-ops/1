/**
 * 초안 저장 로직
 * Draft 기반 초안 저장 시스템
 */

import { getSupabaseClient } from '@/app/lib/supabase/client';

const supabase = getSupabaseClient();

export interface SaveDraftParams {
  type: 'play' | 'think' | 'flow';
  scenario_json: any;
  draft_session_id: string;
  theme_id?: string;
}

export interface SaveDraftResult {
  success: boolean;
  scenarioId?: string;
  error?: string;
}

/**
 * 초안 저장 함수
 * 같은 세션의 같은 타입은 덮어쓰기 (upsert)
 */
export async function saveDraft(params: SaveDraftParams): Promise<string> {
  try {
    // 기존 Draft 조회 (같은 세션의 같은 타입)
    const { data: existing } = await supabase
      .from('scenarios')
      .select('id')
      .eq('draft_session_id', params.draft_session_id)
      .eq('type', params.type)
      .eq('is_draft', true)
      .maybeSingle();

    const upsertData: any = {
      type: params.type,
      scenario_json: params.scenario_json,
      draft_session_id: params.draft_session_id,
      theme_id: params.theme_id,
      is_draft: true,
      is_active: true,
      deleted_at: null,
    };

    // 기존 Draft가 있으면 업데이트, 없으면 생성
    if (existing) {
      const { data, error } = await supabase
        .from('scenarios')
        .update(upsertData)
        .eq('id', existing.id)
        .select('id')
        .single();

      if (error) throw error;
      return data.id;
    } else {
      const { data, error } = await supabase
        .from('scenarios')
        .insert(upsertData)
        .select('id')
        .single();

      if (error) throw error;
      return data.id;
    }
  } catch (err: any) {
    console.error('초안 저장 실패:', err);
    throw new Error(`초안 저장 실패: ${err?.message || String(err)}`);
  }
}
