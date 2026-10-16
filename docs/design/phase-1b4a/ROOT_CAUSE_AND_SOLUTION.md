# Phase 1-B4A — Root Cause & Solution

## 941px 문제 (작업 전)

**증상:** Primary CTA가 첫 화면(861px 높이) 밖, 텍스트 좌측 집중·우측 공백, 풀폭 사진이 CTA 위·아래로 길게 배치.

**B3B 기준값 (다른 DOM/구조):** CTA top ≈1124px @941 — 참고용.

**이번 재측정 (작업 전, HEAD Hero, 941×861):**  
`hero-941-before-reference.png` — `display: block` 스택, 영문 `displayHero` 단일 H1, CTA는 카피 블록 맨 아래·풀폭 16/10 이미지 **위**에 있으나 영문 Display가 커서 첫 화면 CTA 노출 불안정.

### CSS 원인

`@media (max-width: 1023px)` 에서:

```css
.heroGrid { display: block; }
.heroVisual { margin-top: …; margin-inline: calc(-1 * var(--gutter)); }
.heroVisual .media { aspect-ratio: 16 / 10; }
```

768~1023px도 **모바일형 세로 스택 + 풀블리드 이미지**가 적용되어 2열 데스크톱(1024+)과 단절.

## 검토한 해결

| 방안 | 판단 |
|------|------|
| CTA margin만 축소 | **기각** — 그리드 구조 문제 미해결 |
| actions를 visual 위로 reorder만 | DOM상 CTA는 이미 copy 안 — **타이포·스택이 본질** |
| **768–1023 전용 2열 Grid** | **채택** (지시서 §5·§6) |

## 최종 적용

1. **`@media (min-width: 768px) and (max-width: 1023px)`**  
   - `grid-template-columns: minmax(0, 1.08fr) minmax(0, 0.92fr)`  
   - copy+CTA 좌, `heroVisual` 우, bleed 제거, 이미지 4/3  
   - 태블릿 타이포: H1 30–36px, English 38–52px, lead 15–16px  

2. **`@media (max-width: 767px)`** — 기존 block 스택·3/2 이미지 유지  

3. **`home-hero.tsx` (최소)** — 한글 `heroH1` + 영문 `heroEnglish` 분리, `heroLead` / `heroActions` (위계·접근성; CSS만으로 H1/Display 분리 불가)

## 941px CTA 개선 (측정)

| | Primary `top` | Primary `bottom` | 첫 화면(861px) |
|--|--:|--:|--|
| 작업 전 (HEAD, 동일 뷰포트) | (스택·대형 영문) | — | **FAIL** (B3B·before 캡처) |
| **B4A 후** | **431.7px** | **475.7px** | **PASS** (`bottom ≤ 861`) |

## 적용 범위

- Hero CSS 선택자만 (+ TSX Hero 마크업)
- Gateway·Method·Records·SPOMOVE·LAB·FinalCTA **미변경**

## 남은 문제

- `data-spokedu-home-build` 상수(`home-build.ts`)와 `.next/BUILD_ID` **불일치** — QA는 CSS·DOM·fresh `npm run start`(port 3008)로 검증  
- 데스크톱(1024+)에 한글 H1이 추가되어 B1 대비 **정보 위계 소폭 변경** (영문 Display 크기는 유지)  
- 키보드 포커스·WCAG 자동 측정 **NOT_VERIFIED**  
- Hero 이미지 공개 사용 승인 **운영 전 미해결** (지시서 §9)
