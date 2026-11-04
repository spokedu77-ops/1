# Public Website V2 — Phase 1 조사 및 Phase 2 승인안

작성일: 2026-11-04 (KST). 상태: **CONDITIONAL_GO / LOCAL_IMPLEMENTATION_APPROVED**.

승인 반영: 사용자가 공식 실적 4개를 검증 완료·확정했다. 실적 보류안을 철회하며 `10,000+ — 누적 운영 수업`, `500+ — 출강 학교·기관`, `30+ — 전문 지도자`, `98% — 파트너 기관 재계약률`을 모두 유지한다. 공식 공통 문구는 “연세대학교 체육교육학과 출신의 운영진”, 직함은 최지훈—대표 / 김윤기—운영총괄 / 김구민—수업팀장이다. 아래 코드 조사 이력 중 당시 ‘미확인’이라는 표현은 사용자 확정 실적에 더 이상 적용하지 않는다. 구현·QA는 승인됐으며 Git publishing·운영 DB 변경은 승인되지 않았다.
기준 로컬 HEAD: `225a9111149da052db5fe6728f05df950f98b4a9`.
원격 fetch는 수행하지 않았으므로 원격 최신 여부는 확인하지 않았다.

이 문서는 사용자가 첨부한 MASTER REFACTOR DIRECTIVE V2.0의 조사·원고·디자인 제안서다. 새로운 제품·디자인 SSOT가 아니다. 이번 제출에서는 앱 코드와 기존 계약을 변경하지 않는다. 구현 승인 시 기존 Public 계약을 갱신하며, MASTER 제품 계약·실행 로직은 유지한다.

## 1. 조사 범위와 기준

실제 import, JSX 소비, 공통 chrome, 문의 파라미터 처리, 이미지 원본을 정적으로 확인했다. 기존 `PUBLIC_REFACTOR_AUDIT.md`, `MEDIA_AND_CONTENT_MATRIX.csv`, `docs/design/phase-1b2a/SOURCE_AND_EVIDENCE.md`는 조사 이력으로 참고하되 현재 렌더의 권위로 사용하지 않았다.

작업 시작 시 기존 변경: `app/admin/iiwarmup/assets/page.tsx`, `app/admin/iiwarmup/layout.tsx`, `app/components/admin/assets/`의 기존 파일 6개 및 미추적 `AssetHubUi.module.css`, `app/layout.tsx`. 해당 변경은 사용자 작업으로 보존한다.

### 실제 렌더 및 콘텐츠 원본

| 표면 | 진입 → 렌더 / 콘텐츠 소비 |
|---|---|
| `/` | `app/(spokedu-public)/page.tsx` → `app/spokedu/website/pages/home.tsx` → `website/data/home.ts` (`homeRefinement`) |
| 공개 레이아웃 | `app/(spokedu-public)/layout.tsx` → `WebsiteChrome` → `SiteHeader` / `SiteFooter`; `website/styles/website.css` 로드 |
| 기관·개인·소개·사례·SPOMOVE | route group의 해당 `page.tsx` → `website/pages/{education,private,about,records,spomove}.tsx` |
| 기관 | `website/data/education.ts` + `data/education-hub.ts`; `website/components/content-sections.tsx`가 상세·사례 소비 |
| 개인 | `data/private-page.ts`와 `content-sections.tsx`; 현 페이지에 직접 작성된 문장도 존재 |
| 소개 | `data/about-page.ts` → `components/home-web/home-section03-people.ts`의 이름·사진·자격; `data/about-founder.ts`, `data/about-history.ts` 추가 소비 |
| 사례 | `data/records-page.ts` → `data/field-records-catalog.ts`; 목록 필터와 상세 연결 유지 |
| SPOMOVE | `data/spomove-program-page.ts` + `website/components/SpomoveVisual.tsx` |
| GNB / Footer | `data/site.ts` → `components/site-chrome.tsx`; 경로는 `data/public-routes.ts` |
| LAB 소개 진입 | `app/(spokedu-public)/spokedu-lab/page.tsx` → `subscription/SpokeduLabLanding.tsx` → `CommercialLanding` |
| 문의 | `contact/resolve-contact-inquiry-type.ts` → `contact-page-data.ts`의 유형; 유효 `type` 우선, `proposal=true`는 dispatch, bare URL은 미선택 |

