import { resolveTrainingSelection } from './trainingActivity';
import { trainingActivityGuide } from './trainingActivityGuide';
import type { TrainingResultViewInput } from './trainingResultViewModel';

type Four<T> = readonly [T, T, T, T];
type Concept = { label: string; descriptions: Four<string> };
type Profile = { id: string; descriptions: Four<string>; concepts: readonly Concept[]; tips: Four<string> };
export type ResultEducation = { profileId: string; description: string; experiences: { label: string; description: string }[]; tip: string };

const movementContexts = [
  '시지각–운동 협응은 눈으로 확인한 정보를 몸의 반응과 연결하는 과정입니다. 신호를 살펴보고 움직임을 선택하는 경험을 함께 다룹니다.',
  '신체활동에서는 움직임에 앞서 주변 정보를 읽는 과정도 중요합니다. 시각적 단서를 확인하고 반응을 준비하는 흐름을 경험합니다.',
  '지각과 행동은 하나의 흐름으로 연결됩니다. 무엇을 보았는지 확인하고, 규칙에 맞는 신체 반응으로 옮기는 과정을 연습합니다.',
  '움직임의 속도뿐 아니라 반응을 선택하는 과정에도 주목해 보세요. 시각 정보를 구별하고 몸으로 표현하는 것이 활동의 교육적 맥락입니다.',
] as const;

export function selectResultMovementContext(seed: number): string {
  const value = Number.isFinite(seed) ? Math.abs(Math.floor(seed)) : 0;
  return movementContexts[value % movementContexts.length];
}

// Each concept has four explanations of a demand, never a measured outcome.
const concepts = {
  direction: { label: '방향 인식', descriptions: ['화살표가 가리키는 방향을 구별하는 경험입니다.', '신호의 위·아래·왼쪽·오른쪽을 살펴봅니다.', '화살표의 모양에서 이동에 필요한 방향 정보를 읽습니다.', '방향 표시를 확인한 뒤 반응할 쪽을 정합니다.'] },
  choice: { label: '선택 반응', descriptions: ['확인한 정보에 맞춰 움직임을 선택합니다.', '여러 반응 중 현재 신호에 맞는 반응을 고릅니다.', '신호를 읽는 과정과 움직임을 결정하는 과정을 연결합니다.', '먼저 정보를 확인하고 그에 맞는 행동을 정합니다.'] },
  space: { label: '공간지각', descriptions: ['화면의 정보와 실제 공간의 위치를 연결합니다.', '화면에서 찾은 위치를 자신의 움직임으로 옮겨 봅니다.', '시각 정보가 몸을 움직일 위치와 어떻게 이어지는지 살펴봅니다.', '화면 속 위치와 몸이 이동할 공간의 관계를 경험합니다.'] },
  attention: { label: '선택적 주의', descriptions: ['여러 자극 중 현재 과제에 필요한 정보에 주의를 둡니다.', '주변 정보와 목표 정보를 나누어 살펴봅니다.', '반응 기준이 되는 특징을 먼저 확인합니다.', '눈에 들어오는 정보 중 과제와 관련된 단서를 골라 봅니다.'] },
  inhibition: { label: '방해 자극 구별', descriptions: ['눈에 띄는 주변 자극과 반응할 목표를 구별합니다.', '목표와 다른 주변 정보에 바로 반응하지 않고 기준을 확인합니다.', '함께 보이는 정보 중 반응에 쓰지 않을 것을 나누어 봅니다.', '목표와 방해 요소를 비교하며 필요한 정보만 선택합니다.'] },
  rule: { label: '규칙 유지', descriptions: ['현재 안내된 반응 기준을 기억하며 신호를 확인합니다.', '신호를 볼 때마다 적용할 규칙을 떠올립니다.', '익숙한 반응에 앞서 이번 과제의 기준을 확인합니다.', '보이는 정보와 안내된 규칙을 함께 생각해 반응합니다.'] },
  switch: { label: '규칙 전환', descriptions: ['안내가 바뀌면 새 기준으로 반응을 다시 선택합니다.', '이전 신호의 규칙과 지금 적용할 규칙을 구별합니다.', '전환 단서를 확인하고 반응 기준을 바꾸어 봅니다.', '같은 자극도 현재 규칙에 따라 다르게 해석하는 경험입니다.'] },
  discrimination: { label: '시각적 변별', descriptions: ['색·모양 등 과제에서 요구하는 특징을 구별합니다.', '비슷하게 보이는 자극의 차이를 살펴봅니다.', '목표를 정하는 시각적 단서에 주의를 둡니다.', '전체 인상보다 현재 규칙에 필요한 특징을 확인합니다.'] },
  order: { label: '순서 기억', descriptions: ['먼저 나온 정보와 나중에 나온 정보를 차례대로 기억합니다.', '개별 자극뿐 아니라 자극 사이의 앞뒤 관계를 떠올립니다.', '제시된 정보를 하나의 순서로 묶어 봅니다.', '처음부터 마지막까지 이어지는 정보의 순서를 확인합니다.'] },
  working: { label: '작업기억', descriptions: ['잠시 본 정보를 유지하며 다음 반응을 준비합니다.', '화면에서 사라진 정보를 떠올려 과제를 이어 갑니다.', '지금 기억해야 할 내용을 머릿속에 두고 사용합니다.', '본 내용을 유지하는 과정과 다시 꺼내 쓰는 과정을 경험합니다.'] },
  sequential: { label: '순차적 움직임', descriptions: ['기억한 순서를 차례대로 움직임에 연결합니다.', '한 번의 움직임 뒤에 이어질 다음 위치를 떠올립니다.', '각 위치로 움직이는 순서를 계획해 봅니다.', '기억한 정보의 앞뒤 순서를 몸의 움직임으로 표현합니다.'] },
  layout: { label: '공간 기억', descriptions: ['색이 놓인 위치와 전체 배치를 함께 기억합니다.', '각 칸을 따로 보기보다 위치 사이의 관계를 살펴봅니다.', '무엇이 보였는지와 어디에 있었는지를 함께 떠올립니다.', '화면의 여러 위치에 놓인 정보를 잠시 유지합니다.'] },
  change: { label: '변화 탐지', descriptions: ['기억한 배치와 다시 제시된 배치의 차이를 비교합니다.', '처음 본 장면과 달라진 한 칸을 찾아봅니다.', '전체를 살펴본 뒤 변화가 생긴 위치로 주의를 옮깁니다.', '이전 정보와 현재 정보를 대조하며 바뀐 부분을 구별합니다.'] },
  association: { label: '정보 연결', descriptions: ['서로 연결된 번호와 색을 한 쌍으로 기억합니다.', '한쪽 단서를 보고 함께 제시됐던 정보를 떠올립니다.', '번호와 색의 대응을 유지하며 질문을 확인합니다.', '따로 보이는 두 정보를 연결해 사용하는 경험입니다.'] },
  tracking: { label: '시각 추적', descriptions: ['목표가 움직이는 동안 같은 대상을 눈으로 따라갑니다.', '처음 확인한 목표를 이동 중에도 구별해 봅니다.', '움직임의 시작과 도착 위치를 이어서 살펴봅니다.', '자리를 바꾸는 목표에 주의를 두고 위치를 확인합니다.'] },
  transition: { label: '움직임 전환', descriptions: ['새 안내를 확인하고 다음 동작으로 바꾸어 봅니다.', '직전 동작과 지금 필요한 동작을 구별합니다.', '화면의 신호와 동작이 바뀌는 시점을 연결합니다.', '현재 동작을 정리하고 이어질 움직임을 준비합니다.'] },
  rhythm: { label: '움직임의 리듬', descriptions: ['화면 신호의 흐름에 맞춰 움직임을 이어 갑니다.', '동작 사이의 간격을 살피며 다음 신호를 기다립니다.', '급하게 서두르기보다 안내의 흐름에 맞춰 움직여 봅니다.', '시각 신호의 반복과 몸의 움직임을 연결하는 경험입니다.'] },
  body: { label: '신체 조절', descriptions: ['안내된 동작에 필요한 몸의 위치와 자세를 확인합니다.', '동작을 바꿀 때 몸의 중심과 주변 공간을 살펴봅니다.', '신호에 맞춰 사용할 신체 부위와 움직임을 정합니다.', '동작을 시작하고 멈추는 과정을 몸으로 경험합니다.'] },
  stop: { label: '반응 억제', descriptions: ['반응할 신호와 멈출 신호를 구별합니다.', '신호를 확인하기 전 바로 움직이지 않고 기다립니다.', '움직이지 않는 선택도 과제의 한 부분으로 경험합니다.', '익숙한 움직임에 앞서 실행 여부를 판단합니다.'] },
} satisfies Record<string, Concept>;

