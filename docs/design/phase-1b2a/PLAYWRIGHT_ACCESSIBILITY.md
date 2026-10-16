# Playwright · 접근성 · 과업 (Phase 1-B2A)

대상: `METHOD_RECORDS_COMPARISON.html` (참고 시안, Production 아님)

## Playwright

| viewport | overflow (A variant) | 캡처 |
|----------|----------------------|------|
| 1440 | false | method/records A·B |
| 1024 | false | (리포트만) |
| 834 | false | (리포트만) |
| 390 | false | method/records A·B |

파일: `captures/method-A-1440.png` … `records-B-390.png` (8종, **생성 완료**)

이미지: 스크린샷 전 `img.decode()` 호출.

## 접근성 (WCAG 2.2 AA — 부분)

| 항목 | 결과 |
|------|------|
| 다크 섹션 H2 대비 (white on navy) | **수동 PASS** (일반 텍스트 >4.5:1 예상) |
| 키보드 — toolbar 버튼 focus | **PASS** (focus-toolbar-390.png) |
| 시안 내 heading 위계 | h2/h3 — **PASS** |
| 실제 href 동작 | 시안 placeholder `#` — **N/A** |
| Production 컴포넌트 focus | **미검증** (코드 수정 금지) |

자동 contrast ratio 도구: **미실행** — 수동·토큰 기준.

## 고객 과업 (전문가 점검)

| 과업 | Current | A | B |
|------|---------|---|---|
| 1 기관 경험 확인 | 부분 | 양호 | **양호** |
| 2 학부모 조정 확인 | 약 | 양호 | **양호** |
| 3 F·C·S 이해 | 약 | **양호** | 양호 |
| 4 상세 이동 | 혼재 링크 | 명시 | **명시** |
| 5 효과 vs 운영 구분 | 약 | **양호** (카피) | **양호** |

**실사용자 테스트 아님.**