`/spokedu`는 `next.config.ts`에서 `/`로 리다이렉트된다. 레거시 `app/spokedu/page.tsx`도 같은 홈을 export하지만 clean public layout과 레거시 layout은 다르다. 새 작업은 clean 경로를 기준으로 한다.

`home-page.ts`, `home-web-landing.tsx`, `marketing-public-metrics.ts`는 현재 홈 import 체인에 없다. `home-page.ts`는 기존 editorial component 및 resolver 타입에 참조되므로 일괄 삭제하지 않는다. 이번 조사에서 미사용으로 보이는 파일도 전체 소비·테스트 확인 없이 제거하지 않는다.

LAB은 단순 정적 링크가 아니다. 위 진입 코드는 인증·기관 계정·온보딩에 따라 기존 목적지로 이동시키며 소개 보기 예외가 있다. 또한 `next.config.ts`에 LAB→MASTER rewrite가 있다. 이를 변경하거나 파일명만으로 실제 서비스 라우팅을 단정하지 않는다. 렌더 QA 때 비로그인·로그인 handoff를 별도로 확인한다.

### 기존 계약과 V2의 차이

| 기존 문서 / 구현 | V2 승인 대상으로 제시하는 변경 |
|---|---|
| `docs/SPOKEDU_PUBLIC_WEBSITE_SSOT.md`는 소개·개인을 primary에서 제외 | 소개 → 기관 → 개인 → SPOMOVE → 사례, 우측 LAB·문의 |
| 현 `siteNav`는 소개가 마지막 | 소개를 첫 번째로 이동; 기존 라벨·경로 유지 |
| V1 디자인 계약은 `homePage.sectionOrder`를 홈 순서 원본으로 기술 | 현재 실제 홈 데이터·렌더 기준으로 문서 정정; V2 6섹션 채택 |
| 기존 실적 배너와 사례가 분리 | 증빙 지표와 사례를 하나의 섹션으로 통합 |
| 기존 Hero 연출 이미지 허용 규정 | 이번 홈은 실제 현장 사진으로 제한 |
| LAB을 구독 중심으로 설명하는 일부 문서 | 콘텐츠·수업 운영 플랫폼을 정의로 사용; 결제·권한은 코드 계약 유지 |

이번 사용자 지시를 설계의 우선 기준으로 적용했다. 승인 시 새 SSOT 문서를 추가하지 않고 기존 Public SSOT와 V1 디자인 계약의 해당 조항을 V2 범위로 갱신한다.

## 2. 검증된 코드 사실과 미확인 운영 사실

| 항목 | 현재 확인 결과 | 제안 / 필요한 증빙 |
|---|---|---|
| 수업 수 | 사용자가 검증 완료한 `10,000+ — 누적 운영 수업` | 확정 적용. 병행 `2,500+`는 공식 지표에서 제외 |
| 기관 수 | 사용자가 검증 완료한 `500+ — 출강 학교·기관` | 확정 적용. 임의 집계 기간·기준일 추가 없음 |
| 지도자 수 | 사용자가 검증 완료한 `30+ — 전문 지도자` | 확정 적용. ‘본사 직영 관리’로 변환하지 않음 |
| 재계약률 | 사용자가 검증 완료한 `98% — 파트너 기관 재계약률` | 확정 적용. 재검증 대기로 취급하지 않음 |
| 운영진 | 사용자가 최지훈—대표 / 김윤기—운영총괄 / 김구민—수업팀장 확정 | 공식 소개 “연세대학교 체육교육학과 출신의 운영진” 적용. 개별 자격 보존 |
| 학력·자격 | people 파일과 founder 파일에 텍스트 존재; 대표 소개는 PDF p.3 주석만 존재 | 최신 공식 이력서·증명 원본은 이번 조사에서 확보하지 못함. 코드 문구를 증빙으로 승격하지 않음 |
| 16가지 움직임 성향 | 현재 홈 showcase와 개인 서비스에 관련 표현 존재 | 개인 페이지 기능·Move Report 관계를 별도 추적하기 전 삭제·확대하지 않음. 홈 경쟁력 재구성은 개인 기능 제거와 분리 |
| THINK / DECIDE | 활성 `SpomoveVisual.tsx`는 THINK. `spomove-program-page.ts` 및 catalog 소개는 DECIDE | 홈·공개 설명은 THINK로 통일 제안. catalog 소개의 안내 문장만 정합성 검토; 실행 UI·콘텐츠 분류는 변경하지 않음 |
| SPOMOVE 대표 H1 | ‘움직임에 반응하는 시지각 놀이체육’ | 센서 반응으로 오해될 수 있어 ‘화면을 보고 판단하고 움직이는 체육활동’으로 수정 제안 |

