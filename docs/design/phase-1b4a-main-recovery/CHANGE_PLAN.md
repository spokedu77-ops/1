# CHANGE PLAN — main Hero 태블릿

## 현재 main DOM

`heroGrid` → `heroText` (copy + actions) + `heroVisual`

## 문제 (`max-width: 1023px`)

- `heroText { display: contents }` → copy/actions가 그리드에 분리
- areas: `copy` / `visual` / `actions` → CTA가 풀폭 이미지 **아래**

## 해결 (768–1023만, `@media` 블록 **1023 블록 뒤**)

1. `heroGrid`: 2열 `1.08fr / 0.92fr`, areas none  
2. `heroText`: **`display: flex`**, column, gap 22px — CTA를 텍스트 그룹 안에 유지  
3. `heroCopy` / `heroActions`: `grid-area: auto`  
4. `heroVisual`: 2열, bleed 제거, 4:3  
5. 타이포: H1 30–36px, English **38–52px `var(--blue)`**, lead 15–16px  

## 변경하지 않음

- `home-hero.tsx`
- `@media (max-width: 767px)`, `@media (min-width: 1024px)` Hero 규칙
- Gateway·Method·Records·SPOMOVE·LAB·FinalCTA·`.btn`·`.actions` 전역

## toss-review B4A와 차이

- toss-review: `heroCopy`에 CTA 통합, `heroText` 없음  
- main: **`heroText` flex 그룹** 유지 — 패치 복사 금지, 위 DOM 전용 CSS
