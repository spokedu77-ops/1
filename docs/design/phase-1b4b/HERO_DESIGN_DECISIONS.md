# Phase 1-B4B — HERO_DESIGN_DECISIONS

## B1에서 복구 (88013dfb 기준)

- DOM: `heroText` → `heroCopy` + `heroActions`
- Eyebrow: **SPOKEDU 중복 제거**, 고객용 한 줄만
- 본문: 승인 문구 (움직임·참여·지도자용 시스템)
- 데스크톱: CSS `order`로 **영문 Display → 한글 H1 → 본문 → CTA** 시각 위계 (H1 DOM 1개)
- 색: H1 `#0B1F46`, 영문 `#245DFF`
- 모바일: 한글 36px / 영문 20px 블루 / 본문 16px
- 모바일 순서: copy → visual → actions (Grid areas + `heroText { display: contents }`)
- 모바일 사진: 3:2, radius 16px, rail gutter 20px (bleed 제거)
- 모바ile CTA: 가로 2열, min-height 44px

## B4A에서 유지

- 768–1023: 2열, `heroText` flex 그룹, 4:3, bleed 없음
- 태블릿 영문 블루, CTA 왼쪽 컬럼
- 이미지 `src` / `objectPosition` / `fetchPriority` / `alt` 동일

## 변경하지 않음

- CTA href·라벨 (`SPOKEDU_PATHS`)
- Hero 외 6개 섹션 JSX
- 공통 `.actions` / `.btn` / `.rail` / `.root` 규칙 (모바ile `.btn { width:100% }` 유지, Hero CTA만 row override)
- Git checkout/reset/전체 파일 복사

## 구현 메모

- 태블릿 MQ는 **`@media (max-width: 1023px)` Hero stack 뒤**에 두어 2열이 덮이지 않게 함 (B4A 회귀 방지).
- 941 CTA 첫 화면: 태블릿 copy 간격·영문 clamp 소폭 조정 (Hero MQ 내만).