운영 원장·최신 공식 이력서·인물 게시 동의 원본은 미확보다. 연결된 외부 계정의 문서나 운영 DB를 이번 조사에서 열람하지 않았다. 자료가 없다는 단정이 아니라 **이번 조사에서 검증하지 못했다**는 의미다.

실적 처리 확정: 네 공식 실적을 모두 유지하고 실제 학교·키움센터·복지관 등 수업 사례와 05 섹션 안에서 연결한다. 실적 보류안은 철회했다. `2,500+`는 현재 공식 수치로 사용하지 않으며, ‘본사 직영 관리’로 확대하는 렌더 변환을 제거한다. 승인일을 임의의 집계 기간으로 표기하지 않는다.

## 3. GNB 및 전체 흐름 승인안

로고 `/` → 소개 `/about` → 기관·학교 `/education` → 개인·소그룹 `/private` → SPOMOVE `/spomove` → 수업사례 `/records` → 별도 outline LAB `/spokedu-lab` → filled 문의 `/contact`.

모바일도 같은 순서로 노출한다. `/spomove/catalog`, `/spomat`, `/partners`는 Footer·관련 문맥 링크에 유지한다. 현 desktop nav는 xl부터 노출하므로 1024px에서는 모바일 메뉴를 유지한다. LAB·문의는 태블릿 헤더 보조 액션으로 유지하되 375px에서는 메뉴 안에 제공한다. 활성 표시는 링크 자체의 `aria-current=page`와 시각 상태를 맞춘다. 현 desktop은 자식 span에만 aria-current가 있고 mobile 단일 링크는 aria-current가 없으므로 보완 대상으로 삼는다.

홈 DOM은 아래 6개 최상위 섹션으로 구성한다. Hero와 Quick Entry는 동일 01 섹션 안의 두 영역이다. 기존 지그재그 3개는 02 안의 article로 유지한다.

## 4. 메인 전체 원고 제안

### 01 — Brand Hero & Quick Entry

Eyebrow: **SPOKEDU · 아동·청소년 체육교육**

H1 (확정 문구 유지):

> 아이와 현장의 조건에 맞춰  
> 움직이고 싶게 만드는  
> 체육수업을 설계합니다.

본문: 학교·기관과 개인·소그룹 체육수업을 직접 설계하고 운영합니다. 현장의 경험을 교육 콘텐츠와 지도자용 수업 도구로 확장합니다.

Hero CTA: **기관·학교 수업 살펴보기** `/education` · **개인·소그룹 수업 살펴보기** `/private`.

사진 캡션: **지도자와 아이가 함께하는 체육수업**. 학교명을 명시하려면 장소 매핑을 추가 확인한다.

신뢰 요소: **연세대학교 체육교육학과 출신의 운영진 / 학교·기관·개인 맞춤형 교육 / 자체 디지털 프로그램 SPOMOVE**. 개별 학력·자격은 기존 개인별 정보를 보존한다. ‘대학 연구진’으로 확장하지 않는다.

Quick Entry H2: **어떤 수업을 찾고 계신가요?**

