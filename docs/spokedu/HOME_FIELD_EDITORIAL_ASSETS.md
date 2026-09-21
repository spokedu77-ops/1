# SPOKEDU Home — Field Editorial Assets

Production web copies: `public/images/spokedu/home/field-editorial/`

Subscription Home derivative: `public/images/spokedu/subscription/product-library-home.webp` (top UI crop from `product-library.png`; original retained)

작업용 staging(`tmp/home-final-assets/`)은 repo에 두지 않습니다. `/tmp/`는 `.gitignore` 대상입니다.

Re-bake script: `node scripts/fix-home-field-editorial-images.mjs`  
(manifest 기반; **derivative WebP를 source로 재사용 금지**)

Home runtime filenames (Pass 05 cache identity): `home-case-adapted-p05.webp`, `home-case-spomove-p05.webp`, `product-home-stage-p05.webp`. Unsuffixed names are historical only.

## Image roles

Code SSOT: `app/spokedu/data/home-image-roles.ts`.

| Role | HOME slots | Origin |
|---|---|---|
| BRAND | Hero | Directed visual allowed |
| SERVICE | Explorer 기관·학교 / 개인·소그룹 | Directed visual allowed |
| PROOF | FIELD RECORDS, Built FIELD | Real field photo only |
| PRODUCT | Explorer 수업자료·구독, Built SYSTEM, Built CONTENT | Real MASTER UI only |

AI / directed visual은 BRAND·SERVICE에만 쓴다. FIELD RECORDS·사례명·MASTER UI에 쓰지 않는다.

## ACTIVE HOME ASSET MAP

| Home slot | Role | Web file | Production path | Crop / focal | Origin |
|---|---|---|---|---|---|
| Hero | BRAND | `home-hero-gym-motion.jpg` | `/images/spokedu/home/field-editorial/home-hero-gym-motion.jpg` | `68% 42%` desktop / `78% 38%` mobile | Directed visual. 허들 + 남자 지도자. |
| Explorer 기관·학교 | SERVICE | `home-service-institution.jpg` | `/images/spokedu/home/field-editorial/home-service-institution.jpg` | 16:9 stage, cover `52% 48%` | Directed visual. 다인원 + 여성 지도자 + 링 코스. Hero와 다른 장면. |
| Explorer 개인·소그룹 | SERVICE | `home-service-private.jpg` | `/images/spokedu/home/field-editorial/home-service-private.jpg` | 16:9 stage, cover `48% 42%` | Directed visual. 밸런스 쿠션 + 근접 지도. |
| Explorer 수업자료·구독 | PRODUCT | `home-master-ui.png` | `/images/spokedu/home/field-editorial/home-master-ui.png` | 16:9 stage, contain `50% 50%` | Real MASTER capture. No cover crop, no mockup, no browser frame. |
| FIELD RECORDS | PROOF | case editorial files below | records + field-editorial case derivatives | per card | Real field photos only. |
| Built FIELD | PROOF | `home-hero-field.webp` | `/images/spokedu/home/field-editorial/home-hero-field.webp` | `58% 62%` | Real 위례초 현장. Not the Hero directed visual. |
| Built CONTENT | PROOF | `home-master-ui.png` | same MASTER capture | `libraryCrop 50% 40%` | Real 놀이체육 카드 썸네일. |
| Built SYSTEM | PRODUCT | `home-master-ui.png` | same MASTER capture | `productCrop 50% 74%` | Real MASTER UI, different crop. |

`home-hero-field.webp` remains Education shared file. It is **not** Home Hero.

Code SSOT: `app/spokedu/data/home-image-roles.ts`, `app/spokedu/data/home-page.ts` (`HOME_FIELD_EDITORIAL`), `app/spokedu/data/images.ts`, `app/spokedu/data/home-media.ts`.

Home narrative no longer includes a Why section. Why assets are **not** active Home roles.

## Case evidence integrity

| Case slug | Web image | Original source | Same project |
|---|---|---|---|
| `maedong-sports-stepup` | `home-case-general.webp` | `public/images/spokedu/records/maedong-sports-stepup.jpg` | **YES** |
| `donghaeng-special-pe` | `home-case-adapted.webp` | `public/images/spokedu/records/donghaeng-special-pe-field.jpg` | **YES** |
| `dongjak-spomove` | `home-case-spomove.webp` | `public/images/spokedu/records/dongjak-spomove.jpg` | **YES** |

## 원본 → 웹자산 추적 (active)

