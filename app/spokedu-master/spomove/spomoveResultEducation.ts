import type { OfficialSpomovePreset } from './officialSpomovePresets';

export type SpomoveResultEducation = { description: string; tags: string[] };

/** Result copy follows the launched, resolved preset, including theme variants. */
export function getSpomoveResultEducation(preset: OfficialSpomovePreset): SpomoveResultEducation {
  const { mode, level } = preset.engine;
  let tags: string[];
  switch (mode) {
    case 'basic':
      tags = level === 7 ? ['손발 구분', '상하지 협응', '움직임 조절']
        : level === 1 ? ['방향 구별', '정보 선택', '시지각-운동 협응']
        : ['색상 구별', '위치 선택', '시지각-운동 협응'];
      break;
    case 'reactTrain':
      tags = ['시각적 주의', '신호 구별', '움직임 전환'];
      break;
    case 'simon':
      tags = ['정보 선택', '위치 간섭 조절', '시지각-운동 협응'];
      break;
    case 'flanker':
      tags = ['선택적 주의', '방해 자극 구별', '목표 선택'];
      break;
    case 'stroop':
      tags = ['규칙 확인', '간섭 조절', '선택 반응'];
      break;
    case 'spatial':
      tags = level === 7 ? ['시각 기억', '공간 기억', '변화 탐지']
        : level === 4 || level === 5 ? ['색·번호 연결', '작업기억', '정보 회상']
        : ['순서 기억', '작업기억', '순차적 움직임'];
      break;
    case 'flow':
      tags = level === 1 ? ['시각 신호 구별', '움직임 전환', '리듬 유지']
        : ['색상 구별', '움직임 선택', '타이밍 조절'];
      break;
  }
  let description = preset.description.trim();
  // Public names are preserved verbatim; explanations describe actual response behavior.
  if (mode === 'stroop' && (level === 2 || level === 3) && preset.engine.stroopWordResponse !== 'movement') {
    description = '색 단어의 의미와 글씨 색을 구별하고, 화면에 안내된 규칙에 따라 말로 답하는 활동입니다.';
  } else if (mode === 'stroop' && (level === 4 || level === 5)) {
    description = preset.engine.stroopWordMode === 'missing'
      ? '글자·글씨 색·배경에 없는 색을 찾아 말로 답하는 활동입니다.'
      : '단어의 뜻과 배경색에 흔들리지 않고 글씨 색을 구별해 말로 답하는 활동입니다.';
  }
  return {
    description: description && !/[.!?。]$/.test(description) ? `${description.replace(/활동$/, '활동입니다')}.` : description,
    tags,
  };
}