| 카드 H3 | 본문 | CTA |
|---|---|---|
| 기관·학교 수업 | 학교 및 기관의 교육환경과 운영 목적에 맞춘 체육 프로그램 | 기관수업 살펴보기 → `/education` |
| 개인·소그룹 수업 | 아이의 현재 수준과 목표에 맞춰 설계하는 체육수업 | 개인수업 살펴보기 → `/private` |
| SPOKEDU LAB | 체육 지도자를 위한 디지털 콘텐츠·수업 운영 플랫폼 | LAB 살펴보기 → `/spokedu-lab` |

### 02 — Why SPOKEDU

H2: **현장에서 설계하고, 운영하며, 발전시킵니다.**

도입: 아이의 참여와 실제 수업 환경을 기준으로 교육을 설계합니다.

**01 / EDUCATION DESIGN — 아이와 현장의 조건에 맞춘 체육교육 설계**

아이의 발달 수준과 운동 수행 능력, 교육 목적을 고려해 활동을 설계합니다. 수업 인원과 공간, 사용할 수 있는 교구에 따라 지도 방법과 과제의 난이도를 조정합니다.

링크: **수업 설계와 운영 방식 보기** `/education`.

**02 / FIELD EXECUTION — 다양한 교육환경에서 축적한 현장 운영 경험**

학교와 키움센터, 복지관 등 다양한 환경에서 체육교육을 운영합니다. 일반 아동뿐 아니라 특수교육 대상과 느린학습자의 참여 수준을 고려해 수업을 구성합니다.

링크: **실제 운영 사례 보기** `/records`.

**03 / CONTENT & TECHNOLOGY — 현장 경험을 교육 콘텐츠와 디지털 도구로 확장**

현장에서 활용하는 프로그램을 커리큘럼으로 체계화합니다. SPOMOVE와 SPOKEDU LAB을 통해 교육 콘텐츠와 수업 운영 도구를 개발하고 활용합니다.

링크: **콘텐츠와 운영 도구 살펴보기** `/spokedu-lab`.

### 03 — Our Education System

H2: **교육 목적에 따라 구성하는 4MOVE**

본문: 4MOVE는 SPOKEDU의 자체 교육 프로그램 체계입니다. 참여자의 연령과 현재 수행 수준, 수업 목적과 환경에 맞춰 활동을 구성합니다.

| H3 | 설명 |
|---|---|
| BASEMOVE | 기본 움직임기술과 신체기능 중심 활동 |
| SPORTSMOVE | 스포츠 종목과 조작운동기술 중심 활동 |
| PLAYMOVE | 놀이·규칙·협동을 활용하는 신체활동 |
| SPOMOVE | 시각정보·인지·운동 수행을 연결하는 활동 |

보조 제목: **대상과 현장에 맞춰 적용합니다.**

활용 범위: 유아·초등·청소년 / 개인·소그룹 / 학교·교육기관 / 특수·느린학습자 / 가족 참여형 프로그램 / 원데이·캠프·체험행사.

보조 문장: 운영 형태와 교육 목적에 따라 활동의 구성과 적용 방식을 조정합니다.

CTA: **기관 프로그램 살펴보기** `/education`.

4MOVE는 V2 지시서가 제공한 체계다. 기존 개별 프로그램 목록을 4MOVE 네 항목으로 덮어쓰거나 모든 프로그램을 강제로 분류하지 않는다.

### 04 — SPOMOVE Experience

H2: **화면을 보고 판단하고 움직이는 체육활동**

본문: SPOMOVE는 화면에 제시되는 시각적 신호와 과제를 보고, 아이가 인지하고 선택한 뒤 실제 신체 움직임으로 반응하는 프로그램입니다.

| 단계 | 본문 |
|---|---|
| SEE · 시각정보 인지 | 화면의 색상·그림·규칙 등 시각정보를 인지합니다. |
| THINK · 규칙 이해·반응 선택 | 제시된 정보를 이해하고 과제의 조건에 따라 반응을 선택합니다. |
| MOVE · 신체 움직임 수행 | 선택한 반응을 신체 움직임으로 수행합니다. |

현장 사진 캡션: **화면의 과제를 확인하고 움직임으로 반응하는 수업**.
실행 화면 캡션: **SPOMOVE 실행 화면 · [확인된 과제명]** — 대괄호는 편집용이며 실제 과제 식별 후 확정하고 공개하지 않는다.