function profile(id: string, descriptions: Four<string>, keys: readonly (keyof typeof concepts)[], tips: Four<string>): Profile {
  return { id, descriptions, concepts: keys.map(key => concepts[key]), tips };
}

const directionTips: Four<string> = [
  '빠르게 반응하기보다 방향을 충분히 확인한 후 움직이도록 지도해 보세요.',
  '이동 전에 화살표가 가리키는 쪽을 말이나 손짓으로 짚어 보도록 안내해 보세요.',
  '화면을 보는 시점과 움직이기 시작하는 시점을 나누어 연습해 보세요.',
  '방향을 헷갈릴 때는 같은 자리에서 방향만 확인한 뒤 이동하도록 도와주세요.',
];
const attentionTips: Four<string> = [
  '반응 전에 무엇을 기준으로 골랐는지 짧게 설명해 보도록 안내해 보세요.',
  '목표를 충분히 확인할 시간을 주고, 속도보다 선택 기준을 먼저 살펴보세요.',
  '헷갈리는 신호에서는 목표와 방해 요소를 차례대로 짚어 보도록 지도해 보세요.',
  '다음 활동을 시작하기 전에 반응 기준을 한 문장으로 함께 확인해 보세요.',
];
const memoryTips: Four<string> = [
  '기억한 내용을 바로 재촉하기보다 처음부터 차례대로 떠올릴 시간을 주세요.',
  '제시를 보는 시간과 기억을 표현하는 시간을 나누어 안내해 보세요.',
  '어떤 부분부터 기억했는지 물어보고, 아동이 사용한 기억 방법을 살펴보세요.',
  '기억할 양을 늘리기 전에 현재 순서나 연결 관계를 다시 확인해 보세요.',
];

// Activities whose authored guide is absent or editorial-only still get a
// concrete mechanism. These are descriptions, not reconstructed run records.
const otherDescriptions: Partial<Record<string, Four<string>>> = {
  'shape-completion': [
    '현재 조각과 완성 형태를 비교해 필요한 조각을 찾습니다. 후보 중 알맞은 조각이 있는 위치로 이동하는 활동입니다.',
    '완성할 모양에서 부족한 부분을 먼저 살펴봅니다. 제시된 후보를 비교해 맞는 조각을 고릅니다.',
    '기존 조각에 무엇을 더해야 완성 형태가 되는지 생각합니다. 모양의 결합 관계를 보고 이동할 위치를 선택합니다.',
    '부분 모양과 전체 모양의 관계를 확인합니다. 빈 부분에 맞는 후보 조각을 찾아 반응합니다.',
  ],
  'visual-search': [
    '여러 기호 중 목표의 색·모양 조합을 찾아 해당 구역으로 이동합니다. 목표 특징을 함께 비교하는 활동입니다.',
    '먼저 목표 기호의 특징을 확인하고 화면의 여러 자극을 살펴봅니다. 목표가 있는 구역을 선택해 반응합니다.',
    '색이나 모양 하나만 보지 않고 목표와 같은 조합을 찾습니다. 목표 위치를 화면 구역과 연결합니다.',
    '여러 기호가 함께 제시되는 화면에서 필요한 목표를 골라냅니다. 찾아낸 기호가 놓인 구역을 확인합니다.',
  ],
  'number-cart': [
    '숫자 또는 식의 목표를 확인하고 같은 답이 표시된 색 문을 찾습니다. 목표와 후보의 대응을 비교하는 활동입니다.',
    '제시된 목표의 답을 먼저 확인합니다. 여러 색 문 중 같은 답을 가진 문을 선택합니다.',
    '목표 숫자나 식과 후보 문에 표시된 정보를 비교합니다. 서로 맞는 정보를 찾아 반응합니다.',
    '문에 표시된 답을 살펴보고 목표와 일치하는 후보를 고릅니다. 목표 확인과 위치 선택을 연결합니다.',
  ],
  'moving-number-reader': [
    '움직이는 숫자를 눈으로 따라가며 어떤 숫자인지 확인합니다. 읽은 숫자에 대응하는 발판으로 이동합니다.',
    '화면을 이동하는 숫자 캡슐을 살펴봅니다. 캡슐의 색이 아니라 숫자를 반응 기준으로 삼습니다.',
    '숫자가 움직이는 동안 그 모양을 구별합니다. 확인한 숫자와 발판 위치의 대응을 연결합니다.',
    '이동 중인 목표를 추적하고 표시된 숫자를 읽습니다. 숫자를 확인한 뒤 반응할 위치를 고릅니다.',
  ],
  'target-tracking': [
    '처음 확인한 목표가 움직이는 동안 같은 대상을 눈으로 따라갑니다. 이동이 끝나면 목표의 위치를 확인합니다.',
    '여러 대상이 자리를 바꾸는 중에도 처음의 목표를 구별합니다. 처음 위치와 도착 위치를 연결하는 활동입니다.',
    '추적할 대상을 먼저 확인한 뒤 그 움직임을 살펴봅니다. 멈춘 장면에서 목표가 어디에 있는지 찾아봅니다.',
    '목표를 정한 후 다른 대상과 함께 이동하는 과정을 봅니다. 목표가 이동한 경로와 현재 위치를 이어서 확인합니다.',
  ],
  'visual-camouflage': [
    '노이즈 속에서 서서히 드러나는 색 자극을 찾아 반응합니다. 주변 무늬와 목표의 특징을 구별합니다.',
    '복잡한 화면에서 목표가 드러나는 과정을 살펴봅니다. 구별한 색을 해당 발판 위치와 연결합니다.',
    '주변 색 블록 사이에서 목표의 색과 모양을 확인합니다. 목표를 충분히 본 뒤 반응할 위치를 고릅니다.',
    '처음에는 잘 드러나지 않는 시각 정보를 살펴보는 활동입니다. 점차 나타나는 단서를 모아 목표를 구별합니다.',
  ],
  'virus-outbreak': [
    '화면에 증식하는 바이러스의 색별 양을 비교합니다. 안내된 많은 색·적은 색 기준에 따라 목표를 고릅니다.',
    '여러 색의 바이러스가 나타나는 장면을 본 뒤 색별 양을 떠올립니다. 회색 돌연변이는 비교 대상에서 제외합니다.',
    '처음 안내된 수량 비교 기준을 기억하며 화면을 살펴봅니다. 가장 많은 색 또는 가장 적은 색을 구별하는 활동입니다.',
    '색별로 나타난 바이러스의 상대적인 양을 살펴봅니다. 질문의 많고 적음 기준을 확인한 뒤 반응합니다.',
  ],
  'motion-gate': [
    '다가오는 관문의 신호를 확인하고 화면이 안내하는 움직임을 수행합니다. 다음 관문을 준비하며 활동을 이어 갑니다.',
    '관문이 다가오는 동안 필요한 색·동작 정보를 읽습니다. 안내를 확인한 뒤 몸의 위치와 자세를 준비합니다.',
    '화면의 관문과 그때의 동작 안내를 함께 살펴봅니다. 신호 확인과 움직임 준비를 연결하는 활동입니다.',
    '이어지는 관문의 신호에 맞춰 반응할 동작을 선택합니다. 관문 사이에서는 다음 안내를 볼 준비를 합니다.',
  ],
  'beat-wave': [
    '화면의 색 신호와 이동 안내를 보고 해당 발판으로 움직입니다. 반복되는 안내의 흐름에 맞춰 다음 반응을 준비합니다.',
    '색 자극을 확인하고 이동 신호에 맞춰 반응하는 활동입니다. 신호의 흐름과 몸의 움직임을 연결합니다.',
    '다음 이동을 준비하다가 화면의 안내가 나오면 움직입니다. 현재 신호의 색과 반응할 위치를 함께 확인합니다.',
    '화면에서 이어지는 색 신호를 보고 이동할 위치를 고릅니다. 한 반응 뒤에는 다음 안내를 기다립니다.',
  ],
};

