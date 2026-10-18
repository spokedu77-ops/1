# Phase 1-B4A Main Recovery — CHANGE_PLAN

## 현재 main Hero 구조 (커밋 DOM)

```text
heroGrid
 ├─ heroCopy (eyebrow, H1, heroEnglish, lead, heroActions)
 └─ heroVisual
```

지시서 다이어그램의 `heroText` 래퍼는 **저장소 전체에 미존재**. 레이아웃 그룹 역할은 `heroCopy`가 수행.

## 기존 CSS (HEAD)

- 데스크톱: 12열 Grid, copy 1–7 / visual 7–13
- `@media (768–1023)`: 2열 `1.08fr / 0.92fr`, copy col1, visual col2, bleed 제거, 4:3
- `@media (max-width: 767)`: block 스택, 모바일 타이포
- `@media (max-width: 1023)`: Hero Grid areas **미사용** (다른 섹션만)

`display: contents` / `copy-visual-actions` 3행 스택은 **main CSS에 없음** (toss-review 구 패턴 아님).

## 변경 선택자

| 선택자 | 변경 |
|--------|------|
| `@media (768–1023) .heroEnglish` | `color: var(--blue)` 추가 |

## 변경하지 않음

- `home-hero.tsx`
- 공통 `.actions`, `.btn`, `.rail`, `.root`, `.section`
- Gateway / Method / Records / SPOMOVE / LAB / FinalCTA 규칙
- 767 이하, 1024+ Hero Grid 구조

## toss-review B4A 패치와 차이

- JSX 복사·`heroText` 도입 **하지 않음**
- 문서 `tablet-hero-only.diff` (구버전 78줄 heroText 블록) **폐기** → HEAD 대비 **1줄 diff**만 유효

## 영향 범위

Hero 태블릿 768–1023 영문 색상만. 레이아웃은 HEAD와 동일.
