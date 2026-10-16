# SPOKEDU PUBLIC AUDIT

**지시서:** 2026-10-15 FINAL · **2차·3차** 반영  
**모드:** 3차 — **조사만**（ISSUE-02B · ISSUE-10）; 코드·배포·env 변경 **없음**  
**갱신:** 2026-10-15（KST）

---

## 1. Production 기준선

| 항목 | 값 |
|---|---|
| **Production SHA（조사 시점 `origin/main`）** | `c69d92407c7f4ceb0080311243a3d51990eb4025`（ISSUE-01·02·09 배포 반영） |
| **이전 Production** | `c9bca3054e594f201eb536137e16c2757472e649` |
| Deployment ID（2차 기록） | `dpl_8P2Y7ernboXUJcQxNwGgn2qvoc3o` — **3차 시점 Vercel ID 미재조회** |
| **로컬 HEAD（수정 전 기준）** | `0bce969313258e06088b822eaf7b84bc7005ae94` |
| **origin/main（fetch 후）** | `c9bca3054e594f201eb536137e16c2757472e649`（= Production） |
| **로컬 vs Production** | 1차 감사 시점 로컬은 origin보다 **1커밋 뒤**였음; **이미지·카탈로그·푸터 결함은 Production 커밋 `c9bca305`에서도 동일**（아래 대조） |

### Production 커밋 대조（수정 대상）

| 파일 | Production `c9bca305` | 결함 |
|---|---|---|
| `home-web-assets.ts` | `prepare-lesson-plan.png`, `library-program-cards.png` | public에는 `*-20261008-final.png`만 존재 → **404** |
| `catalog/page.tsx` | fallback에 `SPOMOVE_NOTION_CATALOG_URL` `<code>` 노출 | UX 결함 |
| `site-chrome.tsx` | 「MASTER 이용약관」 | 브랜드 copy |

**운영 배포 전 주의:** 아래 QA는 **로컬 `next build` + `next start :3001`** 기준이며, **Production 반영 후**에만 `spokedu.kr`에서 동일하게 보장된다.

---

## 2. 승인 수정（ISSUE-01 · 02 · 09）

### 변경 파일

| 파일 | 변경 |
|---|---|
| `app/spokedu/components/home-web/home-web-assets.ts` | 이미지 `src` **2곳** → `*-20261008-final.png` |
| `app/spokedu/programs/spomove/catalog/page.tsx` | 내부 env 이름 UI 제거; 사용자용 실패 안내 문구로 교체（`<code>{ENV_NAME}</code>` 삭제） |
| `app/spokedu/components/site-chrome.tsx` | 푸터 「SPOKEDU LAB 이용약관」（href `/spokedu-lab/terms` **유지**） |

`git diff` 범위: 위 3파일만（+5 / −9 lines net）.

### ISSUE-02 — 오류 원인（별도, env/데이터 미변경）

| 구분 | 내용 |
|---|---|
| **Production 관찰（1차）** | `SPOMOVE_NOTION_CATALOG_URL` 미설정 → iframe 없음, fallback UI |
| **코드** | `getCatalogUrl()` → env trim/URL parse 실패 시 fallback（의도된 분기） |
| **2차 코드 변경** | env·Notion·권한 **미변경**; 고객 화면의 **설정 키 이름 노출만 제거** |
| **복구** | Vercel Production env 설정 등 **ops 승인** 필요（`DECISION_REQUIRED`） |

---

## 3. ISSUE-01 · 02 · 09 — 실제 검증（E）

### ISSUE-01 홈 이미지

| 단계 | 결과 | 증거 |
|---|---|---|
| 수정 전（Production） | `prepare-lesson-plan.png`, `library-program-cards.png` **404** | 1차 HEAD + Playwright |
| 수정 후（로컬 prod server） | final 경로 **200** | `HEAD http://localhost:3001/images/...final.png` |
| HTML | prerender HTML에 `prepare-lesson-plan-20261008-final` 참조 | `GET /` 본문 검색 |
| 1440 / 390 | Playwright 전체 스크롤 QA **타임아웃**; HTML·200으로 **부분 대체** | 디코딩（naturalWidth>0）은 **배포 후 Production 재검 권장** |

### ISSUE-02 카탈로그 fallback