export function resolveResultEducationProfile(input: TrainingResultViewInput): Profile {
  const { cfg } = input;
  const selection = resolveTrainingSelection(cfg.mode, cfg.level, { activityId: cfg.activityId });
  const id = selection.activityId;
  if (id === 'visual-search') return profile('visual-search', [
    '여러 기호 속에서 목표의 색과 모양을 함께 확인하고 해당 구역으로 움직이는 활동입니다. 구역의 색은 목표 기호의 색이 아니라 발판 위치를 나타냅니다.',
    '흰색·회색의 +와 ×를 살펴보고 안내된 목표 조합을 찾습니다. 찾은 목표가 놓인 화면 구역과 발판 위치를 연결합니다.',
    '비슷하게 보이는 기호 사이에서 목표와 같은 색·모양 조합을 구별합니다. 목표가 있는 구역을 확인한 뒤 움직입니다.',
    '목표 기호를 먼저 확인하고 여러 기호가 제시된 화면을 탐색합니다. 색과 모양을 함께 비교해 반응할 구역을 고릅니다.',
  ], ['discrimination', 'attention', 'space'], [
    '목표의 색과 모양을 먼저 짚어 보고, 화면에서 찾은 위치를 발판과 연결하도록 안내해 보세요.',
    '빠르게 이동하기보다 목표 조합과 같은 기호인지 충분히 확인하도록 지도해 보세요.',
    '기호의 색과 발판 구역의 색이 서로 다른 정보라는 점을 시작 전에 확인해 보세요.',
    '목표를 찾을 때 화면의 어느 부분부터 살펴보는지 관찰하고, 탐색 방법을 함께 이야기해 보세요.',
  ]);
  if (id === 'direction-cue' || id === 'simon-arrow') {
    if (id === 'direction-cue' && cfg.spatialArrowColorMode === 'color') return profile('direction-color', [
      '색이 채워진 화살표의 방향을 확인하고 해당 방향의 발판으로 이동하는 활동입니다. 방향별 색은 정해진 대응을 따릅니다.',
      '방향마다 정해진 색으로 표시된 화살표를 보고 이동할 쪽을 선택합니다. 화살표의 방향과 색을 함께 살펴보는 활동입니다.',
      '화살표가 가리키는 방향과 그 방향에 연결된 색을 확인합니다. 읽은 정보를 실제 공간의 움직임으로 옮겨 봅니다.',
      '색상 화살표를 단서로 방향을 구별하고 알맞은 발판을 찾습니다. 같은 방향에는 같은 색이 대응하는 규칙을 사용합니다.',
    ], ['direction', 'discrimination', 'space'], directionTips);
    return profile('direction', [
      '화살표가 가리키는 방향을 확인하고 알맞은 방향으로 움직이는 활동입니다.',
      '화면에 제시되는 화살표를 보고 이동할 쪽을 선택합니다. 방향을 읽은 뒤 몸의 움직임으로 연결합니다.',
      '위·아래·왼쪽·오른쪽 화살표를 구별하고 그 방향에 맞춰 이동합니다. 화살표의 방향이 반응의 기준입니다.',
      '화면에 나타나는 화살표에서 방향 정보를 읽는 활동입니다. 확인한 방향과 실제 공간의 이동을 연결합니다.',
    ], ['direction', 'choice', 'space'], directionTips);
  }
  if (id === 'relative-compass') return profile('relative-direction', [
    '현재 서 있는 발판을 기준으로 화살표 방향으로 한 칸 이동합니다. 도착한 자리에서 다음 신호를 확인합니다.',
    '매번 출발점으로 돌아가지 않고 지금 선 자리에서 다음 방향을 읽습니다. 화살표에 따라 위치가 이어지는 활동입니다.',
    '자신의 현재 위치와 화살표를 함께 확인해 한 칸 이동합니다. 이동한 위치가 다음 신호의 기준이 됩니다.',
    '연속되는 화살표를 현재 발판의 위치에 적용합니다. 매 신호마다 지금 선 자리를 확인하며 이동합니다.',
  ], ['direction', 'space', 'working'], [
    '다음 화살표를 보기 전에 지금 어느 발판에 서 있는지 확인하도록 안내해 보세요.',
    '한 번 이동한 뒤 도착한 자리에 머물러 다음 신호를 기다리도록 지도해 보세요.',
    '방향과 현재 위치를 헷갈릴 때는 잠시 멈춰 두 정보를 차례대로 확인해 보세요.',
    '출발점으로 돌아가는 활동과 다르다는 점을 시작 전에 한 번 시범으로 설명해 보세요.',
  ]);
  if (id.startsWith('flanker-')) {
    const arrow = id === 'flanker-arrow' || (id === 'flanker-extreme' && cfg.flankerExtremeMode === 'arrow');
    const target = id === 'flanker-nested' ? '가장 안쪽 원' : '가운데 목표';
    const targetWith = id === 'flanker-nested' ? '가장 안쪽 원과' : '가운데 목표와';
    const targetObject = id === 'flanker-nested' ? '가장 안쪽 원을' : '가운데 목표를';
    const criterion = arrow ? '화살표 방향' : cfg.flankerStimulusType === 'number' ? '목표 숫자' : '목표 색';
    return profile(`flanker-${id === 'flanker-nested' ? 'nested' : criterion}`, [
      `주변 방해 자극 사이에서 ${target}의 ${criterion}을 확인합니다. 주변 정보와 구별해 목표에 맞춰 반응하는 활동입니다.`,
      `여러 자극이 함께 나타나지만 반응 기준은 ${target}입니다. ${criterion}을 읽고 알맞은 반응을 선택합니다.`,
      `${targetWith} 주변 자극을 비교하며 필요한 정보를 고릅니다. 주변 자극이 달라도 ${criterion}을 기준으로 반응합니다.`,
      `${criterion}에 주의를 두고 ${targetObject} 구별하는 활동입니다. 목표와 다른 주변 신호를 함께 살펴보되 목표를 반응 기준으로 삼습니다.`,
    ], [arrow ? 'direction' : 'discrimination', 'attention', 'inhibition'], attentionTips);
  }
  if (id.startsWith('stroop-')) {
    const arrow = id === 'stroop-arrow';
    const movement = arrow ? cfg.stroopArrowResponse === 'movement' : ['stroop-word', 'stroop-word-advanced'].includes(id) && cfg.stroopWordResponse === 'movement';
    const missing = id === 'stroop-background-word' && (cfg.level === 5 || cfg.stroopWordMode === 'missing');
    const background = (id === 'stroop-background-word' && !missing)
      || (id === 'stroop-word' && !movement && cfg.stroopWordDifficulty === 'bg');
    const dimension = missing ? '글자·잉크·배경에 없는 색' : background ? '글자나 배경과 구별되는 잉크 색' : arrow ? '화살표 방향 또는 채움 색' : '글자 뜻 또는 잉크 색';
    const response = movement ? '기준에 맞는 발판으로 이동합니다' : '안내된 규칙에 맞춰 말로 답합니다';
    const reverse = movement && !arrow && cfg.stroopWordRuleMode === 'reverse';
    const rule = reverse ? '반대 규칙을 적용해 응답 기준을 바꿉니다.' : '현재 안내된 기준을 먼저 확인합니다.';
    return profile(`stroop-${arrow ? 'arrow' : missing ? 'missing' : background ? 'background' : 'word'}-${movement ? 'movement' : 'voice'}-${reverse ? 'reverse' : 'standard'}`, [
      `${dimension}을 구별하고 ${response}. ${rule}`,
      `서로 다른 시각 정보 중 이번 신호에서 필요한 정보를 선택하는 활동입니다. ${dimension}을 확인하고 ${response}.`,
      `${dimension}이 반응의 기준이 되는 활동입니다. 눈에 먼저 들어오는 정보에 바로 반응하기보다 ${response}.`,
      `여러 특징을 함께 보면서 ${dimension}을 구별하는 활동입니다. ${reverse ? '반대 규칙을 적용해' : '현재 안내된 기준을 확인하고'} ${response}.`,
    ], ['discrimination', 'rule', background || missing ? 'attention' : 'switch'], [
      `${movement ? '이동하기' : '말로 답하기'} 전에 이번 신호에서 어떤 정보를 기준으로 삼는지 확인해 보세요.`,
      `다음 활동에서는 ${dimension}을 차례로 짚어 보고 반응하도록 안내해 보세요.`,
      `헷갈리는 신호에서는 잠시 멈추고 규칙을 확인한 뒤 ${movement ? '움직이도록' : '말하도록'} 지도해 보세요.`,
      `${movement ? '발판 선택' : '말로 하는 응답'}을 재촉하기보다 어떤 단서를 사용했는지 살펴보세요.`,
    ]);
  }
  if (cfg.mode === 'simon') {
    const cue = id === 'simon-camouflage' ? '노이즈 속에서 드러나는 색' : id === 'simon-balloon' ? '커졌다가 터지는 풍선의 색' : id === 'simon-theme' ? '테마 이미지에 대응하는 색' : '도형에 채워진 색';
    return profile(id, [
      `${cue}을 확인하고 해당 색 위치로 이동하는 활동입니다. 자극이 놓인 화면 위치와 반응할 색 위치를 구별합니다.`,
      `화면 어디에 자극이 나타났는지보다 ${cue}을 반응 기준으로 삼습니다. 확인한 색과 발판 위치를 연결합니다.`,
      `${cue}에 주의를 두고 이동할 위치를 고릅니다. 화면의 위치에 바로 이끌리지 않고 반응 규칙을 확인합니다.`,
      `화면 자극의 위치와 색 정보를 함께 접하는 활동입니다. ${cue}에 맞는 발판을 선택해 움직입니다.`,
    ], ['discrimination', 'inhibition', 'space'], [
      '화면에서 자극이 나온 위치와 이동할 색 위치를 나누어 확인해 보세요.',
      '이동 전에 어떤 색을 기준으로 삼았는지 말이나 손짓으로 표현하도록 안내해 보세요.',
      '위치가 달라져도 같은 반응 규칙을 적용하는지 다음 활동에서 살펴보세요.',
      '자극을 충분히 본 뒤 색을 고르고 움직이는 순서로 지도해 보세요.',
    ]);
  }
  if (id === 'sequence-memory') return profile('sequence-memory', [
    '색이 나타나는 순서를 본 뒤 같은 순서로 움직이는 활동입니다. 각 색뿐 아니라 앞뒤 순서를 함께 기억합니다.',
    '여러 색 자극을 차례대로 확인하고 화면에서 사라진 순서를 떠올립니다. 기억한 순서에 따라 발판으로 이동합니다.',
    '먼저 나온 색부터 마지막 색까지 순서를 묶어 기억합니다. 제시가 끝나면 그 순서를 움직임으로 표현합니다.',
    '색 자극을 보는 시간과 순서를 재현하는 시간이 나뉘는 활동입니다. 기억한 정보를 처음부터 차례로 사용합니다.',
  ], ['order', 'working', 'sequential'], memoryTips);
  if (id === 'instant-memory') return profile('instant-memory', [
    '전체 색 배치를 잠깐 본 뒤 바뀐 한 칸을 찾는 활동입니다. 처음 배치와 새 배치를 비교합니다.',
    '여러 칸의 색과 위치를 함께 기억합니다. 다시 나타난 배치에서 색이 달라진 칸을 찾아 반응합니다.',
    '화면 전체의 배치를 기억한 다음 이전과 다른 부분을 구별합니다. 순서를 따라가는 활동과 달리 위치 관계를 함께 살펴봅니다.',
    '처음 본 색 배치를 잠시 유지하고 다음 장면과 대조합니다. 변화가 생긴 한 칸을 찾는 것이 과제입니다.',
  ], ['layout', 'working', 'change'], [
    '빠르게 한 칸을 고르기보다 전체 배치를 한 번 살펴본 뒤 비교하도록 안내해 보세요.',
    '어느 위치부터 살펴봤는지 물어보며 아동의 배치 확인 방법을 관찰해 보세요.',
    '바뀐 칸을 찾을 때 처음 배치에서 기억나는 위치부터 차례로 비교해 보도록 지도해 보세요.',
    '다음 활동에서는 색 이름과 위치를 함께 떠올릴 시간을 주세요.',
  ]);
  if (id === 'color-number-memory' || id === 'color-number-quiz') return profile('number-memory', [
    '번호와 색의 연결을 기억한 뒤 질문을 확인하는 활동입니다. 번호만 또는 색만 외우기보다 둘의 대응을 함께 살펴봅니다.',
    '화면에서 함께 제시되는 번호와 색을 한 쌍으로 기억합니다. 질문 단계에서는 기억한 연결 관계를 떠올립니다.',
    '번호를 단서로 그와 연결됐던 색을 떠올리는 활동입니다. 제시와 확인 단계를 구분해 진행합니다.',
    '각 번호에 어떤 색이 대응했는지 확인하고 잠시 기억합니다. 질문을 통해 연결 정보를 다시 꺼내 봅니다.',
  ], ['association', 'working', 'attention'], memoryTips);
  if (id === 'glass-bridge-memory') return profile('glass-bridge', [
    '발판 색이 제시된 순서를 기억하고 같은 순서로 움직이는 활동입니다. 진행 구성에 따라 기억할 발판 길이가 늘어납니다.',
    '점차 길어지는 발판의 색 순서를 확인합니다. 제시가 끝나면 기억한 순서대로 발판을 이어 갑니다.',
    '발판 하나의 색뿐 아니라 다음 발판과의 순서 관계를 기억합니다. 길이가 늘어나는 구성에서 같은 방식으로 순서를 떠올립니다.',
    '발판 패턴을 보는 단계와 기억한 순서로 반응하는 단계가 나뉩니다. 여러 발판의 정보를 한 순서로 묶어 사용하는 활동입니다.',
  ], ['order', 'working', 'sequential'], [
    '길이가 늘어났을 때 서두르지 않고 첫 발판부터 차례로 떠올리도록 안내해 보세요.',
    '색을 보는 단계와 발판으로 옮기는 단계를 구분해 설명해 보세요.',
    '다음 활동에서는 아동이 어떤 방식으로 발판 순서를 묶어 기억하는지 살펴보세요.',
    '교사 입력 기록과 실제 몸의 움직임은 구분해서 관찰하고, 순서를 확인할 시간을 주세요.',
  ]);
  if (id === 'action-move') return profile('dive', [
    '화면이 안내하는 신호를 보고 해당 동작을 수행하는 활동입니다. 실행 설정에 포함된 동작 사이에서 움직임을 전환합니다.',
    '화면 안내의 흐름에 맞춰 몸을 움직입니다. 새 동작이 안내되면 현재 자세를 정리하고 다음 움직임을 준비합니다.',
    '실행 중 제시되는 시각 신호와 동작 안내를 연결합니다. 설정된 동작 구성을 따라 움직임을 이어 가는 활동입니다.',
    '화면의 신호를 확인하고 필요한 전신 움직임을 선택합니다. 동작이 바뀌는 구간에서는 다음 안내를 살펴봅니다.',
  ], ['transition', 'body', 'rhythm'], [
    '다음 동작으로 바뀔 때 속도보다 자세와 주변 공간을 먼저 확인하도록 지도해 보세요.',
    '동작 전환 직전에 화면 안내를 충분히 볼 수 있도록 시선과 자세를 함께 살펴보세요.',
    '다음 활동에서는 각 동작을 먼저 확인한 뒤 연결해서 움직이도록 안내해 보세요.',
    '동작을 급하게 이어 가기보다 안내의 흐름에 맞춰 준비하고 전환하도록 도와주세요.',
  ]);
  if (id.startsWith('go-no-go-')) return profile('go-no-go', [
    '신호에 따라 움직이거나 멈추는 활동입니다. 제시된 자극을 확인한 뒤 반응 여부를 고릅니다.',
    '반응해야 하는 신호와 반응하지 않아야 하는 신호를 구별합니다. 움직이지 않고 기다리는 것도 과제의 일부입니다.',
    '신호를 보자마자 움직이기보다 실행할 조건인지 먼저 확인합니다. 조건에 따라 움직임과 멈춤을 선택합니다.',
    '두 종류의 신호를 구별하고 정해진 실행·억제 규칙을 적용합니다. 신호 확인과 반응 결정을 나누어 경험합니다.',
  ], ['discrimination', 'rule', 'stop'], attentionTips);
  if (id.startsWith('task-switch-')) return profile('task-switch', [
    '신호가 안내하는 현재 규칙을 확인하고 그 기준으로 반응하는 활동입니다. 규칙이 바뀌면 같은 정보도 다르게 해석합니다.',
    '색·위치·반대 규칙의 전환 단서를 읽고 반응 기준을 고릅니다. 이전 규칙과 지금의 규칙을 구별합니다.',
    '자극 자체뿐 아니라 어떤 규칙으로 볼 것인지 함께 확인합니다. 전환 안내에 따라 반응을 새로 선택합니다.',
    '화면의 규칙 단서를 살펴보고 그때의 기준에 맞춰 움직입니다. 반복되는 자극 속에서 적용할 규칙을 바꾸어 봅니다.',
  ], ['attention', 'rule', 'switch'], attentionTips);
  // Other activities retain their authored mechanism, with four contextual readings.
  const goal = input.education?.description.trim() || trainingActivityGuide(cfg.mode, cfg.level, { activityId: id })?.goal;
  const mechanism = goal && !/보류|안내 예정|미공개/.test(goal)
    ? goal.split(/(?<=[.!?])\s+/)[0]
    : selection.title + '의 화면 신호를 확인하고 안내된 규칙에 따라 반응하는 활동입니다.';
  const tracking = ['shell-tracking', 'color-tracker', 'goalkeeper', 'moving-number-reader'].includes(selection.runtime);
  const keys: (keyof typeof concepts)[] = tracking ? ['tracking', 'attention', 'choice'] : id === 'hand-foot' ? ['discrimination', 'body', 'space'] : ['discrimination', 'attention', 'choice'];
  return profile(id, otherDescriptions[id] ?? [
    mechanism,
    `${mechanism} 자극을 확인하는 단계와 반응을 선택하는 단계를 연결합니다.`,
    `${mechanism} ${tracking ? '목표가 움직이는 동안 같은 대상을 계속 살펴봅니다.' : '눈에 띄는 특징보다 현재 규칙에 필요한 정보를 먼저 살펴봅니다.'}`,
    `${mechanism} 신호의 특징을 구별하고 다음 반응을 준비하는 과정을 경험합니다.`,
  ], keys, attentionTips);
}

