# SPOKEDU Home — Field Editorial Assets

Production web copies: `public/images/spokedu/home/field-editorial/`

작업용 staging(`tmp/home-final-assets/`)은 repo에 두지 않습니다. `/tmp/`는 `.gitignore` 대상입니다.

## Asset map

| Home role | Web file | Production path | Crop / focal |
|---|---|---|---|
| Hero | `home-hero-field.webp` | `/images/spokedu/home/field-editorial/home-hero-field.webp` | Full-bleed; `object-position: 58% 42%`; 지도자·아동 활동 중심, 좌측 카피 여백 |
| Why | `home-why-field.webp` | `/images/spokedu/home/field-editorial/home-why-field.webp` | Editorial 4:3; `object-position: 52% 40%`; 지도자 시범·지도 |
| SPOMOVE | `home-spomove-field.webp` | `/images/spokedu/home/field-editorial/home-spomove-field.webp` | 16:10; `object-position: 50% 48%`; 화면·SPOMAT·아동 동시 |
| Case — 일반 | `home-case-general.webp` | `/images/spokedu/home/field-editorial/home-case-general.webp` | Featured; `object-position: 50% 45%` |
| Case — 특수·포용 | `home-case-adapted.webp` | `/images/spokedu/home/field-editorial/home-case-adapted.webp` | Supporting; `object-position: 55% 48%` |
| Case — SPOMOVE | `home-case-spomove.webp` | `/images/spokedu/home/field-editorial/home-case-spomove.webp` | Supporting; `object-position: 50% 42%` |

Code SSOT: `app/spokedu/data/home-page.ts` (`HOME_FIELD_EDITORIAL`), `app/spokedu/data/images.ts`, `app/spokedu/data/home-media.ts`.

## 원본 → 웹자산 추적

| Web file | 촬영·운영 맥락 (manifest 기준) | Home 연결 |
|---|---|---|
| `home-hero-field.webp` | 서울위례초등학교 일반 체육수업 현장 | Hero |
| `home-why-field.webp` | 기관 체육관 — 지도자 시범·집단 지도 | Why |
| `home-spomove-field.webp` | SPOMOVE 현장 (화면·SPOMAT·참여) | SPOMOVE |
| `home-case-general.webp` | 매동초등학교 스포츠스텝업 | Cases featured (`maedong-sports-stepup`) |
| `home-case-adapted.webp` | 1:1·소그룹 SPOMAT 맞춤 지도 | Cases compact (`donghaeng-special-pe`) |
| `home-case-spomove.webp` | SPOMOVE 수업 — 화면·매트·움직임 | Cases compact (`dongjak-spomove`) |

원본 Drive 파일명·폴더는 PO가 별도 보관. 이 문서는 **웹 배포용 사본** 기준입니다.

---

## P0 — 홈페이지 공개 사용 가능 여부 (배포 전 필수)

**Drive 보유 ≠ 공개 웹 사용 허가.**
아래 표는 파일 단위 최종 확인용입니다. PO(또는 운영 책임자) 서명 전까지 **배포 금지**로 취급합니다.

| Web file | Home role | 기관·현장 | 아동·기관 식별 노출 | 필요 확인 | 공개 사용 | 확인자 | 확인일 |
|---|---|---|---|---|---|---|---|
| `home-hero-field.webp` | Hero | 서울위례초등학교 | 학교명·아동·공간 | 학교/학부모·운영 계약 또는 촬영 동의 | ☐ | | |
| `home-why-field.webp` | Why | 기관 체육관 (지도 시범) | 아동·지도자 | 촬영·초상/운영 공간 사용 허가 | ☐ | | |
| `home-case-general.webp` | Case 일반 | 매동초등학교 | 학교명·아동 | 학교/기관 승인 | ☐ | | |
| `home-case-adapted.webp` | Case 특수·포용 | 찾아가는 동행 체육교실 맥락 | 아동·지도자 | 특수·포용 수업 촬영·보호자/기관 동의 | ☐ | | |
| `home-case-spomove.webp` | Case SPOMOVE | 동작거점형 우리동네키움센터 맥락 | 아동·센터 공간 | 기관/센터 운영·촬영 승인 | ☐ | | |
| `home-spomove-field.webp` | SPOMOVE | SPOMOVE 운영 현장 | 아동·화면 | 동일 (기관·촬영) | ☐ | | |

### 확인 체크 (각 파일)

1. 해당 기관·학교에 **마케팅/홈페이지 게재** 문의 또는 계약 조항이 있는가
2. 아동 **초상권·개인정보**(얼굴·유니폼·명찰) 게재 가능한가
3. 현재 운영 공간·브랜드 메시지와 **불일치**하지 않는가

모든 ☐ → ☑ 완료 후 배포.
