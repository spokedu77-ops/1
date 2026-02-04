/**
 * Asset Hub에서 저장한 이미지를 불러오는 유틸리티
 */

import { getSupabaseClient } from '@/app/lib/supabase/client';
import { ACTION_KEYS, ASSET_VARIANTS, type ActionKey } from '@/app/lib/admin/constants/physics';
import { loadAssetWithFallback } from './loadAssetWithFallback';
import { BUCKET_NAME } from '@/app/lib/admin/constants/storage';

const supabase = getSupabaseClient();

export interface ThemeAssets {
  actions: Record<string, Record<string, string>>; // { POINT: { off: 'path', on: 'path' } }
  backgrounds?: {
    play?: string;
    think?: string;
    flow?: string;
  };
  objects?: string[];
}

/**
 * Storage path를 Public URL로 변환
 */
function getStoragePublicUrl(storagePath: string): string {
  const { data } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(storagePath);
  return data.publicUrl;
}

/**
 * Asset Pack에서 이미지 매핑 추출
 */
export async function loadThemeAssets(
  themeId: string,
  weekId?: string
): Promise<ThemeAssets> {
  try {
    // Asset Pack 조회 (type = 'asset_pack', id = themeId)
    const { data, error } = await supabase
      .from('play_scenarios')
      .select('scenario_json, type')
      .eq('id', themeId)
      .eq('type', 'asset_pack')
      .single();

    if (error || !data) {
      // Asset Pack이 없을 때는 조용히 fallback 반환 (에러를 던지지 않음)
      // 콘솔에 경고만 표시
      console.warn(`[loadThemeAssets] Asset Pack을 찾을 수 없습니다: ${themeId}. Fallback assets를 사용합니다.`);
      // Fallback으로 바로 반환 (4개 이미지 구조)
      const fallbackActions: Record<string, Record<string, string>> = {};
      for (const actionKey of ACTION_KEYS) {
        fallbackActions[actionKey] = {
          off1: '/images/default-action-off.png',
          off2: '/images/default-action-off.png',
          on1: '/images/default-action-on.png',
          on2: '/images/default-action-on.png'
        };
      }
      return {
        actions: fallbackActions
      };
    }

    const scenarioJson = data.scenario_json as any;
    const assets = scenarioJson.assets || {};

    // actions 매핑 생성 (off1, off2, on1, on2 지원)
    const actions: Record<string, Record<string, string>> = {};
    
    if (assets.actions) {
      for (const actionKey of ACTION_KEYS) {
        if (assets.actions[actionKey]) {
          actions[actionKey] = {};
          // 각 variant마다 2개씩 (off1, off2, on1, on2)
          for (const variant of ASSET_VARIANTS) {
            for (const index of [1, 2] as const) {
              const imageKey = `${variant}${index}`;
              const path = assets.actions[actionKey][imageKey];
              if (path) {
                // Storage path를 Public URL로 변환
                actions[actionKey][imageKey] = getStoragePublicUrl(path);
              } else {
                // Fallback 이미지
                actions[actionKey][imageKey] = `/images/default-action-${variant}.png`;
              }
            }
          }
        } else {
          // Fallback 이미지 (4개 모두)
          actions[actionKey] = {
            off1: '/images/default-action-off.png',
            off2: '/images/default-action-off.png',
            on1: '/images/default-action-on.png',
            on2: '/images/default-action-on.png'
          };
        }
      }
    }

    // backgrounds 매핑
    const backgrounds = assets.backgrounds ? {
      play: assets.backgrounds.play ? getStoragePublicUrl(assets.backgrounds.play) : undefined,
      think: assets.backgrounds.think ? getStoragePublicUrl(assets.backgrounds.think) : undefined,
      flow: assets.backgrounds.flow ? getStoragePublicUrl(assets.backgrounds.flow) : undefined,
    } : undefined;

    // objects 배열
    const objects = assets.objects?.map((path: string) => getStoragePublicUrl(path)) || [];

    return {
      actions,
      backgrounds,
      objects
    };
  } catch (error: any) {
    console.error('[loadThemeAssets] 예상치 못한 에러 발생:', error);
    // Fallback: 빈 매핑 반환 (4개 이미지 구조)
    const fallbackActions: Record<string, Record<string, string>> = {};
    for (const actionKey of ACTION_KEYS) {
      fallbackActions[actionKey] = {
        off1: '/images/default-action-off.png',
        off2: '/images/default-action-off.png',
        on1: '/images/default-action-on.png',
        on2: '/images/default-action-on.png'
      };
    }
    return {
      actions: fallbackActions
    };
  }
}

/**
 * 특정 동작의 이미지만 로드
 */
export async function loadActionImages(
  themeId: string,
  actionKey: ActionKey
): Promise<Record<string, string>> {
  const assets = await loadThemeAssets(themeId);
  return assets.actions[actionKey] || {
    off1: '/images/default-action-off.png',
    off2: '/images/default-action-off.png',
    on1: '/images/default-action-on.png',
    on2: '/images/default-action-on.png'
  };
}