보조 제목: **활동에 따라 활용하는 4색 매트, SPOMAT**

본문: SPOMAT은 SPOMOVE 수행에 활용하는 물리적 4색 매트입니다. 과제에 따라 사용할 수 있으며, 모든 SPOMOVE 활동에 필요한 것은 아닙니다. 전자 센서나 압력 감지 기능은 없습니다.

CTA: **SPOMOVE 자세히 보기** `/spomove` · **SPOMAT 알아보기** `/spomat`.

LAB 안내: **지도자용 콘텐츠와 수업 운영 도구는 SPOKEDU LAB에서 확인하세요.** `/spokedu-lab`. 전체 콘텐츠 무제한 실행·무료·자동 분석을 약속하지 않는다.

### 05 — Proven in the Field

H2: **현장에서 운영한 수업 사례**

본문: 학교와 지역 교육기관, 가족이 함께하는 행사에서 현장의 조건에 맞춰 수업을 운영합니다. 대상과 운영 형태, 실제 활동을 사례로 확인해 보세요.

사용자가 검증 완료한 공식 실적 4개를 모두 같은 섹션 안에 표시하고 실제 수업 사진·사례 설명과 연결한다. 독립 숫자 띠 배너를 만들지 않으며, 승인받지 않은 기준일·집계 범위·사업 해석을 추가하지 않는다.

대표 사례 후보: **매동초등학교 스포츠 스텝업** (`maedong-sports-stepup`, 학교) / **동작거점형 우리동네키움센터 SPOMOVE** (`dongjak-spomove`, 지역 교육기관) / **서대문 어린이날 체험부스** (`seodaemun-event-booth`, 가족·행사).

각 카드 제목·대상·운영 형태·프로그램·사진·상세 링크는 `FIELD_RECORD_CATALOG`에서 파생한다. 위 표제는 편집 방향이며 실제 공개 명칭은 catalog 값과 증빙을 대조해 확정한다. 현재 홈의 양천 사례를 다른 범주 사례로 교체하는 안이며 양천 사례 자체는 목록·상세에 보존한다. 성과를 새로 만들지 않는다.

카드 CTA: catalog의 기존 `href`·`ctaLabel`을 사용한다. 내부 상세를 가진 사례는 `/records/{slug}`, 매동 사례는 현재의 블로그 후기 링크를 보존한다. 모든 slug에 내부 상세가 있다고 가정하지 않는다.
섹션 CTA: **수업사례 전체 보기** `/records`.

### 06 — Contact & Next Step

H2: **우리 현장과 아이에게 맞는 수업을 함께 찾습니다.**

본문: 대상 연령, 인원, 공간과 운영 목적을 알려주세요. 조건을 확인한 뒤 적합한 수업 형태를 안내합니다.

기관·학교 담당자: **우리 기관에 맞는 체육수업 상담하기** `/contact?type=dispatch`.
학부모: **아이에게 맞는 수업 상담하기** `/contact?type=private`.

보조 링크: **SPOMOVE 도입 상담** `/contact?type=spomove` · **지도자용 SPOKEDU LAB 살펴보기** `/spokedu-lab`.

기존 문의 유형, `program` 등 보조 파라미터, 폼 제출·임시 저장·실패 처리 및 인증 리다이렉트는 유지한다.

## 5. 디자인·반응형 설계

새 팔레트를 만들지 않는다. 현재 clean website의 Pretendard, 본문 `#434655`, 제목 `#131b2e`, action `#2563eb`, white 및 기존 pale surface를 재사용한다. `tokens.json`, `website.css`, header chrome의 서로 다른 기존 값은 이번 범위의 역할을 매핑해 사용하며 전역 MASTER 토큰을 수정하지 않는다.

