/**
 * 빠른 자동 생성 (Quick Magic) 로직
 * 시스템 권장 밸런스에 맞춰 자동으로 시나리오 생성
 */

import { generateScenarioJSON } from './generateScenarioJSON';
import { generateEventTimeline } from './generateEventTimeline';
import { STATIC_DURATION_RATIOS } from '../constants/physics';
import { GeneratedScenario } from '../types/scenario';

/**
 * 타겟별 가장 인기 있는 테마
 */
const POPULAR_THEMES = {
  junior: 'kitchen',
  senior: 'space',
  mixed: 'kitchen'
} as const;

/**
 * 표준 난이도 (Medium)
 */
const STANDARD_DIFFICULTY = 2 as const;

/**
 * 빠른 자동 생성 함수
 * 타겟에 맞춰 권장 설정으로 시나리오를 자동 생성합니다.
 * 
 * @param target - 타겟 오디언스 ('junior' | 'senior' | 'mixed')
 * @param themeId - Asset Pack ID (선택사항, 있으면 해당 테마 이미지 사용)
 * @returns 생성된 시나리오
 */
export async function quickGenerate(
  target: 'junior' | 'senior' | 'mixed',
  themeId?: string
): Promise<GeneratedScenario> {
  const theme = POPULAR_THEMES[target];
  // themeId가 없으면 theme에서 추론 (예: "kitchen" → "kitchen_v1")
  const assetPackId = themeId || `${theme}_v1`;
  
  const scenario = await generateScenarioJSON({
    target,
    difficulty: STANDARD_DIFFICULTY,
    theme: theme,
    themeId: assetPackId,
    staticDurationRatio: STATIC_DURATION_RATIOS[target]
  });
  
  // Event Timeline 생성
  scenario.eventTimeline = generateEventTimeline(scenario);
  
  return scenario;
}
