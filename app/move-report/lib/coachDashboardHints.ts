/**
 * 집단 상위 유형(프로필 키) 기반 수업 설계 힌트 — 정적 문장만 (AI 없음).
 * 개별 아동이 아닌 그룹 경향용 카피.
 */

function countAxisInKeys(keys: readonly string[], index: number, letter: string): number {
  return keys.filter((k) => k.length > index && k[index] === letter).length;
}

export function getLessonDesignHint(topProfileKeys: readonly string[]): string {
  const keys = topProfileKeys.filter(Boolean).slice(0, 3);
  if (keys.length === 0) {
    return '응답이 쌓이면 이 그룹의 움직임 성향 경향을 바탕으로 수업 템포와 활동 형태를 조율해 보세요.';
  }

  const c = countAxisInKeys(keys, 0, 'C');
  const i = countAxisInKeys(keys, 0, 'I');
  const d = countAxisInKeys(keys, 3, 'D');
  const s = countAxisInKeys(keys, 3, 'S');
  const p = countAxisInKeys(keys, 2, 'P');
  const g = countAxisInKeys(keys, 2, 'G');

  if (c >= 2) {
    return '이 그룹은 함께 움직일 때 에너지가 잘 오르는 경향이 있어요. 팀 미션·짝 활동·협동 게임을 도입부에 두면 참여도가 높아질 수 있어요.';
  }
  if (i >= 2) {
    return '이 그룹은 개인 과제·자기 페이스가 잘 맞는 유형이 많아요. 역할 분담이 명확한 소그룹이나 순환 스테이션으로 부담을 나눠 주면 몰입이 좋아질 수 있어요.';
  }
  if (d >= 2) {
    return '역동적인 에너지가 두드러지는 편이에요. 짧은 루프로 워밍업을 길게 잡고, 방향 전환이 잦은 활동으로 지루함을 줄여 보세요.';
  }
  if (s >= 2) {
    return '차분하게 리듬을 맞추는 유형이 많아요. 규칙과 시각 자료가 분명할수록 안심하고 따라오기 쉬워요. 급한 전환은 한 번에 하나씩만 바꿔 주세요.';
  }
  if (p >= 2) {
    return '과정을 즐기는 반응이 많아요. “얼마나 했는지”보다 “어떻게 해봤는지”를 짧게 공유하는 시간을 넣으면 동기가 유지되기 쉬워요.';
  }
  if (g >= 2) {
    return '목표가 분명할 때 몰입이 올라가는 경향이에요. 작은 성취 체크리스트나 단계별 미션 카드를 주면 수업 흐름이 안정돼요.';
  }

  if (keys[0]?.[0] === 'C') {
    return '협동 성향이 상위에 있어요. 파트너 스트레치·미러 동작처럼 서로 맞추는 활동을 중간에 넣어 주면 분위기가 한층 살아날 수 있어요.';
  }
  if (keys[0]?.[0] === 'I') {
    return '독립적으로 탐색하는 반응이 강해요. 같은 목표라도 연습 칸을 나눠 “내 속도”로 할 수 있게 하면 집중이 오래 갈 수 있어요.';
  }

  return '상위 유형이 고르게 섞여 있어요. 한 가지 스타일에만 맞추기보다, 짧은 블록으로 활동 형태를 바꿔 가며 다양한 참여 경로를 열어 주면 좋아요.';
}
