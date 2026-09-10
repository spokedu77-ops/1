# SPOKEDU Home — Field Editorial Assets

Production web copies: `public/images/spokedu/home/field-editorial/`

Subscription Home derivative: `public/images/spokedu/subscription/product-library-home.webp` (top UI crop from `product-library.png`; original retained)

작업용 staging(`tmp/home-final-assets/`)은 repo에 두지 않습니다. `/tmp/`는 `.gitignore` 대상입니다.

Re-bake script: `node scripts/fix-home-field-editorial-images.mjs`  
(manifest 기반; **derivative WebP를 source로 재사용 금지**)

Home runtime filenames (Pass 05 cache identity): `home-case-adapted-p05.webp`, `home-case-spomove-p05.webp`, `product-home-stage-p05.webp`. Unsuffixed names are historical only.

## ACTIVE HOME ASSET MAP

| Home role | Web file | Production path | Crop / focal | Source status |
|---|---|---|---|---|
| Hero | `home-hero-movement.jpg` | `/images/spokedu/home/home-hero-movement.jpg` | Wide 16:9 desktop / 4:3 mobile; `object-position: 50% 62%` | Instructor + class with equipment. `home-hero-field.webp` remains Education shared file, not Home Hero. |
| SPOMOVE screen + field | `home-spomove-dive-field.webp` | `/images/spokedu/home/field-editorial/home-spomove-dive-field.webp` | Screen panel `50% 30%`; field panel default dive focal | Same DIVE class photo used twice. Not paired with grape/stroop assets. |
| Case — 일반 (featured) | `home-case-general.webp` | `/images/spokedu/home/field-editorial/home-case-general.webp` | Featured; `object-position: 36% 58%` | `records/maedong-sports-stepup.jpg` |
| Case — 특수·포용 | `home-case-adapted-p05.webp` | `/images/spokedu/home/field-editorial/home-case-adapted-p05.webp` | Supporting; `object-position: 48% 42%` | `records/donghaeng-special-pe-field.jpg` |
| Case — SPOMOVE | `home-case-spomove-p05.webp` | `/images/spokedu/home/field-editorial/home-case-spomove-p05.webp` | Supporting; `object-position: 48% 46%` | `records/dongjak-spomove.jpg` |
| Subscription UI | `library-program-cards.png` | `/images/spokedu/subscription/library-program-cards.png` | Top-weighted cover `50% 18%` | Live library capture with lesson names + thumbnails. Prepare-modal shots are not Home stage. |

Code SSOT: `app/spokedu/data/home-page.ts` (`HOME_FIELD_EDITORIAL`), `app/spokedu/data/images.ts`, `app/spokedu/data/home-media.ts`.

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
| `home-hero-movement.jpg` | 교구 설명 중인 수업 장면 | Home Hero | `home/home-hero-movement.jpg` |
| `home-hero-field.webp` | 서울위례초등학교 · 2026.08.10 배구형 스포츠 | Education shared file (not current Home Hero) | **Source:** `KakaoTalk_Photo_2026-08-10-17-42-37_18_.jpeg` · **Drive file ID:** `1CvUlPEbLJLSz1t39ivmbt2UZYtzKveDO` |
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
| Home Hero | `home-hero-movement.jpg` | 교구 설명 수업 | **UNCONFIRMED** |
| Home SPOMOVE | `home-spomove-dive-field.webp` | DIVE 화면·현장 | **UNCONFIRMED** |
| Home Case 일반 | `home-case-general.webp` | 매동초등학교 | **UNCONFIRMED** |
| Home Case 특수·포용 | `home-case-adapted.webp` | 동행 체육교실 | **UNCONFIRMED** |
| Home Case SPOMOVE | `home-case-spomove.webp` | 동작 키움센터 | **UNCONFIRMED** |
| Home Subscription UI | `library-program-cards.png` | 라이브러리 수업 카드 | **UNCONFIRMED** |
| /education Hero | `home-hero-field.webp` (`homeHeroField`) | 서울위례초 | **UNCONFIRMED** |
| /education Cases | records thumbnails (yangcheon / dasarang / donghaeng) | field records | **UNCONFIRMED** |

### 확인 체크 (각 파일 — PO)

1. 해당 기관·학교에 **마케팅/홈페이지 게재** 문의 또는 계약 조항이 있는가
2. 아동 **초상권·개인정보**(얼굴·유니폼·명찰) 게재 가능한가
3. 현재 운영 공간·브랜드 메시지와 **불일치**하지 않는가

PO 서명 후 이 표의 status만 **APPROVED**로 갱신한다.
