# Phase 1-B5 — IMAGE_SELECTION_AND_CROP

## 선택

- **Hero:** `home-service-private.jpg` → 배포 경로 `home-hero-coaching.jpg`
- **미사용:** `home-hero-ai-20261018.png`, `home-service-institution.jpg` (보존)
- **슬라이드/복수 사진:** 없음 (Hero `img` 1개)

## 비율·크롭 정책

- 원본 **16:9** (1024×576) 유지
- Hero `.media`에 `aspect-ratio: 16 / 9`, `object-fit: cover`, `object-position: 50% 50%`
- 4:3·3:2·16:10 Hero 강제 규칙 제거
- `object-position` 반복 조정 없음 — 프레임 비율 통일로 인물 노출

## QA 측정 (자동)

| 뷰포트 | width×height | ratio | 판정 |
|--------|--------------|-------|------|
| 390 | 350×196.9 | 1.778 | PASS |
| 768 | 314×176.6 | 1.778 | PASS |
| 1440 | 708×398.3 | 1.778 | PASS |

## alt / 클레임

- alt: «지도자와 아이가 함께 움직이는 체육 수업 장면»
- 특정 학교·현장 실적 사진으로 표기하지 않음 (연출/에디토리얼 가능성 고려)

## 해상도

- 원본 1024px 너비 — 1440 Hero 프레임 최대 ~708px 표시 폭 기준 **충분** (실화면 QA PASS)
- 업스케일·인위적 해상도 보강 없음
