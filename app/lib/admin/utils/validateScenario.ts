/**
 * 시나리오 검증 유틸리티
 * Phase별 필수 필드 체크 및 시나리오 유효성 검증
 */

import { GeneratedScenario } from '../types/scenario';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * 시나리오 전체 검증
 */
export function validateScenario(scenario: GeneratedScenario): ValidationResult {
  const errors: string[] = [];

  // 시나리오 구조 확인
  if (!scenario) {
    errors.push('시나리오가 null입니다.');
    return { isValid: false, errors };
  }

  if (!scenario.play) {
    errors.push('Play Phase가 없습니다.');
    return { isValid: false, errors };
  }

  if (!scenario.think) {
    errors.push('Think Phase가 없습니다.');
    return { isValid: false, errors };
  }

  if (!scenario.flow) {
    errors.push('Flow Phase가 없습니다.');
    return { isValid: false, errors };
  }

  // Play Phase 검증
  if (scenario.play.content_type === 'engine') {
    if (scenario.play.frequency === undefined || scenario.play.frequency === null || scenario.play.frequency <= 0) {
      errors.push(`Play Phase: frequency가 필요합니다. (현재 값: ${scenario.play.frequency})`);
    }
    if (scenario.play.actions && scenario.play.actions.length === 0) {
      errors.push('Play Phase: actions 배열이 비어있습니다.');
    }
  } else if (scenario.play.content_type === 'html') {
    if (!scenario.play.raw_html || scenario.play.raw_html.trim() === '') {
      errors.push('Play Phase: raw_html이 필요합니다.');
    }
  } else {
    errors.push(`Play Phase: content_type이 올바르지 않습니다. (현재: ${scenario.play.content_type})`);
  }

  // Think Phase 검증
  if (scenario.think.content_type === 'engine') {
    if (scenario.think.totalRounds === undefined || scenario.think.totalRounds === null || scenario.think.totalRounds <= 0) {
      errors.push(`Think Phase: totalRounds가 필요합니다. (현재 값: ${scenario.think.totalRounds})`);
    }
    if (scenario.think.roundDuration === undefined || scenario.think.roundDuration === null || scenario.think.roundDuration <= 0) {
      errors.push(`Think Phase: roundDuration이 필요합니다. (현재 값: ${scenario.think.roundDuration})`);
    }
  } else if (scenario.think.content_type === 'html') {
    if (!scenario.think.raw_html || scenario.think.raw_html.trim() === '') {
      errors.push('Think Phase: raw_html이 필요합니다.');
    }
  } else {
    errors.push(`Think Phase: content_type이 올바르지 않습니다. (현재: ${scenario.think.content_type})`);
  }

  // Flow Phase 검증
  if (scenario.flow.content_type === 'engine') {
    if (scenario.flow.baseSpeed === undefined || scenario.flow.baseSpeed === null || scenario.flow.baseSpeed <= 0) {
      errors.push(`Flow Phase: baseSpeed가 필요합니다. (현재 값: ${scenario.flow.baseSpeed})`);
    }
  } else if (scenario.flow.content_type === 'html') {
    if (!scenario.flow.raw_html || scenario.flow.raw_html.trim() === '') {
      errors.push('Flow Phase: raw_html이 필요합니다.');
    }
  } else {
    errors.push(`Flow Phase: content_type이 올바르지 않습니다. (현재: ${scenario.flow.content_type})`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Phase별 필수 필드 체크
 */
export function validatePhase(
  phase: 'play' | 'think' | 'flow',
  scenario: GeneratedScenario
): ValidationResult {
  const errors: string[] = [];

  // 시나리오 구조 확인
  if (!scenario) {
    errors.push('시나리오가 null입니다.');
    return { isValid: false, errors };
  }

  const phaseConfig = scenario[phase];
  if (!phaseConfig) {
    errors.push(`${phase} Phase가 없습니다.`);
    return { isValid: false, errors };
  }

  if (phaseConfig.content_type === 'engine') {
    if (phase === 'play') {
      if (scenario.play.frequency === undefined || scenario.play.frequency === null || scenario.play.frequency <= 0) {
        errors.push(`Play Phase: frequency가 필요합니다. (현재 값: ${scenario.play.frequency})`);
      }
    } else if (phase === 'think') {
      if (scenario.think.totalRounds === undefined || scenario.think.totalRounds === null || scenario.think.totalRounds <= 0) {
        errors.push(`Think Phase: totalRounds가 필요합니다. (현재 값: ${scenario.think.totalRounds})`);
      }
      if (scenario.think.roundDuration === undefined || scenario.think.roundDuration === null || scenario.think.roundDuration <= 0) {
        errors.push(`Think Phase: roundDuration이 필요합니다. (현재 값: ${scenario.think.roundDuration})`);
      }
    } else if (phase === 'flow') {
      if (scenario.flow.baseSpeed === undefined || scenario.flow.baseSpeed === null || scenario.flow.baseSpeed <= 0) {
        errors.push(`Flow Phase: baseSpeed가 필요합니다. (현재 값: ${scenario.flow.baseSpeed})`);
      }
    }
  } else if (phaseConfig.content_type === 'html') {
    if (!phaseConfig.raw_html || phaseConfig.raw_html.trim() === '') {
      errors.push(`${phase} Phase: raw_html이 필요합니다.`);
    }
  } else {
    errors.push(`${phase} Phase: content_type이 올바르지 않습니다. (현재: ${phaseConfig.content_type})`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
