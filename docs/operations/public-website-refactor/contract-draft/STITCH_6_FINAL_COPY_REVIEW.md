# STITCH 6 — Final copy review manuscript

**Git HEAD:** `2a7125fa0a5305f286ff6c816db49e5d3a360af1`
**Verdict:** `COPY_DRAFT_READY_FOR_APPROVAL`
**Phase C:** NOT AUTHORIZED · **Public code changes:** 0 · **Design structure changes:** 0

## Pixel fidelity gate (strategy — not executed in this pass)

- `STITCH_BASELINE_RENDER_PASS`: **NOT RUN** (requires isolated Stitch HTML render + screenshot diff before content swap).
- Order: baseline render → `STITCH_BASELINE_RENDER_PASS` → approved copy/image swap → nav/CTA wiring → final QA.
- Stitch ZIP HTML/CSS/Tailwind/DOM = implementation SSOT; existing SPOKEDU layout must not be blended on top.

## Global chrome (공통 헤더·푸터 — 6페이지 동일 Stitch 패턴)

| Stitch IA | SPOKEDU 적용 | CTA/링크 | 근거 |
|-----------|-------------|----------|------|
| 로고 wordmark `SPOMOVE` | **SPOKEDU** | `/` | FACT-BRAND-001 |
| Nav: 교육 프로그램 | **기관·학교 수업** | `/education` | siteNav |
| Nav: 프라이빗 레슨 | **개인·소그룹 수업** | `/private` | siteNav |
| Nav: 스포무브 시스템 | **SPOMOVE** | `/spomove` | siteNav |
| Nav: 현장 스토리/기록 | **수업사례** | `/records` | siteNav |
| Nav: 회사 소개 | **SPOKEDU 소개** | `/about` | siteNav |
| Header CTA | **문의하기** | `/contact` | siteHeaderCta |
| LAB capsule (Stitch person icon 영역) | **SPOKEDU LAB** | `/spokedu-lab` | siteHeaderLabCta (out of Stitch 6 scope wire) |
| Footer 연락처 | **spokedu77@gmail.com** / **010-4437-9294** | tel/mailto | brandProfile |
| Footer © SPOMOVE Inc | **© SPOKEDU. 사업자등록번호 311-63-00356** | — | FACT-BIZ-001 |

> Header LAB·Partners 등 Stitch에 없는 IA는 **기능 연결 단계**에서만 추가; Stitch 시각 블록 변경 금지.

---

## Page `/` — `home_spomove`

**DOM slots:** 123 · **Coverage gap estimate:** 0 minor text fragments (material icons / duplicates)

### Sections (Stitch comment order)

- SECTION 1: CODLE MINIMAL HERO
- SECTION 3: CODLE IMPACT METRICS (PURE WHITE, NO TIGHT BOXES)
- SECTION 4: UNIST EDITORIAL PHOTO GRID (RECENT HIGHLIGHTS)
- SECTION 5: CODLE BOTTOM CTA FULL BANNER

### UNLABELED

- **DOM ID:** `DOM-home_spomove-10` · **역할:** heading · **경로:** `html[1]>body[1]>main[1]>div[5]>section[1]>div[6]>h1[1]`
  - **Stitch 원문:** 스포츠 교육의 새로운 기준, 스포무브 하나면 충분합니다.
  - **SPOKEDU 적용 문구:** SPOKEDU 체육교육 · SPOMOVE 프로그램
  - **근거:** Stitch fiction removed — neutral SPOKEDU slot copy (FACT-STAGE7-G07|G08|G09)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** FABRICATED_REPLACED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-home_spomove-12` · **역할:** cta · **경로:** `html[1]>body[1]>main[1]>div[5]>section[1]>div[6]>div[8]>a[9]`
  - **Stitch 원문:** 무료 맞춤 상담 시작하기 arrow_forward
  - **SPOKEDU 적용 문구:** 수업 상담하기
  - **근거:** siteHeaderCta + home hero (HOME-CTA)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** /contact
  - **검증·승인:** PENDING_APPROVAL · **PENDING_APPROVAL**

- **DOM ID:** `DOM-home_spomove-20` · **역할:** decorative_number · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[15]>div[16]>div[17]>span[10]`
  - **Stitch 원문:** 01
  - **SPOKEDU 적용 문구:** 01
  - **근거:** Stitch watermark decoration — design SSOT (DESIGN-ONLY)
  - **디자인 영향:** TEXT_SLOT_LOCKED;METRIC_GRAPHIC_PRESERVED
  - **CTA 목적지:** —
  - **검증·승인:** DESIGN_ONLY · **PENDING_APPROVAL**

- **DOM ID:** `DOM-home_spomove-21` · **역할:** heading · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[15]>div[16]>div[17]>div[18]>h2[1]`
  - **Stitch 원문:** 데이터 기반의 체계적인 스포츠 커리큘럼
  - **SPOKEDU 적용 문구:** 데이터 기반의 체계적인 스포츠 커리큘럼
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-home_spomove-23` · **역할:** tag_chip · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[15]>div[16]>div[17]>div[18]>div[19]`
  - **Stitch 원문:** #개인맞춤 #신체발달 #생체모션측정
  - **SPOKEDU 적용 문구:** #개인맞춤 #신체발달 #생체모션측정
  - **근거:** Hashtag chip — align with LIVE card tags in Phase C (TAG-CHIP)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** PENDING_APPROVAL · **PENDING_APPROVAL**

- **DOM ID:** `DOM-home_spomove-27` · **역할:** cta · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[15]>div[16]>div[17]>div[18]>div[20]>a[11]`
  - **Stitch 원문:** 커리큘럼 세부 로드맵 확인하기 arrow_forward
  - **SPOKEDU 적용 문구:** 커리큘럼 세부 로드맵 확인하기 arrow_forward
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** /education
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-home_spomove-32` · **역할:** decorative_number · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[15]>div[24]>div[28]>span[18]`
  - **Stitch 원문:** 02
  - **SPOKEDU 적용 문구:** 02
  - **근거:** Stitch watermark decoration — design SSOT (DESIGN-ONLY)
  - **디자인 영향:** TEXT_SLOT_LOCKED;METRIC_GRAPHIC_PRESERVED
  - **CTA 목적지:** —
  - **검증·승인:** DESIGN_ONLY · **PENDING_APPROVAL**

- **DOM ID:** `DOM-home_spomove-33` · **역할:** heading · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[15]>div[24]>div[28]>div[29]>h2[2]`
  - **Stitch 원문:** 검증된 전문 코치진 매칭 및 전담 파견
  - **SPOKEDU 적용 문구:** 검증된 전문 코치진 매칭 및 전담 파견
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-home_spomove-35` · **역할:** tag_chip · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[15]>div[24]>div[28]>div[29]>div[30]`
  - **Stitch 원문:** #전문지도사 #안심케어 #상시모니터링
  - **SPOKEDU 적용 문구:** #전문지도사 #안심케어 #상시모니터링
  - **근거:** Hashtag chip — align with LIVE card tags in Phase C (TAG-CHIP)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** PENDING_APPROVAL · **PENDING_APPROVAL**

- **DOM ID:** `DOM-home_spomove-39` · **역할:** cta · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[15]>div[24]>div[28]>div[29]>div[31]>a[12]`
  - **Stitch 원문:** 코치진 풀 및 인증 시스템 확인 arrow_forward
  - **SPOKEDU 적용 문구:** 코치진 풀 및 인증 시스템 확인 arrow_forward
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** /private
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-home_spomove-40` · **역할:** decorative_number · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[15]>div[32]>div[33]>span[24]`
  - **Stitch 원문:** 03
  - **SPOKEDU 적용 문구:** 03
  - **근거:** Stitch watermark decoration — design SSOT (DESIGN-ONLY)
  - **디자인 영향:** TEXT_SLOT_LOCKED;METRIC_GRAPHIC_PRESERVED
  - **CTA 목적지:** —
  - **검증·승인:** DESIGN_ONLY · **PENDING_APPROVAL**

- **DOM ID:** `DOM-home_spomove-41` · **역할:** heading · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[15]>div[32]>div[33]>div[34]>h2[3]`
  - **Stitch 원문:** 실시간 수업 피드백 및 학부모 디지털 리포트
  - **SPOKEDU 적용 문구:** 실시간 수업 피드백 및 학부모 디지털 리포트
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-home_spomove-43` · **역할:** tag_chip · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[15]>div[32]>div[33]>div[34]>div[35]`
  - **Stitch 원문:** #성장기록 #모바일알림 #투명한피드백
  - **SPOKEDU 적용 문구:** #성장기록 #모바일알림 #투명한피드백
  - **근거:** Hashtag chip — align with LIVE card tags in Phase C (TAG-CHIP)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** PENDING_APPROVAL · **PENDING_APPROVAL**

- **DOM ID:** `DOM-home_spomove-47` · **역할:** cta · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[15]>div[32]>div[33]>div[34]>div[36]>a[13]`
  - **Stitch 원문:** 리포트 예시 화면 살펴보기 arrow_forward
  - **SPOKEDU 적용 문구:** 수업 유형 살펴보기
  - **근거:** HOME-008 (HOME-008)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** /spomove
  - **검증·승인:** PENDING_APPROVAL · **PENDING_APPROVAL**

- **DOM ID:** `DOM-home_spomove-61` · **역할:** metric_display · **경로:** `html[1]>body[1]>main[1]>div[5]>section[3]>div[48]>div[49]>div[50]>div[51]`
  - **Stitch 원문:** 500+
  - **SPOKEDU 적용 문구:** —
  - **근거:** 미검증 Stitch 지표 → 숫자 비활성 (FACT-STAGE7-G08)
  - **디자인 영향:** TEXT_SLOT_LOCKED;METRIC_GRAPHIC_PRESERVED
  - **CTA 목적지:** —
  - **검증·승인:** BLOCKED_UNTIL_LEDGER · **PENDING_APPROVAL**

- **DOM ID:** `DOM-home_spomove-63` · **역할:** metric_display · **경로:** `html[1]>body[1]>main[1]>div[5]>section[3]>div[48]>div[49]>div[52]>div[53]`
  - **Stitch 원문:** 2,500+
  - **SPOKEDU 적용 문구:** —
  - **근거:** 미검증 Stitch 지표 → 숫자 비활성 (FACT-STAGE7-G08)
  - **디자인 영향:** TEXT_SLOT_LOCKED;METRIC_GRAPHIC_PRESERVED
  - **CTA 목적지:** —
  - **검증·승인:** BLOCKED_UNTIL_LEDGER · **PENDING_APPROVAL**

- **DOM ID:** `DOM-home_spomove-65` · **역할:** metric_display · **경로:** `html[1]>body[1]>main[1]>div[5]>section[3]>div[48]>div[49]>div[54]>div[55]`
  - **Stitch 원문:** 98%
  - **SPOKEDU 적용 문구:** —
  - **근거:** 미검증 Stitch 지표 → 숫자 비활성 (FACT-STAGE7-G08)
  - **디자인 영향:** TEXT_SLOT_LOCKED;METRIC_GRAPHIC_PRESERVED
  - **CTA 목적지:** —
  - **검증·승인:** BLOCKED_UNTIL_LEDGER · **PENDING_APPROVAL**

- **DOM ID:** `DOM-home_spomove-67` · **역할:** metric_display · **경로:** `html[1]>body[1]>main[1]>div[5]>section[3]>div[48]>div[49]>div[56]>div[57]`
  - **Stitch 원문:** 7일
  - **SPOKEDU 적용 문구:** —
  - **근거:** 미검증 Stitch 지표 → 숫자 비활성 (FACT-STAGE7-G08)
  - **디자인 영향:** TEXT_SLOT_LOCKED;METRIC_GRAPHIC_PRESERVED
  - **CTA 목적지:** —
  - **검증·승인:** BLOCKED_UNTIL_LEDGER · **PENDING_APPROVAL**

- **DOM ID:** `DOM-home_spomove-71` · **역할:** cta · **경로:** `html[1]>body[1]>main[1]>div[5]>section[4]>div[58]>div[59]>a[14]`
  - **Stitch 원문:** 전체 기록 보기 chevron_right
  - **SPOKEDU 적용 문구:** 수업 유형 살펴보기
  - **근거:** HOME-008 (HOME-008)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** /records
  - **검증·승인:** PENDING_APPROVAL · **PENDING_APPROVAL**

- **DOM ID:** `DOM-home_spomove-72` · **역할:** cta · **경로:** `html[1]>body[1]>main[1]>div[5]>section[4]>div[58]>div[61]>a[15]`
  - **Stitch 원문:** 초등 늘봄 방과후 2025. 03. 10 서울 24개 초등학교 늘봄학교 스포츠 거점 협약 체결 학부모 부담을 덜고 학생들의 방과 후 체육 신체 활동을 활성화하는 맞춤 프로그램이 정규 개강되었습니다. arrow_forward
  - **SPOKEDU 적용 문구:** 수업 유형 살펴보기
  - **근거:** HOME-008 (HOME-008)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** /records
  - **검증·승인:** PENDING_APPROVAL · **PENDING_APPROVAL**

- **DOM ID:** `DOM-home_spomove-80` · **역할:** cta · **경로:** `html[1]>body[1]>main[1]>div[5]>section[4]>div[58]>div[61]>a[16]`
  - **Stitch 원문:** 엘리트 레슨 2025. 03. 04 AI 관절 각도 추적 기술로 유소년 선수 부상률 42% 감소 무리한 스윙과 점프 착지 패턴을 실시간으로 감지하여 엘리트 유망주들의 고질적인 관절 부담을 획기적으로 개선했습니다. arrow_forward
  - **SPOKEDU 적용 문구:** SPOKEDU 체육교육 · SPOMOVE 프로그램
  - **근거:** Stitch fiction removed — neutral SPOKEDU slot copy (FACT-STAGE7-G07|G08|G09)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** FABRICATED_REPLACED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-home_spomove-87` · **역할:** cta · **경로:** `html[1]>body[1]>main[1]>div[5]>section[4]>div[58]>div[61]>a[17]`
  - **Stitch 원문:** 학술 연구 세미나 2025. 02. 26 국내 주요 대학 에듀테크 연구진과 모션 알고리즘 발표 유소년 신체 발달 지연 조기 감지 모델 연구 결과를 공유하며 공교육 현장 보급 방안을 심도 있게 모색했습니다. arrow_forward
  - **SPOKEDU 적용 문구:** 학술 연구 세미나 2025. 02. 26 국내 주요 대학 에듀테크 연구진과 모션 알고리즘 발표 유소년 신체 발달 지연 조기 감지 모델 연구 결과를 공유하며 공교육 현장 보급 방안을 심도 있게 모색했습니다. ar…
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** /records
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-home_spomove-95` · **역할:** heading · **경로:** `html[1]>body[1]>main[1]>div[5]>section[5]>div[80]>h2[5]`
  - **Stitch 원문:** 지금, 우리 학교와 아이를 위한 최고의 스포츠 교육을 만나보세요.
  - **SPOKEDU 적용 문구:** 지금, 우리 학교와 아이를 위한 최고의 스포츠 교육을 만나보세요.
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-home_spomove-97` · **역할:** cta · **경로:** `html[1]>body[1]>main[1]>div[5]>section[5]>div[80]>div[81]>a[18]`
  - **Stitch 원문:** 무료 맞춤 상담 신청하기 arrow_forward
  - **SPOKEDU 적용 문구:** 수업 상담하기
  - **근거:** siteHeaderCta + home hero (HOME-CTA)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** /contact
  - **검증·승인:** PENDING_APPROVAL · **PENDING_APPROVAL**

### SECTION 1: CODLE MINIMAL HERO

- **DOM ID:** `DOM-home_spomove-11` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[1]>div[6]>p[1]`
  - **Stitch 원문:** 초등 늘봄 방과후부터 엘리트 맞춤형 케어까지, 데이터와 검증된 코칭으로 아이들의 건강한 성장 곡선을 입체적으로 설계합니다.
  - **SPOKEDU 적용 문구:** 전문 지도자가 학교·기관과 개인 수업을 직접 설계하고 운영합니다. 현장의 경험은 SPOMOVE와 SPOKEDU LAB으로 이어집니다.
  - **근거:** home-web-landing.tsx heroLead (HOME-LIVE-HERO)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** PENDING_APPROVAL · **PENDING_APPROVAL**

- **DOM ID:** `DOM-home_spomove-13` · **역할:** cta · **경로:** `html[1]>body[1]>main[1]>div[5]>section[1]>div[6]>div[8]>a[10]`
  - **Stitch 원문:** 교육 프로그램 보기
  - **SPOKEDU 적용 문구:** 수업 유형 살펴보기
  - **근거:** HOME-008 (HOME-008)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** /education
  - **검증·승인:** PENDING_APPROVAL · **PENDING_APPROVAL**

- **DOM ID:** `DOM-home_spomove-15` · **역할:** image · **경로:** `html[1]>body[1]>main[1]>div[5]>section[1]>div[6]>div[9]>div[10]>img[1]`
  - **Stitch 원문:** Modern indoor sports gymnasium and EdTech training studio with high-tech sensors, children engaged in athletic conditioning under warm sunlight, clean Korean academic edtech aesthetic with soft blue lighting accents and dynamic spatial depth.
  - **SPOKEDU 적용 문구:** (이미지 — COPY_SLOT_IMAGE_REGISTRY.csv 참조)
  - **근거:** Image slot; alt/prompt replaced at implementation (DEC-PACK-05)
  - **디자인 영향:** IMAGE_FRAME_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** IMAGE_PROVENANCE_REVIEW · **PENDING_APPROVAL**

- **DOM ID:** `DOM-home_spomove-22` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[15]>div[16]>div[17]>div[18]>p[2]`
  - **Stitch 원문:** 아이의 연령별 신체 발달 지표와 동작 데이터를 정밀 진단하여, 체육에 대한 흥미와 균형 잡힌 근신경 협응력을 단계별로 완성합니다.
  - **SPOKEDU 적용 문구:** 전문 지도자가 학교·기관과 개인 수업을 직접 설계하고 운영합니다. 현장의 경험은 SPOMOVE와 SPOKEDU LAB으로 이어집니다.
  - **근거:** home-web-landing.tsx heroLead (HOME-LIVE-HERO)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** PENDING_APPROVAL · **PENDING_APPROVAL**

- **DOM ID:** `DOM-home_spomove-24` · **역할:** tag_chip · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[15]>div[16]>div[17]>div[18]>div[19]>span[12]`
  - **Stitch 원문:** #개인맞춤
  - **SPOKEDU 적용 문구:** #개인맞춤
  - **근거:** Hashtag chip — align with LIVE card tags in Phase C (TAG-CHIP)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** PENDING_APPROVAL · **PENDING_APPROVAL**

- **DOM ID:** `DOM-home_spomove-25` · **역할:** tag_chip · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[15]>div[16]>div[17]>div[18]>div[19]>span[13]`
  - **Stitch 원문:** #신체발달
  - **SPOKEDU 적용 문구:** #신체발달
  - **근거:** Hashtag chip — align with LIVE card tags in Phase C (TAG-CHIP)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** PENDING_APPROVAL · **PENDING_APPROVAL**

- **DOM ID:** `DOM-home_spomove-26` · **역할:** tag_chip · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[15]>div[16]>div[17]>div[18]>div[19]>span[14]`
  - **Stitch 원문:** #생체모션측정
  - **SPOKEDU 적용 문구:** #생체모션측정
  - **근거:** Hashtag chip — align with LIVE card tags in Phase C (TAG-CHIP)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** PENDING_APPROVAL · **PENDING_APPROVAL**

- **DOM ID:** `DOM-home_spomove-29` · **역할:** image · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[15]>div[16]>div[21]>div[22]>img[2]`
  - **Stitch 원문:** South Korean elementary school students joyfully learning agility and basketball fundamentals with energetic young sports trainer in a pristine, bright gym space with crisp modern visual lines.
  - **SPOKEDU 적용 문구:** (이미지 — COPY_SLOT_IMAGE_REGISTRY.csv 참조)
  - **근거:** Image slot; alt/prompt replaced at implementation (DEC-PACK-05)
  - **디자인 영향:** IMAGE_FRAME_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** IMAGE_PROVENANCE_REVIEW · **PENDING_APPROVAL**

- **DOM ID:** `DOM-home_spomove-31` · **역할:** image · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[15]>div[24]>div[25]>div[26]>img[3]`
  - **Stitch 원문:** Professional athletic coach guiding a young student through posture adjustment and gentle stretching, showing warm mentorship, bright sunlit indoor sports training center, deep royal blue sports uniforms.
  - **SPOKEDU 적용 문구:** (이미지 — COPY_SLOT_IMAGE_REGISTRY.csv 참조)
  - **근거:** Image slot; alt/prompt replaced at implementation (DEC-PACK-05)
  - **디자인 영향:** IMAGE_FRAME_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** IMAGE_PROVENANCE_REVIEW · **PENDING_APPROVAL**

- **DOM ID:** `DOM-home_spomove-34` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[15]>div[24]>div[28]>div[29]>p[3]`
  - **Stitch 원문:** 체육지도자 국가자격 및 인성 인터뷰를 통과한 전문 지도사가 직접 파견되어, 학교와 학생의 여건에 꼭 맞는 안전한 클래스를 책임집니다.
  - **SPOKEDU 적용 문구:** 전문 지도자가 학교·기관과 개인 수업을 직접 설계하고 운영합니다. 현장의 경험은 SPOMOVE와 SPOKEDU LAB으로 이어집니다.
  - **근거:** home-web-landing.tsx heroLead (HOME-LIVE-HERO)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** PENDING_APPROVAL · **PENDING_APPROVAL**

- **DOM ID:** `DOM-home_spomove-36` · **역할:** tag_chip · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[15]>div[24]>div[28]>div[29]>div[30]>span[20]`
  - **Stitch 원문:** #전문지도사
  - **SPOKEDU 적용 문구:** #전문지도사
  - **근거:** Hashtag chip — align with LIVE card tags in Phase C (TAG-CHIP)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** PENDING_APPROVAL · **PENDING_APPROVAL**

- **DOM ID:** `DOM-home_spomove-37` · **역할:** tag_chip · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[15]>div[24]>div[28]>div[29]>div[30]>span[21]`
  - **Stitch 원문:** #안심케어
  - **SPOKEDU 적용 문구:** #안심케어
  - **근거:** Hashtag chip — align with LIVE card tags in Phase C (TAG-CHIP)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** PENDING_APPROVAL · **PENDING_APPROVAL**

- **DOM ID:** `DOM-home_spomove-38` · **역할:** tag_chip · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[15]>div[24]>div[28]>div[29]>div[30]>span[22]`
  - **Stitch 원문:** #상시모니터링
  - **SPOKEDU 적용 문구:** #상시모니터링
  - **근거:** Hashtag chip — align with LIVE card tags in Phase C (TAG-CHIP)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** PENDING_APPROVAL · **PENDING_APPROVAL**

