/**
 * 시나리오 JSON 생성 로직
 * 좌측 패널 상태값을 Scenario JSON으로 변환
 */

import { 
  TARGET_FREQUENCIES, 
  DIFFICULTY_MAPPING, 
  TRANSITION_INTERVALS,
  THINK_PHASE_CONFIG,
  STATIC_DURATION_RATIOS
} from '../constants/physics';
import { generateActions } from './parametricEngine';
import { generateEventTimeline } from './generateEventTimeline';
import { GeneratedScenario, GeneratorConfig } from '../types/scenario';

export async function generateScenarioJSON(
  config: GeneratorConfig
): Promise<GeneratedScenario> {
  const themeId = config.themeId;
  // 타입 가드 및 기본값 보장
  const mapping = DIFFICULTY_MAPPING[config.difficulty];
  if (!mapping) {
    throw new Error(`Invalid difficulty: ${config.difficulty}. Must be 1, 2, or 3.`);
  }
  
  // 필수 값들이 존재하는지 확인하고 기본값 설정
  const frequency = mapping.hz ?? 12; // 기본값 12Hz
  const speed = mapping.speed ?? 1.0; // 기본값 1.0
  const distortion = mapping.distortion ?? 0.3; // 기본값 0.3
  const boxRate = mapping.boxRate ?? { lv3: 0.40, lv4: 0.45 }; // 기본값
  const stroopCongruentRatio = mapping.stroopCongruentRatio ?? 0.5; // 기본값 0.5
  
  const transitionInterval = TRANSITION_INTERVALS[config.target] ?? 1.0;
  const staticDurationRatio = config.staticDurationRatio ?? STATIC_DURATION_RATIOS[config.target] ?? 0.5;
  
  // THINK_PHASE_CONFIG 값 확인
  const totalRounds = THINK_PHASE_CONFIG.totalRounds ?? 10;
  const objectSpawnInterval = THINK_PHASE_CONFIG.objectSpawnInterval ?? 2000;
  const objectLifetime = THINK_PHASE_CONFIG.objectLifetime ?? 3000;
  
  // roundDuration 계산 (안전하게)
  const roundDuration = totalRounds > 0 ? (120 * 1000) / totalRounds : 12000;
  
  // generateActions는 이제 async이므로 await 필요
  const actions = await generateActions(config, transitionInterval, themeId);

  const scenario: GeneratedScenario = {
    play: {
      content_type: 'engine',
      frequency: frequency,
      actions: actions,
      transitionInterval: transitionInterval
    },
    think: {
      content_type: 'engine',
      roundDuration: roundDuration,
      totalRounds: totalRounds,
      objectSpawnInterval: objectSpawnInterval,
      objectLifetime: objectLifetime,
      congruentRatio: stroopCongruentRatio,
      staticDurationRatio: staticDurationRatio
    },
    flow: {
      content_type: 'engine',
      baseSpeed: 0.6 * speed,
      distortion: distortion,
      boxRate: boxRate
    },
    eventTimeline: []
  };
  
  // 반환 전 필수 필드 검증
  if (!scenario.play.frequency || scenario.play.frequency <= 0) {
    throw new Error(`Invalid play.frequency: ${scenario.play.frequency}`);
  }
  if (!scenario.think.totalRounds || scenario.think.totalRounds <= 0) {
    throw new Error(`Invalid think.totalRounds: ${scenario.think.totalRounds}`);
  }
  if (!scenario.think.roundDuration || scenario.think.roundDuration <= 0) {
    throw new Error(`Invalid think.roundDuration: ${scenario.think.roundDuration}`);
  }
  if (!scenario.flow.baseSpeed || scenario.flow.baseSpeed <= 0) {
    throw new Error(`Invalid flow.baseSpeed: ${scenario.flow.baseSpeed}`);
  }
  
  // Event Timeline 생성
  scenario.eventTimeline = generateEventTimeline(scenario);
  
  return scenario;
}