/** Seed belongs to a mounted result screen, not to render count or elapsed time. */
export function selectResultEducation(input: TrainingResultViewInput, seed: number): ResultEducation {
  const data = resolveResultEducationProfile(input);
  const value = Number.isFinite(seed) ? Math.abs(Math.floor(seed)) : 0;
  return { profileId: data.id, description: data.descriptions[value % 4],
    experiences: data.concepts.map(concept => ({ label: concept.label, description: concept.descriptions[Math.floor(value / 4) % 4] })),
    tip: data.tips[Math.floor(value / 16) % 4] };
}

// Open conversation, with no answer collection or performance judgement.
// Each pair stays together so the follow-up develops the same idea.
const reflectionPairs = {
  direction: [
    ['화살표를 보았을 때 어떤 방향 정보부터 확인했나요?', '화면에서 본 방향을 몸으로 표현한다면 어떻게 보여 줄 수 있을까요?'],
    ['움직이기 전에 화살표의 어느 부분을 살펴봤나요?', '화살표가 가리킨 쪽을 말이나 손짓으로 나타내 볼까요?'],
    ['화면 속 방향과 내가 서 있는 공간을 어떻게 연결했나요?', '지금 자리에서 같은 방향을 가리킨다면 어느 쪽일까요?'],
    ['다음 화살표를 기다릴 때 무엇을 준비하고 싶나요?', '방향을 충분히 확인할 수 있는 준비 자세를 함께 생각해 볼까요?'],
  ],
  search: [
    ['여러 기호 중 목표를 찾을 때 무엇부터 살펴봤나요?', '색과 모양 중 어떤 특징을 먼저 확인했는지 이야기해 볼까요?'],
    ['화면을 살펴볼 때 나만의 탐색 순서가 있었나요?', '한쪽부터 살폈는지, 화면 전체를 보았는지 떠올려 볼까요?'],
    ['목표와 비슷한 기호를 어떻게 구별했나요?', '목표의 색과 모양을 함께 확인하는 방법을 이야기해 볼까요?'],
    ['찾은 목표의 위치를 발판과 어떻게 연결했나요?', '화면의 구역과 실제 발판의 위치를 손으로 짚어 볼까요?'],
  ],
  flanker: [
    ['여러 자극이 함께 나왔을 때 무엇을 반응 기준으로 삼았나요?', '주변 자극과 목표 자극을 나누어 이야기해 볼까요?'],
    ['목표와 주변 정보가 다를 때 어떤 단서를 확인했나요?', '움직이기 전에 목표만 짚어 보는 방법은 어떨까요?'],
    ['이번 활동에서 꼭 보아야 할 정보는 무엇이었나요?', '반응에 쓰지 않아도 되는 주변 정보도 떠올려 볼까요?'],
    ['다음 신호에서는 어디에 시선을 두고 싶나요?', '목표를 확인한 다음 반응하는 순서를 함께 말해 볼까요?'],
  ],
  stroop: [
    ['서로 다른 정보가 보일 때 어떤 규칙을 떠올렸나요?', '이번 응답에서 기준으로 삼은 정보를 말해 볼까요?'],
    ['답하기 전에 어떤 단서를 먼저 확인했나요?', '눈에 먼저 들어온 정보와 응답에 쓴 정보를 나누어 볼까요?'],
    ['이번 신호의 응답 기준을 한 문장으로 표현한다면요?', '같은 화면을 다시 본다면 무엇부터 확인하고 싶나요?'],
    ['보이는 정보와 안내된 규칙을 어떻게 함께 생각했나요?', '바로 답하기 전에 규칙을 떠올릴 방법을 이야기해 볼까요?'],
  ],
  simon: [
    ['자극이 나온 위치와 이동할 색을 어떻게 구별했나요?', '화면의 위치와 발판의 위치를 따로 짚어 볼까요?'],
    ['이동할 곳을 고를 때 어떤 색 정보를 확인했나요?', '자극의 위치가 바뀌어도 같은 색이면 어디로 가야 할까요?'],
    ['화면을 보자마자 움직이기 전에 무엇을 생각했나요?', '색을 확인하고 발판을 고르는 순서를 이야기해 볼까요?'],
    ['이번 활동의 이동 규칙을 말로 설명한다면요?', '화면 위치와 색 중 반응에 필요한 정보를 골라 볼까요?'],
  ],
  memory: [
    ['본 정보를 기억할 때 어떤 방법을 사용했나요?', '처음 떠오르는 정보부터 차례대로 이야기해 볼까요?'],
    ['정보를 하나씩 기억했나요, 몇 개씩 묶어 보았나요?', '나에게 익숙한 기억 방법을 말이나 손짓으로 표현해 볼까요?'],
    ['화면에서 사라진 정보를 어떻게 다시 떠올렸나요?', '기억을 꺼낼 때 출발점으로 삼은 단서를 이야기해 볼까요?'],
    ['다음에 다시 본다면 어떤 부분을 먼저 기억하고 싶나요?', '기억할 내용을 확인하는 시간과 표현하는 시간을 나누어 볼까요?'],
  ],
  instant: [
    ['색 배치를 보았을 때 어느 위치부터 기억했나요?', '한 칸씩 보았는지, 전체 모습을 떠올렸는지 이야기해 볼까요?'],
    ['처음 배치와 다음 배치를 어떻게 비교했나요?', '기억나는 위치를 출발점으로 삼아 다시 살펴볼까요?'],
    ['색과 위치를 함께 기억할 때 어떤 방법을 썼나요?', '화면의 한 부분을 말이나 손짓으로 표현해 볼까요?'],
    ['바뀐 부분을 찾기 전에 어떤 장면을 떠올렸나요?', '전체 배치를 다시 볼 수 있다면 어디부터 살펴보고 싶나요?'],
  ],
  dive: [
    ['새 동작 안내가 나왔을 때 무엇을 먼저 준비했나요?', '몸의 자세와 주변 공간을 확인하는 방법을 이야기해 볼까요?'],
    ['한 동작에서 다음 동작으로 어떻게 이어 갔나요?', '동작이 바뀌기 전에 필요한 준비를 함께 떠올려 볼까요?'],
    ['화면 안내와 몸의 움직임을 어떻게 연결했나요?', '기억나는 안내 하나를 골라 어떤 동작이었는지 표현해 볼까요?'],
    ['다음 동작을 기다릴 때 어떤 자세가 편할까요?', '서두르지 않고 움직임을 전환하는 방법을 생각해 볼까요?'],
  ],
  tracking: [
    ['목표가 움직이는 동안 무엇을 계속 살펴봤나요?', '처음 위치와 나중 위치를 이어서 떠올려 볼까요?'],
    ['여러 대상 사이에서 목표를 어떻게 구별했나요?', '목표를 알아보는 데 쓴 특징을 이야기해 볼까요?'],
    ['목표의 움직임을 어떤 순서로 따라갔나요?', '움직임의 시작과 끝을 손으로 표현해 볼까요?'],
    ['다음에 목표를 다시 본다면 무엇부터 확인하고 싶나요?', '움직이는 동안에도 확인할 수 있는 단서를 생각해 볼까요?'],
  ],
  stop: [
    ['움직일 신호와 기다릴 신호를 어떻게 구별했나요?', '멈춰 있어야 할 때 확인한 단서를 이야기해 볼까요?'],
    ['신호를 보고 움직이기 전에 무엇을 확인했나요?', '반응하지 않는 선택이 필요한 순간을 떠올려 볼까요?'],
    ['다음 신호를 기다릴 때 어떤 준비를 하고 싶나요?', '먼저 보고 움직임을 정하는 순서를 함께 말해 볼까요?'],
    ['이번 활동의 움직임과 멈춤 규칙은 무엇이었나요?', '서로 다른 두 신호를 말이나 손짓으로 표현해 볼까요?'],
  ],
  general: [
    ['이번 활동에서 어떤 신호를 먼저 확인했나요?', '반응을 선택할 때 사용한 단서를 이야기해 볼까요?'],
    ['안내된 규칙을 어떤 방법으로 떠올렸나요?', '기억나는 신호 하나와 그때의 반응을 연결해 볼까요?'],
    ['다음 신호를 볼 때 무엇부터 살펴보고 싶나요?', '보이는 정보 중 꼭 확인할 특징을 함께 골라 볼까요?'],
    ['이번 활동을 친구에게 설명한다면 어떻게 말할까요?', '먼저 확인할 정보와 그다음 반응을 나누어 이야기해 볼까요?'],
  ],
} satisfies Record<string, Four<readonly [string, string]>>;