- **DOM ID:** `DOM-home_spomove-42` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[15]>div[32]>div[33]>div[34]>p[4]`
  - **Stitch 원문:** 매 수업 후 운동 능력 변화와 심리적 몰입도를 시각화한 모바일 리포트를 발송해, 학부모님께 믿음과 아이의 성취감을 동시에 드립니다.
  - **SPOKEDU 적용 문구:** 전문 지도자가 학교·기관과 개인 수업을 직접 설계하고 운영합니다. 현장의 경험은 SPOMOVE와 SPOKEDU LAB으로 이어집니다.
  - **근거:** home-web-landing.tsx heroLead (HOME-LIVE-HERO)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** PENDING_APPROVAL · **PENDING_APPROVAL**

- **DOM ID:** `DOM-home_spomove-44` · **역할:** tag_chip · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[15]>div[32]>div[33]>div[34]>div[35]>span[26]`
  - **Stitch 원문:** #성장기록
  - **SPOKEDU 적용 문구:** #성장기록
  - **근거:** Hashtag chip — align with LIVE card tags in Phase C (TAG-CHIP)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** PENDING_APPROVAL · **PENDING_APPROVAL**

- **DOM ID:** `DOM-home_spomove-45` · **역할:** tag_chip · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[15]>div[32]>div[33]>div[34]>div[35]>span[27]`
  - **Stitch 원문:** #모바일알림
  - **SPOKEDU 적용 문구:** #모바일알림
  - **근거:** Hashtag chip — align with LIVE card tags in Phase C (TAG-CHIP)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** PENDING_APPROVAL · **PENDING_APPROVAL**

- **DOM ID:** `DOM-home_spomove-46` · **역할:** tag_chip · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[15]>div[32]>div[33]>div[34]>div[35]>span[28]`
  - **Stitch 원문:** #투명한피드백
  - **SPOKEDU 적용 문구:** #투명한피드백
  - **근거:** Hashtag chip — align with LIVE card tags in Phase C (TAG-CHIP)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** PENDING_APPROVAL · **PENDING_APPROVAL**

- **DOM ID:** `DOM-home_spomove-49` · **역할:** heading · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[15]>div[32]>div[37]>div[38]>div[39]>div[40]>div[42]>h4[1]`
  - **Stitch 원문:** 김서준 학생 종합 성장 리포트
  - **SPOKEDU 적용 문구:** 수업 기록 예시 (데모 UI — 실제 데이터 아님)
  - **근거:** Stitch fiction removed — neutral SPOKEDU slot copy (FACT-STAGE7-G07|G08|G09)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** FABRICATED_REPLACED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-home_spomove-50` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[15]>div[32]>div[37]>div[38]>div[39]>div[40]>div[42]>p[5]`
  - **Stitch 원문:** 2025. 03. 14 / 초등 방과후 스포츠 모션
  - **SPOKEDU 적용 문구:** 2025. 03. 14 / 초등 방과후 스포츠 모션
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

### SECTION 3: CODLE IMPACT METRICS (PURE WHITE, NO TIGHT BOXES)

- **DOM ID:** `DOM-home_spomove-62` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[3]>div[48]>div[49]>div[50]>p[6]`
  - **Stitch 원문:** 누적 출강 학교 및 기관
  - **SPOKEDU 적용 문구:** 누적 출강 학교 및 기관
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-home_spomove-64` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[3]>div[48]>div[49]>div[52]>p[7]`
  - **Stitch 원문:** 누적 운영 클래스 수
  - **SPOKEDU 적용 문구:** 누적 운영 클래스 수
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-home_spomove-66` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[3]>div[48]>div[49]>div[54]>p[8]`
  - **Stitch 원문:** 기관 및 학부모 재계약률
  - **SPOKEDU 적용 문구:** 기관 및 학부모 재계약률
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-home_spomove-68` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[3]>div[48]>div[49]>div[56]>p[9]`
  - **Stitch 원문:** 최단 맞춤 수업 세팅 기간
  - **SPOKEDU 적용 문구:** 최단 맞춤 수업 세팅 기간
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

### SECTION 4: UNIST EDITORIAL PHOTO GRID (RECENT HIGHLIGHTS)

- **DOM ID:** `DOM-home_spomove-70` · **역할:** heading · **경로:** `html[1]>body[1]>main[1]>div[5]>section[4]>div[58]>div[59]>div[60]>h2[4]`
  - **Stitch 원문:** 현장에서 꽃피는 스포무브의 기록
  - **SPOKEDU 적용 문구:** 현장에서 운영한 수업 사례
  - **근거:** records-page.ts hero (RC-I001)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** PENDING_APPROVAL · **PENDING_APPROVAL**

- **DOM ID:** `DOM-home_spomove-73` · **역할:** image · **경로:** `html[1]>body[1]>main[1]>div[5]>section[4]>div[58]>div[61]>a[15]>div[62]>img[4]`
  - **Stitch 원문:** Elementary students cheering together with colorful basketball cones on court, sunny outdoor modern Korean school ground, cheerful and vibrant mood.
  - **SPOKEDU 적용 문구:** (이미지 — COPY_SLOT_IMAGE_REGISTRY.csv 참조)
  - **근거:** Image slot; alt/prompt replaced at implementation (DEC-PACK-05)
  - **디자인 영향:** IMAGE_FRAME_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** IMAGE_PROVENANCE_REVIEW · **PENDING_APPROVAL**

- **DOM ID:** `DOM-home_spomove-77` · **역할:** heading · **경로:** `html[1]>body[1]>main[1]>div[5]>section[4]>div[58]>div[61]>a[15]>div[63]>div[64]>h3[1]`
  - **Stitch 원문:** 서울 24개 초등학교 늘봄학교 스포츠 거점 협약 체결
  - **SPOKEDU 적용 문구:** 키움센터 정규 SPOMOVE 수업
  - **근거:** field-records-catalog /records/dongjak-spomove (FIELD-CATALOG)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** VERIFIED_CATALOG · **PENDING_APPROVAL**

- **DOM ID:** `DOM-home_spomove-78` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[4]>div[58]>div[61]>a[15]>div[63]>div[64]>p[10]`
  - **Stitch 원문:** 학부모 부담을 덜고 학생들의 방과 후 체육 신체 활동을 활성화하는 맞춤 프로그램이 정규 개강되었습니다.
  - **SPOKEDU 적용 문구:** 거점형 키움센터에서 SPOMOVE 프로그램을 정기 운영한 사례입니다.
  - **근거:** field-records-catalog (FIELD-CATALOG)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** VERIFIED_CATALOG · **PENDING_APPROVAL**

- **DOM ID:** `DOM-home_spomove-81` · **역할:** image · **경로:** `html[1]>body[1]>main[1]>div[5]>section[4]>div[58]>div[61]>a[16]>div[68]>img[5]`
  - **Stitch 원문:** High school elite track athlete equipped with joint sensors doing speed dash test while coach checks tablet dashboard, sleek athletic biomechanics laboratory ambiance.
  - **SPOKEDU 적용 문구:** (이미지 — COPY_SLOT_IMAGE_REGISTRY.csv 참조)
  - **근거:** Image slot; alt/prompt replaced at implementation (DEC-PACK-05)
  - **디자인 영향:** IMAGE_FRAME_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** IMAGE_PROVENANCE_REVIEW · **PENDING_APPROVAL**

- **DOM ID:** `DOM-home_spomove-85` · **역할:** heading · **경로:** `html[1]>body[1]>main[1]>div[5]>section[4]>div[58]>div[61]>a[16]>div[69]>div[70]>h3[2]`
  - **Stitch 원문:** AI 관절 각도 추적 기술로 유소년 선수 부상률 42% 감소
  - **SPOKEDU 적용 문구:** PAPS·체력 중심 기관 수업
  - **근거:** field-records-catalog /records/yangcheon-paps (FIELD-CATALOG)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** VERIFIED_CATALOG · **PENDING_APPROVAL**

- **DOM ID:** `DOM-home_spomove-86` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[4]>div[58]>div[61]>a[16]>div[69]>div[70]>p[11]`
  - **Stitch 원문:** 무리한 스윙과 점프 착지 패턴을 실시간으로 감지하여 엘리트 유망주들의 고질적인 관절 부담을 획기적으로 개선했습니다.
  - **SPOKEDU 적용 문구:** 기관 환경에 맞춘 PAPS·체력 활동을 운영한 사례입니다.
  - **근거:** field-records-catalog (FIELD-CATALOG)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** VERIFIED_CATALOG · **PENDING_APPROVAL**

- **DOM ID:** `DOM-home_spomove-88` · **역할:** image · **경로:** `html[1]>body[1]>main[1]>div[5]>section[4]>div[58]>div[61]>a[17]>div[74]>img[6]`
  - **Stitch 원문:** Academic conference presentation room showing sports scientists discussing athletic growth chart with parents and teachers, modern auditorium with smart board.
  - **SPOKEDU 적용 문구:** (이미지 — COPY_SLOT_IMAGE_REGISTRY.csv 참조)
  - **근거:** Image slot; alt/prompt replaced at implementation (DEC-PACK-05)
  - **디자인 영향:** IMAGE_FRAME_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** IMAGE_PROVENANCE_REVIEW · **PENDING_APPROVAL**

- **DOM ID:** `DOM-home_spomove-92` · **역할:** heading · **경로:** `html[1]>body[1]>main[1]>div[5]>section[4]>div[58]>div[61]>a[17]>div[75]>div[76]>h3[3]`
  - **Stitch 원문:** 국내 주요 대학 에듀테크 연구진과 모션 알고리즘 발표
  - **SPOKEDU 적용 문구:** 학교 체육 프로그램 Step Up
  - **근거:** field-records-catalog /records/maedong-sports-stepup (FIELD-CATALOG)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** VERIFIED_CATALOG · **PENDING_APPROVAL**

- **DOM ID:** `DOM-home_spomove-93` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[4]>div[58]>div[61]>a[17]>div[75]>div[76]>p[12]`
  - **Stitch 원문:** 유소년 신체 발달 지연 조기 감지 모델 연구 결과를 공유하며 공교육 현장 보급 방안을 심도 있게 모색했습니다.
  - **SPOKEDU 적용 문구:** 학교 현장 조건에 맞춰 설계·운영한 체육수업 사례입니다.
  - **근거:** field-records-catalog (FIELD-CATALOG)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** VERIFIED_CATALOG · **PENDING_APPROVAL**

### SECTION 5: CODLE BOTTOM CTA FULL BANNER

- **DOM ID:** `DOM-home_spomove-96` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[5]>div[80]>p[13]`
  - **Stitch 원문:** 복잡한 행정 서류부터 코치 파견, 성장 리포트까지 원스톱으로 지원합니다. 사전 진단 테스트 및 상담은 100% 무료로 진행됩니다.
  - **SPOKEDU 적용 문구:** 대상 연령, 인원, 공간, 운영 목적을 확인한 뒤 적합한 수업 형태를 제안드립니다.
  - **근거:** records-page.ts cta.description (RC-CTA)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** PENDING_APPROVAL · **PENDING_APPROVAL**

- **DOM ID:** `DOM-home_spomove-98` · **역할:** cta · **경로:** `html[1]>body[1]>main[1]>div[5]>section[5]>div[80]>div[81]>a[19]`
  - **Stitch 원문:** 프로그램 제안서 다운로드
  - **SPOKEDU 적용 문구:** 수업 유형 살펴보기
  - **근거:** HOME-008 (HOME-008)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** /education
  - **검증·승인:** PENDING_APPROVAL · **PENDING_APPROVAL**

### Images

- **DOM-home_spomove-15** (SECTION 1: CODLE MINIMAL HERO)
  - Stitch prompt: Modern indoor sports gymnasium and EdTech training studio with high-tech sensors, children engaged in athletic conditioning under warm sunlight, clean Korean ac…
  - Candidate: /images/spokedu/home/home-hero-movement.jpg | /images/spokedu/home/field-editorial/home-hero-field.webp
  - Status: CANDIDATE_REVIEW · File exists; minor consent & publication rights FACT-STAGE7-G20
  - Approval: PENDING_APPROVAL

- **DOM-home_spomove-29** (SECTION 1: CODLE MINIMAL HERO)
  - Stitch prompt: South Korean elementary school students joyfully learning agility and basketball fundamentals with energetic young sports trainer in a pristine, bright gym spac…
  - Candidate: /images/spokedu/dispatch/dispatch-group-class.jpg
  - Status: CANDIDATE_REVIEW · File exists; minor consent & publication rights FACT-STAGE7-G20
  - Approval: PENDING_APPROVAL

- **DOM-home_spomove-31** (SECTION 1: CODLE MINIMAL HERO)
  - Stitch prompt: Professional athletic coach guiding a young student through posture adjustment and gentle stretching, showing warm mentorship, bright sunlit indoor sports train…
  - Candidate: /images/spokedu/private/private-coaching.jpg
  - Status: CANDIDATE_REVIEW · File exists; minor consent & publication rights FACT-STAGE7-G20
  - Approval: PENDING_APPROVAL

- **DOM-home_spomove-73** (SECTION 4: UNIST EDITORIAL PHOTO GRID (RECENT HIGHLIGHTS))
  - Stitch prompt: Elementary students cheering together with colorful basketball cones on court, sunny outdoor modern Korean school ground, cheerful and vibrant mood.…
  - Candidate: /images/spokedu/dispatch/dispatch-group-class.jpg
  - Status: CANDIDATE_REVIEW · File exists; minor consent & publication rights FACT-STAGE7-G20
  - Approval: PENDING_APPROVAL

- **DOM-home_spomove-81** (SECTION 4: UNIST EDITORIAL PHOTO GRID (RECENT HIGHLIGHTS))
  - Stitch prompt: High school elite track athlete equipped with joint sensors doing speed dash test while coach checks tablet dashboard, sleek athletic biomechanics laboratory am…
  - Candidate: /images/spokedu/home/field-editorial/home-master-ui.png
  - Status: CANDIDATE_REVIEW · File exists; minor consent & publication rights FACT-STAGE7-G20
  - Approval: PENDING_APPROVAL

- **DOM-home_spomove-88** (SECTION 4: UNIST EDITORIAL PHOTO GRID (RECENT HIGHLIGHTS))
  - Stitch prompt: Academic conference presentation room showing sports scientists discussing athletic growth chart with parents and teachers, modern auditorium with smart board.…
  - Candidate: /images/spokedu/home/field-editorial/home-service-institution.jpg
  - Status: CANDIDATE_REVIEW · File exists; minor consent & publication rights FACT-STAGE7-G20
  - Approval: PENDING_APPROVAL

---

## Page `/education` — `education_programs_spomove`

**DOM slots:** 133 · **Coverage gap estimate:** 2 minor text fragments (material icons / duplicates)

### Sections (Stitch comment order)


### UNLABELED

- **DOM ID:** `DOM-education_programs_spomove-10` · **역할:** heading · **경로:** `html[1]>body[1]>main[1]>div[5]>section[1]>div[6]>div[7]>h1[1]`
  - **Stitch 원문:** 학교와 기관을 위한 맞춤형 스포츠 커리큘럼
  - **SPOKEDU 적용 문구:** 학교와 기관을 위한 맞춤형 스포츠 커리큘럼
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-education_programs_spomove-11` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[1]>div[6]>div[7]>p[1]`
  - **Stitch 원문:** 카이스트 및 체육 교육학 연구진이 설계한 데이터 기반 맞춤형 체육 솔루션입니다. 늘봄학교, 초·중등 공교육, 지자체 및 유아 교육기관의 특성에 맞춘 체계적인 모듈형 스포츠 교육을 경험해보세요.
  - **SPOKEDU 적용 문구:** 카이스트 및 체육 교육학 연구진이 설계한 데이터 기반 맞춤형 체육 솔루션입니다. 늘봄학교, 초·중등 공교육, 지자체 및 유아 교육기관의 특성에 맞춘 체계적인 모듈형 스포츠 교육을 경험해보세요.
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-education_programs_spomove-12` · **역할:** cta · **경로:** `html[1]>body[1]>main[1]>div[5]>section[1]>div[6]>div[7]>div[9]>a[9]`
  - **Stitch 원문:** 전체 프로그램 둘러보기
  - **SPOKEDU 적용 문구:** 수업 유형 살펴보기
  - **근거:** HOME-008 (HOME-008)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** PENDING_APPROVAL · **PENDING_APPROVAL**

- **DOM ID:** `DOM-education_programs_spomove-13` · **역할:** cta · **경로:** `html[1]>body[1]>main[1]>div[5]>section[1]>div[6]>div[7]>div[9]>a[10]`
  - **Stitch 원문:** 도입 절차 안내
  - **SPOKEDU 적용 문구:** 도입 절차 안내
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-education_programs_spomove-15` · **역할:** heading · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[10]>div[11]>div[12]>h2[1]`
  - **Stitch 원문:** 기관 특화 교육 프로그램 라인업
  - **SPOKEDU 적용 문구:** 기관·학교 수업
  - **근거:** site.ts / brandProfile CODE_SSOT (FACT-NAV-001)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** CODE_SSOT · **PENDING_APPROVAL**

- **DOM ID:** `DOM-education_programs_spomove-16` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[10]>div[11]>p[2]`
  - **Stitch 원문:** 연령대별 발달 과업과 공간 규격에 최적화된 6가지 표준 모듈입니다. 국가 공인 지도사와 AI 분석 코치가 함께 투입됩니다.
  - **SPOKEDU 적용 문구:** 연령대별 발달 과업과 공간 규격에 최적화된 6가지 표준 모듈입니다. 국가 공인 지도사와 AI 분석 코치가 함께 투입됩니다.
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-education_programs_spomove-18` · **역할:** image · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[10]>div[13]>article[1]>div[14]>div[15]>img[1]`
  - **Stitch 원문:** Elementary students playing structured indoor basketball and fitness drills inside a bright clean Korean elementary gymnasium, warm natural sunlight through windows, clean modern equipment in blue and white, dynamic action shot with joyful focus
  - **SPOKEDU 적용 문구:** (이미지 — COPY_SLOT_IMAGE_REGISTRY.csv 참조)
  - **근거:** Image slot; alt/prompt replaced at implementation (DEC-PACK-05)
  - **디자인 영향:** IMAGE_FRAME_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** IMAGE_PROVENANCE_REVIEW · **PENDING_APPROVAL**

- **DOM ID:** `DOM-education_programs_spomove-22` · **역할:** heading · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[10]>div[13]>article[1]>div[14]>h3[1]`
  - **Stitch 원문:** 초등 늘봄/방과후 체육
  - **SPOKEDU 적용 문구:** 초등 늘봄/방과후 체육
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-education_programs_spomove-23` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[10]>div[13]>article[1]>div[14]>p[3]`
  - **Stitch 원문:** 기초 체력 향상과 구기 종목 입문을 결합한 커리큘럼으로 신체 발달과 협동심을 동시에 기르는 초등 맞춤형 수업입니다.
  - **SPOKEDU 적용 문구:** 기초 체력 향상과 구기 종목 입문을 결합한 커리큘럼으로 신체 발달과 협동심을 동시에 기르는 초등 맞춤형 수업입니다.
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-education_programs_spomove-28` · **역할:** image · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[10]>div[13]>article[2]>div[19]>div[20]>img[2]`
  - **Stitch 원문:** Young athletic children running agile ladder drills in a modern bright sports training center, motion capture markers visible in background, energetic sports setting, cool crisp tones and focus
  - **SPOKEDU 적용 문구:** (이미지 — COPY_SLOT_IMAGE_REGISTRY.csv 참조)
  - **근거:** Image slot; alt/prompt replaced at implementation (DEC-PACK-05)
  - **디자인 영향:** IMAGE_FRAME_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** IMAGE_PROVENANCE_REVIEW · **PENDING_APPROVAL**

- **DOM ID:** `DOM-education_programs_spomove-32` · **역할:** heading · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[10]>div[13]>article[2]>div[19]>h3[2]`
  - **Stitch 원문:** 유소년 성장 피지컬
  - **SPOKEDU 적용 문구:** 유소년 성장 피지컬
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-education_programs_spomove-33` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[10]>div[13]>article[2]>div[19]>p[4]`
  - **Stitch 원문:** 급격한 골격 성장에 따른 자세 불균형을 교정하고 코어 중심 안정성과 유연성 확립을 위한 과학적 피지컬 트레이닝입니다.
  - **SPOKEDU 적용 문구:** 급격한 골격 성장에 따른 자세 불균형을 교정하고 코어 중심 안정성과 유연성 확립을 위한 과학적 피지컬 트레이닝입니다.
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-education_programs_spomove-37` · **역할:** image · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[10]>div[13]>article[3]>div[24]>div[25]>img[3]`
  - **Stitch 원문:** Toddlers and young preschool kids enthusiastically hopping over safe colorful foam blocks and soft balance beams in an airy high-ceiling kindergarten, warm pastel accents with soft diffused daylight, secure padded floor
  - **SPOKEDU 적용 문구:** (이미지 — COPY_SLOT_IMAGE_REGISTRY.csv 참조)
  - **근거:** Image slot; alt/prompt replaced at implementation (DEC-PACK-05)
  - **디자인 영향:** IMAGE_FRAME_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** IMAGE_PROVENANCE_REVIEW · **PENDING_APPROVAL**

