/**
 * Play Phase 시나리오 초기화 유틸리티
 * SQL 대신 코드로 시나리오를 생성/업데이트
 */

import { createClient } from '@supabase/supabase-js';
import { Episode } from '../types/scenario';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function initializeKitchenScenario(): Promise<boolean> {
  const kitchenEpisode: Episode = {
    id: "KITCHEN_INFERNO",
    name: "주방의 불꽃",
    theme: "kitchen",
    total_time: 120,
    background: {
      type: "3d",
      scene_config: {
        fog_color: "#1a1a2e",
        fog_near: 500,
        fog_far: 3800,
        ambient_light: 0.7,
        point_lights: [
          {
            color: "#ff6600",
            intensity: 15,
            position: { x: 0, y: 2000, z: 1000 }
          }
        ]
      }
    },
    timeline: [
      {
        start: 0,
        end: 30,
        trigger: {
          type: "FLICKER",
          interval: 1.0,
          intensity: "MID"
        },
        action: "TURN",
        visual_effect: {
          object_type: "flame",
          position: { x: 50, y: 50, z: -1000 },
          scale: 1.0,
          animation_key: "gas_stove_flicker",
          color: "#ff6600"
        },
        repetition: {
          count: 10,
          interval: 1.0,
          variation: "alternating"
        },
        sound_effect: {
          type: "trigger",
          frequency: 400,
          duration: 0.1
        }
      },
      {
        start: 30,
        end: 60,
        trigger: {
          type: "SWEEP",
          speed: 0.8,
          random_delay: [1, 3],
          intensity: "MID"
        },
        action: "DUCK",
        visual_effect: {
          object_type: "pan",
          position: { x: 0, y: 20, z: -1500 },
          scale: 1.2,
          animation_key: "horizontal_slide",
          rotation: { z: 15 }
        },
        repetition: {
          count: 8,
          interval: 3.5,
          variation: "random"
        }
      },
      {
        start: 60,
        end: 90,
        trigger: {
          type: "BURST",
          count: 3,
          intensity: "HIGH"
        },
        action: "JUMP",
        visual_effect: {
          object_type: "popcorn",
          position: { x: 50, y: 50, z: -1200 },
          scale: 1.5,
          animation_key: "popcorn_explosion"
        },
        repetition: {
          count: 5,
          interval: 5.0,
          variation: "sequential"
        }
      },
      {
        start: 90,
        end: 120,
        trigger: {
          type: "APPROACH",
          speed: 0.6,
          intensity: "HIGH"
        },
        action: "PUSH",
        visual_effect: {
          object_type: "wall",
          position: { x: 50, y: 50, z: -2000 },
          scale: 2.0,
          animation_key: "approaching_wall",
          color: "#FF8C42"
        },
        repetition: {
          count: 3,
          interval: 8.0,
          variation: "sequential"
        }
      },
      {
        start: 15,
        end: 45,
        trigger: {
          type: "PULSE",
          interval: 2.0,
          intensity: "LOW"
        },
        action: "POINT",
        visual_effect: {
          object_type: "steam",
          position: { x: 30, y: 70, z: -1100 },
          scale: 1.0,
          animation_key: "steam_rise"
        },
        repetition: {
          count: 6,
          interval: 4.0,
          variation: "alternating"
        }
      },
      {
        start: 45,
        end: 75,
        trigger: {
          type: "ROTATE",
          speed: 1.0,
          intensity: "MID"
        },
        action: "TURN",
        visual_effect: {
          object_type: "knife",
          position: { x: 70, y: 30, z: -1300 },
          scale: 1.3,
          animation_key: "knife_slash",
          rotation: { z: 45 }
        },
        repetition: {
          count: 7,
          interval: 4.0,
          variation: "alternating"
        }
      },
      {
        start: 75,
        end: 105,
        trigger: {
          type: "EXPLODE",
          intensity: "HIGH"
        },
        action: "PUNCH",
        visual_effect: {
          object_type: "spark",
          position: { x: 50, y: 50, z: -1000 },
          scale: 2.0,
          animation_key: "spark_burst",
          color: "#FFD700"
        },
        repetition: {
          count: 4,
          interval: 6.0,
          variation: "random"
        }
      },
      {
        start: 105,
        end: 120,
        trigger: {
          type: "SWEEP",
          speed: 1.2,
          intensity: "HIGH"
        },
        action: "DUCK",
        visual_effect: {
          object_type: "pan",
          position: { x: 50, y: 40, z: -800 },
          scale: 1.5,
          animation_key: "fast_slide",
          rotation: { z: 30 }
        },
        repetition: {
          count: 3,
          interval: 4.0,
          variation: "sequential"
        }
      }
    ]
  };

  const { data, error } = await supabase
    .from('play_scenarios')
    .upsert({
      id: 'kitchen_inferno',
      name: kitchenEpisode.name,
      theme: kitchenEpisode.theme,
      duration: kitchenEpisode.total_time,
      scenario_json: kitchenEpisode,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'id'
    })
    .select()
    .single();

  if (error) {
    console.error('❌ 시나리오 초기화 실패:', error);
    return false;
  }

  console.log('✅ 시나리오 초기화 성공:', data);
  return true;
}

/**
 * 시나리오가 없으면 자동으로 생성
 */
export async function ensureScenarioExists(scenarioId: string): Promise<boolean> {
  // 먼저 존재하는지 확인
  const { data: existing } = await supabase
    .from('play_scenarios')
    .select('id')
    .eq('id', scenarioId)
    .single();

  if (existing) {
    return true; // 이미 존재함
  }

  // 없으면 기본 시나리오 생성
  if (scenarioId === 'kitchen_inferno') {
    return await initializeKitchenScenario();
  }

  console.warn(`⚠️ 시나리오 ${scenarioId}를 찾을 수 없고 자동 생성도 불가능합니다.`);
  return false;
}