export function selectResultReflection(education: ResultEducation, seed: number) {
  const id = education.profileId;
  const kind = id.includes('direction') ? 'direction' : id === 'visual-search' ? 'search'
    : id.startsWith('flanker-') ? 'flanker' : id.startsWith('stroop-') ? 'stroop'
    : id.startsWith('simon-') ? 'simon' : id === 'instant-memory' ? 'instant'
    : ['sequence-memory', 'number-memory', 'glass-bridge'].includes(id) ? 'memory'
    : id === 'dive' || id === 'motion-gate' ? 'dive' : id === 'go-no-go' ? 'stop'
    : education.experiences.some(item => item.label === '시각 추적') ? 'tracking' : 'general';
  const value = Number.isFinite(seed) ? Math.abs(Math.floor(seed)) : 0;
  const pair = reflectionPairs[kind][Math.floor(value / 64) % 4];
  const next = [
    '다시 한다면 어떤 단서를 먼저 확인하고 싶나요?',
    '다음 활동을 시작하기 전에 어떤 준비를 함께 해 볼까요?',
    '이번 활동에서 사용한 방법 중 다시 시도해 보고 싶은 것은 무엇인가요?',
    '나만의 확인 방법을 말이나 손짓으로 표현해 볼까요?',
  ][Math.floor(value / 256) % 4];
  return { question: pair[0], prompts: [pair[1], next],
    hint: '정답을 고르지 않아도 괜찮아요. 신호를 보고 반응을 선택했던 과정을 자유롭게 이야기해 보세요.' };
}

