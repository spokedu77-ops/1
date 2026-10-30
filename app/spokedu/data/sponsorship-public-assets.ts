/**
 * Google Drive 협찬·고화질 현장 사진 — `public/images/spokedu/` 루트 및 파생 경로.
 * 런타임 fetch 없음. records/*·private/* 등 ASCII 파일명 슬롯으로 복사해 페이지에서 참조.
 */
export const SPOKEDU_SPONSORSHIP_ROOT = '/images/spokedu';

/** 루트에 추가된 협찬 원본 파일명 (스캔 기준) */
export const SPOKEDU_SPONSORSHIP_SOURCE_FILES = [
  '개인수업협찬_스텝레더_러닝스텝_004.jpg',
  '개인수업협찬_줄넘기_후프연계활동_004.jpg',
  '개인수업협찬_육상_콘민첩성훈련_001.jpg',
  '협찬수업_축구_볼컨트롤기초_001.jpg',
  '2025-04-03_개인수업협찬_농구_사진1454.jpg',
  '스포키듀 랩 체육관 협찬 13.JPG',
  '스포키듀 랩 체육관 협찬 14.JPG',
  '스포키듀 랩 체육관 협찬 15.JPG',
  '스포키듀 랩 체육관 협찬 16.JPG',
  '2026-08-31_체육관모크모_사진3498.JPG',
  'DSC06500.jpg',
  'DSC06467.jpg',
  'DSC06463.jpg',
  '등촌 체조.jpg',
  '20231008＿152307.jpg',
  'spomat-layout.png',
  'spomat-square-cutout.png',
  'spomat-diamond-cutout.png',
] as const;

export const SPOKEDU_LAB_GYM_SPONSORSHIP_14 =
  `${SPOKEDU_SPONSORSHIP_ROOT}/home/field-editorial/home-hero-lab-gym-sponsorship-14.jpg` as const;

export const SPOMOVE_PUBLIC_COLOR_REACTION = {
  src: '/spokedu/programs/spomove/assets/spe/spe-06.webp',
  alt: 'SPOMAT 위에서 화면 색 신호에 맞춰 반응하는 수업 현장',
} as const;

export const SPOMOVE_PUBLIC_SPOMAT_PRODUCT = {
  src: `${SPOKEDU_SPONSORSHIP_ROOT}/brand/spomat-layout.png`,
  alt: 'SPOMAT 2×2 — 빨강·노랑·초록·파랑 전용 타깃 매트',
} as const;
