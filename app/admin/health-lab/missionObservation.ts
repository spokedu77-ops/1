import type { GuardianObservation, SpecificChoice, SpecificObservation } from './missionEngine';

const CHOICES = ['independent', 'guided', 'not-completed'] as const;

export type MissionObservationItem = {
  itemId: string;
  itemVersion: 1;
  prompt: string;
  choices: { value: SpecificChoice; label: string }[];
};

const WEEK1: MissionObservationItem = {
  itemId: 'week1-target-color',
  itemVersion: 1,
  prompt: '제시된 목표 색상을 찾아 해당 위치로 이동했나요?',
  choices: [
    { value: 'independent', label: '독립적으로 목표 색상을 찾아 이동' },
    { value: 'guided', label: '추가 안내 후 목표 색상으로 이동' },
    { value: 'not-completed', label: '지속적인 도움이 필요하거나 수행하지 못함' },
  ],
};

const WEEK2: MissionObservationItem = {
  itemId: 'week2-path-order',
  itemVersion: 1,
  prompt: '발자국 경로를 순서대로 따라 이동했나요?',
  choices: [
    { value: 'independent', label: '독립적으로 경로를 따라 이동' },
    { value: 'guided', label: '부분적인 안내나 도움으로 이동' },
    { value: 'not-completed', label: '지속적인 도움이 필요하거나 수행하지 못함' },
  ],
};

const ITEMS: Record<string, MissionObservationItem> = {
  'week1-color-move': WEEK1,
  'week2-footstep-path': WEEK2,
};

const VERSION_1_FEEDBACK: Record<string, Record<SpecificChoice, string>> = {
  'week1-target-color': {
    independent: '다음에는 카드 위치를 바꾸거나 이동 경로를 조금 달리해 보세요.',
    guided: '같은 조건에서 한 번 더 연습해 보세요. 목표 색을 충분히 확인한 뒤 이동하도록 도와주세요.',
    'not-completed': '카드 수나 이동 거리를 줄여 더 간단한 조건부터 시작해 보세요.',
  },
  'week2-path-order': {
    independent: '다음에는 발자국 간격이나 방향을 조금 달리해 보세요.',
    guided: '같은 경로로 한 번 더 걸어 보세요. 다음 발자국을 함께 확인한 뒤 이동하도록 도와주세요.',
    'not-completed': '발자국 수를 줄이거나 간격을 좁혀 더 짧은 길부터 시작해 보세요.',
  },
};

const STOPPED_GUIDANCE = '활동이 중단되었습니다. 아이의 안전과 컨디션을 확인한 뒤 다음 참여 여부를 판단해 주세요.';
const SAME_CONDITION = '난이도는 바꾸지 말고 같은 조건에서 한 번 더 관찰해 보세요.';
export const UNANSWERED_SPECIFIC = '고유 관찰 미응답';

export function missionObservation(missionId: string) {
  return ITEMS[missionId] ?? null;
}

export function choiceLabel(item: MissionObservationItem, choice: SpecificChoice) {
  return item.choices.find((option) => option.value === choice)?.label ?? '기록 없음';
}

export function acceptedSpecific(missionId: string, specific: SpecificObservation | null | undefined): SpecificObservation | null {
  const item = missionObservation(missionId);
  if (!item || specific == null) return null;
  const knownChoices = VERSION_1_FEEDBACK[specific.itemId];
  if (
    specific.itemId !== item.itemId ||
    specific.itemVersion !== 1 ||
    !knownChoices?.[specific.choice] ||
    !CHOICES.includes(specific.choice) ||
    typeof specific.recordedAt !== 'string' ||
    Number.isNaN(Date.parse(specific.recordedAt))
  ) return null;
  return specific;
}

export function feedbackLines(missionId: string, observation: GuardianObservation | null): string[] {
  if (!observation) return [];
  const lines: string[] = [];
  if (observation.participation === 'stopped') lines.push(STOPPED_GUIDANCE);
  const specific = acceptedSpecific(missionId, observation.specific);
  if (!specific) {
    lines.push(UNANSWERED_SPECIFIC);
    return lines;
  }
  if (observation.participation === 'stopped') return lines;
  const versioned = specific.itemVersion === 1 ? VERSION_1_FEEDBACK[specific.itemId]?.[specific.choice] : undefined;
  if (!versioned) return lines;
  if (specific.choice === 'guided' || specific.choice === 'not-completed') {
    lines.push(versioned);
    return lines;
  }
  if (observation.participation === 'finished' && observation.movement !== 'difficult') lines.push(versioned);
  else lines.push(SAME_CONDITION);
  return lines;
}
