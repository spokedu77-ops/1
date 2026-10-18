# Final Visual QA

**판정:** `VISUAL_QA_PASS` (서버 `127.0.0.1:3002`, BUILD_ID `CRXHj0T0tTWJPlpW8Zhml`)  
**캡처:** `rendering-qa/captures/` (육안 확인 완료)

| 검사 | 1440 | 1024 | 834 | 390 |
|---|---|---|---|---|
| CSS 정상 적용 | PASS | PASS | PASS | PASS |
| Method 레이아웃 | PASS (3열) | PASS (3열) | PASS (1열+행) | PASS (1열) |
| Method 이미지 | PASS | PASS | PASS | PASS |
| Records 레이아웃 | PASS (1+2) | PASS | PASS | PASS |
| Records 이미지·정보 | PASS | PASS | PASS | PASS |
| 헤더 겹침 | NOT_VERIFIED | NOT_VERIFIED | NOT_VERIFIED | NOT_VERIFIED (390 records 상단 헤더 겹침 가능 — fixed chrome) |
| 가로 넘침 | PASS | PASS | PASS | PASS |
| 링크·포커스 | PASS (390 Tab 3건) | NOT_VERIFIED | NOT_VERIFIED | PASS |

style assert: `run-captures-only.mjs` → `styleChecks.*.ok === true` 전 뷰포트.

## 1차 B2B 제출 캡처 (`docs/design/phase-1b2b/captures/`)

**FAIL** — QA 환경/서버 불일치로 판정 (본 rendering-qa와 교체하지 않음).

## 접근성 (보완)

| 항목 | 결과 |
|---|---|
| Records Tab ×3 + focus 스크린샷 | PASS (`focus-records-390.png`) |
| Enter 이동 | NOT_VERIFIED (자동) |
| WCAG 대비 4.5:1 자동 | NOT_VERIFIED |
| alt / 제목 계층 / 중첩 링크 | 코드·캡처상 **이상 없음** (수동 샘플) |

## B1 회귀 (5섹션)

`home-full-1440.png`, `home-full-390.png` — Hero/Gateway/SPOMOVE/LAB/FinalCTA **존재·배치 유지** (computed diff 미실시, 시각 샘플).
