# Phase 1-B2A — 원본·증거

분석일: 2026-10-16  
Git: `spokedu77-ops/1`, `main` (B1 로컬 변경 유지, **본 단계 서비스 코드 수정 0**)

## 분석한 원본 (READ-ONLY)

| 유형 | 경로 |
|------|------|
| Method 컴포넌트 | `app/spokedu/components/home-web/spokedu-method.tsx` |
| Records 컴포넌트 | `app/spokedu/components/home-web/field-records.tsx` |
| 홈 자산 | `app/spokedu/components/home-web/home-web-assets.ts` |
| 사례 카탈로그 | `app/spokedu/data/field-records-catalog.ts` |
| Records 페이지 | `app/spokedu/components/records-landing.tsx` |
| 홈 랜딩 순서 | `app/spokedu/components/home-web/home-web-landing.tsx` |
| 브랜드 SSOT | `docs/SPOKEDU_PUBLIC_WEBSITE_SSOT.md` |
| B1 로컬 QA | `docs/design/phase-1b1/final-qa/` |
| 감사 메모 | `SPOKEDU_DESIGN_UX_AUDIT.md` (참고, 단독 SSOT 아님) |
| Phase 1-A HTML | **저장소에 없음** (`docs/design/phase-1a/`) |

## 사례 3건 — 코드·카탈로그 기준

### 1. 동작거점 SPOMOVE (`dongjak-spomove`)

| 항목 | 내용 | 등급 |
|------|------|------|
| 프로그램·장소 | SPOMOVE · 동작거점형 우리동네키움센터 | VERIFIED — `field-records-catalog.ts` |
| 운영 유형 | 정규수업 · 초등 · 에듀테크 | VERIFIED |
| 홈 이미지 | `/images/spokedu/records/dongjak-spomove-field.jpg` | VERIFIED — `home-web-assets.ts` |
| 홈 링크 | `/records/dongjak-spomove` | VERIFIED |
| 온사이트 요약 | composition 3항, outcome(과정·운영 틀) | VERIFIED — catalog `onsite` |
| 블로그 | `224288724087` | VERIFIED — catalog `blogHref` |
| 교육 효과 단정 | 없음(과정·관찰 중심) | — |

### 2. 찾아가는 동행 체육교실 (`donghaeng-special-pe`)

| 항목 | 내용 | 등급 |
|------|------|------|
| 프로그램·장소 | 특수체육 · 찾아가는 동행 체육교실 | VERIFIED — catalog |
| 홈 링크 | 네이버 블로그 `224338186918` | VERIFIED — `home-web-assets.ts` |
| 온사이트 `/records/...` | **없음** (catalog `href` = 블로그) | PARTIAL — 상세는 블로그 의존 |
| records-landing 설명 | 수행 수준별 거리·속도·규칙·촉진 조정 | VERIFIED — `records-landing.tsx` |
| catalog `onsite` | **없음** | UNVERIFIED for onsite blocks |

### 3. 매동 스포츠 스텝업 (`maedong-sports-stepup`)

| 항목 | 내용 | 등급 |
|------|------|------|
| 장소·프로그램 | 매동초 · 스포츠 스텝업 · 6개월 늘봄 | VERIFIED — catalog |
| 종목 나열 | 클라이밍, 피클볼, 플로어볼 등 | VERIFIED — catalog `description` |
| 홈·catalog 링크 | 블로그 `224288711414` | VERIFIED |
| 온사이트 요약 | 없음 | PARTIAL |

## Method 섹션 — 이미지·역할

| Step | 이미지 (코드) | 역할 SSOT | 등급 |
|------|---------------|-----------|------|
| 01 Field | `records/yangcheon-paps.jpg` | PROOF 사진 | VERIFIED — `home-web-assets.ts`, SSOT §09 |
| 02 Content | `subscription/prepare-lesson-plan-...png` | PRODUCT UI | VERIFIED |
| 03 System | `home/field-editorial/home-master-ui.png` | PRODUCT UI | VERIFIED |

**연결 메커니즘(현장→콘텐츠 반영 절차)** 을 설명하는 별도 코드/문서 SSOT: **확인되지 않음** → UNVERIFIED (과정을 창작하지 않음).

## 사진 사용·허가

| 자산 | 검토용 사본 | 공개 사용 승인 |
|------|-------------|----------------|
| `docs/design/phase-1b2a/assets/*` | `public/images/...`에서 **복사본** (원본 미변경) | **미확인** — 시안·QA용; Production 배포 승인 별도 |

초상권·기관명 표기: 코드·카탈로그에 있는 공개명만 사용.

## 공개 문구로 쓸 수 있는 정보

- **VERIFIED:** 카탈로그 `description`, `meta`, `operationType`, `onsite.composition`(동작 SPOMOVE), records-landing FEATURED 설명, SSOT 브랜드 정의 문장
- **PARTIAL:** donghaeng·maedong의 상세(블로그만, onsite 없음)
- **UNVERIFIED:** Field→Content 반영의 구체적 내부 프로세스, 전환·효과 수치, Phase 1-A HTML 픽셀 스펙