| 단계 | 결과 | 증거 |
|---|---|---|
| 수정前（Production） | body에 `SPOMOVE_NOTION_CATALOG_URL` 문자열 | 1차 Playwright |
| 수정 후（코드） | `CatalogFallback`에 env constant·`<code>` **없음** | `git diff` |
| 로컬 렌더 | `.env.local`에 catalog URL 있음 → **iframe 경로**（fallback **미노출**） | `GET /spomove/catalog` → `iframe` 포함, env 문자열 **없음** |
| fallback 문구 | Production 배포 후 「프로그램 전체 목록을 불러오지 못했습니다…」 노출 예상 | 정적 코드 검토 |

### ISSUE-09 푸터

| 단계 | 결과 | 증거 |
|---|---|---|
| 수정前 | 「MASTER 이용약관」 | 1차 |
| 수정 후（로컬 HTML） | 「SPOKEDU LAB 이용약관」**yes**, 「MASTER 이용약관」**no** | `GET /` |
| 링크 | `/spokedu-lab/terms`（변경 없음） | `site-chrome.tsx` |

### 회귀 테스트

```
npx vitest run app/spokedu-master/lib/publicProductContract.test.ts \
  app/spokedu-master/shop/shopContract.test.ts \
  app/spokedu-master/navigation.contract.test.ts
→ 3 files, 26 tests passed
```

（승인 범위外 파일未変更; SPOMAT·robots 계약 테스트 **통과**）

### 로컬 빌드

`npm run build` — **성공**（Next.js 16.2.11）.

---

## 4. ISSUE-10 — LAB robots（조사만, 파일 미변경）

### 경로 구분

| 유형 | URL | robots.txt | 메타 robots | sitemap |
|---|---|---|---|---|
| **공식 LAB 소개（랜딩）** | `/spokedu-lab`（`(spokedu-public)` + `CommercialLanding`） | `Disallow: /spokedu-lab`（prefix） | 랜딩 metadata: **index: true**（`subscription/page.tsx`） | **포함**（`SPOKEDU_PATHS.subscription` → `/spokedu-lab`） |
| **회원·앱 화면** | `/spokedu-lab/dashboard`, `/library`, … | 동일 Disallow | `spokedu-master/layout.tsx`: **index: false** | **미포함**（의도적） |
| **약관·개인정보** | `/spokedu-lab/terms`, `/privacy` | **Allow** 예외 | 공개 문서 | sitemap **미포함**（terms/privacy） |
| **SPOMAT shop** | `/spokedu-lab/shop` | Disallow prefix에 걸림 | MASTER layout **noindex** | **미포함** |

### trailingSlash · canonical

- `next.config`에 `trailingSlash` **미설정** → 기본 **false**（trailing slash 없음）.
- LAB 랜딩 canonical: `https://spokedu.kr/spokedu-lab`（metadata）.

### 모순（확정）

- **Sitemap은 `/spokedu-lab` 제출**
- **robots는 `/spokedu-lab` prefix 전면 Disallow**（terms/privacy만 Allow）
- 크롤러 해석: Google은 Allow/Disallow **가장 구체적 규칙** 우선; `$` 종료 규칙 없으면 **랜딩 URL 수집이 불안정**할 수 있음.

### 최소 변경안（승인 전 제안만）

1. `app/robots.ts`에서 prefix 정책 분리 예:
   - `Allow: /spokedu-lab$`（또는 trailingSlash 정책에 맞는 exact）
   - `Disallow: /spokedu-lab/`（하위 회원 경로）
2. **선택:** `/spokedu-lab/shop` 공개 상품만 Allow — **사업 결정**（shop은 현재 MASTER chrome + noindex）.
3. sitemap: 랜딩 유지; shop/terms 추가 여부는 **정책 확정 후**.
4. 회원 경로: robots만으로 보안하지 않음; **noindex（layout）+ 인증** 유지.

**robots 파일은 2차에서 변경하지 않음.**

---

## 5. ISSUE-04 — SPOMAT（조사만）

