/**
 * Flow Phase - 교육 콘텐츠 SSOT
 * 시작 / 레벨 인트로 / 휴식 전환 / 완료 화면에 쓰이는 모든 텍스트
 */

// ─── 타입 ────────────────────────────────────────────────────────────────────

export interface FlowLevelContent {
  /** HUD 레벨 태그 ("LEVEL 1") */
  tag: string;
  /** 레벨 이름 ("점프") */
  label: string;
  /** 실행 중 화면에 뜨는 짧은 지시어 */
  cueWord: string;
  /** 학생에게 설명하는 동작 안내 */
  instruction: string;
  /** 교육적 이유 (왜 이 동작인지) */
  why: string;
  /** 활성화되는 근육·능력 (완료 화면 요약용) */
  muscle: string;
  /** HUD 레벨 태그 색상 (CSS hex) */
  color: string;
  /** HUD 레벨 태그 배경 rgba */
  colorBg: string;
  /** HUD 레벨 태그 테두리 rgba */
  colorBorder: string;
}

export interface FlowRestContent {
  prev: {
    /** "방금 한 것" 등 섹션 제목 */
    heading: string;
    /** 요약 동작명 ("점프 2단계") */
    summary: string;
    /** 활성화 효과 ("하체·심박수 활성화 완료") */
    benefit: string;
  };
  next: {
    /** "다음 레벨" 등 섹션 제목 */
    heading: string;
    /** 레벨 태그 ("LEVEL 3") */
    levelTag: string;
    /** 동작 이름 ("PUNCH") */
    label: string;
    /** 동작 안내 */
    preview: string;
    /** 교육적 효과 */
    benefit: string;
  };
  /** 호흡 안내 문구 */
  breatheText: string;
}

export interface FlowStartContent {
  title: string;
  subtitle: string;
  body: string;
  buttonLabel: string;
}

export interface FlowEndContent {
  title: string;
  summaryHeading: string;
  closing: string;
  replayLabel: string;
  closeLabel: string;
}

// ─── 레벨별 콘텐츠 ───────────────────────────────────────────────────────────

export const FLOW_LEVEL_CONTENT: Record<number, FlowLevelContent> = {
  1: {
    tag: 'LEVEL 1',
    label: '점프',
    cueWord: 'JUMP!',
    instruction: '화면의 다리를 따라 왼쪽, 가운데, 오른쪽으로 점프하세요',
    why: '심박수를 서서히 높이며 잠들어 있던 몸을 깨웁니다',
    muscle: '하체·발목 근육 활성화',
    color: '#93c5fd',
    colorBg: 'rgba(59,130,246,0.15)',
    colorBorder: 'rgba(147,197,253,0.6)',
  },
  2: {
    tag: 'LEVEL 2',
    label: '가속',
    cueWord: 'FASTER!',
    instruction: '속도가 빨라집니다. 리듬을 맞춰 계속 점프하세요',
    why: '심폐 기능을 자극해 집중력 준비 상태를 만듭니다',
    muscle: '심박수 상승·전신 혈액순환',
    color: '#22d3ee',
    colorBg: 'rgba(34,211,238,0.12)',
    colorBorder: 'rgba(34,211,238,0.7)',
  },
  3: {
    tag: 'LEVEL 3',
    label: '펀치',
    cueWord: 'PUNCH!',
    instruction: '다가오는 박스를 주먹으로 치세요',
    why: '상체 근육과 반응 속도를 동시에 깨웁니다',
    muscle: '어깨·상체·회전 근육 활성화',
    color: '#f87171',
    colorBg: 'rgba(239,68,68,0.12)',
    colorBorder: 'rgba(239,68,68,0.7)',
  },
  4: {
    tag: 'LEVEL 4',
    label: '숙이기',
    cueWord: 'DUCK!',
    instruction: '우주선이 지나갈 때 몸을 낮게 숙이세요',
    why: '척추와 복근을 스트레칭하고 주의 전환 반응을 훈련합니다',
    muscle: '척추·복근·고관절 유연성',
    color: '#fbbf24',
    colorBg: 'rgba(245,158,11,0.12)',
    colorBorder: 'rgba(245,158,11,0.7)',
  },
  5: {
    tag: 'LEVEL 5',
    label: '전체',
    cueWord: 'ALL IN!',
    instruction: '박스는 주먹으로, 우주선은 숙이기로 반응하세요',
    why: '전신 협응과 순간 판단 능력을 함께 훈련합니다',
    muscle: '전신 협응·집중력 최고조',
    color: '#a78bfa',
    colorBg: 'rgba(167,139,250,0.12)',
    colorBorder: 'rgba(167,139,250,0.7)',
  },
};