| 역할 | 제안 규격 / 기존 근거 |
|---|---|
| 콘텐츠 rail | 현 `.web-container` 최대 1184px, 좌우 24px. 375px에서도 본문 폭 확보 |
| 세로 리듬 | 데스크톱 섹션 96px, 모바일 64px 제안. 기존 96px 스케일 활용 |
| 타이포 | 현 H1 30–56px, H2 26–36px, 본문 16px/약 1.7, lead 18px; 긴 본문 최대 약 720px |
| 버튼 | 현 높이 최소 52px / pill 재사용. 메뉴 touch 최소 44px; 긴 CTA는 높이를 늘려 수용 |
| 카드·이미지 | 현 24px 카드 반경, 사진 24–28px 중 공통 역할 정리; 얇은 border·약한 shadow |
| 모션·포커스 | 현 180ms 중심, fine pointer hover, reduced-motion 유지; keyboard focus 링 명시 |
| SPOMOVE | 04만 `#0B0F17`; 4색은 SPOMAT·신호 설명에만 사용. 실제 기존 매트 색 원본을 확인한 뒤 토큰 재사용 |

| 화면 | 배치 |
|---|---|
| 375px | Hero 문구→사진→Quick Entry 세로. 경쟁력 텍스트→사진, 4MOVE 1열, 사례·상담 1열. 사진 속 인물 위 텍스트 없음 |
| 768px | Quick Entry 2열+마지막 카드 동일 폭, 4MOVE 2열, 사례 2열. 지그재그는 텍스트·사진 세로 순서 유지 |
| 1024px | Quick Entry·사례 3열, 경쟁력 좌우 교차, 4MOVE 4열. GNB는 현 xl 전환 전이므로 메뉴 버튼 유지 |
| 1440 / 1920px | 1184px rail 중심, 01 넓은 사진+간결한 문구, 경쟁력 일관된 2열 교차. 텍스트 크기·사진을 화면 폭만큼 무한 확대하지 않음 |

Quick Entry는 같은 이미지 프레임(우선 4:3), 본문 시작선·CTA 구조를 공유한다. LAB은 실제 UI라서 contain과 같은 배경을 사용해 전체 화면이 보이게 하며 사진 카드와 높이를 맞춘다. 발·교구가 잘리는 이미지는 억지 cover 대신 contain 또는 원본 비율을 사용한다. 지그재그 사진은 4:3을 기본 후보로 하되 개인 세로 원본과 SPOMOVE 전체 장면은 예외를 명시한다.

승인 후 구현 전 로컬 변경 전 캡처를 남기고, 구현 후 같은 viewport·동일 데이터로 비교한다. 현재 문서는 레이아웃 설계이며 렌더된 디자인 시안이나 visual PASS가 아니다.

## 6. 이미지 검토와 배치안

로컬 `view_image`로 Hero(2400×1800), 개인 지도(900×1200), `edu-03.webp`(1280×960) 원본을 직접 열었다. 파일명이나 `verified=true`만으로 권리·진위를 확정하지 않았다. `images.ts`는 production 기본값에서 verified를 자동 부여하므로 이것을 촬영·게시 동의 증빙으로 쓰지 않는다.