/** Non-color feedback only; the existing color report and teacher copy are retained. */
export function selectEnhancedResultEducation(input: TrainingResultViewInput, seed: number): ResultEducation {
  const selected = selectResultEducation(input, seed);
  if (!['direction', 'direction-color', 'relative-direction'].includes(selected.profileId)) return selected;
  const value = Number.isFinite(seed) ? Math.abs(Math.floor(seed)) : 0;
  const index = Math.floor(value / 4) % 4;
  return { ...selected, experiences: [
    { label: '방향 변별', description: [
      '화살표가 가리키는 방향을 시각적으로 구별하는 경험입니다.',
      '화살표의 모양에서 어느 쪽을 가리키는지 읽어 봅니다.',
      '서로 다른 방향 표시를 비교하며 신호의 방향을 확인합니다.',
      '화살표의 끝이 향하는 쪽을 살피며 방향 정보를 구별합니다.',
    ][index] },
    { label: '선택 반응', description: concepts.choice.descriptions[index] },
    { label: '시지각-운동 협응', description: [
      '화면의 방향 정보를 몸의 움직임으로 연결하는 경험입니다.',
      '눈으로 확인한 방향에 맞춰 움직임을 준비하고 표현합니다.',
      '화살표를 읽는 과정과 실제 공간에서 반응하는 과정을 연결합니다.',
      '시각적 방향 단서를 확인한 뒤 몸으로 옮겨 보는 경험입니다.',
    ][index] },
  ] };
}