| 항목 | 현재 근거（코드·Production 관찰） | 불일치 |
|---|---|---|
| **공식 판매가（계약 SSOT）** | `SPOMAT_PRODUCT_CONTRACT.regularPrice` = **20,900**（`productCatalog.ts`） | 공개 `/spomat`: `pricesPublished: false` → 「가격 비공개」 |
| **약관** | `terms/page.tsx` §5: SPOMAT 일반가 **20,900원** | 공개 SPOMAT页과 상이 |
| **판매처** | `/spokedu-lab/shop`（rewrite → MASTER shop） | SPOMAT页 CTA → shop |
| **비로그인 shop** | Production: **20,900원** 표시, CTA 「구매 문의」→ `mailto:spokedu77@gmail.com` | `useSpomatShopAvailable()` false 시 mailto（온라인 결제 `/api/.../purchase` **비활성**） |
| **인증·무게·KC** | `/spomat` `spomat-page.ts`: 「확인되지 않은 무게·인증·제조국은 표기하지 않음」 | shop/LAB: 규격 60×60, 5.5mm, 재질만 | **NEEDS_EVIDENCE:** KC·스마트스토어·과거 15,900 — **코드/운영 화면에서 미확인** |
| **스마트스토어** | 공개 코드 경로 **없음** | 외부 채널은 **NOT TESTED** |

**2차:** 가격·상품 정책 **변경 없음**. 정렬은 **DECISION_REQUIRED**.

---

## 6. 사업·콘텐츠 감사（D — 표시만, UI 미변경）

각 항목: **현재 표시·근거** / **부족·오해** / **최소 개선안（구조 유지）**

### 6.1 홈 — 고객 분기·신뢰

| | |
|---|---|
| **표시** | `ServiceGateway`: 기관·학교 / 개인·소그룹 / SPOKEDU LAB 3분기; `SpokeduMethod`+`FieldRecords`로 현장→콘텐츠→시스템; 사례 사진（동작·동행·매동 등） |
| **근거** | `service-gateway.tsx`, `home-web-landing.tsx`, `home-web-assets.ts` |
| **부족** | Hero 직후 **압축 신뢰 근거**（설립·키움·방송 등）는 홈 상단에 없음 → `/about`·사례에 분산 |
| **개선안** | About `history` 마일스톤 중 **1~2개만** gateway 아래 짧은 텍스트 블록（디자인 전면 변경 없이） — **승인 후** |

### 6.2 `/education` — 기관 도입

| | |
|---|---|
| **표시** | 공간·인원·연령·운영 4조건; 프로그램 흐름 4단; 운영 형식; 대표 사례（동행·동작 SPOMOVE 등）; FAQ（비용 **요인**만, 고정가 없음）; `#contact` + 제안 폼 |
| **근거** | `education-hub-landing.tsx` |
| **부족** | **성범죄경력·지도자 자격·보험·계약/정산 서류** 등 기관 RFP 항목 **명시 없음**; 안전은 copy에 분산（「안전 범위」 수준） |
| **개선안** | FAQ 1~2문항 추가（「확인된 절차만」） 또는 `/contact` 기관 유형 안내 보강 — **사실 확정 후** |

### 6.3 `/private` — 학부모

| | |
|---|---|
| **표시** | 적합성·1:1/소그룹·방문 장소·지도자·수업 흐름·후기·FAQ·`#apply`/contact 연계; hero 「연세대…운영진」 |
| **근거** | `private-page.ts`, Production Playwright 본문 |
| **부족** | **비용·회차별 요금·체험수업 유무** FAQ 없음（원데이는 format 설명에만） |
| **개선안** | FAQ 「비용은 상담 후 안내」+ 회차 구조（8회 등）**기존 운영 정책과 일치하는 범위에서** 1문항 — **DECISION_REQUIRED** |

### 6.4 `/spomove` — 도입·환경

| | |
|---|---|
| **표시** | 시지각 반응 구조, SPOMAT 역할, 기관 도입（공간·인원 가변）, 수업 흐름, CTA 도입 문의 |
| **근거** | `spomove-program-page.ts` |
| **부족** | **TV/프로젝터/인터넷/노트북** 요구는 `/spomove/catalog` 탭 UI（`spomove-catalog-tabs.tsx`）에 있으나 **메인 `/spomove` 본문에는 없음**; 카탈로그 fallback 시 해당 탭 **비노출** |
| **개선안** | `institutionFit` 근처에 「화면 출력·네트워크」**2~3 bullet**（catalog-tabs와 동일 SSOT） — 카탈로그 복구와 **독립** 가능 |