| Web file | 촬영·운영 맥락 | Home 연결 | Source file |
|---|---|---|---|
| `home-hero-gym-motion.jpg` | Directed BRAND visual — 허들 수업 | Home Hero | PO-directed generate |
| `home-service-institution.jpg` | Directed SERVICE visual — 기관 다인원 수업 | Explorer 기관·학교 | PO-directed generate |
| `home-service-private.jpg` | Directed SERVICE visual — 소그룹 밸런스 지도 | Explorer 개인·소그룹 | PO-directed generate |
| `home-hero-movement.jpg` | 교구 설명 중인 수업 장면 | Not current Home Hero | `home/home-hero-movement.jpg` |
| `home-hero-field.webp` | 서울위례초등학교 · 2026.08.10 배구형 스포츠 | Built FIELD (not Home Hero) | **Source:** `KakaoTalk_Photo_2026-08-10-17-42-37_18_.jpeg` · **Drive file ID:** `1CvUlPEbLJLSz1t39ivmbt2UZYtzKveDO` |
| `home-spomove-dive-field.webp` | SPOMOVE DIVE 현장 (화면·패드·이동) | Home SPOMOVE screen+field | `field-editorial/home-spomove-dive-field.webp` |
| `home-spomove-field.webp` | 포도 화면 SPOMOVE 현장 | Not an active Home role | `home/home-hero-spomove-class.JPG` |
| `home-case-general.webp` | 매동초등학교 스포츠스텝업 | Cases featured (`maedong-sports-stepup`) | `records/maedong-sports-stepup.jpg` |
| `home-case-adapted.webp` | 찾아가는 동행 체육교실 (특수·포용) | Cases (`donghaeng-special-pe`) | `records/donghaeng-special-pe-field.jpg` |
| `home-case-spomove.webp` | 동작거점형 우리동네키움센터 SPOMOVE | Cases (`dongjak-spomove`) | `records/dongjak-spomove.jpg` |
| `library-program-cards.png` | 수업명·활동 썸네일이 보이는 라이브러리 | Home Subscription stage | `subscription/library-program-cards.png` |
| `product-library-home.webp` | 구독시스템 홈 상단 UI | Not current Home stage | `subscription/product-library.png` (top crop) |

원본 Drive 파일명·폴더는 PO가 별도 보관. 이 문서는 **웹 배포용 사본** 기준입니다.

---

## ARCHIVED / UNUSED (not active Home roles)

| Web file | Former role | Notes |
|---|---|---|
| `home-why-field-ed.webp` | Why (removed from Home IA) | File may remain on disk; **do not** map as production Home role |
| `home-why-field.webp` | Why (legacy filename) | Same — unused by current Home SSOT |

---

## P0 — Public-use governance

**Drive 보유 ≠ 공개 웹 사용 허가.**  
**Vercel deploy success ≠ public-use approval.**

Agent/code must **not** mark assets APPROVED. Status below reflects PO confirmation only.

| Surface | Asset | Context | Public-use status |
|---|---|---|---|
| Home Hero | `home-hero-gym-motion.jpg` | Directed BRAND visual | **PO-DIRECTED** (synthetic; not a field record) |
| Home Explorer 기관 | `home-service-institution.jpg` | Directed SERVICE visual | **PO-DIRECTED** (synthetic; not a field record) |
| Home Explorer 개인 | `home-service-private.jpg` | Directed SERVICE visual | **PO-DIRECTED** (synthetic; not a field record) |
| Home Explorer / Built SYSTEM | `home-master-ui.png` | Real MASTER UI | **UNCONFIRMED** |
| Built FIELD | `home-hero-field.webp` | 서울위례초 현장 | **UNCONFIRMED** |
| Home Case 일반 | `home-case-general.webp` | 매동초등학교 | **UNCONFIRMED** |
| Home Case 특수·포용 | `home-case-adapted.webp` | 동행 체육교실 | **UNCONFIRMED** |
| Home Case SPOMOVE | `home-case-spomove.webp` | 동작 키움센터 | **UNCONFIRMED** |
| /education Hero | `home-hero-field.webp` (`homeHeroField`) | 서울위례초 | **UNCONFIRMED** |
| /education Cases | records thumbnails (yangcheon / dasarang / donghaeng) | field records | **UNCONFIRMED** |

### 확인 체크 (각 파일 — PO)

1. 해당 기관·학교에 **마케팅/홈페이지 게재** 문의 또는 계약 조항이 있는가
2. 아동 **초상권·개인정보**(얼굴·유니폼·명찰) 게재 가능한가
3. 현재 운영 공간·브랜드 메시지와 **불일치**하지 않는가

PO 서명 후 이 표의 status만 **APPROVED**로 갱신한다.