- **DOM ID:** `DOM-education_programs_spomove-41` · **역할:** heading · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[10]>div[13]>article[3]>div[24]>h3[3]`
  - **Stitch 원문:** 유치부 유아체육
  - **SPOKEDU 적용 문구:** 유치부 유아체육
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-education_programs_spomove-42` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[10]>div[13]>article[3]>div[24]>p[5]`
  - **Stitch 원문:** 음악과 스토리가 접목된 감각 통합 놀이 기반으로 두뇌와 신체의 동시 발달을 견인하는 친환경 세이프티 프로그램입니다.
  - **SPOKEDU 적용 문구:** 음악과 스토리가 접목된 감각 통합 놀이 기반으로 두뇌와 신체의 동시 발달을 견인하는 친환경 세이프티 프로그램입니다.
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-education_programs_spomove-46` · **역할:** image · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[10]>div[13]>article[4]>div[29]>div[30]>img[4]`
  - **Stitch 원문:** Professional sports coach giving instructions using a tablet to youth sports teams in a clean modern multi-purpose community recreation hall, high-tech academic sports atmosphere, crisp daylight
  - **SPOKEDU 적용 문구:** (이미지 — COPY_SLOT_IMAGE_REGISTRY.csv 참조)
  - **근거:** Image slot; alt/prompt replaced at implementation (DEC-PACK-05)
  - **디자인 영향:** IMAGE_FRAME_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** IMAGE_PROVENANCE_REVIEW · **PENDING_APPROVAL**

- **DOM ID:** `DOM-education_programs_spomove-50` · **역할:** heading · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[10]>div[13]>article[4]>div[29]>h3[4]`
  - **Stitch 원문:** 기관 특화 체육
  - **SPOKEDU 적용 문구:** 기관 특화 체육
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-education_programs_spomove-51` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[10]>div[13]>article[4]>div[29]>p[6]`
  - **Stitch 원문:** 복지관, 청소년 수련원, 기업 임직원 자녀 복지관 등 기관의 예산과 환경에 맞춤형으로 지도자를 파견하고 운영합니다.
  - **SPOKEDU 적용 문구:** 복지관, 청소년 수련원, 기업 임직원 자녀 복지관 등 기관의 예산과 환경에 맞춤형으로 지도자를 파견하고 운영합니다.
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-education_programs_spomove-55` · **역할:** image · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[10]>div[13]>article[5]>div[34]>div[35]>img[5]`
  - **Stitch 원문:** Group of students wearing matching royal blue jerseys celebrating high five after a soccer match on an outdoor pristine turf field on a clear sunny afternoon, sharp photography, dynamic youth movement
  - **SPOKEDU 적용 문구:** (이미지 — COPY_SLOT_IMAGE_REGISTRY.csv 참조)
  - **근거:** Image slot; alt/prompt replaced at implementation (DEC-PACK-05)
  - **디자인 영향:** IMAGE_FRAME_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** IMAGE_PROVENANCE_REVIEW · **PENDING_APPROVAL**

- **DOM ID:** `DOM-education_programs_spomove-59` · **역할:** heading · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[10]>div[13]>article[5]>div[34]>h3[5]`
  - **Stitch 원문:** 방학 시즌 특강
  - **SPOKEDU 적용 문구:** 방학 시즌 특강
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-education_programs_spomove-60` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[10]>div[13]>article[5]>div[34]>p[7]`
  - **Stitch 원문:** 수영, 스키, 축구 인텐시브 등 방학 기간 동안 한 종목을 단기간에 마스터할 수 있도록 기획된 집중 몰입형 체육 캠프입니다.
  - **SPOKEDU 적용 문구:** 수영, 스키, 축구 인텐시브 등 방학 기간 동안 한 종목을 단기간에 마스터할 수 있도록 기획된 집중 몰입형 체육 캠프입니다.
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-education_programs_spomove-64` · **역할:** image · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[10]>div[13]>article[6]>div[39]>div[40]>img[6]`
  - **Stitch 원문:** Young student practicing safe landing technique on blue crash mats supervised by certified instructor in gymnastics center, clean minimalist aesthetic, focus on posture and joint protection
  - **SPOKEDU 적용 문구:** (이미지 — COPY_SLOT_IMAGE_REGISTRY.csv 참조)
  - **근거:** Image slot; alt/prompt replaced at implementation (DEC-PACK-05)
  - **디자인 영향:** IMAGE_FRAME_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** IMAGE_PROVENANCE_REVIEW · **PENDING_APPROVAL**

- **DOM ID:** `DOM-education_programs_spomove-68` · **역할:** heading · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[10]>div[13]>article[6]>div[39]>h3[6]`
  - **Stitch 원문:** 기초 기계체조 및 안전
  - **SPOKEDU 적용 문구:** 기초 기계체조 및 안전
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-education_programs_spomove-69` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[10]>div[13]>article[6]>div[39]>p[8]`
  - **Stitch 원문:** 신체 컨트롤의 기초인 매트 운동과 낙법을 익혀 일상 낙상 사고를 예방하고 척추 유연성을 극대화하는 안전 체육입니다.
  - **SPOKEDU 적용 문구:** 신체 컨트롤의 기초인 매트 운동과 낙법을 익혀 일상 낙상 사고를 예방하고 척추 유연성을 극대화하는 안전 체육입니다.
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-education_programs_spomove-72` · **역할:** decorative_number · **경로:** `html[1]>body[1]>main[1]>div[5]>section[3]>div[44]>div[45]>div[46]>div[47]`
  - **Stitch 원문:** 01
  - **SPOKEDU 적용 문구:** 01
  - **근거:** Stitch watermark decoration — design SSOT (DESIGN-ONLY)
  - **디자인 영향:** TEXT_SLOT_LOCKED;METRIC_GRAPHIC_PRESERVED
  - **CTA 목적지:** —
  - **검증·승인:** DESIGN_ONLY · **PENDING_APPROVAL**

- **DOM ID:** `DOM-education_programs_spomove-73` · **역할:** heading · **경로:** `html[1]>body[1]>main[1]>div[5]>section[3]>div[44]>div[45]>div[46]>h3[7]`
  - **Stitch 원문:** 기관 맞춤형 사전 진단 & 설계
  - **SPOKEDU 적용 문구:** 기관 맞춤형 사전 진단 & 설계
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-education_programs_spomove-74` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[3]>div[44]>div[45]>div[46]>p[9]`
  - **Stitch 원문:** 학교 체육관 면적, 바닥 마감재, 보유 교구, 학사 일정을 면밀히 실사합니다. 스포무브의 AI 진단 지표를 기반으로 위험 요소를 사전에 제거하고 최적의 차시별 로드맵을 확정합니다.
  - **SPOKEDU 적용 문구:** 학교 체육관 면적, 바닥 마감재, 보유 교구, 학사 일정을 면밀히 실사합니다. 스포무브의 AI 진단 지표를 기반으로 위험 요소를 사전에 제거하고 최적의 차시별 로드맵을 확정합니다.
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-education_programs_spomove-79` · **역할:** cta · **경로:** `html[1]>body[1]>main[1]>div[5]>section[3]>div[44]>div[45]>div[46]>a[11]`
  - **Stitch 원문:** 진단 프로세스 세부 가이드라인 보기 arrow_forward
  - **SPOKEDU 적용 문구:** 수업 유형 살펴보기
  - **근거:** HOME-008 (HOME-008)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** /contact
  - **검증·승인:** PENDING_APPROVAL · **PENDING_APPROVAL**

- **DOM ID:** `DOM-education_programs_spomove-80` · **역할:** image · **경로:** `html[1]>body[1]>main[1]>div[5]>section[3]>div[44]>div[45]>div[49]>div[50]>img[7]`
  - **Stitch 원문:** Technical sports curriculum planning session with coaches reviewing school gym blueprints and sports data analytics on tablet screens, clean brightly lit office environment, professional editorial style
  - **SPOKEDU 적용 문구:** (이미지 — COPY_SLOT_IMAGE_REGISTRY.csv 참조)
  - **근거:** Image slot; alt/prompt replaced at implementation (DEC-PACK-05)
  - **디자인 영향:** IMAGE_FRAME_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** IMAGE_PROVENANCE_REVIEW · **PENDING_APPROVAL**

- **DOM ID:** `DOM-education_programs_spomove-81` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[3]>div[44]>div[45]>div[49]>div[50]>div[51]>div[52]>p[10]`
  - **Stitch 원문:** STEP 01 DELIVERABLE
  - **SPOKEDU 적용 문구:** STEP 01 DELIVERABLE
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-education_programs_spomove-82` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[3]>div[44]>div[45]>div[49]>div[50]>div[51]>div[52]>p[11]`
  - **Stitch 원문:** 기관 전용 커리큘럼 제안서 & 공간 적합성 리포트
  - **SPOKEDU 적용 문구:** 기관 전용 커리큘럼 제안서 & 공간 적합성 리포트
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-education_programs_spomove-83` · **역할:** image · **경로:** `html[1]>body[1]>main[1]>div[5]>section[3]>div[44]>div[53]>div[54]>div[55]>img[8]`
  - **Stitch 원문:** Certified sports instructor conducting dynamic movement class for active children with smart camera sensor tracking motions in real-time, academic edtech gym, high visual clarity, warm vibrant energy
  - **SPOKEDU 적용 문구:** (이미지 — COPY_SLOT_IMAGE_REGISTRY.csv 참조)
  - **근거:** Image slot; alt/prompt replaced at implementation (DEC-PACK-05)
  - **디자인 영향:** IMAGE_FRAME_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** IMAGE_PROVENANCE_REVIEW · **PENDING_APPROVAL**

- **DOM ID:** `DOM-education_programs_spomove-84` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[3]>div[44]>div[53]>div[54]>div[55]>div[56]>div[57]>p[12]`
  - **Stitch 원문:** STEP 02 OPERATION
  - **SPOKEDU 적용 문구:** STEP 02 OPERATION
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-education_programs_spomove-85` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[3]>div[44]>div[53]>div[54]>div[55]>div[56]>div[57]>p[13]`
  - **Stitch 원문:** 국가공인 전문 지도사 파견 & 실시간 모니터링
  - **SPOKEDU 적용 문구:** 국가공인 전문 지도사 파견 & 실시간 모니터링
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-education_programs_spomove-86` · **역할:** decorative_number · **경로:** `html[1]>body[1]>main[1]>div[5]>section[3]>div[44]>div[53]>div[58]>div[59]`
  - **Stitch 원문:** 02
  - **SPOKEDU 적용 문구:** 02
  - **근거:** Stitch watermark decoration — design SSOT (DESIGN-ONLY)
  - **디자인 영향:** TEXT_SLOT_LOCKED;METRIC_GRAPHIC_PRESERVED
  - **CTA 목적지:** —
  - **검증·승인:** DESIGN_ONLY · **PENDING_APPROVAL**

- **DOM ID:** `DOM-education_programs_spomove-87` · **역할:** heading · **경로:** `html[1]>body[1]>main[1]>div[5]>section[3]>div[44]>div[53]>div[58]>h3[8]`
  - **Stitch 원문:** 공인 지도사 파견 및 데이터 피드백
  - **SPOKEDU 적용 문구:** 공인 지도사 파견 및 데이터 피드백
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-education_programs_spomove-88` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[3]>div[44]>div[53]>div[58]>p[14]`
  - **Stitch 원문:** 엄격한 인성 검증 및 아동 발달 수료를 마친 정규 코칭 스태프가 출강합니다. 매 수업 후 모션 AI 분석 로그가 학부모 및 기관 관리자 포털에 자동 동기화되어 교육 성취도를 투명하게 공개합니다.
  - **SPOKEDU 적용 문구:** 엄격한 인성 검증 및 아동 발달 수료를 마친 정규 코칭 스태프가 출강합니다. 매 수업 후 모션 AI 분석 로그가 학부모 및 기관 관리자 포털에 자동 동기화되어 교육 성취도를 투명하게 공개합니다.
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-education_programs_spomove-93` · **역할:** cta · **경로:** `html[1]>body[1]>main[1]>div[5]>section[3]>div[44]>div[53]>div[58]>a[12]`
  - **Stitch 원문:** AI 모션 분석 시스템 원리 보기 arrow_forward
  - **SPOKEDU 적용 문구:** 수업 유형 살펴보기
  - **근거:** HOME-008 (HOME-008)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** /spomove
  - **검증·승인:** PENDING_APPROVAL · **PENDING_APPROVAL**

- **DOM ID:** `DOM-education_programs_spomove-95` · **역할:** heading · **경로:** `html[1]>body[1]>main[1]>div[5]>section[4]>div[61]>div[62]>h2[2]`
  - **Stitch 원문:** 수치로 입증된 공교육 및 기관 신뢰
  - **SPOKEDU 적용 문구:** 수치로 입증된 공교육 및 기관 신뢰
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-education_programs_spomove-96` · **역할:** metric_display · **경로:** `html[1]>body[1]>main[1]>div[5]>section[4]>div[61]>div[63]>div[64]>div[65]`
  - **Stitch 원문:** 500+
  - **SPOKEDU 적용 문구:** —
  - **근거:** 미검증 Stitch 지표 → 숫자 비활성 (FACT-STAGE7-G08)
  - **디자인 영향:** TEXT_SLOT_LOCKED;METRIC_GRAPHIC_PRESERVED
  - **CTA 목적지:** —
  - **검증·승인:** BLOCKED_UNTIL_LEDGER · **PENDING_APPROVAL**

- **DOM ID:** `DOM-education_programs_spomove-97` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[4]>div[61]>div[63]>div[64]>p[15]`
  - **Stitch 원문:** 누적 파트너 교육 기관
  - **SPOKEDU 적용 문구:** 누적 파트너 교육 기관
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-education_programs_spomove-98` · **역할:** metric_display · **경로:** `html[1]>body[1]>main[1]>div[5]>section[4]>div[61]>div[63]>div[66]>div[67]`
  - **Stitch 원문:** 12,000+
  - **SPOKEDU 적용 문구:** 12,000+
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED;METRIC_GRAPHIC_PRESERVED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-education_programs_spomove-99` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[4]>div[61]>div[63]>div[66]>p[16]`
  - **Stitch 원문:** 정규 교육 참여 학생 수
  - **SPOKEDU 적용 문구:** 정규 교육 참여 학생 수
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-education_programs_spomove-100` · **역할:** metric_display · **경로:** `html[1]>body[1]>main[1]>div[5]>section[4]>div[61]>div[63]>div[68]>div[69]`
  - **Stitch 원문:** 99.4%
  - **SPOKEDU 적용 문구:** —
  - **근거:** Stitch fiction removed — neutral SPOKEDU slot copy (FACT-STAGE7-G07|G08|G09)
  - **디자인 영향:** TEXT_SLOT_LOCKED;METRIC_GRAPHIC_PRESERVED
  - **CTA 목적지:** —
  - **검증·승인:** FABRICATED_REPLACED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-education_programs_spomove-101` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[4]>div[61]>div[63]>div[68]>p[17]`
  - **Stitch 원문:** 안전 수칙 준수 및 무사고율
  - **SPOKEDU 적용 문구:** 안전 수칙 준수 및 무사고율
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-education_programs_spomove-102` · **역할:** metric_display · **경로:** `html[1]>body[1]>main[1]>div[5]>section[4]>div[61]>div[63]>div[70]>div[71]`
  - **Stitch 원문:** 4.9/5
  - **SPOKEDU 적용 문구:** 4.9/5
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED;METRIC_GRAPHIC_PRESERVED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-education_programs_spomove-103` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[4]>div[61]>div[63]>div[70]>p[18]`
  - **Stitch 원문:** 학부모 및 교직원 만족도
  - **SPOKEDU 적용 문구:** 학부모 및 교직원 만족도
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-education_programs_spomove-105` · **역할:** heading · **경로:** `html[1]>body[1]>main[1]>div[5]>section[5]>div[72]>div[73]>div[76]>h2[3]`
  - **Stitch 원문:** 우리 학교·기관에 완벽히 들어맞는 스포츠 교육을 지금 바로 설계해보세요
  - **SPOKEDU 적용 문구:** 우리 학교·기관에 완벽히 들어맞는 스포츠 교육을 지금 바로 설계해보세요
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-education_programs_spomove-106` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[5]>div[72]>div[73]>div[76]>p[19]`
  - **Stitch 원문:** 전담 연구원이 귀 기관의 예산, 참여 인원, 체육 공간에 최적화된 맞춤형 커리큘럼 제안서와 견적을 24시간 내 발송해 드립니다.
  - **SPOKEDU 적용 문구:** 전담 연구원이 귀 기관의 예산, 참여 인원, 체육 공간에 최적화된 맞춤형 커리큘럼 제안서와 견적을 24시간 내 발송해 드립니다.
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-education_programs_spomove-107` · **역할:** cta · **경로:** `html[1]>body[1]>main[1]>div[5]>section[5]>div[72]>div[73]>div[76]>div[77]>a[13]`
  - **Stitch 원문:** 기관 제안서 다운로드 & 상담 신청
  - **SPOKEDU 적용 문구:** 수업 상담하기
  - **근거:** siteHeaderCta + home hero (HOME-CTA)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** /contact
  - **검증·승인:** PENDING_APPROVAL · **PENDING_APPROVAL**

- **DOM ID:** `DOM-education_programs_spomove-108` · **역할:** cta · **경로:** `html[1]>body[1]>main[1]>div[5]>section[5]>div[72]>div[73]>div[76]>div[77]>a[14]`
  - **Stitch 원문:** 실제 학교 운영 사례 확인
  - **SPOKEDU 적용 문구:** 실제 학교 운영 사례 확인
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** /records
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

### Images

- **DOM-education_programs_spomove-18** (UNLABELED)
  - Stitch prompt: Elementary students playing structured indoor basketball and fitness drills inside a bright clean Korean elementary gymnasium, warm natural sunlight through win…
  - Candidate: /images/spokedu/dispatch/dispatch-group-class.jpg
  - Status: CANDIDATE_REVIEW · File exists; minor consent & publication rights FACT-STAGE7-G20
  - Approval: PENDING_APPROVAL

- **DOM-education_programs_spomove-28** (UNLABELED)
  - Stitch prompt: Young athletic children running agile ladder drills in a modern bright sports training center, motion capture markers visible in background, energetic sports se…
  - Candidate: /images/spokedu/home/field-editorial/home-hero-ai-20261018.png
  - Status: CANDIDATE_REVIEW · File exists; minor consent & publication rights FACT-STAGE7-G20
  - Approval: PENDING_APPROVAL

- **DOM-education_programs_spomove-37** (UNLABELED)
  - Stitch prompt: Toddlers and young preschool kids enthusiastically hopping over safe colorful foam blocks and soft balance beams in an airy high-ceiling kindergarten, warm past…
  - Candidate: /images/spokedu/private/curriculum-preschool.jpg | /images/spokedu/복지관_민첩성 놀이체육.jpg
  - Status: CANDIDATE_REVIEW · File exists; minor consent & publication rights FACT-STAGE7-G20
  - Approval: PENDING_APPROVAL

- **DOM-education_programs_spomove-46** (UNLABELED)
  - Stitch prompt: Professional sports coach giving instructions using a tablet to youth sports teams in a clean modern multi-purpose community recreation hall, high-tech academic…
  - Candidate: /images/spokedu/private/private-coaching.jpg
  - Status: CANDIDATE_REVIEW · File exists; minor consent & publication rights FACT-STAGE7-G20
  - Approval: PENDING_APPROVAL

- **DOM-education_programs_spomove-55** (UNLABELED)
  - Stitch prompt: Group of students wearing matching royal blue jerseys celebrating high five after a soccer match on an outdoor pristine turf field on a clear sunny afternoon, s…
  - Candidate: /images/spokedu/records/dongjak-spomove-field.jpg | /images/spokedu/private/curriculum-soccer.jpg
  - Status: CANDIDATE_REVIEW · File exists; minor consent & publication rights FACT-STAGE7-G20
  - Approval: PENDING_APPROVAL

- **DOM-education_programs_spomove-64** (UNLABELED)
  - Stitch prompt: Young student practicing safe landing technique on blue crash mats supervised by certified instructor in gymnastics center, clean minimalist aesthetic, focus on…
  - Candidate: /images/spokedu/private/class-flow-01.jpg
  - Status: CANDIDATE_REVIEW · File exists; minor consent & publication rights FACT-STAGE7-G20
  - Approval: PENDING_APPROVAL

- **DOM-education_programs_spomove-80** (UNLABELED)
  - Stitch prompt: Technical sports curriculum planning session with coaches reviewing school gym blueprints and sports data analytics on tablet screens, clean brightly lit office…
  - Candidate: /images/spokedu/home/field-editorial/home-master-ui.png
  - Status: CANDIDATE_REVIEW · File exists; minor consent & publication rights FACT-STAGE7-G20
  - Approval: PENDING_APPROVAL

- **DOM-education_programs_spomove-83** (UNLABELED)
  - Stitch prompt: Certified sports instructor conducting dynamic movement class for active children with smart camera sensor tracking motions in real-time, academic edtech gym, h…
  - Candidate: /images/spokedu/home/home-hero-movement.jpg | /images/spokedu/home/field-editorial/home-hero-field.webp
  - Status: CANDIDATE_REVIEW · File exists; minor consent & publication rights FACT-STAGE7-G20
  - Approval: PENDING_APPROVAL

---

## Page `/private` — `private_lesson_spomove`

**DOM slots:** 111 · **Coverage gap estimate:** 0 minor text fragments (material icons / duplicates)

### Sections (Stitch comment order)


### UNLABELED

- **DOM ID:** `DOM-private_lesson_spomove-10` · **역할:** heading · **경로:** `html[1]>body[1]>main[1]>div[5]>section[1]>div[7]>h1[1]`
  - **Stitch 원문:** 1:1 프라이빗 맞춤 레슨으로 아이의 운동 신경과 자신감을 완성합니다.
  - **SPOKEDU 적용 문구:** 1:1 프라이빗 맞춤 레슨으로 아이의 운동 신경과 자신감을 완성합니다.
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-private_lesson_spomove-11` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[1]>div[7]>p[1]`
  - **Stitch 원문:** 단편적인 동작 암기가 아닌, FMS 바이오메카닉스 분석과 국가공인 엘리트 코칭진의 밀착 설계를 통해 잠재된 신체 밸런스를 이끌어냅니다.
  - **SPOKEDU 적용 문구:** SPOKEDU 체육교육 · SPOMOVE 프로그램
  - **근거:** Stitch fiction removed — neutral SPOKEDU slot copy (FACT-STAGE7-G07|G08|G09)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** FABRICATED_REPLACED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-private_lesson_spomove-12` · **역할:** cta · **경로:** `html[1]>body[1]>main[1]>div[5]>section[1]>div[7]>div[9]>a[9]`
  - **Stitch 원문:** 체험 레슨 신청하기 arrow_forward
  - **SPOKEDU 적용 문구:** 체험 레슨 신청하기 arrow_forward
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-private_lesson_spomove-13` · **역할:** cta · **경로:** `html[1]>body[1]>main[1]>div[5]>section[1]>div[7]>div[9]>a[10]`
  - **Stitch 원문:** 프로그램 차별점 알아보기
  - **SPOKEDU 적용 문구:** 수업 유형 살펴보기
  - **근거:** HOME-008 (HOME-008)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** PENDING_APPROVAL · **PENDING_APPROVAL**

