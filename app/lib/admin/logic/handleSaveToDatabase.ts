/**
 * 데이터베이스 저장 로직
 * Zod 검증 후 Supabase RPC 함수를 통해 단일 트랜잭션으로 저장
 */

import { ScenarioJSONSchema, WarmupProgramSchema } from '../schemas/scenarioSchema';
import { GeneratedScenario } from '../types/scenario';
import { getSupabaseClient } from '@/app/lib/supabase/client';

const supabase = getSupabaseClient();

export interface SaveOptions {
  asTemplate?: boolean;
  title?: string;
  description?: string;
  theme?: string; // 실제 테마 값 (kitchen, space 등)
}

export interface SaveResult {
  success: boolean;
  error?: string;
  scenarioId?: string;
  programId?: string;
}

/**
 * 시나리오를 데이터베이스에 저장
 * play_scenarios → warmup_programs_composite → rotation_schedule 순서로 단일 트랜잭션 처리
 */
export async function handleSaveToDatabase(
  scenario: GeneratedScenario,
  weekId: string | null,
  options: SaveOptions = {}
): Promise<SaveResult> {
  try {
    // 1. Zod 검증 (engine 모드일 때는 actions가 없을 수 있음)
    let scenarioData: any;
    
    if (scenario.play.content_type === 'html') {
      // HTML 모드: raw_html만 있으면 됨
      scenarioData = {
        theme: 'html',
        duration: 120,
        actions: [],
        raw_html: scenario.play.raw_html || '',
        config_vars: scenario.play.config_vars || {},
      };
    } else {
      // Engine 모드: actions 또는 frequency 등이 있음
      // theme은 options에서 가져오거나, 없으면 기본값 'kitchen' 사용
      const theme = options.theme || 'kitchen';
      
      scenarioData = {
        theme: theme, // 실제 테마 값 사용 (kitchen, space 등)
        duration: 120,
        actions: scenario.play.actions || [],
        frequency: scenario.play.frequency,
        transitionInterval: scenario.play.transitionInterval,
      };
      
      // actions가 있으면 검증
      if (scenario.play.actions && scenario.play.actions.length > 0) {
        const validationResult = ScenarioJSONSchema.safeParse({
          theme: scenarioData.theme,
          duration: scenarioData.duration,
          actions: scenarioData.actions,
        });
        
        if (!validationResult.success) {
          return {
            success: false,
            error: `검증 실패: ${validationResult.error.issues.map((e: any) => e.message).join(', ')}`,
          };
        }
      }
    }

    // 2. Supabase RPC 함수 호출 (단일 트랜잭션)
    const { data, error } = await supabase.rpc('save_warmup_program', {
      scenario_data: scenarioData,
      week_id: weekId,
      as_template: options.asTemplate || false,
      program_title: options.title || 'Untitled Program',
      program_description: options.description || '',
    });

    if (error) {
      console.error('RPC 함수 호출 오류:', error);
      return {
        success: false,
        error: `저장 실패: ${error.message}`,
      };
    }

    return {
      success: true,
      scenarioId: data?.scenario_id,
      programId: data?.program_id,
    };
  } catch (err: any) {
    console.error('저장 오류:', err);
    return {
      success: false,
      error: `알 수 없는 오류: ${err?.message || String(err)}`,
    };
  }
}
