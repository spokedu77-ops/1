# Phase 1-B4A Main Recovery — IMPLEMENTATION_REPORT

## 수정 파일

- `app/spokedu/components/home-web/home-web.module.css` (1줄)

## 적용 내용

- **768–1023px:** `.heroEnglish { color: var(--blue); }` — 태블릿 영문 Display Brand Blue
- **768–1023px 2열 Grid:** HEAD에 이미 존재 (copy+CTA 좌 / photo 우, 4:3, bleed 제거)

## TSX

- `home-hero.tsx`: **무수정**

## B1·B2B·B3B

- 다른 섹션 파일 **무수정**
- Hero 문구·href **유지** (`/education`, `/spokedu-lab`)

## CTA

- 941×861: Primary·Secondary bottom ≤ viewport (`RESPONSIVE_METRICS.json` pass)
- CTA 위치: `heroCopy` 내부 (태블릿 2열 왼쪽)

## DOM 노트

- `heroText` 없음 → QA `heroTextDisplay: null`, `heroCopyDisplay: block`, `twoColumnTabletLayout: true` (768–1023)
