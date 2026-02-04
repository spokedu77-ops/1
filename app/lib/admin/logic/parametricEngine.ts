/**
 * 파라메트릭 엔진
 * 타겟/난이도/테마에 따른 자동 액션 생성
 * Asset Hub 이미지 자동 로딩
 */

import { ACTION_KEYS, DEFAULT_ACTION_LABELS } from '@/app/lib/admin/constants/physics';
import { ActionConfig } from '../types/scenario';
import { GeneratorConfig } from '../types/scenario';
import { loadThemeAssets } from '@/app/lib/admin/assets/loadThemeAssets';
import { loadAssetWithFallback } from '@/app/lib/admin/assets/loadAssetWithFallback';

export async function generateActions(
  config: GeneratorConfig,
  transitionInterval: number,
  themeId?: string // Asset Pack ID (예: "kitchen_v1")
): Promise<ActionConfig[]> {
  // 타겟별 선호 액션
  const targetActions: Record<string, string[]> = {
    junior: ['POINT', 'CLAP', 'JUMP', 'WALK', 'TURN'],
    senior: ['CHOP', 'PUNCH', 'THROW', 'HAMMER', 'SWING'],
    mixed: [...ACTION_KEYS] // 전체
  };
  
  const preferred = targetActions[config.target] || targetActions.mixed;
  const count = config.difficulty === 1 ? 8 : config.difficulty === 2 ? 12 : 15;
  const totalDuration = 120; // 2분
  const actionDuration = (totalDuration - (transitionInterval * (count - 1))) / count;
  
  // Asset Hub에서 이미지 로드 (themeId가 있으면)
  let themeAssets: Awaited<ReturnType<typeof loadThemeAssets>> | null = null;
  if (themeId) {
    try {
      themeAssets = await loadThemeAssets(themeId);
    } catch (error) {
      console.warn('Asset Hub 이미지 로드 실패, 기본 이미지 사용:', error);
    }
  }

  const actions: ActionConfig[] = [];
  
  for (let i = 0; i < count; i++) {
    const actionType = preferred[Math.floor(Math.random() * preferred.length)];
    const startTime = i * (actionDuration + transitionInterval);
    
    // Asset Hub 이미지 사용 (있으면)
    let images: { off: string; on: string } = { off: '', on: '' };
    if (themeAssets?.actions[actionType]) {
      const assetImages = themeAssets.actions[actionType];
      // Fallback 이미지와 함께 로드
      images = {
        off: await loadAssetWithFallback(assetImages.off || '', '/images/default-action-off.png'),
        on: await loadAssetWithFallback(assetImages.on || '', '/images/default-action-on.png')
      };
    }
    
    actions.push({
      id: `action_${String(i + 1).padStart(3, '0')}`,
      type: actionType,
      startTime,
      duration: actionDuration,
      position: {
        x: Math.random() * 100,
        y: Math.random() * 100
      },
      intensity: config.difficulty === 1 ? 'LOW' : config.difficulty === 3 ? 'HIGH' : 'MID',
      images,
      introText: {
        en: actionType,
        ko: DEFAULT_ACTION_LABELS[actionType as keyof typeof DEFAULT_ACTION_LABELS] || actionType
      }
    });
  }
  
  return actions;
}