### 6.5 `/records` — 매동·동행

| | |
|---|---|
| **표시** | 목록 카드; **내부 상세** slug: dongjak, yangcheon, dasarang-oneday, seodaemun-event-booth |
| **매동·동행** | catalog: **blogHref만**, `onsite` 없음 → 홈/records 카드는 **네이버 블로그**로 이탈 |
| **부족** | 지시 사례 2건 **내부 `/records/*` 요약 없음**（동작·양천·다사랑 대비） |
| **개선안** | 공개 자료·동의 확인 후 `field-records-catalog`에 `onsite` 추가 → 기존 `/records/[slug]` 템플릿 재사용 — **승인·콘텐츠 작업** |

### 6.6 `/about` · `/spomat`

| | |
|---|---|
| **about** | 설립·연혁·운영 원칙·3축（체육교육/SPOMOVE/구독）; 연혁 한 줄 「MASTER」표기（`about-page.ts` L116） |
| **spomat** | 실행 도구 정의, 2×2, 사양（shop과 동일 항목）, 가격 **비공개** copy, shop 링크 |
| **부족** | About 「MASTER」 vs 고객명 「SPOKEDU LAB」; SPOMAT 공개 vs shop **가격**（§5） |
| **개선안** | About 연혁 문구만 「SPOKEDU LAB」로（**ISSUE-09와 별도 copy 승인**）; SPOMAT 가격은 **ISSUE-04 정책** 후 |

---

## 7. QA 요약表

| ID | 수정前（Production） | 수정後（로컬 build+start） | Production 반영 |
|---|---|---|---|
| ISSUE-01 | 2 URL 404 | final PNG 200; HTML ref OK | **배포 필요** |
| ISSUE-02 | env 이름 노출 | 코드상 제거; local=iframe | fallback UI **배포 후** Production 확인 |
| ISSUE-09 | MASTER label | SPOKEDU LAB label | **배포 필요** |

---

## 8. 미검증 항목

- `/contact` 제출·리드 API 저장（Production 비파괴）
- 홈 이미지 **브라우저 decode**（1440/390）— Playwright timeout
- GA4 `spokedu_cta_click` / 제출 성공 이벤트 수집
- SPOMAT KC·스마트스토어·과거 15,900
- 카탈로그 **Notion 연결** Production env 존재 여부（값 미조회）
- ISSUE-02 fallback 문구 Production **실측**（배포 전）

---

## 9. 추가 승인 필요

| 우선 | 항목 |
|---|---|
| P0 ops | `SPOMOVE_NOTION_CATALOG_URL` Production 설정（카탈로그 기능 복구） |
| P1 배포 | ISSUE-01·02·09 **커밋·Vercel Production**（별도 사용자 지시） |
| P1 정책 | ISSUE-10 robots/sitemap 정렬 |
| P1 정책 | ISSUE-04 SPOMAT 가격·shop·/spomat·약관 일치 |
| P2 콘텐츠 | 기관 FAQ（자격·안전·서류）, private 비용 FAQ, spomove 환경 bullet, records 매동·동행 onsite |

---

## 10. 최종 상태

| | |
|---|---|
| **CONFIRMED（1차·대조）** | 홈 404 basename, catalog env 노출, robots/sitemap 모순, SPOMAT 가격 노출 불일치 |
| **DEPLOYED（2차 승인 3건）** | `c69d9240` — 홈 이미지·카탈로그 fallback copy·푸터（HTML 스모크 PASS, 브라우저 decode 일부 Playwright 타임아웃） |
| **3차 조사** | ISSUE-02B · ISSUE-10 — §11 |

---

## 11. 3차 조사 — ISSUE-02B · ISSUE-10（2026-10-15）

**Git:** `HEAD` = `origin/main` = `c69d9240` · **서비스 코드 변경 없음** · `SPOKEDU_PUBLIC_AUDIT.md`만 갱신（untracked 유지）

### 11.1 ISSUE-02B — SPOMOVE 카탈로그 기능 복구

#### 실제 원인（Production + 코드 교차）