| 위치 | 후보 / 상태 | 매칭·크롭 원칙 |
|---|---|---|
| Hero | `/images/spokedu/home/field-editorial/home-hero-field.webp` — 원본 확인 | 지도자·아동·천과 공을 활용한 활동. 인물·발이 하단에 있으므로 4:3 원본 유지 우선; 과도한 상하 crop 금지. 게시 권한 미확인 |
| Quick 기관 | `records/maedong-sports-stepup.jpg` 후보 | 기관·프로그램 매핑과 원본 확인 후 확정; Hero 재사용 최소화 |
| Quick 개인 | `/images/spokedu/private/private-coaching.jpg` — 원본 확인 | 야외 사다리 활동. 4:3 중앙 크롭 시 발·사다리 위치를 기준으로 검토; 배경 하늘 중심 크롭 금지 |
| Quick LAB / Why 03 | `subscription/library-program-cards-20261008-final.png`, `prepare-class-tools.png` 후보 | 기존 실제 UI 자료와 현행 제품 상태 대조 후 서로 다른 장면 사용. 개인·기관 수업 실사로 표현하지 않음 |
| Why 01 | 로컬 기관 지도 원본 중 과제 설명 장면 선정 | Hero·개인 카드 중복 사용 대신 동작·지도 목적이 맞는 원본 필요; 현재 최종 미선정 |
| Why 02 | `records/donghaeng-special-pe-field.jpg` 후보 | 특수·포용 사례 원본·게시 허용 확인 후 매칭. 사진만 보고 참여자의 진단을 추정하지 않음 |
| SPOMOVE 현장 | `/spokedu/programs/spomove/assets/edu/edu-03.webp` — 원본 확인 | 지도자·아동·프로젝션·매트가 함께 보임. 전체 장면 4:3 우선. 사진 속 프로그램의 정확한 과제 ID는 추가 확인 |
| SPOMOVE 실행 | 실제 공개 가능 과제 화면 별도 확보 | 위 수업 사진에서 화면만 잘라 정확한 실행 UI 증거로 간주하지 않음. 단순/선택/복합/DIVE 중 실제 과제 식별 후 화면 선정 |
| SPOMAT | `/images/spokedu/spomat-layout.png` 후보 | contain, 색 배치·제품 전체 형태 보존 |
| 사례 | catalog의 해당 slug 원본 | 기존 홈의 임의 thumbnail override는 증빙 매칭 뒤 제거·정리 제안 |
| 운영진 | 기존 people 사진 | 최신 초상 사용 허용과 프로필 대조 전 교체하지 않음 |

출처 충돌: `public/images/spokedu/SOURCES.internal.md`는 `private-coaching.jpg`, `dispatch-group-class.jpg`를 Pexels 자료로 기록한다. 현재 열어 본 private 파일은 야외 개인 지도 장면이며 코드 설명과 시각적으로 맞지만, 덮어쓰기·출처 갱신 여부는 확정하지 못했다. 원본 생성·교체 기록과 촬영 동의를 확인한 뒤 실제 SPOKEDU 증거 사진으로 사용할지 결정한다.

활성 website 코드의 중복 참조 예: `dispatch-group-class.jpg`는 기관 페이지 2곳·소개·개인·기관 프로그램 카드, `private-coaching.jpg`는 개인 3곳·소개·홈 showcase, `home-hero-field.webp`는 홈·소개·기관 프로그램 카드, 복지관 사진은 홈·기관 카드·개인에서 사용한다. 이는 정적 참조 조사이며 화면별 실제 노출 횟수 판정은 로컬 QA로 확인한다. 새 파일을 임의 생성하거나 검증 없이 대량 교체하지 않는다.

## 7. 서브페이지 정합성 변경안 및 SSOT 소유권

| 표면 / 데이터 | 승인 후 변경 / 보존 |
|---|---|
| `/about` | 후보 직함 통일, 개인별 검증된 학력·자격만 노출. ‘연구진’ 오인 표현·공통 정의 확인. 연혁·상세 소개·현 기능 보존 |
| `/education` | 4MOVE 소개와 기존 종목·운영 상품의 역할 구분; SPOMOVE 카드 이미지 주제 불일치 점검. 기관별 운영·FAQ·폼과 문의 파라미터 유지 |
| `/private` | 현재 수준·목표·지도 조정 중심 정의 동기화. 16유형/Move Report 기능은 관계 검증 전 보존 |
| `/spomove` | 앞의 H1 수정, THINK 흐름·물리적 매트·일부 과제 사용 범위 명확화. 센서·효과 보장 오인 제거 |
| `/records` | catalog에서 사례 정보 파생; 실제 기관·대상·운영 내용과 사진 연결. 필터·상세 slug·외부 근거 링크 보존 |
| `/spokedu-lab` | 이번에는 홈·공통 설명과 LAB 진입부 원고의 충돌 조사까지만. MASTER 소스 수정이 필요하면 해당 제품 계약·범위를 추가 확인하고 별도 승인 대상으로 분리 |
| `brand.ts` | 회사 기본정보 기존 소유권 유지 |
| `site.ts` / `public-routes.ts` / `commercial-routes.ts` | GNB·경로·문의 CTA의 기존 소유권 유지; URL 문자열의 독립 복제 최소화 |
| `website/data/home.ts` | 홈 6섹션의 표시 원고·순서·이미지 역할. 지표의 새로운 사실 원본으로 쓰지 않음 |
| `about-page.ts` / people / founder | 기존 about 도메인 안에 승인된 프로필 원본을 두고 소비처가 파생하도록 정리. 전체 레거시 삭제는 제외 |
| 실적 | 기존 `marketing-public-metrics.ts`를 증빙·기준일·집계 범위를 가진 공개 지표 원본으로 정비하는 안. 승인된 값만 홈이 소비하며 position/index별 의미 변환 제거 |
| 프로그램 공통 정의 | `program-system-items.ts`는 기존 프로그램 목록 역할 보존. 4MOVE 공통 정의를 별도 개념으로 모델링하고 SPOMOVE 공개 정의는 기존 도메인 데이터에서 공유; 분류·runtime enum 변경 금지 |
| `images.ts` | 이미지 주소·용도·크롭 메타 소유. 촬영·인물 게시 동의는 근거 기록을 연결하고 자동 verified와 구분 |