- **DOM ID:** `DOM-private_lesson_spomove-16` · **역할:** metric_display · **경로:** `html[1]>body[1]>main[1]>div[5]>section[1]>div[7]>div[10]>div[11]>span[8]`
  - **Stitch 원문:** 98.6%
  - **SPOKEDU 적용 문구:** 98.6%
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED;METRIC_GRAPHIC_PRESERVED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-private_lesson_spomove-19` · **역할:** metric_display · **경로:** `html[1]>body[1]>main[1]>div[5]>section[1]>div[7]>div[10]>div[12]>span[11]`
  - **Stitch 원문:** 1:1Care
  - **SPOKEDU 적용 문구:** 1:1Care
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED;METRIC_GRAPHIC_PRESERVED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-private_lesson_spomove-22` · **역할:** metric_display · **경로:** `html[1]>body[1]>main[1]>div[5]>section[1]>div[7]>div[10]>div[13]>span[14]`
  - **Stitch 원문:** 300+
  - **SPOKEDU 적용 문구:** 300+
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED;METRIC_GRAPHIC_PRESERVED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-private_lesson_spomove-24` · **역할:** decorative_number · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[14]>div[15]>div[16]>div[17]`
  - **Stitch 원문:** 01
  - **SPOKEDU 적용 문구:** 01
  - **근거:** Stitch watermark decoration — design SSOT (DESIGN-ONLY)
  - **디자인 영향:** TEXT_SLOT_LOCKED;METRIC_GRAPHIC_PRESERVED
  - **CTA 목적지:** —
  - **검증·승인:** DESIGN_ONLY · **PENDING_APPROVAL**

- **DOM ID:** `DOM-private_lesson_spomove-25` · **역할:** tag_chip · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[14]>div[15]>div[16]>div[18]>div[19]`
  - **Stitch 원문:** #정밀진단 #체형분석
  - **SPOKEDU 적용 문구:** #정밀진단 #체형분석
  - **근거:** Hashtag chip — align with LIVE card tags in Phase C (TAG-CHIP)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** PENDING_APPROVAL · **PENDING_APPROVAL**

- **DOM ID:** `DOM-private_lesson_spomove-26` · **역할:** tag_chip · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[14]>div[15]>div[16]>div[18]>div[19]>span[17]`
  - **Stitch 원문:** #정밀진단
  - **SPOKEDU 적용 문구:** #정밀진단
  - **근거:** Hashtag chip — align with LIVE card tags in Phase C (TAG-CHIP)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** PENDING_APPROVAL · **PENDING_APPROVAL**

- **DOM ID:** `DOM-private_lesson_spomove-27` · **역할:** tag_chip · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[14]>div[15]>div[16]>div[18]>div[19]>span[18]`
  - **Stitch 원문:** #체형분석
  - **SPOKEDU 적용 문구:** #체형분석
  - **근거:** Hashtag chip — align with LIVE card tags in Phase C (TAG-CHIP)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** PENDING_APPROVAL · **PENDING_APPROVAL**

- **DOM ID:** `DOM-private_lesson_spomove-28` · **역할:** heading · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[14]>div[15]>div[16]>div[18]>h2[1]`
  - **Stitch 원문:** 체계적인 FMS(기능적 움직임 검사) 기반 진단
  - **SPOKEDU 적용 문구:** 체계적인 FMS(기능적 움직임 검사) 기반 진단
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-private_lesson_spomove-29` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[14]>div[15]>div[16]>div[18]>p[2]`
  - **Stitch 원문:** 단순 관찰이 아닌 7가지 스크리닝 지표와 AI 컴퓨터 비전을 통해 아이의 척추 정렬, 관절 가동성, 비대칭성을 정밀 수치화합니다.
  - **SPOKEDU 적용 문구:** 단순 관찰이 아닌 7가지 스크리닝 지표와 AI 컴퓨터 비전을 통해 아이의 척추 정렬, 관절 가동성, 비대칭성을 정밀 수치화합니다.
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-private_lesson_spomove-30` · **역할:** cta · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[14]>div[15]>div[16]>div[18]>div[20]>a[11]`
  - **Stitch 원문:** FMS 평가 프로세스 상세히 보기 east
  - **SPOKEDU 적용 문구:** 수업 유형 살펴보기
  - **근거:** HOME-008 (HOME-008)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** PENDING_APPROVAL · **PENDING_APPROVAL**

- **DOM ID:** `DOM-private_lesson_spomove-31` · **역할:** image · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[14]>div[15]>div[21]>div[22]>div[23]>img[1]`
  - **Stitch 원문:** An advanced pediatric athletic assessment in a brightly lit modern sports science laboratory. A smiling Korean adolescent performs a controlled mobility test while an instructor uses a digital tablet displaying skeleton tracking and biomechanical joint angle overlays. Clean blue …
  - **SPOKEDU 적용 문구:** (이미지 — COPY_SLOT_IMAGE_REGISTRY.csv 참조)
  - **근거:** Image slot; alt/prompt replaced at implementation (DEC-PACK-05)
  - **디자인 영향:** IMAGE_FRAME_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** IMAGE_PROVENANCE_REVIEW · **PENDING_APPROVAL**

- **DOM ID:** `DOM-private_lesson_spomove-33` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[14]>div[15]>div[21]>div[22]>div[23]>div[24]>div[25]>div[27]>p[3]`
  - **Stitch 원문:** 3D 신체 회전 및 밸런스 지수
  - **SPOKEDU 적용 문구:** 3D 신체 회전 및 밸런스 지수
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-private_lesson_spomove-34` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[14]>div[15]>div[21]>div[22]>div[23]>div[24]>div[25]>div[27]>p[4]`
  - **Stitch 원문:** 좌우 균형 지수 94.2% 안정
  - **SPOKEDU 적용 문구:** —
  - **근거:** 미검증 Stitch 지표 → 숫자 비활성 (FACT-STAGE7-G08)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** BLOCKED_UNTIL_LEDGER · **PENDING_APPROVAL**

- **DOM ID:** `DOM-private_lesson_spomove-36` · **역할:** image · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[14]>div[28]>div[29]>div[30]>div[31]>img[2]`
  - **Stitch 원문:** A warm, engaging private one-on-one sports coaching session inside a premium indoor sports studio with polished maple wood floors and royal blue accents. A certified elite Korean youth sports coach is guiding an elementary school child through footwork ladder coordination with en…
  - **SPOKEDU 적용 문구:** (이미지 — COPY_SLOT_IMAGE_REGISTRY.csv 참조)
  - **근거:** Image slot; alt/prompt replaced at implementation (DEC-PACK-05)
  - **디자인 영향:** IMAGE_FRAME_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** IMAGE_PROVENANCE_REVIEW · **PENDING_APPROVAL**

- **DOM ID:** `DOM-private_lesson_spomove-38` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[14]>div[28]>div[29]>div[30]>div[31]>div[32]>div[33]>div[35]>p[5]`
  - **Stitch 원문:** 전문 스포츠지도사 1급 인증
  - **SPOKEDU 적용 문구:** 전문 스포츠지도사 1급 인증
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-private_lesson_spomove-39` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[14]>div[28]>div[29]>div[30]>div[31]>div[32]>div[33]>div[35]>p[6]`
  - **Stitch 원문:** 유소년 전담 8년 이상 전문 경력
  - **SPOKEDU 적용 문구:** 유소년 전담 8년 이상 전문 경력
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-private_lesson_spomove-41` · **역할:** decorative_number · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[14]>div[28]>div[36]>div[37]`
  - **Stitch 원문:** 02
  - **SPOKEDU 적용 문구:** 02
  - **근거:** Stitch watermark decoration — design SSOT (DESIGN-ONLY)
  - **디자인 영향:** TEXT_SLOT_LOCKED;METRIC_GRAPHIC_PRESERVED
  - **CTA 목적지:** —
  - **검증·승인:** DESIGN_ONLY · **PENDING_APPROVAL**

- **DOM ID:** `DOM-private_lesson_spomove-42` · **역할:** tag_chip · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[14]>div[28]>div[36]>div[38]>div[39]`
  - **Stitch 원문:** #전문지도자 #밀착티칭
  - **SPOKEDU 적용 문구:** #전문지도자 #밀착티칭
  - **근거:** Hashtag chip — align with LIVE card tags in Phase C (TAG-CHIP)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** PENDING_APPROVAL · **PENDING_APPROVAL**

- **DOM ID:** `DOM-private_lesson_spomove-43` · **역할:** tag_chip · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[14]>div[28]>div[36]>div[38]>div[39]>span[25]`
  - **Stitch 원문:** #전문지도자
  - **SPOKEDU 적용 문구:** #전문지도자
  - **근거:** Hashtag chip — align with LIVE card tags in Phase C (TAG-CHIP)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** PENDING_APPROVAL · **PENDING_APPROVAL**

- **DOM ID:** `DOM-private_lesson_spomove-44` · **역할:** tag_chip · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[14]>div[28]>div[36]>div[38]>div[39]>span[26]`
  - **Stitch 원문:** #밀착티칭
  - **SPOKEDU 적용 문구:** #밀착티칭
  - **근거:** Hashtag chip — align with LIVE card tags in Phase C (TAG-CHIP)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** PENDING_APPROVAL · **PENDING_APPROVAL**

- **DOM ID:** `DOM-private_lesson_spomove-45` · **역할:** heading · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[14]>div[28]>div[36]>div[38]>h2[2]`
  - **Stitch 원문:** 국가공인 자격 및 엘리트 출신 전담 코치진 1:1 매칭
  - **SPOKEDU 적용 문구:** 국가공인 자격 및 엘리트 출신 전담 코치진 1:1 매칭
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-private_lesson_spomove-46` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[14]>div[28]>div[36]>div[38]>p[7]`
  - **Stitch 원문:** 체육학 석사, 선수 트레이너(AT) 자격을 겸비한 검증된 지도자가 아이의 성향과 체력 수준에 맞춰 온전히 몰입하는 전담 케어를 제공합니다.
  - **SPOKEDU 적용 문구:** 체육학 석사, 선수 트레이너(AT) 자격을 겸비한 검증된 지도자가 아이의 성향과 체력 수준에 맞춰 온전히 몰입하는 전담 케어를 제공합니다.
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-private_lesson_spomove-47` · **역할:** cta · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[14]>div[28]>div[36]>div[38]>div[40]>a[12]`
  - **Stitch 원문:** 코치진 프로필 및 자격 확인 east
  - **SPOKEDU 적용 문구:** 코치진 프로필 및 자격 확인 east
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-private_lesson_spomove-48` · **역할:** decorative_number · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[14]>div[41]>div[42]>div[43]`
  - **Stitch 원문:** 03
  - **SPOKEDU 적용 문구:** 03
  - **근거:** Stitch watermark decoration — design SSOT (DESIGN-ONLY)
  - **디자인 영향:** TEXT_SLOT_LOCKED;METRIC_GRAPHIC_PRESERVED
  - **CTA 목적지:** —
  - **검증·승인:** DESIGN_ONLY · **PENDING_APPROVAL**

- **DOM ID:** `DOM-private_lesson_spomove-49` · **역할:** tag_chip · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[14]>div[41]>div[42]>div[44]>div[45]`
  - **Stitch 원문:** #영상피드백 #학부모안심
  - **SPOKEDU 적용 문구:** #영상피드백 #학부모안심
  - **근거:** Hashtag chip — align with LIVE card tags in Phase C (TAG-CHIP)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** PENDING_APPROVAL · **PENDING_APPROVAL**

- **DOM ID:** `DOM-private_lesson_spomove-50` · **역할:** tag_chip · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[14]>div[41]>div[42]>div[44]>div[45]>span[29]`
  - **Stitch 원문:** #영상피드백
  - **SPOKEDU 적용 문구:** #영상피드백
  - **근거:** Hashtag chip — align with LIVE card tags in Phase C (TAG-CHIP)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** PENDING_APPROVAL · **PENDING_APPROVAL**

- **DOM ID:** `DOM-private_lesson_spomove-51` · **역할:** tag_chip · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[14]>div[41]>div[42]>div[44]>div[45]>span[30]`
  - **Stitch 원문:** #학부모안심
  - **SPOKEDU 적용 문구:** #학부모안심
  - **근거:** Hashtag chip — align with LIVE card tags in Phase C (TAG-CHIP)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** PENDING_APPROVAL · **PENDING_APPROVAL**

- **DOM ID:** `DOM-private_lesson_spomove-52` · **역할:** heading · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[14]>div[41]>div[42]>div[44]>h2[3]`
  - **Stitch 원문:** 매 수업 종료 후 영상 기반 성장 분석 리포트 발송
  - **SPOKEDU 적용 문구:** 매 수업 종료 후 영상 기반 성장 분석 리포트 발송
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-private_lesson_spomove-53` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[14]>div[41]>div[42]>div[44]>p[8]`
  - **Stitch 원문:** 당일 진행된 핵심 트레이닝 영상과 구간별 모션 피드백, 다음 수업 목표가 담긴 모바일 분석 카카오톡 알림장을 매회 제공합니다.
  - **SPOKEDU 적용 문구:** 당일 진행된 핵심 트레이닝 영상과 구간별 모션 피드백, 다음 수업 목표가 담긴 모바일 분석 카카오톡 알림장을 매회 제공합니다.
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-private_lesson_spomove-54` · **역할:** cta · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[14]>div[41]>div[42]>div[44]>div[46]>a[13]`
  - **Stitch 원문:** 샘플 레포트 확인하기 east
  - **SPOKEDU 적용 문구:** 샘플 레포트 확인하기 east
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-private_lesson_spomove-55` · **역할:** image · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[14]>div[41]>div[47]>div[48]>div[49]>img[3]`
  - **Stitch 원문:** A high-tech digital sports dashboard on an elegant tablet screen resting on a minimalist desk. The UI displays multi-angle video playback of a child running and jumping with AI motion angle telemetry, milestone progress charts in royal blue and soft slate tones, and a coach's per…
  - **SPOKEDU 적용 문구:** (이미지 — COPY_SLOT_IMAGE_REGISTRY.csv 참조)
  - **근거:** Image slot; alt/prompt replaced at implementation (DEC-PACK-05)
  - **디자인 영향:** IMAGE_FRAME_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** IMAGE_PROVENANCE_REVIEW · **PENDING_APPROVAL**

- **DOM ID:** `DOM-private_lesson_spomove-57` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[14]>div[41]>div[47]>div[48]>div[49]>div[50]>div[51]>div[53]>p[9]`
  - **Stitch 원문:** 데일리 모션 리포트 실시간 전송
  - **SPOKEDU 적용 문구:** 데일리 모션 리포트 실시간 전송
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-private_lesson_spomove-58` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[14]>div[41]>div[47]>div[48]>div[49]>div[50]>div[51]>div[53]>p[10]`
  - **Stitch 원문:** 평균 15분 내 카카오 알림톡 전달
  - **SPOKEDU 적용 문구:** 평균 15분 내 카카오 알림톡 전달
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-private_lesson_spomove-61` · **역할:** heading · **경로:** `html[1]>body[1]>main[1]>div[5]>section[3]>div[54]>div[55]>div[56]>h2[4]`
  - **Stitch 원문:** 아이 맞춤형 특화 레슨 과정
  - **SPOKEDU 적용 문구:** 아이 맞춤형 특화 레슨 과정
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-private_lesson_spomove-62` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[3]>div[54]>div[55]>p[11]`
  - **Stitch 원문:** 아이의 신체 발달 주기와 흥미에 최적화된 3가지 전문 트랙을 통해 신체 조절력과 성취감을 극대화합니다.
  - **SPOKEDU 적용 문구:** 아이의 신체 발달 주기와 흥미에 최적화된 3가지 전문 트랙을 통해 신체 조절력과 성취감을 극대화합니다.
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-private_lesson_spomove-64` · **역할:** image · **경로:** `html[1]>body[1]>main[1]>div[5]>section[3]>div[54]>div[57]>div[58]>div[59]>div[60]>img[4]`
  - **Stitch 원문:** An energetic youth fitness conditioning class indoors. A young Asian child with joyful expression is mastering jump rope rhythm with glowing form markers and light athletic equipment around. Clean gymnasium floor, natural soft light, premium sports academy setting.
  - **SPOKEDU 적용 문구:** (이미지 — COPY_SLOT_IMAGE_REGISTRY.csv 참조)
  - **근거:** Image slot; alt/prompt replaced at implementation (DEC-PACK-05)
  - **디자인 영향:** IMAGE_FRAME_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** IMAGE_PROVENANCE_REVIEW · **PENDING_APPROVAL**

- **DOM ID:** `DOM-private_lesson_spomove-65` · **역할:** heading · **경로:** `html[1]>body[1]>main[1]>div[5]>section[3]>div[54]>div[57]>div[58]>div[59]>div[62]>h3[1]`
  - **Stitch 원문:** 줄넘기 & 기초 체력 빌드업
  - **SPOKEDU 적용 문구:** 줄넘기 & 기초 체력 빌드업
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-private_lesson_spomove-66` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[3]>div[54]>div[57]>div[58]>div[59]>div[62]>p[12]`
  - **Stitch 원문:** 급수 줄넘기, 스텝 레더 순발력 훈련, 점핑 코디네이션을 통해 심폐 지구력과 협응력을 빠르게 향상시킵니다.
  - **SPOKEDU 적용 문구:** 급수 줄넘기, 스텝 레더 순발력 훈련, 점핑 코디네이션을 통해 심폐 지구력과 협응력을 빠르게 향상시킵니다.
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-private_lesson_spomove-71` · **역할:** image · **경로:** `html[1]>body[1]>main[1]>div[5]>section[3]>div[54]>div[57]>div[65]>div[66]>div[67]>img[5]`
  - **Stitch 원문:** A focused dynamic ball skills coaching session in an elite indoor court. A Korean child practicing basketball dribbling technique and soccer ball control under the attentive eye of a professional sports mentor. High energy, athletic apparel, clean stadium lighting, editorial clar…
  - **SPOKEDU 적용 문구:** (이미지 — COPY_SLOT_IMAGE_REGISTRY.csv 참조)
  - **근거:** Image slot; alt/prompt replaced at implementation (DEC-PACK-05)
  - **디자인 영향:** IMAGE_FRAME_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** IMAGE_PROVENANCE_REVIEW · **PENDING_APPROVAL**

- **DOM ID:** `DOM-private_lesson_spomove-72` · **역할:** heading · **경로:** `html[1]>body[1]>main[1]>div[5]>section[3]>div[54]>div[57]>div[65]>div[66]>div[69]>h3[2]`
  - **Stitch 원문:** 구기 종목 마스터 (농구·축구)
  - **SPOKEDU 적용 문구:** 구기 종목 마스터 (농구·축구)
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-private_lesson_spomove-73` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[3]>div[54]>div[57]>div[65]>div[66]>div[69]>p[13]`
  - **Stitch 원문:** 기본기 볼 터치부터 공간 지각 및 경기 전술 감각까지, 학교 체육과 취미 엘리트를 아우르는 체계적 1:1 트레이닝입니다.
  - **SPOKEDU 적용 문구:** 기본기 볼 터치부터 공간 지각 및 경기 전술 감각까지, 학교 체육과 취미 엘리트를 아우르는 체계적 1:1 트레이닝입니다.
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-private_lesson_spomove-77` · **역할:** image · **경로:** `html[1]>body[1]>main[1]>div[5]>section[3]>div[54]>div[57]>div[72]>div[73]>div[74]>img[6]`
  - **Stitch 원문:** A modern rehabilitation and posture alignment studio. A youth athlete using gentle resistance bands and spinal stabilization rollers with guidance from a certified physical therapist coach. Clean white, slate, and royal blue color scheme, scientific health atmosphere.
  - **SPOKEDU 적용 문구:** (이미지 — COPY_SLOT_IMAGE_REGISTRY.csv 참조)
  - **근거:** Image slot; alt/prompt replaced at implementation (DEC-PACK-05)
  - **디자인 영향:** IMAGE_FRAME_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** IMAGE_PROVENANCE_REVIEW · **PENDING_APPROVAL**

- **DOM ID:** `DOM-private_lesson_spomove-78` · **역할:** heading · **경로:** `html[1]>body[1]>main[1]>div[5]>section[3]>div[54]>div[57]>div[72]>div[73]>div[76]>h3[3]`
  - **Stitch 원문:** 체형 교정 & 소아 비만 관리
  - **SPOKEDU 적용 문구:** 체형 교정 & 소아 비만 관리
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-private_lesson_spomove-79` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[3]>div[54]>div[57]>div[72]>div[73]>div[76]>p[14]`
  - **Stitch 원문:** 학습 자세로 굳어진 거북목, 척추 비대칭을 교정하고 재미있는 칼로리 버닝 루틴으로 건강한 성장을 촉진합니다.
  - **SPOKEDU 적용 문구:** 학습 자세로 굳어진 거북목, 척추 비대칭을 교정하고 재미있는 칼로리 버닝 루틴으로 건강한 성장을 촉진합니다.
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-private_lesson_spomove-83` · **역할:** heading · **경로:** `html[1]>body[1]>main[1]>div[5]>section[4]>div[79]>div[80]>div[83]>h2[5]`
  - **Stitch 원문:** 지금 우리 아이에게 꼭 맞는 전담 코치님을 만나보세요
  - **SPOKEDU 적용 문구:** 지금 우리 아이에게 꼭 맞는 전담 코치님을 만나보세요
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-private_lesson_spomove-84` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[4]>div[79]>div[80]>div[83]>p[15]`
  - **Stitch 원문:** 가까운 SPOMOVE 트레이닝 센터 방문 또는 전문 지도사 가정 방문 상담을 통해 아이의 정밀 신체 진단 결과를 먼저 확인하실 수 있습니다.
  - **SPOKEDU 적용 문구:** SPOKEDU
  - **근거:** site.ts / brandProfile CODE_SSOT (FACT-NAV-001)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** CODE_SSOT · **PENDING_APPROVAL**

- **DOM ID:** `DOM-private_lesson_spomove-85` · **역할:** cta · **경로:** `html[1]>body[1]>main[1]>div[5]>section[4]>div[79]>div[80]>div[83]>form[1]>button[1]`
  - **Stitch 원문:** 1:1 방문 상담 신청하기
  - **SPOKEDU 적용 문구:** 수업 상담하기
  - **근거:** siteHeaderCta + home hero (HOME-CTA)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** PENDING_APPROVAL · **PENDING_APPROVAL**

