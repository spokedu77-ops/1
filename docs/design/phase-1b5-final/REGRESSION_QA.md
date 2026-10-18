# Phase 1-B5 — REGRESSION_QA

## 변경 범위 외 섹션

Gateway · Method · Records · SPOMOVE · LAB · Final CTA — **TSX/CSS diff 없음**

## B4D 게이트 (동일 빌드·서버)

| 게이트 | B5 결과 |
|--------|---------|
| OVERFLOW_X | PASS |
| GATEWAY_LAYOUT_1440 + borders | PASS |
| RECORDS_MEDIA_HEIGHT_390 | PASS (ratio ~0.75) |
| LAB_STYLE_390 | PASS |
| Live audit (`B4D_PORT=3017`) | PASS |

## Hero 회귀 방지

- B4A 태블릿 768–1023 2열: 유지 (텍스트+CTA 좌, 16:9 우)
- 모바일 ≤1023: copy → visual → actions 순서 유지

## 알려진 운영 메모

- `home-qa-audit.mjs`는 기본적으로 `phase-1b4d/FINAL_QA_EVIDENCE.json`을 읽는다. B5 검증 시 **동일 BUILD의 evidence**와 **port 3017**로 audit 실행함.