| 단계 | 확인 결과 |
|---|---|
| 데이터 로딩 | **별도 fetch 없음.** `SpomoveCatalogPage` → `getCatalogUrl()` → truthy면 `<iframe src={catalogUrl}>` , falsy면 `CatalogFallback` |
| env 사용처 | **런타임 1곳:** `process.env.SPOMOVE_NOTION_CATALOG_URL`（`catalog/page.tsx`）. README·`.env.example`에 문서화 |
| Production 동작 | `https://spokedu.kr/spomove/catalog` — **iframe 없음**, fallback h1·「불러오지 못했습니다…」 (**2026-10-15 HTTP HTML**) |
| env 존재 여부 | Vercel 대시보드 **미조회**（값·키 노출 금지）. **관찰상 SSR에서 `getCatalogUrl()` → `null`**（미설정·빈값·URL parse 실패와 동일 증상） |
| 원래 설계 | 커밋 `58be2319`（2026-08-02）「embedded SPOMOVE catalog page」— **Notion 공개 게시 URL을 Vercel env에 넣고 iframe 임베드**（README § SPOMOVE Notion Catalog） |
| Notion vs LAB | **Notion:** 마케팅용 전체 프로그램 카탈로그（외부 페이지）. **LAB:** `curriculum` DB + `/api/spokedu-master/programs`（**libraryBrowse** 필요, Production **401**）. **SPOMOVE 실행 SSOT:** `officialSpomovePresets.ts`（코드, 회원 런타임） |
| 공개 CTA | `spomove-program-page.ts` 다수 CTA → `/spomove/catalog`; 푸터 `site.ts`; `/spomove?tab=catalog` → **`SpomoveCatalogTabs`**（정적 마케팅 탭, **Notion iframe과 다른 경로**） |

#### A안 vs B안

| | **A안 — Notion 연결 복구** | **B안 — LAB/코드 SSOT 기반 공개 카탈로그** |
|---|---|---|
| **내용** | Vercel Production에 **운영자가 확인한** Notion **공개 게시 URL** 등록 → 기존 iframe 유지 | env 없을 때·대체로 **공개 페이지에서 프로그램 목록 렌더**（예: `OFFICIAL_SPOMOVE_LIBRARY` 메타만, 또는 `/spomove?tab=catalog`의 `SpomoveCatalogTabs`를 catalog 라우트에 연결） |
| **구현 가능** | **조건부 가능** — env + **CSP `frame-src`에 Notion 도메인 추가 필요**（현재 `next.config.ts`는 YouTube/Vimeo/Toss만 허용; 로컬에서 env 있을 때 **Notion iframe CSP 차단** 재현 이력） | **기술적으로 가능**하나 **범위·데이터 경계 결정 필요** — LAB DB API는 **비로그인 401**; 놀이체육 전체 목록과 SPOMOVE preset 목록 **콘텐츠 범위가 다름** |
| **수정 파일（예상）** | Vercel env（ops）, 필요 시 `next.config.ts` **frame-src 1줄** | `catalog/page.tsx` + 공개용 presenter（기존 `spomove-catalog-tabs` 또는 preset 목록 read-only）— **신규 대형 시스템 아님, 그러나 승인된 설계 선택 필수** |
| **권한 영향** | 없음（외부 공개 Notion만 임베드） | **낮게 유지 가능**（preset **공개 필드만**, lesson 본문·미디어 entitlement 미노출）— 설계 오류 시 **유료 콘텐츠 노출 위험** |
| **관리 부담** | Notion 게시 유지·URL 변경 시 env 갱신 | 코드/DB SSOT와 동기화（Notion 이중 관리 제거 가능） |
| **회귀 위험** | CSP 누락 시 **iframe 빈 화면**; Notion URL 변경 시 **운영 의존** | 카탈로그 의미 변경（Notion 문서 vs 실행 preset vs 놀이체육 DB）— **마케팅·제품 정합성** |
| **Notion 미운영 시** | **A 단독 불충분** — URL 없으면 계속 fallback | B 또는 **A+B fallback** 검토 |

#### 권고（근거）

1. **단기 기능 복구（최소 diff）:** 운영에서 **유효한 Notion 공개 URL 존재가 확인되면** → **A안 + CSP Notion allow**（ops + 소규모 config, **승인 후**）.  
2. **Notion 카탈로그가 더 이상 SSOT가 아니면** → **B안을 제품 결정 후** 진행（어떤 목록을 `/spomove/catalog`에 보여줄지: preset vs 마케팅 탭 vs LAB subset）.  
3. **임의 URL·신규 Notion·LAB API 권한 완화·오류 숨김**은 권고하지 않음.