- **DOM ID:** `DOM-private_lesson_spomove-86` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[4]>div[79]>div[80]>div[83]>p[16]`
  - **Stitch 원문:** 신청 즉시 24시간 내 배정 전문 코치가 맞춤 사전 전화 상담을 진행합니다.
  - **SPOKEDU 적용 문구:** 신청 즉시 24시간 내 배정 전문 코치가 맞춤 사전 전화 상담을 진행합니다.
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

### Images

- **DOM-private_lesson_spomove-31** (UNLABELED)
  - Stitch prompt: An advanced pediatric athletic assessment in a brightly lit modern sports science laboratory. A smiling Korean adolescent performs a controlled mobility test wh…
  - Candidate: /images/spokedu/home/field-editorial/home-master-ui.png
  - Status: CANDIDATE_REVIEW · File exists; minor consent & publication rights FACT-STAGE7-G20
  - Approval: PENDING_APPROVAL

- **DOM-private_lesson_spomove-36** (UNLABELED)
  - Stitch prompt: A warm, engaging private one-on-one sports coaching session inside a premium indoor sports studio with polished maple wood floors and royal blue accents. A cert…
  - Candidate: /images/spokedu/home/home-hero-movement.jpg | /images/spokedu/home/field-editorial/home-hero-field.webp
  - Status: CANDIDATE_REVIEW · File exists; minor consent & publication rights FACT-STAGE7-G20
  - Approval: PENDING_APPROVAL

- **DOM-private_lesson_spomove-55** (UNLABELED)
  - Stitch prompt: A high-tech digital sports dashboard on an elegant tablet screen resting on a minimalist desk. The UI displays multi-angle video playback of a child running and…
  - Candidate: /images/spokedu/home/field-editorial/home-master-ui.png
  - Status: CANDIDATE_REVIEW · File exists; minor consent & publication rights FACT-STAGE7-G20
  - Approval: PENDING_APPROVAL

- **DOM-private_lesson_spomove-64** (UNLABELED)
  - Stitch prompt: An energetic youth fitness conditioning class indoors. A young Asian child with joyful expression is mastering jump rope rhythm with glowing form markers and li…
  - Candidate: /images/spokedu/home/home-hero-movement.jpg | /images/spokedu/home/field-editorial/home-hero-field.webp
  - Status: CANDIDATE_REVIEW · File exists; minor consent & publication rights FACT-STAGE7-G20
  - Approval: PENDING_APPROVAL

- **DOM-private_lesson_spomove-71** (UNLABELED)
  - Stitch prompt: A focused dynamic ball skills coaching session in an elite indoor court. A Korean child practicing basketball dribbling technique and soccer ball control under …
  - Candidate: /images/spokedu/dispatch/dispatch-group-class.jpg
  - Status: CANDIDATE_REVIEW · File exists; minor consent & publication rights FACT-STAGE7-G20
  - Approval: PENDING_APPROVAL

- **DOM-private_lesson_spomove-77** (UNLABELED)
  - Stitch prompt: A modern rehabilitation and posture alignment studio. A youth athlete using gentle resistance bands and spinal stabilization rollers with guidance from a certif…
  - Candidate: /images/spokedu/private/private-coaching.jpg
  - Status: CANDIDATE_REVIEW · File exists; minor consent & publication rights FACT-STAGE7-G20
  - Approval: PENDING_APPROVAL

---

## Page `/spomove` — `spomove_system_spomove`

**DOM slots:** 130 · **Coverage gap estimate:** 5 minor text fragments (material icons / duplicates)

### Sections (Stitch comment order)


### UNLABELED

- **DOM ID:** `DOM-spomove_system_spomove-11` · **역할:** heading · **경로:** `html[1]>body[1]>main[1]>div[5]>section[1]>div[6]>h1[1]`
  - **Stitch 원문:** 인공지능과 스포츠 과학이 결합된 스포무브 독자적 솔루션
  - **SPOKEDU 적용 문구:** 인공지능과 스포츠 과학이 결합된 스포무브 독자적 솔루션
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-spomove_system_spomove-12` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[1]>div[6]>p[1]`
  - **Stitch 원문:** 초정밀 모션 AI 비전 인식 기술과 스포츠 바이오메카닉스 데이터를 융합하여, 아동부터 엘리트 선수까지 모든 움직임을 실시간으로 측정하고 최적화된 맞춤 처방을 전달합니다.
  - **SPOKEDU 적용 문구:** SPOKEDU 체육교육 · SPOMOVE 프로그램
  - **근거:** Stitch fiction removed — neutral SPOKEDU slot copy (FACT-STAGE7-G07|G08|G09)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** FABRICATED_REPLACED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-spomove_system_spomove-13` · **역할:** cta · **경로:** `html[1]>body[1]>main[1]>div[5]>section[1]>div[6]>div[8]>a[9]`
  - **Stitch 원문:** 시스템 도입 문의 arrow_forward
  - **SPOKEDU 적용 문구:** 수업 상담하기
  - **근거:** siteHeaderCta + home hero (HOME-CTA)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** /contact
  - **검증·승인:** PENDING_APPROVAL · **PENDING_APPROVAL**

- **DOM ID:** `DOM-spomove_system_spomove-14` · **역할:** cta · **경로:** `html[1]>body[1]>main[1]>div[5]>section[1]>div[6]>div[8]>a[10]`
  - **Stitch 원문:** 핵심 기술 확인하기
  - **SPOKEDU 적용 문구:** 핵심 기술 확인하기
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-spomove_system_spomove-15` · **역할:** decorative_number · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[9]>div[10]>div[11]>div[12]>span[8]`
  - **Stitch 원문:** 01
  - **SPOKEDU 적용 문구:** 01
  - **근거:** Stitch watermark decoration — design SSOT (DESIGN-ONLY)
  - **디자인 영향:** TEXT_SLOT_LOCKED;METRIC_GRAPHIC_PRESERVED
  - **CTA 목적지:** —
  - **검증·승인:** DESIGN_ONLY · **PENDING_APPROVAL**

- **DOM ID:** `DOM-spomove_system_spomove-16` · **역할:** heading · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[9]>div[10]>div[11]>div[12]>h2[1]`
  - **Stitch 원문:** 실시간 관절 랜드마크 모션 트래킹
  - **SPOKEDU 적용 문구:** 실시간 관절 랜드마크 모션 트래킹
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-spomove_system_spomove-17` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[9]>div[10]>div[11]>div[12]>p[2]`
  - **Stitch 원문:** 웨어러블 센서 착용의 불편함 없이, 단일 카메라만으로 신체 주요 33개 관절 랜드마크의 3D 공간 좌표를 120fps 초고속으로 실시간 추적합니다.
  - **SPOKEDU 적용 문구:** 웨어러블 센서 착용의 불편함 없이, 단일 카메라만으로 신체 주요 33개 관절 랜드마크의 3D 공간 좌표를 120fps 초고속으로 실시간 추적합니다.
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-spomove_system_spomove-18` · **역할:** tag_chip · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[9]>div[10]>div[11]>div[12]>div[13]`
  - **Stitch 원문:** #AI비전 #동작인식 #무센서트래킹
  - **SPOKEDU 적용 문구:** #AI비전 #동작인식 #무센서트래킹
  - **근거:** Hashtag chip — align with LIVE card tags in Phase C (TAG-CHIP)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** PENDING_APPROVAL · **PENDING_APPROVAL**

- **DOM ID:** `DOM-spomove_system_spomove-19` · **역할:** tag_chip · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[9]>div[10]>div[11]>div[12]>div[13]>span[10]`
  - **Stitch 원문:** #AI비전
  - **SPOKEDU 적용 문구:** #AI비전
  - **근거:** Hashtag chip — align with LIVE card tags in Phase C (TAG-CHIP)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** PENDING_APPROVAL · **PENDING_APPROVAL**

- **DOM ID:** `DOM-spomove_system_spomove-20` · **역할:** tag_chip · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[9]>div[10]>div[11]>div[12]>div[13]>span[11]`
  - **Stitch 원문:** #동작인식
  - **SPOKEDU 적용 문구:** #동작인식
  - **근거:** Hashtag chip — align with LIVE card tags in Phase C (TAG-CHIP)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** PENDING_APPROVAL · **PENDING_APPROVAL**

- **DOM ID:** `DOM-spomove_system_spomove-21` · **역할:** tag_chip · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[9]>div[10]>div[11]>div[12]>div[13]>span[12]`
  - **Stitch 원문:** #무센서트래킹
  - **SPOKEDU 적용 문구:** #무센서트래킹
  - **근거:** Hashtag chip — align with LIVE card tags in Phase C (TAG-CHIP)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** PENDING_APPROVAL · **PENDING_APPROVAL**

- **DOM ID:** `DOM-spomove_system_spomove-22` · **역할:** cta · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[9]>div[10]>div[11]>div[12]>div[14]>a[11]`
  - **Stitch 원문:** 알고리즘 정밀도 연구 보고서 보기 arrow_forward
  - **SPOKEDU 적용 문구:** 수업 유형 살펴보기
  - **근거:** HOME-008 (HOME-008)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** /spomove
  - **검증·승인:** PENDING_APPROVAL · **PENDING_APPROVAL**

- **DOM ID:** `DOM-spomove_system_spomove-24` · **역할:** image · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[9]>div[10]>div[11]>div[15]>div[16]>img[1]`
  - **Stitch 원문:** Futuristic athletic motion analysis visual showing a young athletic runner overlaid with glowing blue digital skeletal joints and vector kinetic tracking vectors in a sterile laboratory environment.
  - **SPOKEDU 적용 문구:** (이미지 — COPY_SLOT_IMAGE_REGISTRY.csv 참조)
  - **근거:** Image slot; alt/prompt replaced at implementation (DEC-PACK-05)
  - **디자인 영향:** IMAGE_FRAME_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** IMAGE_PROVENANCE_REVIEW · **PENDING_APPROVAL**

- **DOM ID:** `DOM-spomove_system_spomove-31` · **역할:** heading · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[22]>div[23]>div[24]>div[25]>div[26]>div[27]>div[28]>h3[1]`
  - **Stitch 원문:** 운동 수행역량 다면 진단 지표
  - **SPOKEDU 적용 문구:** 운동 수행역량 다면 진단 지표
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-spomove_system_spomove-32` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[22]>div[23]>div[24]>div[25]>div[26]>div[27]>div[28]>p[3]`
  - **Stitch 원문:** Biomechanic Balance & Power Index
  - **SPOKEDU 적용 문구:** Biomechanic Balance & Power Index
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-spomove_system_spomove-33` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[22]>div[23]>div[24]>div[25]>div[26]>div[30]>div[31]>p[4]`
  - **Stitch 원문:** 코어 안정도
  - **SPOKEDU 적용 문구:** 코어 안정도
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-spomove_system_spomove-34` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[22]>div[23]>div[24]>div[25]>div[26]>div[30]>div[31]>p[5]`
  - **Stitch 원문:** 96.4점
  - **SPOKEDU 적용 문구:** 96.4점
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-spomove_system_spomove-35` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[22]>div[23]>div[24]>div[25]>div[26]>div[30]>div[32]>p[6]`
  - **Stitch 원문:** 좌우 비대칭률
  - **SPOKEDU 적용 문구:** 좌우 비대칭률
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-spomove_system_spomove-36` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[22]>div[23]>div[24]>div[25]>div[26]>div[30]>div[32]>p[7]`
  - **Stitch 원문:** 1.8% 미만
  - **SPOKEDU 적용 문구:** 1.8% 미만
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-spomove_system_spomove-37` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[22]>div[23]>div[24]>div[25]>div[26]>div[30]>div[33]>p[8]`
  - **Stitch 원문:** 성장 잠재력
  - **SPOKEDU 적용 문구:** 성장 잠재력
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-spomove_system_spomove-38` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[22]>div[23]>div[24]>div[25]>div[26]>div[30]>div[33]>p[9]`
  - **Stitch 원문:** 상위 4%
  - **SPOKEDU 적용 문구:** 상위 4%
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-spomove_system_spomove-39` · **역할:** decorative_number · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[22]>div[23]>div[24]>div[34]>span[20]`
  - **Stitch 원문:** 02
  - **SPOKEDU 적용 문구:** 02
  - **근거:** Stitch watermark decoration — design SSOT (DESIGN-ONLY)
  - **디자인 영향:** TEXT_SLOT_LOCKED;METRIC_GRAPHIC_PRESERVED
  - **CTA 목적지:** —
  - **검증·승인:** DESIGN_ONLY · **PENDING_APPROVAL**

- **DOM ID:** `DOM-spomove_system_spomove-40` · **역할:** heading · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[22]>div[23]>div[24]>div[34]>h2[2]`
  - **Stitch 원문:** 신체 불균형 및 운동 능력 정밀 수치화
  - **SPOKEDU 적용 문구:** 신체 불균형 및 운동 능력 정밀 수치화
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-spomove_system_spomove-41` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[22]>div[23]>div[24]>div[34]>p[10]`
  - **Stitch 원문:** 육안으로 파악하기 힘든 미세한 보행 이상, 골반 기울기, 근력 불균형을 오차범위 1% 미만의 정량적 바이오메카닉스 지표로 산출합니다.
  - **SPOKEDU 적용 문구:** SPOKEDU 체육교육 · SPOMOVE 프로그램
  - **근거:** Stitch fiction removed — neutral SPOKEDU slot copy (FACT-STAGE7-G07|G08|G09)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** FABRICATED_REPLACED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-spomove_system_spomove-42` · **역할:** tag_chip · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[22]>div[23]>div[24]>div[34]>div[35]`
  - **Stitch 원문:** #바이오메카닉스 #밸런스측정 #정밀진단
  - **SPOKEDU 적용 문구:** SPOKEDU 체육교육 · SPOMOVE 프로그램
  - **근거:** Stitch fiction removed — neutral SPOKEDU slot copy (FACT-STAGE7-G07|G08|G09)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** FABRICATED_REPLACED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-spomove_system_spomove-43` · **역할:** tag_chip · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[22]>div[23]>div[24]>div[34]>div[35]>span[22]`
  - **Stitch 원문:** #바이오메카닉스
  - **SPOKEDU 적용 문구:** SPOKEDU 체육교육 · SPOMOVE 프로그램
  - **근거:** Stitch fiction removed — neutral SPOKEDU slot copy (FACT-STAGE7-G07|G08|G09)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** FABRICATED_REPLACED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-spomove_system_spomove-44` · **역할:** tag_chip · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[22]>div[23]>div[24]>div[34]>div[35]>span[23]`
  - **Stitch 원문:** #밸런스측정
  - **SPOKEDU 적용 문구:** #밸런스측정
  - **근거:** Hashtag chip — align with LIVE card tags in Phase C (TAG-CHIP)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** PENDING_APPROVAL · **PENDING_APPROVAL**

- **DOM ID:** `DOM-spomove_system_spomove-45` · **역할:** tag_chip · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[22]>div[23]>div[24]>div[34]>div[35]>span[24]`
  - **Stitch 원문:** #정밀진단
  - **SPOKEDU 적용 문구:** #정밀진단
  - **근거:** Hashtag chip — align with LIVE card tags in Phase C (TAG-CHIP)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** PENDING_APPROVAL · **PENDING_APPROVAL**

- **DOM ID:** `DOM-spomove_system_spomove-46` · **역할:** cta · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[22]>div[23]>div[24]>div[34]>div[36]>a[12]`
  - **Stitch 원문:** 측정 알고리즘 검증 기준 확인 arrow_forward
  - **SPOKEDU 적용 문구:** 측정 알고리즘 검증 기준 확인 arrow_forward
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** /spomove
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-spomove_system_spomove-47` · **역할:** decorative_number · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[37]>div[38]>div[39]>div[40]>span[26]`
  - **Stitch 원문:** 03
  - **SPOKEDU 적용 문구:** 03
  - **근거:** Stitch watermark decoration — design SSOT (DESIGN-ONLY)
  - **디자인 영향:** TEXT_SLOT_LOCKED;METRIC_GRAPHIC_PRESERVED
  - **CTA 목적지:** —
  - **검증·승인:** DESIGN_ONLY · **PENDING_APPROVAL**

- **DOM ID:** `DOM-spomove_system_spomove-48` · **역할:** heading · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[37]>div[38]>div[39]>div[40]>h2[3]`
  - **Stitch 원문:** 개인별 성장 단계에 맞춘 알고리즘 처방
  - **SPOKEDU 적용 문구:** 개인별 성장 단계에 맞춘 알고리즘 처방
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-spomove_system_spomove-49` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[37]>div[38]>div[39]>div[40]>p[11]`
  - **Stitch 원문:** 일률적인 교육 과정을 탈피하여 학습자 개개인의 신체 발달 지연도와 강점을 머신러닝이 학습하고, 매주 동적으로 업데이트되는 전용 훈련 로드맵을 설계합니다.
  - **SPOKEDU 적용 문구:** 일률적인 교육 과정을 탈피하여 학습자 개개인의 신체 발달 지연도와 강점을 머신러닝이 학습하고, 매주 동적으로 업데이트되는 전용 훈련 로드맵을 설계합니다.
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-spomove_system_spomove-50` · **역할:** tag_chip · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[37]>div[38]>div[39]>div[40]>div[41]`
  - **Stitch 원문:** #맞춤커리큘럼 #동적난이도 #개인별최적화
  - **SPOKEDU 적용 문구:** #맞춤커리큘럼 #동적난이도 #개인별최적화
  - **근거:** Hashtag chip — align with LIVE card tags in Phase C (TAG-CHIP)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** PENDING_APPROVAL · **PENDING_APPROVAL**

- **DOM ID:** `DOM-spomove_system_spomove-51` · **역할:** tag_chip · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[37]>div[38]>div[39]>div[40]>div[41]>span[28]`
  - **Stitch 원문:** #맞춤커리큘럼
  - **SPOKEDU 적용 문구:** #맞춤커리큘럼
  - **근거:** Hashtag chip — align with LIVE card tags in Phase C (TAG-CHIP)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** PENDING_APPROVAL · **PENDING_APPROVAL**

- **DOM ID:** `DOM-spomove_system_spomove-52` · **역할:** tag_chip · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[37]>div[38]>div[39]>div[40]>div[41]>span[29]`
  - **Stitch 원문:** #동적난이도
  - **SPOKEDU 적용 문구:** #동적난이도
  - **근거:** Hashtag chip — align with LIVE card tags in Phase C (TAG-CHIP)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** PENDING_APPROVAL · **PENDING_APPROVAL**

- **DOM ID:** `DOM-spomove_system_spomove-53` · **역할:** tag_chip · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[37]>div[38]>div[39]>div[40]>div[41]>span[30]`
  - **Stitch 원문:** #개인별최적화
  - **SPOKEDU 적용 문구:** #개인별최적화
  - **근거:** Hashtag chip — align with LIVE card tags in Phase C (TAG-CHIP)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** PENDING_APPROVAL · **PENDING_APPROVAL**

- **DOM ID:** `DOM-spomove_system_spomove-54` · **역할:** cta · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[37]>div[38]>div[39]>div[40]>div[42]>a[13]`
  - **Stitch 원문:** 맞춤형 코칭 커리큘럼 살펴보기 arrow_forward
  - **SPOKEDU 적용 문구:** 수업 유형 살펴보기
  - **근거:** HOME-008 (HOME-008)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** /education
  - **검증·승인:** PENDING_APPROVAL · **PENDING_APPROVAL**

- **DOM ID:** `DOM-spomove_system_spomove-56` · **역할:** heading · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[37]>div[38]>div[39]>div[43]>div[44]>div[45]>div[46]>div[48]>h4[1]`
  - **Stitch 원문:** 동적 맞춤 플랜 로드맵 엔진
  - **SPOKEDU 적용 문구:** 동적 맞춤 플랜 로드맵 엔진
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-spomove_system_spomove-57` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[37]>div[38]>div[39]>div[43]>div[44]>div[45]>div[46]>div[48]>p[12]`
  - **Stitch 원문:** Phase Adaptive Training Flow
  - **SPOKEDU 적용 문구:** Phase Adaptive Training Flow
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-spomove_system_spomove-59` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[37]>div[38]>div[39]>div[43]>div[44]>div[49]>div[50]>div[51]>div[52]>p[13]`
  - **Stitch 원문:** 기초 관절 가동성 회복 트레이닝
  - **SPOKEDU 적용 문구:** 기초 관절 가동성 회복 트레이닝
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-spomove_system_spomove-60` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[37]>div[38]>div[39]>div[43]>div[44]>div[49]>div[50]>div[51]>div[52]>p[14]`
  - **Stitch 원문:** 척추 기립근 활성화 및 발목 가동성 회복 (주 2회 처방)
  - **SPOKEDU 적용 문구:** 척추 기립근 활성화 및 발목 가동성 회복 (주 2회 처방)
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-spomove_system_spomove-61` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[37]>div[38]>div[39]>div[43]>div[44]>div[49]>div[53]>div[54]>div[55]>p[15]`
  - **Stitch 원문:** 순발력 및 협응력 강화 모듈 (현재 단계)
  - **SPOKEDU 적용 문구:** 순발력 및 협응력 강화 모듈 (현재 단계)
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-spomove_system_spomove-62` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[37]>div[38]>div[39]>div[43]>div[44]>div[49]>div[53]>div[54]>div[55]>p[16]`
  - **Stitch 원문:** 시각 반응 피드백 반응 훈련 연계 (목표 달성도 84%)
  - **SPOKEDU 적용 문구:** 시각 반응 피드백 반응 훈련 연계 (목표 달성도 84%)
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-spomove_system_spomove-63` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[37]>div[38]>div[39]>div[43]>div[44]>div[49]>div[56]>div[57]>div[58]>p[17]`
  - **Stitch 원문:** 스포츠 종목별 전술 모션 최적화
  - **SPOKEDU 적용 문구:** 스포츠 종목별 전술 모션 최적화
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-spomove_system_spomove-64` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[37]>div[38]>div[39]>div[43]>div[44]>div[49]>div[56]>div[57]>div[58]>p[18]`
  - **Stitch 원문:** 축구/육상 스텝 에너지 전환율 극대화 루틴
  - **SPOKEDU 적용 문구:** 축구/육상 스텝 에너지 전환율 극대화 루틴
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-spomove_system_spomove-70` · **역할:** metric_display · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[59]>div[60]>div[61]>div[62]>div[63]>div[69]>div[70]>div[71]>span[43]`
  - **Stitch 원문:** +32.4%
  - **SPOKEDU 적용 문구:** +32.4%
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED;METRIC_GRAPHIC_PRESERVED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-spomove_system_spomove-72` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[59]>div[60]>div[61]>div[62]>div[63]>div[69]>div[70]>p[19]`
  - **Stitch 원문:** 유연성 및 하지 안정성 지표 비약적 향상
  - **SPOKEDU 적용 문구:** 유연성 및 하지 안정성 지표 비약적 향상
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-spomove_system_spomove-75` · **역할:** metric_display · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[59]>div[60]>div[61]>div[62]>div[63]>div[69]>div[72]>div[73]>span[46]`
  - **Stitch 원문:** 24회
  - **SPOKEDU 적용 문구:** 24회
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED;METRIC_GRAPHIC_PRESERVED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-spomove_system_spomove-77` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[59]>div[60]>div[61]>div[62]>div[63]>div[69]>div[72]>p[20]`
  - **Stitch 원문:** 출석률 100% 달성 및 모션 로그 저장 완료
  - **SPOKEDU 적용 문구:** 출석률 100% 달성 및 모션 로그 저장 완료
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-spomove_system_spomove-78` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[59]>div[60]>div[61]>div[62]>div[63]>div[74]>div[75]>div[76]>p[21]`
  - **Stitch 원문:** 모바일 학부모 알림 리포트 전송
  - **SPOKEDU 적용 문구:** 모바일 학부모 알림 리포트 전송
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-spomove_system_spomove-79` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[59]>div[60]>div[61]>div[62]>div[63]>div[74]>div[75]>div[76]>p[22]`
  - **Stitch 원문:** 수업 직후 3분 내 고화질 분석 리포트 자동 발송
  - **SPOKEDU 적용 문구:** 수업 직후 3분 내 고화질 분석 리포트 자동 발송
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-spomove_system_spomove-81` · **역할:** decorative_number · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[59]>div[60]>div[61]>div[77]>span[50]`
  - **Stitch 원문:** 04
  - **SPOKEDU 적용 문구:** 04
  - **근거:** Stitch watermark decoration — design SSOT (DESIGN-ONLY)
  - **디자인 영향:** TEXT_SLOT_LOCKED;METRIC_GRAPHIC_PRESERVED
  - **CTA 목적지:** —
  - **검증·승인:** DESIGN_ONLY · **PENDING_APPROVAL**