const experienceFollowups = {
  direction: ['방향이 바뀌었을 때 무엇을 먼저 확인했나요?', '화살표의 끝과 내가 움직일 쪽을 어떻게 연결했나요?', '다음 신호를 보기 전에 어떤 자세로 기다리고 싶나요?', '서로 다른 방향을 손짓으로 구별한다면 어떻게 나타낼까요?'],
  search: ['목표를 찾은 뒤 위치를 어떻게 확인했나요?', '살펴보지 않은 구역은 어떻게 확인하고 싶나요?', '색은 같고 모양이 다를 때 무엇을 비교했나요?', '다음에는 화면의 어느 부분부터 살펴보고 싶나요?'],
  flanker: ['주변 자극이 달라졌을 때 목표를 어떻게 다시 확인했나요?', '목표를 고른 다음 어떤 반응을 준비했나요?', '주변 정보가 눈에 들어오면 어디를 다시 보고 싶나요?', '같은 목표가 다른 주변 자극과 나오면 무엇을 기준으로 삼을까요?'],
  stroop: ['응답 기준이 바뀌었을 때 어떤 정보를 다시 확인했나요?', '답을 정할 때 안내된 규칙을 어떻게 떠올렸나요?', '보이는 특징 중 이번 응답에 쓰지 않은 정보는 무엇이었나요?', '다음 신호에서는 어떤 순서로 규칙과 정보를 확인하고 싶나요?'],
  simon: ['신호가 다른 위치에 나오면 무엇을 다시 확인하고 싶나요?', '같은 색이 다른 자리에 나타나면 반응 규칙은 어떻게 설명할까요?', '신호를 기다릴 때 어디에 시선을 두고 싶나요?', '반응을 고르기 전에 색을 확인할 방법을 이야기해 볼까요?'],
  memory: ['기억한 내용의 앞뒤 관계를 어떤 방법으로 떠올렸나요?', '기억할 내용을 다시 볼 수 있다면 어디에 주의를 두고 싶나요?', '다음 반응을 준비할 때 어떤 기억을 먼저 사용했나요?', '다음 활동에서 같은 기억 방법을 어떻게 사용하고 싶나요?'],
  instant: ['색 이름과 위치 중 무엇을 함께 떠올렸나요?', '전체 배치에서 눈에 들어온 부분은 어디였나요?', '기억한 장면과 새 장면의 차이를 어떻게 설명할까요?', '다음에는 어떤 위치들을 함께 기억해 보고 싶나요?'],
  dive: ['다음 동작을 시작하기 전에 주변 공간을 어떻게 확인하고 싶나요?', '움직임을 바꿀 때 몸의 어느 부분을 먼저 준비했나요?', '새로운 동작 안내가 나오면 어떤 순서로 준비할까요?', '다시 활동할 때 동작 사이의 준비 시간을 어떻게 쓰고 싶나요?'],
  tracking: ['목표의 위치가 바뀌었을 때 시선을 어떻게 옮겼나요?', '비슷한 대상과 구별할 단서는 무엇이었나요?', '움직임이 끝났을 때 무엇을 다시 확인했나요?', '다음에는 목표를 기다리며 어디를 살펴보고 싶나요?'],
  stop: ['기다리는 동안 다음 신호를 어떻게 확인했나요?', '멈추는 신호를 보면 어떤 자세로 기다리고 싶나요?', '다음 신호가 달라지면 무엇을 먼저 확인할까요?', '규칙을 떠올린 다음 반응을 고르는 방법을 이야기해 볼까요?'],
  general: ['반응을 고른 다음에는 어떤 정보를 다시 확인했나요?', '화면에서 살펴볼 부분을 손으로 짚는다면 어디일까요?', '활동의 규칙을 한 문장으로 설명한다면요?', '다시 활동할 때 시도해 보고 싶은 확인 방법은 무엇인가요?'],
} satisfies Record<string, Four<string>>;