#### 3차 QA

| 항목 | 결과 |
|---|---|
| Production `/spomove/catalog` | fallback HTML (**기능 미복구**, env UI 제거는 **c69d9240 반영됨**） |
| `/api/spokedu-master/programs` | **401**（비로그인） |
| Playwright | **미실행**（조사 HTTP/HTML 위주） |
| Vercel env 실값 | **NOT TESTED**（대시보드 미접근） |

---

### 11.2 ISSUE-10 — LAB 검색 접근성

#### 현재 구조（Production + 코드）

| 항목 | 확인 |
|---|---|
| **robots.txt（Production）** | `Disallow: /spokedu-lab` · Allow `/spokedu-lab/terms`, `/spokedu-lab/privacy` · `=` `app/robots.ts` |
| **sitemap** | `https://spokedu.kr/spokedu-lab` **포함**（`SPOKEDU_PATHS.subscription`） |
| **공개 랜딩 URL** | `/spokedu-lab` — `(spokedu-public)/subscription/page.tsx` · `CommercialLanding` · metadata **`robots: index: true`**, canonical `https://spokedu.kr/spokedu-lab` |
| **rewrite** | `/spokedu-lab/:path*` → `/spokedu-master/:path*`（fallback）; **exact `/spokedu-lab`는 public page가 우선** |
| **회원 dashboard** | `/spokedu-lab/dashboard` — `spokedu-master/layout.tsx` **`robots: index: false`** + 인증 |
| **trailingSlash** | `next.config` **미설정** → Next 기본 **false** |
| **`/subscription`** | **308** → `/spokedu-lab`（`next.config.ts` redirect） |
| **Production `/spokedu-lab` HTML** | 「유아·초등」, Free/Lite 등 **랜딩 copy 포함**（비로그인 HTML 샘플）; `robots`/canonical 메타 **존재** |

#### 문제（확정）

- **Sitemap은 `/spokedu-lab` 제출** ↔ **robots는 `/spokedu-lab` prefix 전면 Disallow** → 크롤러 정책 **모순**（랜딩 metadata `index:true`와도 충돌）.
- `/spokedu-lab/shop` 등: robots Disallow + MASTER layout noindex — **의도적 비색인에 가깝음**（공개 열람은 가능）.

#### 수정안 비교（코드 변경 **제안만**, 미적용）

| 안 | 내용 | 검색엔진 호환 | 회원 경로 | 회귀 위험 |
|---|---|---|---|---|
| **A** | `Allow: /spokedu-lab$`（또는 trailingSlash 정책에 맞는 exact）+ `Disallow: /spokedu-lab/` | Google **Allow/Disallow 구체 규칙**으로 랜딩만 허용 가능 | `/spokedu-lab/dashboard` 등 **하위 차단 유지** | `$`·slash 규칙 오류 시 **일부 하위 오허용/오차단** |
| **B** | `Disallow: /spokedu-lab/` 만（exact `/spokedu-lab`는 disallow 아님） | prefix disallow 제거 효과 | **exact 랜딩 Allow**; 하위만 차단 | **B 단독** 시 `/spokedu-lab` without slash와 `/spokedu-lab/` 혼동 — trailingSlash **false**면 보통 **A와 병행 검토** |
| **C** | 회원 경로 **명시 Disallow**（dashboard, library, programs, …）+ 공개 `/spokedu-lab`, `/spokedu-lab/shop` Allow **여부는 사업 결정** | 가장 **명시적** | shop 색인 여부 **별도** | rules **길어짐**, 누락 시 **신규 경로 노출** |

**권고（최소）:** **A + B 조합 검토** — `Allow: /spokedu-lab`（exact）, `Disallow: /spokedu-lab/`, terms/privacy Allow **유지**. sitemap은 **랜딩만** 유지（shop 추가는 **별도 승인**）. **인증·noindex layout 변경 없음**.

#### 3차 QA

| 항목 | 결과 |
|---|---|
| Production robots/sitemap | **교차 확인 완료** |
| `/spokedu-lab` 랜딩 HTTP | **200**, 랜딩 copy **확인** |
| `/spokedu-lab/dashboard` noindex | layout metadata **코드 확인**; Production meta **별도 fetch 미실행** |
| Playwright | **미실행** |

---

### 11.3 승인 요청（3차）

| ID | 사용자 결정 |
|---|---|
| **ISSUE-02B** | **A（Notion URL + CSP）** vs **B（공개 preset/탭 SSOT）** vs **A 실패 시 B** |
| **ISSUE-02B ops** | Production Notion URL **존재·유효·게시 유지** 여부 확인（값은 ops만） |
| **ISSUE-10** | robots **A/B/C** 중 채택; `/spokedu-lab/shop` sitemap/색인 **포함 여부** |
| **공통** | 채택안 **승인 후**에만 `robots.ts` / `catalog` / `next.config` CSP 수정 |

---

## 12. 4차 — ISSUE-02B 조사 · ISSUE-10 robots（2026-10-16）

**기준 SHA:** 로컬 `HEAD` `9309e5a6`（커밋·푸시·배포 **없음**）  
**Production robots:** 아직 prefix `Disallow: /spokedu-lab`（배포 전）

### 12.1 ISSUE-02B — 코드 수정 없음

| 확인 | 결과 |
|---|---|
| `/spomove?tab=catalog` | Production **308 → `/spomove/catalog`**（`proxy.ts` `isLegacyCatalogQuery`）. 비로그인이 **한눈에 보기 탭 HTML을 받지 못함** |
| 탭 콘텐츠 | `spomove-catalog-tabs.tsx` `refinedCatalogSections`: 단순/선택/복합/DIVE **분류 설명**. 개별 프로그램명 목록 **없음** |
| 구분 | **도입 검토용 소개 탭**이지 전체 카탈로그가 아님 |
| CTA | 탭 안 「전체 프로그램 카탈로그 보기」→ `/spomove/catalog`（현재 fallback）. `?tab=catalog`로 바꾸면 proxy가 다시 `/spomove/catalog`로 보냄 |
| 충족 여부 | **충족하지 않음.** 최소 CTA 변경만으로는 목록이 생기지 않음 |

**추가 승인 필요（미구현）**

- 공개 목록의 범위: 분류 소개 유지 vs 공식 preset **이름·난이도만** vs Notion 복구（env + CSP, 이번 라운드 **금지**）
- `proxy.ts`의 `?tab=catalog` → `/spomove/catalog` 308을 유지할지

LAB API·실행 권한·preset·Notion env·CSP는 **변경하지 않음**.

### 12.2 ISSUE-10 — 최소 robots 수정（로컬, 미배포）

**사전 확인**

- `trailingSlash` 미설정（기본 false）
- Production `/spokedu-lab` **200**, `/spokedu-lab/` **308 → `/spokedu-lab`**
- 랜딩 canonical `/spokedu-lab`, metadata `index: true`
- sitemap에 `/spokedu-lab` 포함
- dashboard는 layout `noindex` + 인증（이번 수정 **없음**）

**변경:** `app/robots.ts` disallow `/spokedu-lab` → `/spokedu-lab/`

| 경로 | 규칙 |
|---|---|
| `/spokedu-lab` | disallow 불일치 → **허용** |
| `/spokedu-lab/dashboard` 등 하위 | `Disallow: /spokedu-lab/` → **차단** |
| `/spokedu-lab/terms`, `/privacy` | 더 긴 Allow → **허용 유지** |
| `/spokedu-lab/shop` | 하위 Disallow → **색인 정책 유지（차단）** |
| `/admin`, `/api`, `/teacher`, `/spokedu-master` | **유지** |

계약 테스트 `navigation.contract.test.ts`가 예전 prefix 문자열 `'/spokedu-lab'`을 요구해 **단언 1곳**을 `'/spokedu-lab/'`로 맞춤. **7 tests passed.**

Production `robots.txt`는 **배포 전까지 이전 규칙**.

---

## 부록 — 1차 QA（Production, 변경 전）

（1차 기록 유지 — Production `c9bca305` 동일 결함）

- TEST-01 `/private`: PASS  
- TEST-02 `/spomove/catalog`: FAIL（fallback + env 노출）  
- TEST-03 `/spokedu-lab/shop`: PASS（표시）; mailto 구매  
- TEST-04 홈: FAIL（2×404）  
- TEST-05 `/contact`: UI PASS; submit NOT TESTED  