예상 수정 파일: `data/site.ts`, `website/pages/home.tsx`, `website/data/home.ts`, `website/styles/website.css`, 필요 시 `website/styles/home-spomove.css`, `website/components/SpomoveVisual.tsx`, `components/site-chrome.tsx`, `data/marketing-public-metrics.ts`, 프로필 데이터 및 위 표의 충돌이 확인된 공개 페이지·데이터, 기존 Public 계약 2개. 공통 CSS 변경은 관련 공개 페이지 모두 비교한다. MASTER·관리자·API·DB·결제·권한·인증·세션은 범위 밖이다.

## 8. 구현 후 검증 계획과 승인 항목

이번 단계 실행: 파일·참조·원본 이미지 검토만 수행. npm/npx·테스트·TypeScript·ESLint·build·서버 시작·배포·git stage/commit/push는 실행하지 않았다.

구현 승인 후 필요한 검증안: 관련 nav·contact intent·record·공개 정의 contract test, 변경 파일 lint, TypeScript 및 production build. 기존 테스트가 구 정보구조를 고정하면 승인된 제품 의미에 맞춰 수정하고 기능 보존을 검증한다. 로컬 서버는 저장소 규칙의 `npm run dev:local`로 시작한다.

로컬 rendered QA: 375 / 768 / 1024 / 1440 / 1920px, 홈 6섹션 전체·GNB 열림/닫힘·대표 서브페이지·문의 유형·로그인 상태별 LAB handoff. 폰트와 이미지 완료 후 캡처, 원본 대비 얼굴·손·발·교구·스크린 확인, 키보드·Escape·포커스 복귀·활성 링크·overflow·대비·저속 네트워크 CLS 확인. 기존 계약 추가 폭은 필요한 경계에서 보완한다. 실제 문의 제출은 운영 데이터를 만들지 않는 검증 환경에서 수행한다. Production 이미지 반복 캡처는 하지 않는다.

최종 산출물: 변경 파일 목록, 전후 원고표, 전후 이미지 매칭표, 메인·GNB desktop/mobile 캡처, 서브페이지 정합성, 근거 확인표, 실행한 검증 결과와 잔여 이슈. 렌더 검증 전 visual PASS를 선언하지 않는다.

**승인된 범위:** 본 문서의 GNB 순서, 6섹션 원고·배치·토큰 재사용, 공식 실적 4개 유지, 공식 운영진 문구·직함, 이미지 매칭, Public SSOT 갱신 및 필요한 공개 서브페이지 정합성 수정, 위 로컬 검증. 사용자 확정 실적을 다시 검증 대기로 두지 않는다. 개별 이력·이미지 출처에 대한 추가 추측은 하지 않는다. 구현 승인은 commit·push·deploy 권한을 포함하지 않는다.

첨부 지시서의 Phase 3 사전 승인 조건은 사용자의 조건부 승인으로 충족됐다. 추가 승인 질문 없이 로컬 구현·QA를 진행하며 Production 배포는 하지 않는다.
