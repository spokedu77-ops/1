/**
 * Asset 사용처 조회
 * scenario_ids 배열을 사용하여 빠른 검색
 */

import { getSupabaseClient } from '@/app/lib/supabase/client';

const supabase = getSupabaseClient();

export interface AssetUsage {
  templates: Array<{
    id: string;
    title: string;
    week_id: string | null;
  }>;
  publishedPrograms: Array<{
    week_key: string;
    program_id: string;
  }>;
}

/**
 * Asset이 어느 템플릿/프로그램에서 사용되는지 조회
 */
export async function checkAssetUsage(assetId: string): Promise<AssetUsage> {
  try {
    // 1. 템플릿에서 사용처 조회 (scenario_ids 배열 사용)
    const { data: templates, error: templatesError } = await supabase
      .from('warmup_programs_composite')
      .select('id, title, week_id')
      .contains('scenario_ids', [assetId]);

    if (templatesError) {
      console.error('템플릿 조회 오류:', templatesError);
    }

    // 2. rotation_schedule에서 사용처 조회: asset_pack_id 컬럼 및 program_snapshot.scenario_ids 둘 다 검사
    const { data: schedules, error: schedulesError } = await supabase
      .from('rotation_schedule')
      .select('week_key, program_id, asset_pack_id, program_snapshot')
      .eq('is_published', true);

    const publishedPrograms: Array<{ week_key: string; program_id: string }> = [];

    if (schedules) {
      for (const schedule of schedules as Array<{ week_key: string; program_id: string; asset_pack_id?: string | null; program_snapshot?: { scenario_ids?: string[] } | null }>) {
        const byColumn = schedule.asset_pack_id === assetId;
        const snapshot = schedule.program_snapshot;
        const scenarioIds = snapshot?.scenario_ids ?? [];
        const bySnapshot = scenarioIds.includes(assetId);
        if (byColumn || bySnapshot) {
          publishedPrograms.push({
            week_key: schedule.week_key,
            program_id: schedule.program_id
          });
        }
      }
    }

    if (schedulesError) {
      console.error('스케줄 조회 오류:', schedulesError);
    }

    return {
      templates: (templates || []).map(t => ({
        id: t.id,
        title: t.title,
        week_id: t.week_id
      })),
      publishedPrograms
    };
  } catch (error: any) {
    console.error('Asset 사용처 조회 실패:', error);
    return {
      templates: [],
      publishedPrograms: []
    };
  }
}