- **DOM ID:** `DOM-spomove_system_spomove-82` · **역할:** heading · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[59]>div[60]>div[61]>div[77]>h2[4]`
  - **Stitch 원문:** 학부모 및 교육기관 클라우드 데이터 대시보드
  - **SPOKEDU 적용 문구:** 학부모 및 교육기관 클라우드 데이터 대시보드
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-spomove_system_spomove-83` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[59]>div[60]>div[61]>div[77]>p[23]`
  - **Stitch 원문:** 분석된 모든 측정 데이터는 즉시 클라우드로 동기화되어 학부모 전용 리포트와 교육 기관 관리자 시스템으로 실시간 제공됩니다.
  - **SPOKEDU 적용 문구:** 분석된 모든 측정 데이터는 즉시 클라우드로 동기화되어 학부모 전용 리포트와 교육 기관 관리자 시스템으로 실시간 제공됩니다.
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-spomove_system_spomove-84` · **역할:** tag_chip · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[59]>div[60]>div[61]>div[77]>div[78]`
  - **Stitch 원문:** #실시간연동 #클라우드리포트 #투명한기록
  - **SPOKEDU 적용 문구:** #실시간연동 #클라우드리포트 #투명한기록
  - **근거:** Hashtag chip — align with LIVE card tags in Phase C (TAG-CHIP)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** PENDING_APPROVAL · **PENDING_APPROVAL**

- **DOM ID:** `DOM-spomove_system_spomove-85` · **역할:** tag_chip · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[59]>div[60]>div[61]>div[77]>div[78]>span[52]`
  - **Stitch 원문:** #실시간연동
  - **SPOKEDU 적용 문구:** #실시간연동
  - **근거:** Hashtag chip — align with LIVE card tags in Phase C (TAG-CHIP)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** PENDING_APPROVAL · **PENDING_APPROVAL**

- **DOM ID:** `DOM-spomove_system_spomove-86` · **역할:** tag_chip · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[59]>div[60]>div[61]>div[77]>div[78]>span[53]`
  - **Stitch 원문:** #클라우드리포트
  - **SPOKEDU 적용 문구:** #클라우드리포트
  - **근거:** Hashtag chip — align with LIVE card tags in Phase C (TAG-CHIP)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** PENDING_APPROVAL · **PENDING_APPROVAL**

- **DOM ID:** `DOM-spomove_system_spomove-87` · **역할:** tag_chip · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[59]>div[60]>div[61]>div[77]>div[78]>span[54]`
  - **Stitch 원문:** #투명한기록
  - **SPOKEDU 적용 문구:** #투명한기록
  - **근거:** Hashtag chip — align with LIVE card tags in Phase C (TAG-CHIP)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** PENDING_APPROVAL · **PENDING_APPROVAL**

- **DOM ID:** `DOM-spomove_system_spomove-88` · **역할:** cta · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[59]>div[60]>div[61]>div[77]>div[79]>a[14]`
  - **Stitch 원문:** 현장 실제 리포트 샘플 보기 arrow_forward
  - **SPOKEDU 적용 문구:** 수업 유형 살펴보기
  - **근거:** HOME-008 (HOME-008)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** /records
  - **검증·승인:** PENDING_APPROVAL · **PENDING_APPROVAL**

- **DOM ID:** `DOM-spomove_system_spomove-90` · **역할:** heading · **경로:** `html[1]>body[1]>main[1]>div[5]>section[3]>div[80]>div[81]>h2[5]`
  - **Stitch 원문:** 숫자로 입증되는 시스템의 신뢰성과 확장성
  - **SPOKEDU 적용 문구:** 숫자로 입증되는 시스템의 신뢰성과 확장성
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-spomove_system_spomove-92` · **역할:** metric_display · **경로:** `html[1]>body[1]>main[1]>div[5]>section[3]>div[80]>div[82]>div[83]>div[84]>span[57]`
  - **Stitch 원문:** 99.8
  - **SPOKEDU 적용 문구:** —
  - **근거:** Stitch fiction removed — neutral SPOKEDU slot copy (FACT-STAGE7-G07|G08|G09)
  - **디자인 영향:** TEXT_SLOT_LOCKED;METRIC_GRAPHIC_PRESERVED
  - **CTA 목적지:** —
  - **검증·승인:** FABRICATED_REPLACED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-spomove_system_spomove-93` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[3]>div[80]>div[82]>div[83]>p[24]`
  - **Stitch 원문:** 모션 인식 정확도
  - **SPOKEDU 적용 문구:** 모션 인식 정확도
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-spomove_system_spomove-95` · **역할:** metric_display · **경로:** `html[1]>body[1]>main[1]>div[5]>section[3]>div[80]>div[82]>div[85]>div[86]>span[59]`
  - **Stitch 원문:** 45,000
  - **SPOKEDU 적용 문구:** 45,000
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED;METRIC_GRAPHIC_PRESERVED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-spomove_system_spomove-96` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[3]>div[80]>div[82]>div[85]>p[25]`
  - **Stitch 원문:** 분석된 운동 세션
  - **SPOKEDU 적용 문구:** 분석된 운동 세션
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-spomove_system_spomove-98` · **역할:** metric_display · **경로:** `html[1]>body[1]>main[1]>div[5]>section[3]>div[80]>div[82]>div[87]>div[88]>span[61]`
  - **Stitch 원문:** 120
  - **SPOKEDU 적용 문구:** 120
  - **근거:** Decorative index / step number (DESIGN-ONLY)
  - **디자인 영향:** DECORATIVE_NUMBER_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** DESIGN_ONLY · **PENDING_APPROVAL**

- **DOM ID:** `DOM-spomove_system_spomove-99` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[3]>div[80]>div[82]>div[87]>p[26]`
  - **Stitch 원문:** 맞춤 운동 라이브러리
  - **SPOKEDU 적용 문구:** 맞춤 운동 라이브러리
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-spomove_system_spomove-101` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[3]>div[80]>div[82]>div[89]>p[27]`
  - **Stitch 원문:** 데이터 보안 사고
  - **SPOKEDU 적용 문구:** 데이터 보안 사고
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-spomove_system_spomove-102` · **역할:** heading · **경로:** `html[1]>body[1]>main[1]>div[5]>section[4]>div[91]>div[92]>h2[6]`
  - **Stitch 원문:** 스포무브 시스템을 학교와 교육 현장에 도입하세요
  - **SPOKEDU 적용 문구:** SPOMOVE
  - **근거:** site.ts / brandProfile CODE_SSOT (FACT-NAV-001)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** CODE_SSOT · **PENDING_APPROVAL**

- **DOM ID:** `DOM-spomove_system_spomove-103` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[4]>div[91]>div[92]>p[28]`
  - **Stitch 원문:** 공교육 체육 수업, 유소년 전문 아카데미, 스포츠 클럽을 위한 최적화된 하드웨어 및 소프트웨어 도입 컨설팅을 제공합니다.
  - **SPOKEDU 적용 문구:** 공교육 체육 수업, 유소년 전문 아카데미, 스포츠 클럽을 위한 최적화된 하드웨어 및 소프트웨어 도입 컨설팅을 제공합니다.
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-spomove_system_spomove-104` · **역할:** cta · **경로:** `html[1]>body[1]>main[1]>div[5]>section[4]>div[91]>div[92]>div[93]>a[15]`
  - **Stitch 원문:** 도입 제안서 요청하기
  - **SPOKEDU 적용 문구:** 기관 체육수업 상담하기
  - **근거:** education-hub primaryCta (EDU-CTA)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** /contact
  - **검증·승인:** PENDING_APPROVAL · **PENDING_APPROVAL**

- **DOM ID:** `DOM-spomove_system_spomove-105` · **역할:** cta · **경로:** `html[1]>body[1]>main[1]>div[5]>section[4]>div[91]>div[92]>div[93]>a[16]`
  - **Stitch 원문:** 파트너십 안내
  - **SPOKEDU 적용 문구:** 파트너십 안내
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** /about
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

### Images

- **DOM-spomove_system_spomove-24** (UNLABELED)
  - Stitch prompt: Futuristic athletic motion analysis visual showing a young athletic runner overlaid with glowing blue digital skeletal joints and vector kinetic tracking vector…
  - Candidate: /images/spokedu/home/field-editorial/home-hero-ai-20261018.png
  - Status: CANDIDATE_REVIEW · File exists; minor consent & publication rights FACT-STAGE7-G20
  - Approval: PENDING_APPROVAL

---

## Page `/records` — `field_records_spomove`

**DOM slots:** 104 · **Coverage gap estimate:** 0 minor text fragments (material icons / duplicates)

### Sections (Stitch comment order)


### UNLABELED

- **DOM ID:** `DOM-field_records_spomove-10` · **역할:** heading · **경로:** `html[1]>body[1]>main[1]>div[5]>section[1]>div[6]>h1[1]`
  - **Stitch 원문:** 전국 교육 현장에서 꽃피는 스포무브의 생생한 기록
  - **SPOKEDU 적용 문구:** 전국 교육 현장에서 꽃피는 스포무브의 생생한 기록
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-field_records_spomove-11` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[1]>div[6]>p[1]`
  - **Stitch 원문:** 학교 늘봄학교, 유소년 아카데미, 지자체 협력 현장의 실제 교육 스토리를 확인하세요.
  - **SPOKEDU 적용 문구:** 학교 늘봄학교, 유소년 아카데미, 지자체 협력 현장의 실제 교육 스토리를 확인하세요.
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-field_records_spomove-12` · **역할:** cta · **경로:** `html[1]>body[1]>main[1]>div[5]>section[1]>div[6]>div[8]>button[1]`
  - **Stitch 원문:** 전체
  - **SPOKEDU 적용 문구:** 전체
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-field_records_spomove-13` · **역할:** cta · **경로:** `html[1]>body[1]>main[1]>div[5]>section[1]>div[6]>div[8]>button[2]`
  - **Stitch 원문:** 늘봄학교
  - **SPOKEDU 적용 문구:** 늘봄학교
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-field_records_spomove-14` · **역할:** cta · **경로:** `html[1]>body[1]>main[1]>div[5]>section[1]>div[6]>div[8]>button[3]`
  - **Stitch 원문:** 기관위탁
  - **SPOKEDU 적용 문구:** 기관위탁
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-field_records_spomove-15` · **역할:** cta · **경로:** `html[1]>body[1]>main[1]>div[5]>section[1]>div[6]>div[8]>button[4]`
  - **Stitch 원문:** 프라이빗
  - **SPOKEDU 적용 문구:** 프라이빗
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-field_records_spomove-16` · **역할:** cta · **경로:** `html[1]>body[1]>main[1]>div[5]>section[1]>div[6]>div[8]>button[5]`
  - **Stitch 원문:** 대회/캠프
  - **SPOKEDU 적용 문구:** 대회/캠프
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-field_records_spomove-18` · **역할:** heading · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[9]>div[10]>div[11]>h2[1]`
  - **Stitch 원문:** 현장 기록 아카이브
  - **SPOKEDU 적용 문구:** 현장 기록 아카이브
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-field_records_spomove-19` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[9]>div[10]>p[2]`
  - **Stitch 원문:** 아이들의 신체 성장 그래프와 정량적 센서 로그가 만들어내는 신뢰도 높은 스포츠 피드백 리포트입니다.
  - **SPOKEDU 적용 문구:** 아이들의 신체 성장 그래프와 정량적 센서 로그가 만들어내는 신뢰도 높은 스포츠 피드백 리포트입니다.
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-field_records_spomove-21` · **역할:** image · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[9]>div[12]>article[1]>div[13]>img[1]`
  - **Stitch 원문:** Elementary students joyfully participating in an indoor physical education class inside a modern brightly lit South Korean school gymnasium, equipped with digital tracking screens, gentle natural light, educational sports setting with vibrant royal blue and clean white aesthetics…
  - **SPOKEDU 적용 문구:** (이미지 — COPY_SLOT_IMAGE_REGISTRY.csv 참조)
  - **근거:** Image slot; alt/prompt replaced at implementation (DEC-PACK-05)
  - **디자인 영향:** IMAGE_FRAME_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** IMAGE_PROVENANCE_REVIEW · **PENDING_APPROVAL**

- **DOM ID:** `DOM-field_records_spomove-23` · **역할:** heading · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[9]>div[12]>article[1]>div[16]>div[17]>h3[1]`
  - **Stitch 원문:** 서울 강남초 늘봄학교 체육 정규 수업 개시
  - **SPOKEDU 적용 문구:** 서울 강남초 늘봄학교 체육 정규 수업 개시
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-field_records_spomove-24` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[9]>div[12]>article[1]>div[16]>div[17]>p[3]`
  - **Stitch 원문:** 방과후 돌봄 참여 학생 120명을 대상으로 스포무브 스마트 점프 및 균형감각 측정 세션을 성공적으로 런칭하였습니다.
  - **SPOKEDU 적용 문구:** 방과후 돌봄 참여 학생 120명을 대상으로 스포무브 스마트 점프 및 균형감각 측정 세션을 성공적으로 런칭하였습니다.
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-field_records_spomove-26` · **역할:** cta · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[9]>div[12]>article[1]>div[16]>div[18]>a[9]`
  - **Stitch 원문:** arrow_forward
  - **SPOKEDU 적용 문구:** arrow_forward
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-field_records_spomove-28` · **역할:** image · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[9]>div[12]>article[2]>div[19]>img[2]`
  - **Stitch 원문:** Young basketball academy players practicing precision dribbling drills while an AI smart motion camera system captures joint angles on a sleek indoor hardwood basketball court, sharp lighting, athletic tech vibe.
  - **SPOKEDU 적용 문구:** (이미지 — COPY_SLOT_IMAGE_REGISTRY.csv 참조)
  - **근거:** Image slot; alt/prompt replaced at implementation (DEC-PACK-05)
  - **디자인 영향:** IMAGE_FRAME_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** IMAGE_PROVENANCE_REVIEW · **PENDING_APPROVAL**

- **DOM ID:** `DOM-field_records_spomove-31` · **역할:** heading · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[9]>div[12]>article[2]>div[22]>div[23]>h3[2]`
  - **Stitch 원문:** AI 모션 분석 기반 유소년 농구 드리블 스킬 클리닉
  - **SPOKEDU 적용 문구:** AI 모션 분석 기반 유소년 농구 드리블 스킬 클리닉
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-field_records_spomove-32` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[9]>div[12]>article[2]>div[22]>div[23]>p[4]`
  - **Stitch 원문:** 스마트 비전 카메라를 통해 팔꿈치 각도와 볼 핸들링 릴리즈 궤적을 3차원으로 추적하여 즉각적인 시각 피드백을 제공했습니다.
  - **SPOKEDU 적용 문구:** 스마트 비전 카메라를 통해 팔꿈치 각도와 볼 핸들링 릴리즈 궤적을 3차원으로 추적하여 즉각적인 시각 피드백을 제공했습니다.
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-field_records_spomove-35` · **역할:** image · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[9]>div[12]>article[3]>div[25]>img[3]`
  - **Stitch 원문:** Diverse group of Korean multicultural teenagers cooperating in an energetic group sports agility camp at an expansive community athletics stadium under clear blue skies, professional coaches in athletic gear guiding with smiles.
  - **SPOKEDU 적용 문구:** (이미지 — COPY_SLOT_IMAGE_REGISTRY.csv 참조)
  - **근거:** Image slot; alt/prompt replaced at implementation (DEC-PACK-05)
  - **디자인 영향:** IMAGE_FRAME_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** IMAGE_PROVENANCE_REVIEW · **PENDING_APPROVAL**

- **DOM ID:** `DOM-field_records_spomove-37` · **역할:** heading · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[9]>div[12]>article[3]>div[28]>div[29]>h3[3]`
  - **Stitch 원문:** 경기 교육청 협력 다문화 청소년 스포츠 캠프 운영
  - **SPOKEDU 적용 문구:** 경기 교육청 협력 다문화 청소년 스포츠 캠프 운영
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-field_records_spomove-38` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[9]>div[12]>article[3]>div[28]>div[29]>p[5]`
  - **Stitch 원문:** 언어 장벽을 허무는 움직임 중심 게이미피케이션 프로그램으로 협동심과 기초 체력 역량을 체계적으로 증진했습니다.
  - **SPOKEDU 적용 문구:** 언어 장벽을 허무는 움직임 중심 게이미피케이션 프로그램으로 협동심과 기초 체력 역량을 체계적으로 증진했습니다.
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-field_records_spomove-41` · **역할:** image · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[9]>div[12]>article[4]>div[31]>img[4]`
  - **Stitch 원문:** A dedicated female youth athlete undergoing posture and spine alignment exercise under the careful guidance of a certified specialist in a minimalist modern private physical training clinic with clean slate tones and high-tech tablet logs.
  - **SPOKEDU 적용 문구:** (이미지 — COPY_SLOT_IMAGE_REGISTRY.csv 참조)
  - **근거:** Image slot; alt/prompt replaced at implementation (DEC-PACK-05)
  - **디자인 영향:** IMAGE_FRAME_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** IMAGE_PROVENANCE_REVIEW · **PENDING_APPROVAL**

- **DOM ID:** `DOM-field_records_spomove-43` · **역할:** heading · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[9]>div[12]>article[4]>div[34]>div[35]>h3[4]`
  - **Stitch 원문:** 성장기 체형 비대칭 개선 1:1 맞춤 트레이닝 사례
  - **SPOKEDU 적용 문구:** 성장기 체형 비대칭 개선 1:1 맞춤 트레이닝 사례
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-field_records_spomove-44` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[9]>div[12]>article[4]>div[34]>div[35]>p[6]`
  - **Stitch 원문:** 골반 편향 6.2도 불균형을 나타내던 초등 5학년 회원의 12주 운동 후 골반 정렬도 1.4도 회복 및 보행 밸런스 개선 리포트.
  - **SPOKEDU 적용 문구:** 골반 편향 6.2도 불균형을 나타내던 초등 5학년 회원의 12주 운동 후 골반 정렬도 1.4도 회복 및 보행 밸런스 개선 리포트.
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-field_records_spomove-47` · **역할:** image · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[9]>div[12]>article[5]>div[37]>img[5]`
  - **Stitch 원문:** University researchers in clean lab coats and sports attire observing running biometric charts on laptops while testing youth sprinting mechanics inside a cutting edge biomechanics university laboratory.
  - **SPOKEDU 적용 문구:** (이미지 — COPY_SLOT_IMAGE_REGISTRY.csv 참조)
  - **근거:** Image slot; alt/prompt replaced at implementation (DEC-PACK-05)
  - **디자인 영향:** IMAGE_FRAME_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** IMAGE_PROVENANCE_REVIEW · **PENDING_APPROVAL**

- **DOM ID:** `DOM-field_records_spomove-50` · **역할:** heading · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[9]>div[12]>article[5]>div[40]>div[41]>h3[5]`
  - **Stitch 원문:** 대학 체육학과 연계 유소년 피지컬 데이터 실증
  - **SPOKEDU 적용 문구:** 대학 체육학과 연계 유소년 피지컬 데이터 실증
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-field_records_spomove-51` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[9]>div[12]>article[5]>div[40]>div[41]>p[7]`
  - **Stitch 원문:** 모션 트래커 기반 순간 가속도 및 착지 충격 분산 지표를 학술적으로 검증하여 교육 프로그램의 신뢰성을 강화했습니다.
  - **SPOKEDU 적용 문구:** 기관·학교 수업
  - **근거:** site.ts / brandProfile CODE_SSOT (FACT-NAV-001)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** CODE_SSOT · **PENDING_APPROVAL**