export function selectEnhancedResultReflection(education: ResultEducation, seed: number) {
  const id = education.profileId;
  const kind = id.includes('direction') ? 'direction' : id === 'visual-search' ? 'search'
    : id.startsWith('flanker-') ? 'flanker' : id.startsWith('stroop-') ? 'stroop'
    : id.startsWith('simon-') ? 'simon' : id === 'instant-memory' ? 'instant'
    : ['sequence-memory', 'number-memory', 'glass-bridge'].includes(id) ? 'memory'
    : id === 'dive' || id === 'motion-gate' ? 'dive' : id === 'go-no-go' ? 'stop'
    : education.experiences.some(item => item.label === '시각 추적') ? 'tracking' : 'general';
  const value = Number.isFinite(seed) ? Math.abs(Math.floor(seed)) : 0;
  const index = Math.floor(value / 64) % 4;
  const pair = reflectionPairs[kind][index];
  const second = id === 'number-memory' ? [
    '번호와 색의 연결을 어떤 단서로 떠올렸나요?', '번호를 다시 보면 연결된 색을 어떻게 찾아보고 싶나요?',
    '기억할 때 번호와 색을 함께 표현한다면 어떻게 말할까요?', '다음에는 번호와 색을 어떤 방법으로 묶어 기억하고 싶나요?',
  ][index] : experienceFollowups[kind][index];
  return { question: pair[0], prompts: [pair[1], second], hint: '' };
}

/** One mounted-result seed selects complete sentences, never clipped text or measured claims. */
export function selectV2ResultCopy(input: TrainingResultViewInput, seed: number) {
  const education = selectEnhancedResultEducation(input, seed);
  const reflection = selectEnhancedResultReflection(education, seed);
  const selection = resolveTrainingSelection(input.cfg.mode, input.cfg.level, { activityId: input.cfg.activityId });
  const id = selection.activityId;
  const index = Math.floor(Math.abs(Number.isFinite(seed) ? seed : 0) / 64) % 4;
  const voice = input.cfg.stroopArrowResponse === 'voice' || input.cfg.stroopWordResponse === 'voice';
  const movements = voice ? [
    '기억나는 응답 규칙을 말로 표현해 볼까요?', '기억나는 신호와 답을 차례로 말해 볼까요?',
    '신호를 보고 답을 정한 순서를 말해 볼까요?', '다음에 사용할 응답 규칙을 말해 볼까요?',
  ] : education.profileId.includes('direction') ? [
    '기억나는 방향 두 가지를 몸으로 표현해 볼까요?', '화살표가 가리킨 쪽을 손으로 나타내 볼까요?',
    '지금 자리에서 기억나는 방향을 가리켜 볼까요?', '방향을 확인하고 반응할 준비 자세를 표현해 볼까요?',
  ] : ['sequence-memory', 'glass-bridge-memory'].includes(id) ? [
    '기억나는 순서를 몸의 움직임으로 표현해 볼까요?', '기억한 순서대로 손을 움직여 볼까요?',
    '처음과 마지막 위치를 차례로 표현해 볼까요?', '기억한 순서 두 가지를 이어 표현해 볼까요?',
  ] : ['color-number-memory', 'color-number-quiz'].includes(id) ? [
    '기억나는 번호와 색의 연결을 몸으로 표현해 볼까요?', '번호에 연결된 색의 위치를 손으로 짚어 볼까요?',
    '기억나는 색과 번호를 차례로 표현해 볼까요?', '색과 번호의 연결 두 가지를 표현해 볼까요?',
  ] : id === 'instant-memory' ? [
    '기억나는 위치 두 곳을 몸으로 표현해 볼까요?', '기억한 배치의 위치를 손으로 짚어 볼까요?',
    '서로 다른 두 위치를 차례로 표현해 볼까요?', '기억한 색과 위치를 함께 나타내 볼까요?',
  ] : id === 'action-move' ? [
    '기억나는 움직임 두 가지를 이어서 표현해 볼까요?', '방향을 바꾼 동작을 천천히 표현해 볼까요?',
    '다음 신호를 기다리는 자세를 표현해 볼까요?', '기억나는 동작의 순서를 몸으로 표현해 볼까요?',
  ] : id === 'moving-number-reader' ? [
    '숫자에 맞는 위치를 몸으로 짚어 볼까요?', '기억나는 숫자의 위치를 손으로 표현해 볼까요?',
    '숫자를 확인한 뒤 움직일 위치를 나타내 볼까요?', '기억나는 두 숫자의 위치를 차례로 짚어 볼까요?',
  ] : ['goalkeeper', 'color-tracker', 'number-cart', 'visual-search', 'target-tracking', 'shape-completion'].includes(id) ? [
    '기억나는 목표 위치를 몸으로 표현해 볼까요?', '목표를 확인한 위치를 손으로 짚어 볼까요?',
    '서로 다른 두 위치를 차례로 표현해 볼까요?', '목표를 보고 반응할 준비 자세를 표현해 볼까요?',
  ] : [
    '기억나는 색 두 가지를 찾아 움직여 볼까요?', '색을 확인하고 반응할 위치를 손으로 짚어 볼까요?',
    '기억나는 신호와 움직임을 함께 표현해 볼까요?', '다음 신호를 기다리는 준비 자세를 표현해 볼까요?',
  ];
  return { education, question: reflection.question, extra: reflection.prompts[1], movement: movements[index] };
}
