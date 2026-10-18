# Phase 1-B4B — QA_RESULTS

**판정:** `LOCAL_QA_PASS`

## TypeScript / Build

- `npm run build`: **PASS**
- **BUILD_ID:** `iLRqYm9wMCSQGKSqgOGot`
- ESLint CLI: 미실행 (AGENTS 기본). 빌드 TS 통과.

## 서버

- `PORT=3014` fresh `next start` (repo root)
- URL: `http://127.0.0.1:3014/spokedu/`
- 기존 3012/3013 등 **임의 종료 없음**

## Playwright (10 Hero 폭 + full page)

| Viewport | Hero pass | 비고 |
|----------|-----------|------|
| 360×800 | ✓ | 영문 20px blue, actions after visual |
| 390×844 | ✓ | |
| 430×932 | ✓ | |
| 767×861 | ✓ | 모바일 stack; CTA는 스크롤 영역 (경계 폭) |
| 768×861 | ✓ | 2열, heroText flex |
| 834×861 | ✓ | CTA first screen |
| 941×861 | ✓ | primary bottom ~459.8 ≤ 861 |
| 1023×861 | ✓ | CTA first screen |
| 1024×861 | ✓ | EN 72px blue, H1 42px navy |
| 1440×900 | ✓ | EN ~99px blue |

- `home-full-390.png`, `home-full-941.png`, `home-full-1440.png` 생성
- `hero-mobile-before-after.png` (before: B4A 작업 전 390 캡처 참조)
- `hero-desktop-before-after.png` (before: B4A 1024 캡처 참조)

## Computed (941)

- `gridColumnCount`: 2
- `heroTextDisplay`: flex
- `englishColor`: rgb(36, 93, 255)
- `overflowX`: false

## 접근성

- Hero Primary/Secondary focus, outline 2px
- Enter 네비: 링크 focus 검증 (제출 없음)

## 6섹션 회귀

- Hero 외 JSX/CSS **미수정** — full-page 캡처로 Gateway 이하 노출 확인 (자동 diff 없음, 파일 스코프 감사 PASS)

## Commit / Push / Deploy

- **0건**
