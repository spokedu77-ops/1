# PUBLIC_REFACTOR_AUDIT — 1·2차 + 최종 교정

**범위:** 공개 마케팅 surface (`app/spokedu`, `/spokedu-lab` 랜딩 UI)  
**Commit / Deploy:** 없음 · **활성 경로:** `ACTIVE_PAGE_MAP.md`  
**Git 기록:** `GIT_CORRECTION_BASELINE.json` · **소스 패치:** `CORRECTION_SOURCE.patch`

---

## 0. 최종 교정 (검수 실패 항목)

| 대상 | 원인 | 조치 | 렌더 검증 |
|------|------|------|-----------|
| Hero 모바일 | `768–1023` 2단 미디어쿼리 + `heroIntegrated` `grid-column: 6/13` 잔존 → 390px 2단·좁은 열 | **≤1023 단일 칼럼 고정**, 768–1023 2단 **삭제**, DOM 순서 copy→visual→actions, `grid-column: 1/-1` 리셋 | `QA_CAPTURE_RESULTS.json` home 360/390 **qaPass** |
| Records 목록 의미 | FEATURED 제외 후에도 「전체 수업사례」 표기 | **`FIELD_RECORD_CATALOG` SSOT** + `RECORDS_LANDING_FEATURED_SLUGS` · UI 「그 외 수업사례」·필터 범위 명시 | Vitest partition 3+5=8 |
| LAB 내부 문구 | 「공식 사이트와 같은 브랜드」 | 고객 기능 설명 문장으로 **교체** | `PUBLIC_COPY_SCAN.json` **0 hits** (fresh port) |
| 이미지 원장 | `page=inventory` only | `build-media-matrix.mjs` → **asset+usage** 행, dHash 후보, contact sheet | 106 assets · 82 usage rows |
| 캡처 QA | `waitUntil: load` 즉시 촬영 | `capture-page-utils.mjs` — fonts·scroll·img.complete | `capture-after-screens.mjs` **failed: 0** |

---

## 1. 홈 Hero

| 항목 | 최종 |
|------|------|
| 대표 사진 | `home-hero-gym-motion.jpg` · **ASSET_PROVENANCE_REVIEW_REQUIRED** (파일명만으로 촬영 승인 주장 안 함) |
| 모바일 | 단일 칼럼 · 16:10 · 전폭 사진 · CTA 전폭 버튼 |
| 데스크톱 | 5/7 2단 · 16:10 · `object-position: 42% 42%` |
| 카피 | 슬로건 유지 · SPOMOVE·LAB **도구** 관계 |

**디자인 최종 = PO_REVIEW_REQUIRED** (`BEFORE_AFTER/AFTER/home-*-fold.png`)

---

## 2. `/records`

| 문제 | 조치 |
|------|------|
| FEATURED·목록 slug 중복 | `RECORDS_LANDING_FEATURED_SLUGS` (3) + catalog 파생 **그 외** (5) · `assertRecordsLandingPartition()` |
| 「전체」 의미 오류 | **「그 외 수업사례」** · 필터는 그 외 N건에만 적용 문구 |
| 07·02 대형 통계 | **metaStrip** 유지 |
| 모바일 순서 | Hero → **주요 사례 사진** → meta → 그 외 |

필터·외부 링크·상세 경로 **유지** · 사례 **삭제 없음**.

---

## 3. `/education` (2차)

- `adjustment` 동선 설명: “공간과 참여 인원…” 반복 **완화** (`education-hub.ts`)
- 사례 카드·DispatchProposalForm·`#contact` — **미변경** (이미 catalog 연동 cases)

**REVIEW_REQUIRED:** hub 섹션별 이미지–문장 1:1 수동 실사 (Playwright 텍스트 diff 미실행)

---

## 4. `/private` (2차)

- 구조·API·9필드 계약 **유지**
- **REVIEW_REQUIRED:** 폼 위계·모바일 스크롤 — PO 캡처 검수 (`BEFORE_AFTER/AFTER/private-*`)

---

## 5. SPOMOVE / catalog (2차)

| 항목 | 조치 |
|------|------|
| Catalog 순서 | 1차 유지: **활동 카드 → 분류** |
| SEE·DECIDE·MOVE | 카탈로그 **3카드 섹션 제거** → `/spomove` 안내 문장으로 대체 |
| `/spomove` 랜딩 | `content`/`reactionLevels` **UI 미렌더** (기존 flow·experience·variation 유지) |

**REVIEW_REQUIRED:** `activityCards`별 mediaKey ↔ 프로그램명 일치 — 수동 matrix 검토

---

## 6. SPOKEDU LAB (`CommercialLanding`)

- **결제·권한·온보딩 코드 무变更**
- Hero body: 내부 브랜드 문구 **제거** → 프로그램·수업반·출석·활동 순서 **고객 설명**
- 모바일: `productFrame` 보강 **유지**

---

## 7. 1차 고객 문구 (유지)

About / Spomat / Partners / Consult env — **1차 FIXED 유지** (grep: 고객 JSX에 SSOT·Primary·제품 원장 **0건**)

---

## 8. 미완료 · 자산

| ID | 내용 |
|----|------|
| ASSET_REQUIRED | Hero 후보 `home-hero-coaching.jpg` vs `gym-motion` — PO가 대표성 최종 선택 |
| REVIEW_REQUIRED | Production BEFORE (`spokedu.kr`) = 1차 변경 전인지 **PO 확인** |
| REVIEW_REQUIRED | 16 SHA 중복 그룹 — CSV `duplicate_group` — **맥락별 JUSTIFIED_REUSE vs 재배치** |
| NOT_VERIFIED | `/private` 폼 필드 축소 (의도적 보류) |
| REVIEW_REQUIRED | dHash 유사 49쌍 + `IMAGE_SIMILARITY_CONTACT_SHEET.jpg` — **자동 교체 금지** |
| ASSET_PROVENANCE_REVIEW_REQUIRED | Hero `gym-motion` 촬영·사용 권한 기록 |
| OPS | 캡처 시 **stale `next start`** 방지 — `REFACTOR_CAPTURE_PORT` 변경(기본 3055) 후 build |

---

## 변경 파일 (2차 포함 · uncommitted)

```
app/spokedu/components/home-web/home-hero.tsx
app/spokedu/components/home-web/home-web-assets.ts
app/spokedu/components/home-web/home-web.module.css
app/spokedu/components/home-web/service-gateway.tsx
app/spokedu/components/records-landing.tsx
app/spokedu/components/records-landing.module.css
app/spokedu/components/spomove-public-catalog.tsx
app/spokedu/data/education-hub.ts
app/spokedu/data/spomove-public-catalog-page.ts
app/spokedu-master/landing/components/LandingSections.tsx
app/spokedu-master/landing/landing.module.css
(+ 1차: about-page, spomat-page, partners-page, about/partners landing, spokedu-method, …)
```
