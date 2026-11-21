import { GUIDE_BLOCKS } from '../trainingGuideContent';
import { resolveTrainingActivity, type TrainingActivityInput } from './trainingActivity';

/** Guide associations use activity IDs; display order is never a lookup key. */
export function trainingActivityGuide(mode: string, level: number, input: TrainingActivityInput = {}) {
  const id = resolveTrainingActivity(mode, level, input);
  if (id === 'sports-fencing' || id === 'sports-kendo') return {
    activityId: id, num: id === 'sports-fencing' ? '1' : '2', name: id === 'sports-fencing' ? '펜싱 · 런지' : '검도 · 일도양단',
    goal: id === 'sports-fencing' ? '다가오는 코어의 색과 도착 시점에 맞춰 같은 색 매트를 내디디며 런지와 찌르기를 수행합니다.' : '다가오는 장벽의 색에 맞춰 매트를 밟고 검기 방향으로 베기 동작을 수행합니다.',
    screen: '3초 카운트다운 후 설정한 접근 시간과 라운드 수로 진행합니다. 화면의 관통·절단 효과는 동작 신호이며 성공 판정이 아닙니다.',
    action: '같은 색 매트에서 해당 스포츠 동작으로 반응합니다.', coach: '먼저 천천히 동작을 익히고 충분한 개인 간격을 확보하세요.',
    pitfall: '제시한 목표 수만 기록하며 실제 동작 정확도나 성공률을 자동 측정하지 않습니다.',
  };
  if (id === 'moving-number-reader') return {
    activityId: id, num: '11', name: '움직이는 숫자 판별',
    goal: '캡슐 안의 숫자를 눈으로 읽고 해당 구역으로 이동합니다.',
    screen: '쉬움은 설정한 고정 비행 시간과 이동 3초를 사용합니다. 어려움은 비행 1.1→0.35초, 이동 3.4→2초로 자동 가속합니다. 준비 1.5초와 공개 2.5초는 공통이며, 3라운드부터 가림막 1개, 5라운드부터 3개가 등장합니다.',
    action: '1 좌상 빨강, 2 우상 노랑, 3 좌하 초록, 4 우하 파랑 구역으로 이동합니다.',
    coach: '캡슐의 파란색이 아니라 안의 숫자를 읽게 하세요.',
    pitfall: '숫자 출현은 제시 기록입니다. 실제 이동 성공이나 정확도를 자동 측정하지 않습니다.',
  };
  if (id === 'beat-rush') return {
    activityId: id, num: '', name: '비트 러시',
    goal: '다가오는 블럭의 색을 구별하고 도착 시점에 같은 색 매트로 이동합니다.',
    screen: '선택한 환경 배경의 4색 레인에서 블럭 앞면이 도착선에 닿습니다. 긴 블럭은 잔발 스텝 신호입니다.',
    action: '색에 맞춰 이동하고 긴 블럭 동안 같은 자리에서 가볍게 잔발 스텝을 이어 갑니다.',
    coach: '먼저 걸어서 색과 위치를 익힌 뒤 접근 시간을 조절하세요.',
    pitfall: '기록은 제시한 블럭 수이며 실제 동작 성공 여부를 측정하지 않습니다.',
  };
  if (id === 'motion-gate') return {
    activityId: id, num: '2', name: '모션 게이트',
    goal: '다가오는 색상 관문의 신호를 보고 같은 색 매트에서 안내된 포즈를 수행합니다.',
    screen: '선택한 카테고리와 난이도의 동작이 색상 관문과 함께 제시됩니다. 설정한 통과 시간과 반복 횟수로 진행합니다.',
    action: '관문의 색과 동작 안내를 확인하고, 해당 매트에서 포즈를 취합니다. 투게더·패밀리는 함께 동작합니다.',
    coach: '동작 소개에서 자세를 먼저 익히고 참여자 사이의 간격을 확보하세요.',
    pitfall: '기록은 제시한 관문의 수이며 실제 포즈의 정확도를 자동 측정하지 않습니다.',
  };
  return GUIDE_BLOCKS.flatMap(block => block.phases).find(phase => phase.activityId === id || phase.activityIds?.includes(id));
}
