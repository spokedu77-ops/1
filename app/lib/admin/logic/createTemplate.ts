/**
 * 템플릿 생성 로직
 * Draft 3개를 Final로 변환하고 템플릿 생성
 */

import { getSupabaseClient } from '@/app/lib/supabase/client';

const supabase = getSupabaseClient();

export interface CreateTemplateResult {
  success: boolean;
  templateId?: string;
  error?: string;
}

/**
 * Draft 3개를 Final로 변환하고 템플릿 생성
 */
export async function createTemplateFromDrafts(
  sessionId: string,
  weekId?: string
): Promise<string> {
  try {
    // 1. Draft 3개 조회
    const { data: drafts, error: fetchError } = await supabase
      .from('scenarios')
      .select('*')
      .eq('draft_session_id', sessionId)
      .eq('is_draft', true)
      .eq('is_active', true);

    if (fetchError) {
      throw new Error(`Draft 조회 실패: ${fetchError.message}`);
    }

    if (!drafts || drafts.length !== 3) {
      throw new Error(
        `Play, Think, Flow 초안이 모두 필요합니다. (현재: ${drafts?.length || 0}개)`
      );
    }

    const play = drafts.find((d) => d.type === 'play');
    const think = drafts.find((d) => d.type === 'think');
    const flow = drafts.find((d) => d.type === 'flow');

    if (!play || !think || !flow) {
      const missing = [];
      if (!play) missing.push('Play');
      if (!think) missing.push('Think');
      if (!flow) missing.push('Flow');
      throw new Error(`다음 초안이 누락되었습니다: ${missing.join(', ')}`);
    }

    // 2. Draft를 Final로 변경
    const { error: updateError } = await supabase
      .from('scenarios')
      .update({ is_draft: false })
      .in('id', [play.id, think.id, flow.id]);

    if (updateError) {
      throw new Error(`Draft Final 변환 실패: ${updateError.message}`);
    }

    // 3. Template 생성 (warmup_programs_composite)
    const templateData: any = {
      phases: {
        play: { scenario_id: play.id },
        think: { scenario_id: think.id },
        flow: { scenario_id: flow.id },
      },
      scenario_ids: [play.id, think.id, flow.id],
      version: 1,
      is_active: true,
    };

    // week_id가 있으면 할당, 없으면 Template (null)
    if (weekId) {
      templateData.week_id = weekId;
      templateData.title = `웜업 프로그램 - ${weekId}`;
      templateData.description = 'Play, Think, Flow 3단계로 구성된 웜업 프로그램';
    } else {
      templateData.week_id = null;
      templateData.title = '웜업 템플릿';
      templateData.description = 'Play, Think, Flow 3단계로 구성된 웜업 템플릿';
    }

    // total_duration 계산 (기본값: 540초 = 9분)
    templateData.total_duration = 540;

    const { data: template, error: templateError } = await supabase
      .from('warmup_programs_composite')
      .insert(templateData)
      .select('id')
      .single();

    if (templateError) {
      throw new Error(`템플릿 생성 실패: ${templateError.message}`);
    }

    return template.id;
  } catch (err: any) {
    console.error('템플릿 생성 실패:', err);
    throw err;
  }
}
