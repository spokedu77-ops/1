/**
 * Asset 교체(Replace) 로직
 * Template에는 Replace 허용, Published Snapshot에는 Replace 금지
 */

import { getSupabaseClient } from '@/app/lib/supabase/client';
import { checkAssetUsage } from './checkAssetUsage';

const supabase = getSupabaseClient();

export interface ReplaceResult {
  templatesUpdated: number;
  publishedProtected: number;
}

/**
 * Asset 교체
 * 1. Template만 업데이트 (week_id IS NULL)
 * 2. Published Snapshot은 건드리지 않음
 * 3. 기존 Asset Soft Delete
 */
export async function replaceAsset(
  oldAssetId: string,
  newAssetId: string
): Promise<ReplaceResult> {
  // 1. 사용처 조회
  const usage = await checkAssetUsage(oldAssetId);

  // 2. Template만 업데이트 (week_id IS NULL)
  const templates = usage.templates.filter(t => t.week_id === null);
  let templatesUpdated = 0;

  for (const template of templates) {
    try {
      // 템플릿 데이터 조회
      const { data: templateData, error: fetchError } = await supabase
        .from('warmup_programs_composite')
        .select('scenario_ids, phases')
        .eq('id', template.id)
        .single();

      if (fetchError || !templateData) {
        console.error(`템플릿 조회 실패: ${template.id}`, fetchError);
        continue;
      }

      // scenario_ids 배열 업데이트
      const newScenarioIds = (templateData.scenario_ids || []).map((id: string) =>
        id === oldAssetId ? newAssetId : id
      );

      // phases JSON 내부도 업데이트 (필수!)
      const newPhases = JSON.parse(JSON.stringify(templateData.phases));
      
      // phases 내부의 모든 scenario_id 교체
      if (Array.isArray(newPhases)) {
        newPhases.forEach((phase: any) => {
          if (phase.scenario_id === oldAssetId) {
            phase.scenario_id = newAssetId;
          }
        });
      }

      // 동시 업데이트
      const { error: updateError } = await supabase
        .from('warmup_programs_composite')
        .update({
          scenario_ids: newScenarioIds,
          phases: newPhases, // phases도 업데이트
          updated_at: new Date().toISOString(),
          version: (templateData as any).version ? (templateData as any).version + 1 : 1
        })
        .eq('id', template.id);

      if (updateError) {
        console.error(`템플릿 업데이트 실패: ${template.id}`, updateError);
        continue;
      }

      templatesUpdated++;
    } catch (error) {
      console.error(`템플릿 교체 중 오류: ${template.id}`, error);
    }
  }

  // 3. Published Snapshot은 건드리지 않음 (보호됨)
  const publishedProtected = usage.publishedPrograms.length;

  if (publishedProtected > 0) {
    console.log(
      `${publishedProtected} published programs use old asset (protected)`
    );
  }

  // 4. 기존 Asset Soft Delete
  await supabase
    .from('play_scenarios')
    .update({
      is_active: false,
      deleted_at: new Date().toISOString()
    })
    .eq('id', oldAssetId);

  return {
    templatesUpdated,
    publishedProtected
  };
}
