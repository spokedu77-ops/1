# Phase 2-A — PRODUCTION_AUDIT

**대상:** `https://spokedu.kr` · 뷰포트 390 / 941 / 1440 · 비로그인

---

## `/private`

| 항목 | 결과 |
|------|------|
| HTTP | **200** (전 뷰포트) |
| 초기(0s) | 본문 마커 없음, `bodyLen` ~377 — **헤더·푸터 위주** |
| 3s | `1:1과 소그룹`, `개인·소그룹 수업을 안내`, `#apply`, 이미지 12장 중 9~11 로드 |
| 10s | 동일하게 유지 (추가 실패 없음) |
| 콘솔 error | 없음 |
| 실패 네트워크 | 없음 |
| `PRIVATE_CONTENT_VISIBLE` | **PASS** (3s 이후) |

**고객 과업:** Home → `/private` → 수업 정보 → 상담(`#apply`) — **가능** (J01–J03 PASS). J03은 `/contact`가 아니라 **`/private#apply`** (페이지 내 상담 폼).

**캡처:** `captures/private-production-{390,941,1440}.png`

---

## `/spomove/catalog`

| 항목 | 결과 |
|------|------|
| HTTP | **200** |
| 0~10s | **fallback UI 고정** — H1 «전체 카탈로그를 아직 표시할 수 없습니다» |
| iframe | **없음** |
| 대체 경로 | «SPOMOVE 소개», «기관 도입 문의», «구독시스템 알아보기» **표시·클릭 가능** |
| 기술 정보 노출 | 화면에 env 변수명·스택 **미노출** (캡처·body 스니펫 확인) |
| `CATALOG_CONTENT_AVAILABLE` (목록) | **FAIL** — 프로그램 목록 미표시 |
| fallback 안내 + 내비 | **PASS** |

**고객 과업:** 카탈로그 **목록 확인** — **불가**. 소개·도입 문의로 우회 — **가능** (J05 PARTIAL, J06 PASS → `/education?program=spomove#contact`).

**캡처:** `captures/catalog-production-{390,941,1440}.png`

---

## `/contact`

| 항목 | 결과 |
|------|------|
| HTTP | **200** |
| 초기(0s) | 히어로·안내 카드 렌더, «문의 폼을 불러오는 중» **짧게 가능** (로컬 타임라인) |
| 10s (스크롤 없음) | 유형 선택 카드까지 표시; **`<form>`은 유형 미선택 시 없음** (설계상) |
| 유형 선택 후 | `<form>` + submit, 필수값 검증 **PASS** (POST 차단) |
| `CONTACT_FORM_INTERACTIVE` | **PASS** (유형 선택 후) |
| 실제 접수 API | **NOT_VERIFIED** (Production 제출 금지) |

**캡처:** `contact-production-390-initial.png`, `contact-production-390-settled.png`, `contact-production-1440-settled.png`

---

## 공통 (`/`)

- 홈 Hero 재감사 **범위 외**. J01에서 visible `/private` 링크 또는 direct navigation으로 개인수업 진입 확인.
