# Phase 1-B3A — Source of Truth

**HEAD:** `a050b1e6aa32fc3d5af07941c1d33145be1bc1ae`  
**BUILD_ID (로컬 QA):** `CRXHj0T0tTWJPlpW8Zhml`  
**QA 서버:** `http://127.0.0.1:3002/` (CSS `--navy` computed 확인, B2B rendering-qa 절차 준수)

## 분석한 소스코드

| 영역 | 파일 |
|---|---|
| 홈 SPOMOVE | `app/spokedu/components/home-web/spomove-stage.tsx` |
| 홈 LAB | `app/spokedu/components/home-web/master-stage.tsx` |
| 에셋 | `app/spokedu/components/home-web/home-web-assets.ts` |
| 스타일 | `app/spokedu/components/home-web/home-web.module.css` (`.split`, `.productFrame`, 모바일 230% crop) |
| CTA | `app/spokedu/data/public-routes.ts` → `spomove: /spomove`, `subscription: /spokedu-lab` |
| SPOMOVE 공개 | `app/spokedu/data/spomove-program-page.ts`, `app/spokedu/programs/spomove/page.tsx` |
| LAB 공개 | `app/(spokedu-public)/spokedu-lab/page.tsx` → `CommercialLanding` |
| 권한 | `app/spokedu-master/lib/productCatalog.ts`, `subscription.ts`, `SubscriptionGateWall.tsx` |
| 공개 요금 | `app/spokedu/data/public-product-contract.ts` → `publicProductContract.ts` |

## SPOMOVE — 기능·구조 (검증)

| 주장 | 출처 | 상태 |
|---|---|---|
| SEE·DECIDE·MOVE 3단계 공개 설명 | `spomove-program-page.ts` `flow.steps` | 코드 일치 |
| ADAPT는 별도 variation 섹션(조절·난이도) | 동 파일 `variation` eyebrow `ADAPT` | 코드 일치 — 홈 3단계에 **미포함** ≠ 오류 |
| 단순·선택·복합 반응 구분 | `spomove-program-page.ts` `content.levels` | 코드 일치 |
| 공개 SPOMOVE 카탈로그 72종 (hold 제외) | `officialLibraryExpansion.test.ts` | 테스트 계약 |
| 홈 CTA → `/spomove` | `spomove-stage.tsx` | 코드 일치 |
| 홈 이미지 | `HOME_SPOMOVE_VISUAL` → `/images/spokedu/dispatch/dispatch-group-class.jpg` | 코드 일치 |

## SPOKEDU LAB — 기능·권한 (검증)

| 플랜 | Library | Class tools | Attendance | Records | SPOMOVE |
|---|---|---|---|---|---|
| Free | false* | 3종 | false | false | false |
| Lite (active) | true | true | true | true | false |
| Premium (active) | true | true | true | true | true |

\*Free: `SubscriptionGateWall` — 목록 탐색·주간 무료 1개 미리보기 등 제한적; `curriculum-page.ts` FAQ·PD-019와 정합.

| 주장 | 출처 | 상태 |
|---|---|---|
| 홈 CTA → `/spokedu-lab` | `master-stage.tsx` | 코드 일치 |
| 비로그인: 상품 소개 랜딩 | `spokedu-lab/page.tsx` + `CommercialLanding` | 코드 일치 |
| 로그인: dashboard/onboarding 리다이렉트 | `subscription/page.tsx` `redirectAuthenticatedVisitor` | 코드 일치 |
| 홈 UI 이미지 | `library-program-cards-20261008-final.png` — **라이브러리 탐색 UI** | 코드·alt 일치 |
| 모바일 crop 230% / left -34% | `home-web.module.css` `@media (max-width:767px)` `.productFrame img` | 코드 일치 |

## `144+` 수치

| 항목 | 결과 |
|---|---|
| 저장소 내 프로그램 **개수 SSOT** | **NOT_VERIFIED** — `144+`는 `master-stage.tsx`에만 존재, 카탈로그 count API·테스트 미연결 |
| `docs/programs-144-template.csv` | 템플릿 파일 존재 — **현재 라이브 카운트 증명 아님** |

B3B 구현 전 **DB/프로그램 게이트웨이 집계로 재검증** 필요. 미검증 시 홈에 수치 유지·제거·대체는 Product Decision.

## CTA 경로

| CTA | href | 로그아웃 | 로그인 |
|---|---|---|---|
| SPOMOVE 자세히 보기 | `/spomove` | `SpomoveProgramLanding` | 동일 |
| SPOKEDU LAB 알아보기 | `/spokedu-lab` | `CommercialLanding` | dashboard/onboarding (view 쿼리 없을 때) |

## 이미지 출처

| 파일 | 역할 | PROOF/PRODUCT |
|---|---|---|
| `dispatch-group-class.jpg` | SPOMOVE 홈 | PROOF (현장) |
| `library-program-cards-20261008-final.png` | LAB 홈 | PRODUCT (라이브러리 UI) |
| `prepare-lesson-plan-20261008-final.png` | B3A 시안 보조 | PRODUCT (가이드 UI) |

## 확인되지 않은 내용

- `144+`와 실제 등록 프로그램 수 일치 여부
- 홈 SPOMOVE 사진과 `/spomove` 랜딩 DIVE 장면의 동일 수업 여부 (과거 `home-page.ts`는 동일 수업 주석, 현재 홈-web 에셋은 dispatch-group-class)
- `/spomove/catalog` UX 결함 (별도 이슈, B3A 범위 밖)
- 아동 초상권·공개 승인 문서 (법무 확인 NOT_VERIFIED)
