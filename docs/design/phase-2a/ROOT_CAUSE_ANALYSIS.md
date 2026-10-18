# Phase 2-A — ROOT_CAUSE_ANALYSIS

---

## RC-1 — Production SPOMOVE 카탈로그 목록 미표시

| 필드 | 내용 |
|------|------|
| **증상** | `/spomove/catalog`에서 iframe 없이 fallback H1만 표시 |
| **재현** | `https://spokedu.kr/spomove/catalog` · 즉시 · 모든 뷰포트 |
| **고객 영향** | 프로그램 **전체 목록 확인 불가**; 소개·도입 문의로만 우회 |
| **관련 파일** | `app/spokedu/programs/spomove/catalog/page.tsx` (`getCatalogUrl()` → `process.env.SPOMOVE_NOTION_CATALOG_URL`) |
| **기술적 원인** | URL env **미설정 또는 빈 값** → `CatalogFallback` 분기 (코드상 의도된 degraded mode) |
| **확실성** | **HIGH** (Local 동일 코드 + env 있을 때 iframe PASS, Prod fallback) |
| **해결 방향** | Production 호스팅에 `SPOMOVE_NOTION_CATALOG_URL` **설정·재배포** (HTTPS Notion/허용 origin URL). 값은 보고서·로그에 **기록하지 않음** |
| **수정 위험** | env만: **낮음**. 잘못된 URL: iframe 빈 화면·X-Frame-Options 이슈 가능 |
| **검증** | Prod에서 iframe + H1 «SPOMOVE 전체 프로그램 카탈로그» + `okCatalogList` |

---

## RC-2 — 개인수업 «헤더만» **구 가설** vs 현재

| 필드 | 내용 |
|------|------|
| **증상 (과거 가설)** | 본문 없이 헤더·푸터만 |
| **현재 Prod** | **0s:** thin shell · **≥3s:** 전체 `private-landing` PASS |
| **재현** | JS hydration 전 ~3s |
| **고객 영향** | 첫 1~3초 **서비스가 깨진 것처럼 보일 수 있음** (P1 UX) |
| **관련 파일** | `app/spokedu/private/page.tsx`, `components/private-landing.tsx` (`use client`, Suspense, framer-motion) |
| **기술적 원인** | **Client-heavy landing**; meaningful HTML 지연 |
| **확실성** | **MEDIUM** (10s 장애는 **아님**) |
| **해결 방향** | SSR 스켈레ton/정적 hero, 번들 분할, RSC 경계 검토 (후속 구현) |
| **수정 위험** | **중간** (마케팅 페이지 회귀) |
| **검증** | 0s 스크린샷에 H1/핵심 copy 존재, LCP 개선 |

---

## RC-3 — 상담 폼 «로딩 중» vs 실제 장애

| 필드 | 내용 |
|------|------|
| **증상** | HTML/초기에 «문의 폼을 불러오는 중» 가능 |
| **Prod 실측** | 수 초 내 유형 UI; **유형 클릭 후** form·submit·`:invalid` 검증 OK |
| **관련 파일** | `contact-form-shell.tsx` (Suspense), `contact-form.tsx` (유형 선택 후 form mount) |
| **기술적 원인** | (1) Suspense fallback (2) **form은 inquiryType 선택 전 DOM에 없음** — QA가 form만 보면 false FAIL |
| **확실성** | **HIGH** |
| **해결 방향** | 장애 아님; QA 시 유형 선택 포함. 제출 E2E는 **승인된 스테이징**에서 |
| **수정 위험** | 불필요한 «수정» 지양 |

---

## RC-4 — J03 상담 경로 (`/contact` vs `#apply`)

| 필드 | 내용 |
|------|------|
| **증상** | 개인수업 CTA → `/contact`가 아닌 **`/private#apply`** |
| **고객 영향** | 상담 **가능**하나 통합 `/contact`와 **경로 이원화** |
| **확실성** | **HIGH** (의도된 product flow) |
| **우선순위** | **P2** (장애 아님, 정합성·측정 이슈) |

---

## UNCONFIRMED

- Production **문의 API** (`/api/consult` 등) 수신·저장·알림 — **NOT_VERIFIED**
- Production 배포 아티팩트가 `c1a7ec52`와 **100% 일치**하는지 — **NOT_VERIFIED** (동작은 main 코드와 일치하는 패턴)
