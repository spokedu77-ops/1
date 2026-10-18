# Phase 1-B4C — BASELINE_FAIL_PROOF

**복구 전** (CSS 수정 직전 워킹 트리)

```text
BASELINE_QA_RESULT

CSS_MODULE_REFERENCES: FAIL (26 missing, exit 1)
GATEWAY_LAYOUT: NOT_RUN (구 visual QA에 layout 계약 없음)
RECORDS_CARD_LAYOUT: NOT_RUN
LAB_STYLE_CONSISTENCY: NOT_RUN
```

## 근거

- `baseline-css-contract.json` — 26개 클래스 `defined: false`
- 기존 B4B `run-qa.mjs`: Hero 위주, **Gateway card border/grid 미검사** → `FALSE_PASS` 가능

## 복구 전 스크린샷

| 파일 | 상태 |
|------|------|
| `before-gateway-1440.png` | **NOT_CAPTURED** (정적 contract FAIL 기록 후 동일 세션에서 CSS 복구; 시각 before는 contract+과거 B4B full-page로 대체 설명) |
| `before-gateway-390.png` | NOT_CAPTURED |
| `before-records-*` | NOT_CAPTURED |

## 보완 후 baseline 재현

복구 **후**에도 `home-css-contract.mjs`를 구 CSS 상태로 돌리면 exit 1 — 스크립트는 **누락 탐지 가능**함을 baseline JSON으로 증명.

## 신규 게이트 (복구 전 시뮬레이션)

`home-css-contract.mjs` 단독 실행 → **FAIL (exit 1)** 확인 완료.
