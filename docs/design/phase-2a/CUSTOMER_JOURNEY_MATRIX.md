# Phase 2-A — CUSTOMER_JOURNEY_MATRIX (J01–J10)

**근거:** `journey-matrix-check.mjs` · `QA_EVIDENCE.json` · `captures/*`

| ID | 시나리오 | Production | Local | 증거 |
|----|----------|------------|-------|------|
| J01 | Home → 개인수업 | **PASS** `…/private` | **PASS** | J01 url |
| J02 | 개인수업 상세 | **PASS** (마커 «1:1과 소그룹») | **PASS** | `private-*-390.png`, timeline 3s |
| J03 | 개인수업 → 상담 | **PASS** `…/private#apply` | **PASS** | apply 섹션 (통합 `/contact` 아님) |
| J04 | Home → SPOMOVE | **PASS** `…/spomove` | **PASS** | direct `/spomove` |
| J05 | SPOMOVE → 카탈로그 | **PARTIAL** fallback | **PASS** iframe | `catalog-production-390.png` vs `catalog-local-390.png` |
| J06 | 카탈로그 → 도입 문의 | **PASS** `…/education?program=spomove#contact` | **PASS** | 클릭 후 URL |
| J07 | Home → 상담 | **PASS** `…/contact` | **PASS** | |
| J08 | 상담 유형 → 폼 | **PASS** form+submit | **PASS** | `contact-interaction-check.mjs` |
| J09 | 필수값 검증 | **PASS** `:invalid` (POST 차단) | **PASS** | 실제 접수 **NOT_VERIFIED** |
| J10 | 대체 연락처 | **PASS** 전화·이메일 | **PASS** | footer 텍스트 |

## 재현 메모

- **J05 Prod FAIL 조건:** `SPOMOVE_NOTION_CATALOG_URL` 없음 → fallback H1.
- **J08:** `#contact-type-select` 버튼 클릭 필수; 미클릭 시 form 없음.
- **J01:** 모바일 nav 링크가 hidden일 수 있음 → visible 링크 또는 direct URL.
