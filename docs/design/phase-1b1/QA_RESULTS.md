# Phase 1-B1 QA 결과

검증 일시: 2026-10-16 (로컬 Production build + Playwright)

## 정적 검사

| 항목 | 명령 | 결과 |
|------|------|------|
| TypeScript | `npm run typecheck` | **PASS** |
| ESLint (변경 TSX) | `npx eslint app/spokedu/components/home-web/home-hero.tsx app/spokedu/components/home-web/service-gateway.tsx` | **PASS** |
| ESLint (전체) | `npm run lint:all` | **미실행** (기존 저장소 전역 이슈와 B1 구분 목적) |
| Production build | `npm run build` | **PASS** |

환경: Playwright Chromium 바이너리가 없어 `npx playwright install chromium` 실행( npm 의존성 추가 아님).

## Playwright (로컬 `npm run start`, `/`)

스크립트: `docs/design/phase-1b1/run-captures.mjs`, `run-qa-checks.mjs`

| viewport | Hero·Gateway·overflow | 비고 |
|----------|---------------------|------|
| 1440×900 | **PASS** | 캡처 `captures/home-1440.png`, 영문 Display·한글 H1·이미지·CTA 확인 |
| 1024×900 | **PASS** | `captures/home-1024.png`, `overflow: false` |
| 834×900 | **PASS** | `captures/home-834.png`, 1열 카드·히어로 스택 |
| 390×844 | **PASS** | `captures/home-390.png`, H1→영문→본문→이미지→CTA 순 |

### href

| 대상 | 기대 | 결과 |
|------|------|------|
| Hero Primary | `/education` | **PASS** |
| Hero Secondary | `/spokedu-lab` | **PASS** |
| Card 1 | `/education` | **PASS** |
| Card 2 | `/private` | **PASS** |
| Card 3 | `/spokedu-lab` | **PASS** |

### 기타 자동 검사

| 항목 | 결과 |
|------|------|
| `document.querySelectorAll('h1').length === 1` (4 widths) | **PASS** |
| Gateway 장식 번호 01/02/03 | **PASS** (없음) |
| Hero 이미지 visible 후 캡처 | **PASS** |
| 가로 넘침 (`scrollWidth > innerWidth`) | **PASS** (4 widths 모두 false) |

### 미검증 / 수동 권장

| 항목 | 상태 |
|------|------|
| 키보드 Tab·Enter 포커스 링 시각 | **미검증** (자동 스크립트 미포함) |
| 나머지 5섹션 DOM·href·copy 회귀 | **부분** — 전체 페이지 full-page 캡처로 시각적 이상 없음 확인, 섹션별 diff 자동화 없음 |

## Gateway 전용 캡처

- `captures/gateway-1440.png` — **PASS**
- `captures/gateway-390.png` — **PASS**

## 나머지 섹션 회귀 (시각)

full-page 스크린샷에서 `SpokeduMethod`, `FieldRecords`, `SpomoveStage`, `MasterStage`, `FinalCTA` 순서·존재 확인 — **PASS** (자동 텍스트/href diff 없음)

## 완료 전 감사

| 항목 | 결과 |
|------|------|
| 서비스 코드 변경 | 허용 3파일만 |
| 기존 미커밋 3파일 SHA | 변경 없음(작업 중 유지) |
| commit / push | **없음** |
| 브랜치 | `main` |
| npm 패키지 추가 | **없음** |

### B1 파일 SHA-256 (작업 후)

```
CE8F1716B7AAC9F64D83F9F70F1EEF2E4C31A909093D90DC66CBC399786AA238  home-hero.tsx
D596F1554F23570BEEB6B66A596A0394C22834F0E3F645E4DD0834C18198EF3A  service-gateway.tsx
4EF6F846DDB780E1925C99CFA91011231F035C99C32FA094791B1C96B6436615  home-web.module.css
```
