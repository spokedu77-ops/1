# ACTIVE_PAGE_MAP — 공개 홈페이지 활성 렌더링

**기록 시각:** 2026-10-18 (로컬 작업 트리)

| 항목 | 값 |
|------|-----|
| 브랜치 | `spokedu-security-audit-20261018` |
| HEAD | `e7abff47cf7fcd9260d90d3ba8a44bc589be9c40` |
| origin/main | `3c770fd700f4a4f6bbcb741a367bbfc573a29675` |
| 공통 chrome | `app/spokedu/components/site-chrome.tsx` + `landing-page-root.tsx` (일부 페이지) |

Clean public URL은 `app/(spokedu-public)/**` → `app/spokedu/**` re-export. **고객 URL 기준으로 매핑.**

| 공개 URL | page.tsx (canonical) | 렌더 루트 | 데이터 SSOT |
|----------|-------------------|-----------|-------------|
| `/` | `app/(spokedu-public)/page.tsx` → `app/spokedu/page.tsx` | `home-landing.tsx` → **`home-web/home-web-landing.tsx`** (7섹션) | `home-web-assets.ts`, `home-build.ts` · `home-page.ts`는 proofCards prop만 (현재 **void**) |
| `/education` | `app/(spokedu-public)/education/page.tsx` | **`education-hub-landing.tsx`** | `education-hub.ts`, `education-hub.module.css` |
| `/private` | `app/(spokedu-public)/private/page.tsx` | **`private-landing.tsx`**, `#apply` → `private-apply-form.tsx` | `private-page.ts` |
| `/spomove` | `app/(spokedu-public)/spomove/page.tsx` | **`spomove-program-landing.tsx`** + **`spomove-catalog-tabs.tsx`** (tab) | `spomove-program-page.ts` |
| `/spomove/catalog` | `app/(spokedu-public)/spomove/catalog/page.tsx` | **`spomove-public-catalog.tsx`** | `spomove-public-catalog-page.ts`, `home-media.ts` |
| `/spokedu-lab` | `app/(spokedu-public)/spokedu-lab/page.tsx` | **`CommercialLanding.tsx`** (`subscription/page.tsx` 래퍼) | `publicProductContract.ts` (가격·권한 코드 SSOT, UI만 리팩터 범위) |
| `/records` | `app/(spokedu-public)/records/page.tsx` | **`records-landing.tsx`** | `field-records-catalog.ts` |
| `/records/[slug]` | `app/(spokedu-public)/records/[slug]/page.tsx` | records detail route | catalog + slug pages |
| `/about` | `app/(spokedu-public)/about/page.tsx` | **`about-landing.tsx`** | `about-page.ts` |
| `/spomat` | `app/(spokedu-public)/spomat/page.tsx` | **`spomat-landing.tsx`** | `spomat-page.ts` |
| `/partners` | `app/(spokedu-public)/partners/page.tsx` | **`partners-landing.tsx`** | `partners-page.ts` |
| `/contact` | `app/(spokedu-public)/contact/page.tsx` | **`contact-form-shell.tsx`** + contact modules | `contact-page-data.ts` |
| `/consult` | `app/consult/page.tsx` (별도 레이아웃) | inline form + Kakao share | `/api/consult` (**이번 범위: UI 문구만**) |

## 비활성·착각 금지

| 경로/파일 | 상태 |
|-----------|------|
| `home/home-editorial-landing.tsx` | **미연결** — `/` 에서 import 없음 |
| `home-page.ts` cases | Hero web-first lock으로 **화면 미사용** |
| `subscription-v17/**` | 삭제됨 |
| `/spokedu/*` prefix | 레거시 redirect — 신규 href 생성 금지 |

## WIP 격리 (본 리팩터 diff에 포함하지 않음)

감audit 시정·mileage·inventory 등 다른 작업 트리 변경은 `git status`로 별도 확인. 본 문서는 **공개 마�eting surface** 추적 전용.