- **DOM ID:** `DOM-field_records_spomove-54` · **역할:** image · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[9]>div[12]>article[6]>div[43]>img[6]`
  - **Stitch 원문:** Vibrant outdoor weekend family fitness festival on a sunny open lawn with parents and young children participating in smart obstacle tag and agility relay games, festival banners in blue and white.
  - **SPOKEDU 적용 문구:** (이미지 — COPY_SLOT_IMAGE_REGISTRY.csv 참조)
  - **근거:** Image slot; alt/prompt replaced at implementation (DEC-PACK-05)
  - **디자인 영향:** IMAGE_FRAME_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** IMAGE_PROVENANCE_REVIEW · **PENDING_APPROVAL**

- **DOM ID:** `DOM-field_records_spomove-56` · **역할:** heading · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[9]>div[12]>article[6]>div[46]>div[47]>h3[6]`
  - **Stitch 원문:** 주말 가족 참여형 플레이 피트니스 페스티벌
  - **SPOKEDU 적용 문구:** 주말 가족 참여형 플레이 피트니스 페스티벌
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-field_records_spomove-57` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[9]>div[12]>article[6]>div[46]>div[47]>p[8]`
  - **Stitch 원문:** 학부모와 아동이 한 팀이 되어 센서 태그 릴레이와 민첩성 챌린지를 완주하며 가족 간 신체 소통 문화를 확산했습니다.
  - **SPOKEDU 적용 문구:** 학부모와 아동이 한 팀이 되어 센서 태그 릴레이와 민첩성 챌린지를 완주하며 가족 간 신체 소통 문화를 확산했습니다.
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-field_records_spomove-63` · **역할:** heading · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[9]>div[49]>div[50]>div[52]>h4[1]`
  - **Stitch 원문:** 금일 수업 진행 중 14개 센터 · 데이터 취합율 99.4%
  - **SPOKEDU 적용 문구:** SPOKEDU 체육교육 · SPOMOVE 프로그램
  - **근거:** Stitch fiction removed — neutral SPOKEDU slot copy (FACT-STAGE7-G07|G08|G09)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** FABRICATED_REPLACED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-field_records_spomove-67` · **역할:** cta · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[9]>div[49]>div[54]>button[6]`
  - **Stitch 원문:** sync 데이터 동기화 확인
  - **SPOKEDU 적용 문구:** sync 데이터 동기화 확인
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-field_records_spomove-68` · **역할:** metric_display · **경로:** `html[1]>body[1]>main[1]>div[5]>section[3]>div[56]>div[57]>div[58]>div[59]`
  - **Stitch 원문:** 500 +
  - **SPOKEDU 적용 문구:** —
  - **근거:** 미검증 Stitch 지표 → 숫자 비활성 (FACT-STAGE7-G08)
  - **디자인 영향:** TEXT_SLOT_LOCKED;METRIC_GRAPHIC_PRESERVED
  - **CTA 목적지:** —
  - **검증·승인:** BLOCKED_UNTIL_LEDGER · **PENDING_APPROVAL**

- **DOM ID:** `DOM-field_records_spomove-69` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[3]>div[56]>div[57]>div[58]>p[9]`
  - **Stitch 원문:** 누적 협력 교육 현장
  - **SPOKEDU 적용 문구:** 누적 협력 교육 현장
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-field_records_spomove-70` · **역할:** metric_display · **경로:** `html[1]>body[1]>main[1]>div[5]>section[3]>div[56]>div[57]>div[60]>div[61]`
  - **Stitch 원문:** 98 %
  - **SPOKEDU 적용 문구:** —
  - **근거:** 미검증 Stitch 지표 → 숫자 비활성 (FACT-STAGE7-G08)
  - **디자인 영향:** TEXT_SLOT_LOCKED;METRIC_GRAPHIC_PRESERVED
  - **CTA 목적지:** —
  - **검증·승인:** BLOCKED_UNTIL_LEDGER · **PENDING_APPROVAL**

- **DOM ID:** `DOM-field_records_spomove-71` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[3]>div[56]>div[57]>div[60]>p[10]`
  - **Stitch 원문:** 학부모 및 교육청 참여 만족도
  - **SPOKEDU 적용 문구:** 학부모 및 교육청 참여 만족도
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-field_records_spomove-72` · **역할:** metric_display · **경로:** `html[1]>body[1]>main[1]>div[5]>section[3]>div[56]>div[57]>div[62]>div[63]`
  - **Stitch 원문:** 100 %
  - **SPOKEDU 적용 문구:** 100 %
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED;METRIC_GRAPHIC_PRESERVED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-field_records_spomove-73` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[3]>div[56]>div[57]>div[62]>p[11]`
  - **Stitch 원문:** 전문 자격 인증 코치 직영 파견
  - **SPOKEDU 적용 문구:** 전문 자격 인증 코치 직영 파견
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-field_records_spomove-74` · **역할:** metric_display · **경로:** `html[1]>body[1]>main[1]>div[5]>section[3]>div[56]>div[57]>div[64]>div[65]`
  - **Stitch 원문:** 15 분 내
  - **SPOKEDU 적용 문구:** 15 분 내
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED;METRIC_GRAPHIC_PRESERVED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-field_records_spomove-75` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[3]>div[56]>div[57]>div[64]>p[12]`
  - **Stitch 원문:** 수업 종료 후 모바일 리포트 전송
  - **SPOKEDU 적용 문구:** 수업 종료 후 모바일 리포트 전송
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-field_records_spomove-77` · **역할:** heading · **경로:** `html[1]>body[1]>main[1]>div[5]>section[4]>div[66]>div[69]>h2[2]`
  - **Stitch 원문:** 우리 학교 및 센터의 현장 수업을 지금 시작하세요
  - **SPOKEDU 적용 문구:** 우리 학교 및 센터의 현장 수업을 지금 시작하세요
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-field_records_spomove-78` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[4]>div[66]>div[69]>p[13]`
  - **Stitch 원문:** 늘봄학교 특별활동부터 전문 아카데미 시스템 위탁까지, 스포무브의 검증된 현장 코칭 팀이 찾아갑니다.
  - **SPOKEDU 적용 문구:** 늘봄학교 특별활동부터 전문 아카데미 시스템 위탁까지, 스포무브의 검증된 현장 코칭 팀이 찾아갑니다.
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-field_records_spomove-79` · **역할:** cta · **경로:** `html[1]>body[1]>main[1]>div[5]>section[4]>div[66]>div[69]>a[15]`
  - **Stitch 원문:** 수업 일정 상담하기
  - **SPOKEDU 적용 문구:** 수업 상담하기
  - **근거:** siteHeaderCta + home hero (HOME-CTA)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** /contact
  - **검증·승인:** PENDING_APPROVAL · **PENDING_APPROVAL**

### Images

- **DOM-field_records_spomove-21** (UNLABELED)
  - Stitch prompt: Elementary students joyfully participating in an indoor physical education class inside a modern brightly lit South Korean school gymnasium, equipped with digit…
  - Candidate: /images/spokedu/dispatch/dispatch-group-class.jpg
  - Status: CANDIDATE_REVIEW · File exists; minor consent & publication rights FACT-STAGE7-G20
  - Approval: PENDING_APPROVAL

- **DOM-field_records_spomove-28** (UNLABELED)
  - Stitch prompt: Young basketball academy players practicing precision dribbling drills while an AI smart motion camera system captures joint angles on a sleek indoor hardwood b…
  - Candidate: /images/spokedu/dispatch/dispatch-group-class.jpg
  - Status: CANDIDATE_REVIEW · File exists; minor consent & publication rights FACT-STAGE7-G20
  - Approval: PENDING_APPROVAL

- **DOM-field_records_spomove-35** (UNLABELED)
  - Stitch prompt: Diverse group of Korean multicultural teenagers cooperating in an energetic group sports agility camp at an expansive community athletics stadium under clear bl…
  - Candidate: /images/spokedu/private/private-coaching.jpg
  - Status: CANDIDATE_REVIEW · File exists; minor consent & publication rights FACT-STAGE7-G20
  - Approval: PENDING_APPROVAL

- **DOM-field_records_spomove-41** (UNLABELED)
  - Stitch prompt: A dedicated female youth athlete undergoing posture and spine alignment exercise under the careful guidance of a certified specialist in a minimalist modern pri…
  - Candidate: /images/spokedu/home/field-editorial/home-master-ui.png
  - Status: CANDIDATE_REVIEW · File exists; minor consent & publication rights FACT-STAGE7-G20
  - Approval: PENDING_APPROVAL

- **DOM-field_records_spomove-47** (UNLABELED)
  - Stitch prompt: University researchers in clean lab coats and sports attire observing running biometric charts on laptops while testing youth sprinting mechanics inside a cutti…
  - Candidate: /images/spokedu/home/field-editorial/home-hero-ai-20261018.png
  - Status: CANDIDATE_REVIEW · File exists; minor consent & publication rights FACT-STAGE7-G20
  - Approval: PENDING_APPROVAL

- **DOM-field_records_spomove-54** (UNLABELED)
  - Stitch prompt: Vibrant outdoor weekend family fitness festival on a sunny open lawn with parents and young children participating in smart obstacle tag and agility relay games…
  - Candidate: /images/spokedu/records/dongjak-spomove-field.jpg | /images/spokedu/private/curriculum-soccer.jpg
  - Status: CANDIDATE_REVIEW · File exists; minor consent & publication rights FACT-STAGE7-G20
  - Approval: PENDING_APPROVAL

---

## Page `/about` — `about_spomove`

**DOM slots:** 120 · **Coverage gap estimate:** 0 minor text fragments (material icons / duplicates)

### Sections (Stitch comment order)


### UNLABELED

- **DOM ID:** `DOM-about_spomove-10` · **역할:** heading · **경로:** `html[1]>body[1]>main[1]>div[5]>section[1]>div[6]>h1[1]`
  - **Stitch 원문:** 모든 아이들이 스포츠를 통해 건강한 삶의 기쁨을 누릴 수 있도록
  - **SPOKEDU 적용 문구:** 모든 아이들이 스포츠를 통해 건강한 삶의 기쁨을 누릴 수 있도록
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-about_spomove-11` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[1]>div[6]>p[1]`
  - **Stitch 원문:** SPOMOVE는 정밀 바이오메카닉스와 AI 모션 비전 기술을 현장 체육 교육과 융합합니다. 단순한 기록 경쟁을 넘어, 모든 아이가 자신의 몸을 바르게 인지하고 평생 지속 가능한 운동 습관을 확립하도록 돕는 차세대 에듀테크 연구 집단입니다.
  - **SPOKEDU 적용 문구:** SPOKEDU
  - **근거:** site.ts / brandProfile CODE_SSOT (FACT-NAV-001)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** CODE_SSOT · **PENDING_APPROVAL**

- **DOM ID:** `DOM-about_spomove-14` · **역할:** metric_display · **경로:** `html[1]>body[1]>main[1]>div[5]>section[1]>div[6]>div[8]>div[9]>span[7]`
  - **Stitch 원문:** 2021년
  - **SPOKEDU 적용 문구:** 2021년
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED;METRIC_GRAPHIC_PRESERVED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-about_spomove-17` · **역할:** metric_display · **경로:** `html[1]>body[1]>main[1]>div[5]>section[1]>div[6]>div[8]>div[10]>span[10]`
  - **Stitch 원문:** 48개교
  - **SPOKEDU 적용 문구:** 48개교
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED;METRIC_GRAPHIC_PRESERVED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-about_spomove-20` · **역할:** metric_display · **경로:** `html[1]>body[1]>main[1]>div[5]>section[1]>div[6]>div[8]>div[11]>span[13]`
  - **Stitch 원문:** 14만건
  - **SPOKEDU 적용 문구:** —
  - **근거:** Stitch fiction removed — neutral SPOKEDU slot copy (FACT-STAGE7-G07|G08|G09)
  - **디자인 영향:** TEXT_SLOT_LOCKED;METRIC_GRAPHIC_PRESERVED
  - **CTA 목적지:** —
  - **검증·승인:** FABRICATED_REPLACED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-about_spomove-23` · **역할:** metric_display · **경로:** `html[1]>body[1]>main[1]>div[5]>section[1]>div[6]>div[8]>div[12]>span[16]`
  - **Stitch 원문:** 99.4%
  - **SPOKEDU 적용 문구:** —
  - **근거:** Stitch fiction removed — neutral SPOKEDU slot copy (FACT-STAGE7-G07|G08|G09)
  - **디자인 영향:** TEXT_SLOT_LOCKED;METRIC_GRAPHIC_PRESERVED
  - **CTA 목적지:** —
  - **검증·승인:** FABRICATED_REPLACED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-about_spomove-25` · **역할:** decorative_number · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[13]>div[14]>div[15]>span[19]`
  - **Stitch 원문:** 01
  - **SPOKEDU 적용 문구:** 01
  - **근거:** Stitch watermark decoration — design SSOT (DESIGN-ONLY)
  - **디자인 영향:** TEXT_SLOT_LOCKED;METRIC_GRAPHIC_PRESERVED
  - **CTA 목적지:** —
  - **검증·승인:** DESIGN_ONLY · **PENDING_APPROVAL**

- **DOM ID:** `DOM-about_spomove-26` · **역할:** tag_chip · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[13]>div[14]>div[15]>div[16]>div[17]`
  - **Stitch 원문:** #스포츠과학 #정량분석 #생체역학연구
  - **SPOKEDU 적용 문구:** #스포츠과학 #정량분석 #생체역학연구
  - **근거:** Hashtag chip — align with LIVE card tags in Phase C (TAG-CHIP)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** PENDING_APPROVAL · **PENDING_APPROVAL**

- **DOM ID:** `DOM-about_spomove-27` · **역할:** tag_chip · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[13]>div[14]>div[15]>div[16]>div[17]>span[20]`
  - **Stitch 원문:** #스포츠과학
  - **SPOKEDU 적용 문구:** #스포츠과학
  - **근거:** Hashtag chip — align with LIVE card tags in Phase C (TAG-CHIP)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** PENDING_APPROVAL · **PENDING_APPROVAL**

- **DOM ID:** `DOM-about_spomove-28` · **역할:** tag_chip · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[13]>div[14]>div[15]>div[16]>div[17]>span[21]`
  - **Stitch 원문:** #정량분석
  - **SPOKEDU 적용 문구:** #정량분석
  - **근거:** Hashtag chip — align with LIVE card tags in Phase C (TAG-CHIP)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** PENDING_APPROVAL · **PENDING_APPROVAL**

- **DOM ID:** `DOM-about_spomove-29` · **역할:** tag_chip · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[13]>div[14]>div[15]>div[16]>div[17]>span[22]`
  - **Stitch 원문:** #생체역학연구
  - **SPOKEDU 적용 문구:** #생체역학연구
  - **근거:** Hashtag chip — align with LIVE card tags in Phase C (TAG-CHIP)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** PENDING_APPROVAL · **PENDING_APPROVAL**

- **DOM ID:** `DOM-about_spomove-30` · **역할:** heading · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[13]>div[14]>div[15]>div[16]>h3[1]`
  - **Stitch 원문:** 데이터 기반의 과학적 코칭 철학
  - **SPOKEDU 적용 문구:** 데이터 기반의 과학적 코칭 철학
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-about_spomove-31` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[13]>div[14]>div[15]>div[16]>p[2]`
  - **Stitch 원문:** 경험과 직관에만 의존하던 기존 체육 훈련의 한계를 넘어, 초당 120프레임 정밀 키포인트 추적으로 관절 각도와 무게중심 이동을 실시간 정량화합니다. 아이들 각자의 신체 특성에 부합하는 무리 없는 최적의 모션 피드백을 전달합니다.
  - **SPOKEDU 적용 문구:** SPOKEDU 체육교육 · SPOMOVE 프로그램
  - **근거:** Stitch fiction removed — neutral SPOKEDU slot copy (FACT-STAGE7-G07|G08|G09)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** FABRICATED_REPLACED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-about_spomove-32` · **역할:** cta · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[13]>div[14]>div[15]>div[16]>div[18]>a[9]`
  - **Stitch 원문:** 모션 AI 비전 알고리즘 자세히 보기 arrow_forward
  - **SPOKEDU 적용 문구:** 수업 유형 살펴보기
  - **근거:** HOME-008 (HOME-008)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** /spomove
  - **검증·승인:** PENDING_APPROVAL · **PENDING_APPROVAL**

- **DOM ID:** `DOM-about_spomove-34` · **역할:** image · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[13]>div[14]>div[19]>div[20]>img[1]`
  - **Stitch 원문:** Modern sports biomechanics motion capture laboratory with high-speed cameras, dual force plates on floor, and sleek digital screens visualizing skeletal human movement in royal blue graphics. Professional academic atmosphere with minimalist equipment and clean white surfaces.
  - **SPOKEDU 적용 문구:** (이미지 — COPY_SLOT_IMAGE_REGISTRY.csv 참조)
  - **근거:** Image slot; alt/prompt replaced at implementation (DEC-PACK-05)
  - **디자인 영향:** IMAGE_FRAME_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** IMAGE_PROVENANCE_REVIEW · **PENDING_APPROVAL**

- **DOM ID:** `DOM-about_spomove-40` · **역할:** image · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[13]>div[26]>div[27]>div[28]>img[2]`
  - **Stitch 원문:** Warm and joyful moment in a bright modern sports gym where a friendly Korean youth athletic coach gives a high-five to a smiling child wearing a blue training vest. Sunlight streams through large glass windows, capturing authentic laughter, encouraging atmosphere, and safe soft-m…
  - **SPOKEDU 적용 문구:** (이미지 — COPY_SLOT_IMAGE_REGISTRY.csv 참조)
  - **근거:** Image slot; alt/prompt replaced at implementation (DEC-PACK-05)
  - **디자인 영향:** IMAGE_FRAME_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** IMAGE_PROVENANCE_REVIEW · **PENDING_APPROVAL**

- **DOM ID:** `DOM-about_spomove-41` · **역할:** decorative_number · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[13]>div[26]>div[30]>span[31]`
  - **Stitch 원문:** 02
  - **SPOKEDU 적용 문구:** 02
  - **근거:** Stitch watermark decoration — design SSOT (DESIGN-ONLY)
  - **디자인 영향:** TEXT_SLOT_LOCKED;METRIC_GRAPHIC_PRESERVED
  - **CTA 목적지:** —
  - **검증·승인:** DESIGN_ONLY · **PENDING_APPROVAL**

- **DOM ID:** `DOM-about_spomove-42` · **역할:** tag_chip · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[13]>div[26]>div[30]>div[31]>div[32]`
  - **Stitch 원문:** #진정성 #안전제일 #자신감향상
  - **SPOKEDU 적용 문구:** #진정성 #안전제일 #자신감향상
  - **근거:** Hashtag chip — align with LIVE card tags in Phase C (TAG-CHIP)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** PENDING_APPROVAL · **PENDING_APPROVAL**

- **DOM ID:** `DOM-about_spomove-43` · **역할:** tag_chip · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[13]>div[26]>div[30]>div[31]>div[32]>span[32]`
  - **Stitch 원문:** #진정성
  - **SPOKEDU 적용 문구:** #진정성
  - **근거:** Hashtag chip — align with LIVE card tags in Phase C (TAG-CHIP)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** PENDING_APPROVAL · **PENDING_APPROVAL**

- **DOM ID:** `DOM-about_spomove-44` · **역할:** tag_chip · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[13]>div[26]>div[30]>div[31]>div[32]>span[33]`
  - **Stitch 원문:** #안전제일
  - **SPOKEDU 적용 문구:** #안전제일
  - **근거:** Hashtag chip — align with LIVE card tags in Phase C (TAG-CHIP)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** PENDING_APPROVAL · **PENDING_APPROVAL**

- **DOM ID:** `DOM-about_spomove-45` · **역할:** tag_chip · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[13]>div[26]>div[30]>div[31]>div[32]>span[34]`
  - **Stitch 원문:** #자신감향상
  - **SPOKEDU 적용 문구:** #자신감향상
  - **근거:** Hashtag chip — align with LIVE card tags in Phase C (TAG-CHIP)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** PENDING_APPROVAL · **PENDING_APPROVAL**

- **DOM ID:** `DOM-about_spomove-46` · **역할:** heading · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[13]>div[26]>div[30]>div[31]>h3[2]`
  - **Stitch 원문:** 사람 중심의 따뜻한 교육 현장
  - **SPOKEDU 적용 문구:** 사람 중심의 따뜻한 교육 현장
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-about_spomove-47` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[13]>div[26]>div[30]>div[31]>p[3]`
  - **Stitch 원문:** 정량화된 데이터는 목적이 아닌 수단입니다. 스포무브의 코칭 스태프는 아이들이 실패를 두려워하지 않고 스스로 도전을 즐길 수 있도록 심리적 안정감과 즐거움을 최우선으로 수업을 설계합니다.
  - **SPOKEDU 적용 문구:** 정량화된 데이터는 목적이 아닌 수단입니다. 스포무브의 코칭 스태프는 아이들이 실패를 두려워하지 않고 스스로 도전을 즐길 수 있도록 심리적 안정감과 즐거움을 최우선으로 수업을 설계합니다.
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-about_spomove-48` · **역할:** cta · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[13]>div[26]>div[30]>div[31]>div[33]>a[10]`
  - **Stitch 원문:** 생생한 현장 수업 스토리 확인하기 arrow_forward
  - **SPOKEDU 적용 문구:** 생생한 현장 수업 스토리 확인하기 arrow_forward
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** /records
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-about_spomove-49` · **역할:** decorative_number · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[13]>div[34]>div[35]>span[38]`
  - **Stitch 원문:** 03
  - **SPOKEDU 적용 문구:** 03
  - **근거:** Stitch watermark decoration — design SSOT (DESIGN-ONLY)
  - **디자인 영향:** TEXT_SLOT_LOCKED;METRIC_GRAPHIC_PRESERVED
  - **CTA 목적지:** —
  - **검증·승인:** DESIGN_ONLY · **PENDING_APPROVAL**

- **DOM ID:** `DOM-about_spomove-50` · **역할:** tag_chip · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[13]>div[34]>div[35]>div[36]>div[37]`
  - **Stitch 원문:** #공교육혁신 #교육나눔 #디지털격차해소
  - **SPOKEDU 적용 문구:** #공교육혁신 #교육나눔 #디지털격차해소
  - **근거:** Hashtag chip — align with LIVE card tags in Phase C (TAG-CHIP)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** PENDING_APPROVAL · **PENDING_APPROVAL**

- **DOM ID:** `DOM-about_spomove-51` · **역할:** tag_chip · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[13]>div[34]>div[35]>div[36]>div[37]>span[39]`
  - **Stitch 원문:** #공교육혁신
  - **SPOKEDU 적용 문구:** #공교육혁신
  - **근거:** Hashtag chip — align with LIVE card tags in Phase C (TAG-CHIP)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** PENDING_APPROVAL · **PENDING_APPROVAL**

- **DOM ID:** `DOM-about_spomove-52` · **역할:** tag_chip · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[13]>div[34]>div[35]>div[36]>div[37]>span[40]`
  - **Stitch 원문:** #교육나눔
  - **SPOKEDU 적용 문구:** #교육나눔
  - **근거:** Hashtag chip — align with LIVE card tags in Phase C (TAG-CHIP)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** PENDING_APPROVAL · **PENDING_APPROVAL**

- **DOM ID:** `DOM-about_spomove-53` · **역할:** tag_chip · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[13]>div[34]>div[35]>div[36]>div[37]>span[41]`
  - **Stitch 원문:** #디지털격차해소
  - **SPOKEDU 적용 문구:** #디지털격차해소
  - **근거:** Hashtag chip — align with LIVE card tags in Phase C (TAG-CHIP)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** PENDING_APPROVAL · **PENDING_APPROVAL**

