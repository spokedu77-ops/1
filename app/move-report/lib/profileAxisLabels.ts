/**
 * 프로필 내부 키(예: CRPD) 4글자 → 부모용 축 라벨(한글).
 * 키 문자 자체는 변경하지 않고 표시용으로만 사용한다.
 */
export function axisLabelsFromProfileKey(key: string): string[] | null {
  const k = key?.trim();
  if (k.length < 4) return null;
  const a = k[0];
  const b = k[1];
  const c = k[2];
  const d = k[3];
  return [
    a === 'C' ? '협동형' : '독립형',
    b === 'R' ? '규칙 친화' : '탐구 지향',
    c === 'P' ? '과정 중시' : '목표 지향',
    d === 'D' ? '동적 에너지' : '정적 에너지',
  ];
}

/** 부모용 한 줄 요약: "독립형 · 탐구 지향 · …" */
export function axisLabelsJoined(key: string, sep = ' · '): string {
  const labels = axisLabelsFromProfileKey(key);
  if (!labels) return '';
  return labels.join(sep);
}
