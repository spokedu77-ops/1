# SPOKEDU Home — Global 100% 로드맵

**기준:** Stripe / Linear / Apple / Nike / Awwwards SOTY 급 “첫 화면에서 브랜드·신뢰·다음 행동”이 동시에 완성된 상태.  
**현재 추정 (코드):** **~96%** — 사진 드롭인·OG·Lighthouse·10분 수동만 남으면 100%.  
**운영 가이드:** `app/spokedu/docs/PHOTO_DROPIN_100.md`  
**승인:** `app/spokedu/docs/HOME_SIGNOFF.md`  
**가정 작업:** `fetch-spokedu-images.mjs`로 슬롯 채운 뒤 Phase 2–4 코드 폴리시 진행 (운영 JPG 덮어쓰기 = 동일 파일명).  
**원칙:** 카피·CTA URL·문의 `?type=` 흐름은 유지. 비주얼·리듬·증거·사진은 전면 승격.

---

## 완성도 마일스톤

| 단계 | 목표 % | 산출물 | 블로커 |
|------|--------|--------|--------|
| **0** | 55→58 | 사진 0건 placeholder, 레이아웃 버그 0 | ✅ 레이아웃 수정 + **Pexels 임시 스톡 전 슬롯 채움** (`fetch-spokedu-images.mjs`) |
| **1** | 58→70 | **슬롯 실사** (PHOTO_REQUEST 파일명) | ✅ dev: fetch 스크립트 / prod: 운영 JPG 덮어쓰기 |
| **2** | 70→78 | 타이포 스케일·섹션 리듬·여백 시스템 | ✅ `homeSectionInner*`·`homeIntroCluster` |
| **3** | 78→86 | Hero 에디토리얼, 신뢰 스트립 full-width | ✅ (운영 실사 시 체감 ↑) |
| **4** | 86→93 | 이미지 톤 `homePhotoGrade`, LCP preload | ✅ 코드 / 보정 JPG는 운영 |
| **5** | 93→100 | OG·LCP·a11y·360~desktop QA | ✅ JSON-LD·preload·스킵링크·overflow QA / ⏳ Lighthouse·운영 실사 |

**100% 정의 (체크리스트)**

- [ ] Hero 3초: “누구·무엇·왜 믿음”이 **우리 사진**만으로 전달
- [ ] 스톡·건물 외관·무관 인물 0%
- [ ] 섹션마다 시각 무게가 다름 (큰→작은→CTA)
- [ ] 현장 4카드 = 실제 venue·프로그램과 1:1 매칭
- [ ] Lighthouse LCP Hero < 2.5s (desktop), 이미지 404/placeholder 0
- [ ] 모바일 360 / 390 / 430 / desktop 캡처 승인

---

## 섹션별 100% 기준

### Hero
- **지금:** 3분할 콜라주 + 범용 스톡.
- **목표:** 1개 대표 컷(풀블리드 또는 60% 비주얼) + 짧은 H1 + 단일 primary CTA. 보조 2컷은 선택.
- **파일:** `home/home-hero-movement.jpg` (가로 2400px+, 아이 움직임·수업 에너지)

### 3축 (visitor gate)
- 개인: 1~2명 코칭 `private/private-coaching.jpg`
- 기관: 다인 수업 `dispatch/dispatch-group-class.jpg`
- 콘텐츠: 강사교육/LAB `curriculum/curriculum-instructor-training.jpg`

### 현장 기록 (4)
| 카드 | 파일 | 촬영 내용 |
|------|------|-----------|
| 양천 SPOMOVE | `records/yangcheon.jpg` | 양천거점형키움센터 SPOMOVE 정규수업 |
| 동작 | `records/dongjak.jpg` | 동작거점형키움센터 SPOMOVE/리듬 수업 |
| 원데이 | `records/dasarang.jpg` | 다사랑영등포지역아동센터 원데이 |
| PLAYZ | `records/playz.jpg` | 서울숲 PLAYZ Lounge 방학캠프 |

### 수업 콘텐츠 (5)
`programs/program-spomove.jpg`, `program-paps-running.jpg`, `program-oneday.jpg`, `program-camp.webp`, `program-curriculum-content.jpg`

---

## 사진 전달 방법 (운영자)

1. 원본 파일명은 위 표와 **동일**하게 (코드 수정 없이 반영).
2. `public/images/spokedu/{category}/` 에 넣거나 ZIP으로 전달.
3. 가로 1600px 이상, JPG/WebP, 인물 얼굴 가로·세로 모두 OK (단체는 얼굴 식별 가능 수준).
4. 1차 배치: **Hero 1장 + 현장 4장** (가장 체감 큼).

---

## 코드 작업 순서 (에이전트)

1. **Phase 1** — 사진 드롭인 파이프라인 확인, `images.ts` alt만 보정.
2. **Phase 2** — `ui-classes` Home 전용 타이포 토큰, 섹션 `gap` 리듬.
3. **Phase 3** — `HomeHeroEditorial` 컴포넌트, 콜라주→단일 Hero 옵션 (feature flag 또는 직접 교체).
4. **Phase 4** — `HomeTrustStrip` (기관명·운영 연수·프로그램 수 — 데이터는 `home-page.ts`에 상수).
5. **Phase 5** — Playwright `spokedu-home-images-qa.mjs` + 4 viewport 스냅샷 CI.

---

## 하지 않을 것

- postimg·외부 hotlink
- placeholder gradient를 “디자인”으로 유지
- 섹션 구조·CTA 링크 임의 변경 (별도 요청 없으면)

---

## 참고

- 이미지 레지스트리: `app/spokedu/data/images.ts`
- Home UI: `app/spokedu/components/home-landing.tsx`
- QA: `node scripts/spokedu-home-images-qa.mjs http://localhost:3000`
