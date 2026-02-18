/**
 * Draft 검증 로직
 * Play, Think, Flow 초안 데이터의 유효성을 검증
 */

export interface DraftValidationResult {
  isValid: boolean;
  errors: string[];
}

/** Play 초안에서 검증 시 사용하는 필드 */
interface PlayDraftData {
  timeline?: unknown;
  selectedActions?: unknown;
  asset_pack_id?: unknown;
}

/**
 * Play 초안 검증
 */
function validatePlayDraft(data: PlayDraftData): DraftValidationResult {
  const errors: string[] = [];

  const timeline = data.timeline;
  if (!timeline || !Array.isArray(timeline) || timeline.length === 0) {
    errors.push('타임라인이 필요합니다.');
  }

  const selectedActions = data.selectedActions;
  if (!selectedActions || !Array.isArray(selectedActions) || selectedActions.length !== 5) {
    errors.push('정확히 5개의 액션을 선택해야 합니다.');
  }

  const assetPackId = data.asset_pack_id;
  if (assetPackId === undefined || assetPackId === null || typeof assetPackId !== 'string') {
    errors.push('Asset Pack ID가 필요합니다.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/** Think 초안에서 검증 시 사용하는 필드 */
interface ThinkDraftData {
  layout_sequence?: unknown;
  seed?: unknown;
}

/**
 * Think 초안 검증
 */
function validateThinkDraft(data: ThinkDraftData): DraftValidationResult {
  const errors: string[] = [];

  if (!data.layout_sequence || !Array.isArray(data.layout_sequence) || data.layout_sequence.length === 0) {
    errors.push('최소 1개 이상의 레이아웃 시퀀스가 필요합니다.');
  } else {
    // 레이아웃 시퀀스 검증
    const sequence = data.layout_sequence;
    for (let i = 0; i < sequence.length; i++) {
      const seq = sequence[i];
      
      if (typeof seq.startTime !== 'number' || seq.startTime < 0) {
        errors.push(`시퀀스 ${i + 1}: startTime이 유효하지 않습니다.`);
      }
      
      if (typeof seq.endTime !== 'number' || seq.endTime > 150) {
        errors.push(`시퀀스 ${i + 1}: endTime은 150초를 초과할 수 없습니다.`);
      }
      
      if (seq.startTime >= seq.endTime) {
        errors.push(`시퀀스 ${i + 1}: startTime(${seq.startTime})이 endTime(${seq.endTime})보다 크거나 같습니다.`);
      }
      
      // 이전 구간과의 연속성 검증
      if (i > 0 && seq.startTime !== sequence[i - 1].endTime) {
        errors.push(`시퀀스 ${i + 1}: startTime(${seq.startTime})이 이전 구간의 endTime(${sequence[i - 1].endTime})와 일치하지 않습니다.`);
      }
    }
    
    // 전체 구간이 0~150초를 커버하는지 검증 (Think Studio 표준)
    const firstStart = sequence[0]?.startTime;
    const lastEnd = sequence[sequence.length - 1]?.endTime;
    
    if (firstStart !== 0) {
      errors.push('첫 번째 시퀀스는 0초부터 시작해야 합니다.');
    }
    
    if (lastEnd !== 150) {
      errors.push('마지막 시퀀스는 150초에 종료되어야 합니다.');
    }
  }

  if (typeof data.seed !== 'number') {
    errors.push('Seed 값이 필요합니다.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/** Flow 초안에서 검증 시 사용하는 필드 */
interface FlowDraftData {
  baseSpeed?: unknown;
  distortion?: unknown;
  boxRate?: { lv3?: unknown; lv4?: unknown };
}

/**
 * Flow 초안 검증
 */
function validateFlowDraft(data: FlowDraftData): DraftValidationResult {
  const errors: string[] = [];

  if (typeof data.baseSpeed !== 'number' || data.baseSpeed <= 0) {
    errors.push('baseSpeed는 0보다 큰 숫자여야 합니다.');
  }

  if (typeof data.distortion !== 'number' || data.distortion < 0 || data.distortion > 1) {
    errors.push('distortion은 0과 1 사이의 값이어야 합니다.');
  }

  if (!data.boxRate || typeof data.boxRate !== 'object') {
    errors.push('boxRate 객체가 필요합니다.');
  } else {
    if (typeof data.boxRate.lv3 !== 'number' || data.boxRate.lv3 < 0 || data.boxRate.lv3 > 1) {
      errors.push('boxRate.lv3는 0과 1 사이의 값이어야 합니다.');
    }
    
    if (typeof data.boxRate.lv4 !== 'number' || data.boxRate.lv4 < 0 || data.boxRate.lv4 > 1) {
      errors.push('boxRate.lv4는 0과 1 사이의 값이어야 합니다.');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Draft 검증 메인 함수
 */
export function validateDraft(
  type: 'play' | 'think' | 'flow',
  data: PlayDraftData | ThinkDraftData | FlowDraftData
): DraftValidationResult {
  switch (type) {
    case 'play':
      return validatePlayDraft(data as PlayDraftData);
    case 'think':
      return validateThinkDraft(data as ThinkDraftData);
    case 'flow':
      return validateFlowDraft(data as FlowDraftData);
    default:
      return {
        isValid: false,
        errors: [`알 수 없는 타입: ${type}`]
      };
  }
}
