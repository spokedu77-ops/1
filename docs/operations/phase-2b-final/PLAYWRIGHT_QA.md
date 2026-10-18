# Phase 2-B FINAL — PLAYWRIGHT_QA

**스크립트:** `run-catalog-qa.mjs` · **조건:** `CATALOG_QA_NO_ENV=1` (Notion env **미전달**)

## 화면

| VP | H1 | iframe | fallback | 3분류 | overflow | 판정 |
|----|-----|--------|----------|-------|----------|------|
| 390 | 1 | 0 | ✗ | ✓ | ✗ | PASS |
| 834 | 1 | 0 | ✗ | ✓ | ✗ | PASS |
| 941 | 1 | 0 | ✗ | ✓ | ✗ | PASS |
| 1440 | 1 | 0 | ✗ | ✓ | ✗ | PASS |

## 고객 여정

| ID | 결과 | URL |
|----|------|-----|
| A | PASS | `/spomove` → `/spomove/catalog` |
| B | PASS | catalog → `/spomove` |
| C | PASS | → `/education?program=spomove#contact` |
| D | PASS | → `/spokedu-lab` |

## 회귀

- `HOME_HERO_B5` — PASS

## 증거

`QA_EVIDENCE.json`, `captures/*`

**overall:** PASS
