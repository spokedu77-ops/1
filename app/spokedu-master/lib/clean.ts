import type { Program } from '../types';

export const BROKEN_TEXT_PATTERN =
  /[�]|[?][가-힣]|怨|諛|吏|媛|蹂|鍮|湲|醫|嫄|珥|獄|筌|揶|癰|疫|椰/;

export function hasBrokenText(value: string | undefined): boolean {
  if (!value) return false;
  return value.includes('�') || /[ìíëêðÃÂ]/.test(value) || BROKEN_TEXT_PATTERN.test(value);
}

export function cleanText(value: string | undefined, fallback: string): string {
  const text = (value ?? '').trim();
  if (!text || hasBrokenText(text)) return fallback;
  return text;
}

export function cleanList(items: string[] | undefined, fallback: string[]): string[] {
  const cleaned = (items ?? []).map((item) => item.trim()).filter((item) => item && !hasBrokenText(item));
  return cleaned.length ? cleaned : fallback;
}

export const PROGRAM_FALLBACK: Record<string, Partial<Program>> = {
  'funstick-fencing': {
    title: '펀스틱 펜싱 Funstick Fencing',
    category: '민첩·반응',
    grade: '초등 3학년 이상',
    space: '실내 체육관 · 넓은 활동 공간',
    description: '부드러운 펀스틱과 풍선 목표물을 활용해 거리 판단, 타이밍, 균형 조절을 경험하는 대체 펜싱 수업입니다.',
    equipment: ['펀스틱 2개', '풍선 목표물 2개', '접시콘 12~15개'],
    tags: ['펜싱', '민첩성', '거리 판단', 'SPOMOVE 연계'],
  },
  'figure-8-agility': {
    title: '8자 드릴 민첩성 트레이닝',
    category: '민첩·반응',
    grade: '초등 3~6학년',
    space: '좁은 실내 공간',
    description: '마커콘을 8자 패턴으로 통과하며 방향 전환, 가속, 재출발 리듬을 익히는 SPOMOVE 연계 수업입니다.',
    equipment: ['마커콘 4개', '태블릿 또는 노트북'],
    tags: ['민첩성', '방향 전환', '좁은 공간', 'SPOMOVE'],
  },
  'team-relay-challenge': {
    title: '팀 릴레이 챌린지',
    category: '협동',
    grade: '전 학년',
    space: '넓은 공간',
    description: '팀별 릴레이로 출발 반응과 협동성을 함께 끌어올리는 수업입니다.',
    equipment: ['바톤', '마커콘'],
    tags: ['협동', '출발 반응', '팀 빌딩'],
  },
};

export const DRILL_FALLBACK: Record<string, string> = {
  'SR-05': '스피드 리액션',
  'SR-06': '방향 전환 챌린지',
  'RS-05': '팀 콜 사인',
  'IC-05': '스텝 밸런스',
  'RC-05': '리듬 체인지',
};
