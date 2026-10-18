# Phase 1-B4B — IMPLEMENTATION_REPORT

## 수정 파일

1. `app/spokedu/components/home-web/home-hero.tsx`
2. `app/spokedu/components/home-web/home-web.module.css` (Hero 선택자 및 Hero MQ만)

## DOM

- `heroText` / `heroCopy` / `heroActions` / `heroVisual` — B1 구조
- Eyebrow: `heroEyebrow` 단일 문구
- CTA: `heroActions`에 분리 (모바일 Grid `actions` 영역)

## CSS 요약

- Base: B1 타이포·색 (`heroEnglish` blue)
- `@media (min-width: 1024px)`: desktop visual order (EN → KO → lead)
- `@media (max-width: 1023px)`: mobile stack areas (copy / visual / actions)
- `@media (768–1023px)`: B4A 2열 (파일 하단, ≤1023 다음)
- `@media (max-width: 767px)`: B1 모바일 타이포·사진·CTA row

## 콘텐츠·링크

- H1·영문·본문·CTA 문구: 지시서와 일치
- Primary `/education`, Secondary `/spokedu-lab` (computed href)

## TSX

- Hero 이미지 속성 **보존**