- **DOM ID:** `DOM-about_spomove-54` · **역할:** heading · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[13]>div[34]>div[35]>div[36]>h3[3]`
  - **Stitch 원문:** 교육 격차 해소를 위한 공교육 파트너십
  - **SPOKEDU 적용 문구:** 교육 격차 해소를 위한 공교육 파트너십
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-about_spomove-55` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[13]>div[34]>div[35]>div[36]>p[4]`
  - **Stitch 원문:** 지리적·경제적 여건에 구애받지 않고 모든 공립 학교 학생들이 첨단 AI 체육 커리큘럼을 무상으로 경험할 수 있도록, 교육청 및 지자체와 함께하는 스마트 스쿨 프로젝트를 지속해서 확대합니다.
  - **SPOKEDU 적용 문구:** 지리적·경제적 여건에 구애받지 않고 모든 공립 학교 학생들이 첨단 AI 체육 커리큘럼을 무상으로 경험할 수 있도록, 교육청 및 지자체와 함께하는 스마트 스쿨 프로젝트를 지속해서 확대합니다.
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-about_spomove-56` · **역할:** cta · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[13]>div[34]>div[35]>div[36]>div[38]>a[11]`
  - **Stitch 원문:** 학교·기관 단체 제휴 프로그램 안내 arrow_forward
  - **SPOKEDU 적용 문구:** 수업 유형 살펴보기
  - **근거:** HOME-008 (HOME-008)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** /contact
  - **검증·승인:** PENDING_APPROVAL · **PENDING_APPROVAL**

- **DOM ID:** `DOM-about_spomove-58` · **역할:** image · **경로:** `html[1]>body[1]>main[1]>div[5]>section[2]>div[13]>div[34]>div[39]>div[40]>img[3]`
  - **Stitch 원문:** Spacious Korean elementary school indoor gymnasium where energetic students engage in an organized interactive agility training drill using colorful training cones and an educational tablet dashboard mounted on a sleek stand. Crisp daylight illumination, dynamic posture, organize…
  - **SPOKEDU 적용 문구:** (이미지 — COPY_SLOT_IMAGE_REGISTRY.csv 참조)
  - **근거:** Image slot; alt/prompt replaced at implementation (DEC-PACK-05)
  - **디자인 영향:** IMAGE_FRAME_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** IMAGE_PROVENANCE_REVIEW · **PENDING_APPROVAL**

- **DOM ID:** `DOM-about_spomove-64` · **역할:** heading · **경로:** `html[1]>body[1]>main[1]>div[5]>section[3]>div[46]>div[47]>div[48]>h2[1]`
  - **Stitch 원문:** 신뢰할 수 있는 학술 연구진과 전문 코치진
  - **SPOKEDU 적용 문구:** 신뢰할 수 있는 학술 연구진과 전문 코치진
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-about_spomove-65` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[3]>div[46]>div[47]>div[48]>p[5]`
  - **Stitch 원문:** UNIST 인간공학 연구진과 대한체육회 공인 지도자가 원팀을 이루어 과학적 신뢰성과 현장 적합성을 완벽하게 검증합니다.
  - **SPOKEDU 적용 문구:** 지도자 현장 수업
  - **근거:** Stitch fiction removed — neutral SPOKEDU slot copy (FACT-STAGE7-G07|G08|G09)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** FABRICATED_REPLACED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-about_spomove-67` · **역할:** image · **경로:** `html[1]>body[1]>main[1]>div[5]>section[3]>div[46]>div[51]>div[52]>div[53]>img[4]`
  - **Stitch 원문:** Professional studio portrait of an Asian male AI sports biomechanics professor in early 40s wearing a modern tailored navy blazer with confident friendly expression, neutral grey backdrop with clean studio lighting.
  - **SPOKEDU 적용 문구:** (이미지 — COPY_SLOT_IMAGE_REGISTRY.csv 참조)
  - **근거:** Image slot; alt/prompt replaced at implementation (DEC-PACK-05)
  - **디자인 영향:** IMAGE_FRAME_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** IMAGE_PROVENANCE_REVIEW · **PENDING_APPROVAL**

- **DOM ID:** `DOM-about_spomove-71` · **역할:** heading · **경로:** `html[1]>body[1]>main[1]>div[5]>section[3]>div[46]>div[51]>div[52]>h4[1]`
  - **Stitch 원문:** 강 준 석
  - **SPOKEDU 적용 문구:** 강 준 석
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-about_spomove-72` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[3]>div[46]>div[51]>div[52]>p[6]`
  - **Stitch 원문:** 인공지능 생체신호 분석 연구실 디렉터 / IEEE AI 헬스케어 분과 상임위원
  - **SPOKEDU 적용 문구:** 프로그램·운영 안내
  - **근거:** Stitch fiction removed — neutral SPOKEDU slot copy (FACT-STAGE7-G07|G08|G09)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** FABRICATED_REPLACED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-about_spomove-73` · **역할:** image · **경로:** `html[1]>body[1]>main[1]>div[5]>section[3]>div[46]>div[51]>div[55]>div[56]>img[5]`
  - **Stitch 원문:** Professional studio portrait of an Asian female youth athletic psychology researcher in late 30s wearing a crisp white collared shirt, professional, warm, intellectual appearance with soft lighting.
  - **SPOKEDU 적용 문구:** (이미지 — COPY_SLOT_IMAGE_REGISTRY.csv 참조)
  - **근거:** Image slot; alt/prompt replaced at implementation (DEC-PACK-05)
  - **디자인 영향:** IMAGE_FRAME_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** IMAGE_PROVENANCE_REVIEW · **PENDING_APPROVAL**

- **DOM ID:** `DOM-about_spomove-77` · **역할:** heading · **경로:** `html[1]>body[1]>main[1]>div[5]>section[3]>div[46]>div[51]>div[55]>h4[2]`
  - **Stitch 원문:** 이 혜 민
  - **SPOKEDU 적용 문구:** 이 혜 민
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-about_spomove-78` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[3]>div[46]>div[51]>div[55]>p[7]`
  - **Stitch 원문:** 서울대학교 체육교육학 박사 / 유소년 발달단계별 신체 밸런스 커리큘럼 설계
  - **SPOKEDU 적용 문구:** 서울대학교 체육교육학 박사 / 유소년 발달단계별 신체 밸런스 커리큘럼 설계
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-about_spomove-79` · **역할:** image · **경로:** `html[1]>body[1]>main[1]>div[5]>section[3]>div[46]>div[51]>div[58]>div[59]>img[6]`
  - **Stitch 원문:** Professional portrait of an athletic Asian male Master Coach in his 30s wearing a sharp royal blue athletic quarter-zip jacket, energetic posture, confident friendly smile, modern gym background slightly blurred.
  - **SPOKEDU 적용 문구:** (이미지 — COPY_SLOT_IMAGE_REGISTRY.csv 참조)
  - **근거:** Image slot; alt/prompt replaced at implementation (DEC-PACK-05)
  - **디자인 영향:** IMAGE_FRAME_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** IMAGE_PROVENANCE_REVIEW · **PENDING_APPROVAL**

- **DOM ID:** `DOM-about_spomove-83` · **역할:** heading · **경로:** `html[1]>body[1]>main[1]>div[5]>section[3]>div[46]>div[51]>div[58]>h4[3]`
  - **Stitch 원문:** 박 성 훈
  - **SPOKEDU 적용 문구:** 박 성 훈
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-about_spomove-84` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[3]>div[46]>div[51]>div[58]>p[8]`
  - **Stitch 원문:** 전 국가대표 육상팀 피지컬 트레이너 / 엘리트 모빌리티 코칭 디렉터
  - **SPOKEDU 적용 문구:** SPOKEDU 체육교육 · SPOMOVE 프로그램
  - **근거:** Stitch fiction removed — neutral SPOKEDU slot copy (FACT-STAGE7-G07|G08|G09)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** FABRICATED_REPLACED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-about_spomove-85` · **역할:** image · **경로:** `html[1]>body[1]>main[1]>div[5]>section[3]>div[46]>div[51]>div[61]>div[62]>img[7]`
  - **Stitch 원문:** Professional headshot of an Asian male AI computer vision software architect in late 30s wearing casual black knitwear with spectacles, intellectual focused posture, contemporary tech office environment.
  - **SPOKEDU 적용 문구:** (이미지 — COPY_SLOT_IMAGE_REGISTRY.csv 참조)
  - **근거:** Image slot; alt/prompt replaced at implementation (DEC-PACK-05)
  - **디자인 영향:** IMAGE_FRAME_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** IMAGE_PROVENANCE_REVIEW · **PENDING_APPROVAL**

- **DOM ID:** `DOM-about_spomove-89` · **역할:** heading · **경로:** `html[1]>body[1]>main[1]>div[5]>section[3]>div[46]>div[51]>div[61]>h4[4]`
  - **Stitch 원문:** 최 동 건
  - **SPOKEDU 적용 문구:** 최 동 건
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-about_spomove-90` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[3]>div[46]>div[51]>div[61]>p[9]`
  - **Stitch 원문:** CVPR 모션 인식 연구 발표자 / 3D 실시간 신체 랜드마크 트래커 총괄 개발
  - **SPOKEDU 적용 문구:** 프로그램·운영 안내
  - **근거:** Stitch fiction removed — neutral SPOKEDU slot copy (FACT-STAGE7-G07|G08|G09)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** FABRICATED_REPLACED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-about_spomove-92` · **역할:** heading · **경로:** `html[1]>body[1]>main[1]>div[5]>section[4]>div[64]>div[65]>div[68]>h2[2]`
  - **Stitch 원문:** 스포무브와 함께 스포츠 교육의 새로운 미래를 만들어가세요
  - **SPOKEDU 적용 문구:** 스포무브와 함께 스포츠 교육의 새로운 미래를 만들어가세요
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-about_spomove-93` · **역할:** body · **경로:** `html[1]>body[1]>main[1]>div[5]>section[4]>div[64]>div[65]>div[68]>p[10]`
  - **Stitch 원문:** 공교육 협력 사업 추진, 프라이빗 아카데미 가맹, 그리고 스포츠 과학 AI 연구원 채용까지—체육 교육의 혁신에 함께할 여러분을 기다립니다.
  - **SPOKEDU 적용 문구:** 공교육 협력 사업 추진, 프라이빗 아카데미 가맹, 그리고 스포츠 과학 AI 연구원 채용까지—체육 교육의 혁신에 함께할 여러분을 기다립니다.
  - **근거:** Stitch display text retained where no conflict (brand-normalize pass in Phase C) (STITCH-RETAIN)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** —
  - **검증·승인:** REVIEW_RETAINED · **PENDING_APPROVAL**

- **DOM ID:** `DOM-about_spomove-94` · **역할:** cta · **경로:** `html[1]>body[1]>main[1]>div[5]>section[4]>div[64]>div[65]>div[68]>div[69]>a[12]`
  - **Stitch 원문:** 제휴 및 채용 문의
  - **SPOKEDU 적용 문구:** 수업 상담하기
  - **근거:** siteHeaderCta + home hero (HOME-CTA)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** /contact
  - **검증·승인:** PENDING_APPROVAL · **PENDING_APPROVAL**

- **DOM ID:** `DOM-about_spomove-95` · **역할:** cta · **경로:** `html[1]>body[1]>main[1]>div[5]>section[4]>div[64]>div[65]>div[68]>div[69]>a[13]`
  - **Stitch 원문:** 교육 프로그램 둘러보기
  - **SPOKEDU 적용 문구:** 수업 유형 살펴보기
  - **근거:** HOME-008 (HOME-008)
  - **디자인 영향:** TEXT_SLOT_LOCKED
  - **CTA 목적지:** /education
  - **검증·승인:** PENDING_APPROVAL · **PENDING_APPROVAL**

### Images

- **DOM-about_spomove-34** (UNLABELED)
  - Stitch prompt: Modern sports biomechanics motion capture laboratory with high-speed cameras, dual force plates on floor, and sleek digital screens visualizing skeletal human m…
  - Candidate: /images/spokedu/home/field-editorial/home-hero-ai-20261018.png
  - Status: CANDIDATE_REVIEW · File exists; minor consent & publication rights FACT-STAGE7-G20
  - Approval: PENDING_APPROVAL

- **DOM-about_spomove-40** (UNLABELED)
  - Stitch prompt: Warm and joyful moment in a bright modern sports gym where a friendly Korean youth athletic coach gives a high-five to a smiling child wearing a blue training v…
  - Candidate: /images/spokedu/private/private-coaching.jpg
  - Status: CANDIDATE_REVIEW · File exists; minor consent & publication rights FACT-STAGE7-G20
  - Approval: PENDING_APPROVAL

- **DOM-about_spomove-58** (UNLABELED)
  - Stitch prompt: Spacious Korean elementary school indoor gymnasium where energetic students engage in an organized interactive agility training drill using colorful training co…
  - Candidate: /images/spokedu/dispatch/dispatch-group-class.jpg
  - Status: CANDIDATE_REVIEW · File exists; minor consent & publication rights FACT-STAGE7-G20
  - Approval: PENDING_APPROVAL

- **DOM-about_spomove-67** (UNLABELED)
  - Stitch prompt: Professional studio portrait of an Asian male AI sports biomechanics professor in early 40s wearing a modern tailored navy blazer with confident friendly expres…
  - Candidate: /images/spokedu/private/instructor-choi.jpg | /images/spokedu/private/instructor-kim-gumin.jpg
  - Status: CANDIDATE_REVIEW · File exists; minor consent & publication rights FACT-STAGE7-G20
  - Approval: PENDING_APPROVAL

- **DOM-about_spomove-73** (UNLABELED)
  - Stitch prompt: Professional studio portrait of an Asian female youth athletic psychology researcher in late 30s wearing a crisp white collared shirt, professional, warm, intel…
  - Candidate: /images/spokedu/private/instructor-choi.jpg | /images/spokedu/private/instructor-kim-gumin.jpg
  - Status: CANDIDATE_REVIEW · File exists; minor consent & publication rights FACT-STAGE7-G20
  - Approval: PENDING_APPROVAL

- **DOM-about_spomove-79** (UNLABELED)
  - Stitch prompt: Professional portrait of an athletic Asian male Master Coach in his 30s wearing a sharp royal blue athletic quarter-zip jacket, energetic posture, confident fri…
  - Candidate: /images/spokedu/private/private-coaching.jpg
  - Status: CANDIDATE_REVIEW · File exists; minor consent & publication rights FACT-STAGE7-G20
  - Approval: PENDING_APPROVAL

- **DOM-about_spomove-85** (UNLABELED)
  - Stitch prompt: Professional headshot of an Asian male AI computer vision software architect in late 30s wearing casual black knitwear with spectacles, intellectual focused pos…
  - Candidate: /images/spokedu/private/class-flow-01.jpg
  - Status: CANDIDATE_REVIEW · File exists; minor consent & publication rights FACT-STAGE7-G20
  - Approval: PENDING_APPROVAL

---

## Design conflict register (copy-led; no layout change applied)

- `DOM-home_spomove-2` (/): TEXT_SLOT_LOCKED;LINE_WRAP_RISK — alt: 「수업 유형 살펴보기」
- `DOM-home_spomove-20` (/): TEXT_SLOT_LOCKED;METRIC_GRAPHIC_PRESERVED — alt: 「01」
- `DOM-home_spomove-32` (/): TEXT_SLOT_LOCKED;METRIC_GRAPHIC_PRESERVED — alt: 「02」
- `DOM-home_spomove-40` (/): TEXT_SLOT_LOCKED;METRIC_GRAPHIC_PRESERVED — alt: 「03」
- `DOM-home_spomove-61` (/): TEXT_SLOT_LOCKED;METRIC_GRAPHIC_PRESERVED — alt: 「—」
- `DOM-home_spomove-63` (/): TEXT_SLOT_LOCKED;METRIC_GRAPHIC_PRESERVED — alt: 「—」
- `DOM-home_spomove-65` (/): TEXT_SLOT_LOCKED;METRIC_GRAPHIC_PRESERVED — alt: 「—」
- `DOM-home_spomove-67` (/): TEXT_SLOT_LOCKED;METRIC_GRAPHIC_PRESERVED — alt: 「—」
- `DOM-home_spomove-116` (/): TEXT_SLOT_LOCKED;LINE_WRAP_RISK — alt: 「대상 연령, 인원, 공간, 운영 목적을 확인한 뒤 적합한 수업 형태를 제안드립니다.」
- `DOM-home_spomove-117` (/): TEXT_SLOT_LOCKED;LINE_WRAP_RISK — alt: 「대상 연령, 인원, 공간, 운영 목적을 확인한 뒤 적합한 수업 형태를 제안드립니다.」
- `DOM-home_spomove-118` (/): TEXT_SLOT_LOCKED;LINE_WRAP_RISK — alt: 「대상 연령, 인원, 공간, 운영 목적을 확인한 뒤 적합한 수업 형태를 제안드립니다.」
- `DOM-education_programs_spomove-2` (/education): TEXT_SLOT_LOCKED;LINE_WRAP_RISK — alt: 「수업 유형 살펴보기」
- `DOM-education_programs_spomove-72` (/education): TEXT_SLOT_LOCKED;METRIC_GRAPHIC_PRESERVED — alt: 「01」
- `DOM-education_programs_spomove-86` (/education): TEXT_SLOT_LOCKED;METRIC_GRAPHIC_PRESERVED — alt: 「02」
- `DOM-education_programs_spomove-96` (/education): TEXT_SLOT_LOCKED;METRIC_GRAPHIC_PRESERVED — alt: 「—」
- `DOM-education_programs_spomove-98` (/education): TEXT_SLOT_LOCKED;METRIC_GRAPHIC_PRESERVED — alt: 「12,000+」
- `DOM-education_programs_spomove-100` (/education): TEXT_SLOT_LOCKED;METRIC_GRAPHIC_PRESERVED — alt: 「—」
- `DOM-education_programs_spomove-102` (/education): TEXT_SLOT_LOCKED;METRIC_GRAPHIC_PRESERVED — alt: 「4.9/5」
- `DOM-education_programs_spomove-126` (/education): TEXT_SLOT_LOCKED;LINE_WRAP_RISK — alt: 「상담 가능 시간: 평일 09:00–18:00 (주말·공휴일은 채널 안내 기준)」
- `DOM-private_lesson_spomove-2` (/private): TEXT_SLOT_LOCKED;LINE_WRAP_RISK — alt: 「수업 유형 살펴보기」
- `DOM-private_lesson_spomove-16` (/private): TEXT_SLOT_LOCKED;METRIC_GRAPHIC_PRESERVED — alt: 「98.6%」
- `DOM-private_lesson_spomove-19` (/private): TEXT_SLOT_LOCKED;METRIC_GRAPHIC_PRESERVED — alt: 「1:1Care」
- `DOM-private_lesson_spomove-22` (/private): TEXT_SLOT_LOCKED;METRIC_GRAPHIC_PRESERVED — alt: 「300+」
- `DOM-private_lesson_spomove-24` (/private): TEXT_SLOT_LOCKED;METRIC_GRAPHIC_PRESERVED — alt: 「01」
- `DOM-private_lesson_spomove-41` (/private): TEXT_SLOT_LOCKED;METRIC_GRAPHIC_PRESERVED — alt: 「02」
- `DOM-private_lesson_spomove-48` (/private): TEXT_SLOT_LOCKED;METRIC_GRAPHIC_PRESERVED — alt: 「03」
- `DOM-private_lesson_spomove-104` (/private): TEXT_SLOT_LOCKED;LINE_WRAP_RISK — alt: 「상담 가능 시간: 평일 09:00–18:00 (주말·공휴일은 채널 안내 기준)」
- `DOM-about_spomove-2` (/about): TEXT_SLOT_LOCKED;LINE_WRAP_RISK — alt: 「수업 유형 살펴보기」
- `DOM-about_spomove-14` (/about): TEXT_SLOT_LOCKED;METRIC_GRAPHIC_PRESERVED — alt: 「2021년」
- `DOM-about_spomove-17` (/about): TEXT_SLOT_LOCKED;METRIC_GRAPHIC_PRESERVED — alt: 「48개교」
- `DOM-about_spomove-20` (/about): TEXT_SLOT_LOCKED;METRIC_GRAPHIC_PRESERVED — alt: 「—」
- `DOM-about_spomove-23` (/about): TEXT_SLOT_LOCKED;METRIC_GRAPHIC_PRESERVED — alt: 「—」
- `DOM-about_spomove-25` (/about): TEXT_SLOT_LOCKED;METRIC_GRAPHIC_PRESERVED — alt: 「01」
- `DOM-about_spomove-41` (/about): TEXT_SLOT_LOCKED;METRIC_GRAPHIC_PRESERVED — alt: 「02」
- `DOM-about_spomove-49` (/about): TEXT_SLOT_LOCKED;METRIC_GRAPHIC_PRESERVED — alt: 「03」
- `DOM-about_spomove-113` (/about): TEXT_SLOT_LOCKED;LINE_WRAP_RISK — alt: 「상담 가능 시간: 평일 09:00–18:00 (주말·공휴일은 채널 안내 기준)」
- `DOM-field_records_spomove-2` (/records): TEXT_SLOT_LOCKED;LINE_WRAP_RISK — alt: 「수업 유형 살펴보기」
- `DOM-field_records_spomove-68` (/records): TEXT_SLOT_LOCKED;METRIC_GRAPHIC_PRESERVED — alt: 「—」
- `DOM-field_records_spomove-70` (/records): TEXT_SLOT_LOCKED;METRIC_GRAPHIC_PRESERVED — alt: 「—」
- `DOM-field_records_spomove-72` (/records): TEXT_SLOT_LOCKED;METRIC_GRAPHIC_PRESERVED — alt: 「100 %」
- … +12 rows in CSV

## Validation summary

| Check | Result |
|-------|--------|
| DOM extract slots | 721 |
| Text slots empty copy | 0 |
| Image slots | 34 |
| IMAGE_ASSET_REQUIRED | 0 |
| Unverified / blocked fact rows | 75 |
| Design impact flagged | 52 |
| Public fact auto-confirmed | **0** (all PENDING_APPROVAL) |
| Phase C | **NOT STARTED** |

## Auxiliary files

- `copy-slot-review/STITCH_6_DOM_SLOTS.csv`
- `copy-slot-review/STITCH_6_IMAGE_REGISTRY.csv`
- `copy-slot-review/STITCH_6_UNVERIFIED_FACTS.csv`
- Legacy 135 + 518 extracts remain under `copy-slot-review/` for audit trail only.
- Full DOM trace: 721 rows in CSV; manuscript shows primary display slots only (headings, body, CTA, metrics, images, chrome).

## Approval

PO confirms copy + image candidates per section. Phase C and `STITCH_BASELINE_RENDER_PASS` remain gated.