// ─── 휴식 구간 콘텐츠 ────────────────────────────────────────────────────────

/**
 * 휴식 구간 키: 'rest-N' (N번째 휴식, 1부터 시작)
 * DURATIONS의 displayLevels === 0 슬롯과 1:1 대응
 */
export const FLOW_REST_CONTENT: Record<string, FlowRestContent> = {
  'rest-1': {
    prev: {
      heading: '방금 한 것',
      summary: '점프 · 가속 2단계',
      benefit: '하체 근육과 심박수가 활성화됐어요 ✓',
    },
    next: {
      heading: '다음 레벨 예고',
      levelTag: 'LEVEL 3',
      label: 'PUNCH',
      preview: '다가오는 박스를 주먹으로 치세요. 박스가 부서지면서 다음 다리로 점프합니다.',
      benefit: '어깨와 상체 근육을 깨웁니다',
    },
    breatheText: '들이마시고... 내쉬세요...',
  },
  'rest-2': {
    prev: {
      heading: '방금 한 것',
      summary: '펀치 · 박스 파괴',
      benefit: '어깨·상체 근육이 활성화됐어요 ✓',
    },
    next: {
      heading: '다음 레벨 예고',
      levelTag: 'LEVEL 4',
      label: 'DUCK',
      preview: '우주선이 낮게 날아옵니다. 우주선이 보이면 몸을 낮게 숙이세요.',
      benefit: '척추와 복근을 이완합니다',
    },
    breatheText: '들이마시고... 내쉬세요...',
  },
};

/** 휴식 순서 번호 → key 매핑 헬퍼 */
export function getRestContent(restIndex: number): FlowRestContent {
  return FLOW_REST_CONTENT[`rest-${restIndex}`] ?? FLOW_REST_CONTENT['rest-1']!;
}

// ─── 시작 콘텐츠 ─────────────────────────────────────────────────────────────

export const FLOW_START_CONTENT: FlowStartContent = {
  title: 'SPOKEDU FLOW',
  subtitle: '화면을 따라 몸을 움직이는 움직임 워밍업',
  body: '몸이 준비되면 수업 집중력이 훨씬 높아집니다',
  buttonLabel: '시작하기',
};

// ─── 완료 콘텐츠 ─────────────────────────────────────────────────────────────

export const FLOW_END_CONTENT: FlowEndContent = {
  title: '수고했어요!',
  summaryHeading: '오늘 활성화한 것',
  closing: '몸이 준비됐어요. 이제 수업에 더 잘 집중할 수 있습니다.',
  replayLabel: '다시 시작',
  closeLabel: '닫기',
};

/**
 * 완료 화면 요약 — 실행된 레벨 번호 배열을 받아
 * 각 레벨의 muscle 설명 리스트를 반환
 */
export function buildEndSummary(
  playedLevels: number[]
): Array<{ label: string; muscle: string }> {
  return playedLevels
    .filter((lv) => lv >= 1 && lv <= 5)
    .map((lv) => ({
      label: FLOW_LEVEL_CONTENT[lv]?.label ?? `LV${lv}`,
      muscle: FLOW_LEVEL_CONTENT[lv]?.muscle ?? '',
    }));
}
