# SPOKEDU Unified Design System V1 — Phase 1-A 검토

## 1. 검토 요약

- 상태: **Phase 1-A 디자인 시안 검토 완료 후보**
- 작업 모드: `DESIGN_ONLY`
- Production 소스 변경: 없음
- 시안 위치: `docs/design/phase-1a/` 내부 한정
- Git commit·push·배포: 없음
- 시안 검증: 로컬 독립 HTML을 Playwright Chromium으로 1440px / 390px / 390px 메뉴 열림 상태에서 확인

공통 브랜드는 Blue/Navy/Pretendard/1280px 축/3종 CTA/3종 카드로 정리했다. 서비스별 차이는 없애지 않고 기관 오렌지, 개인 틸, SPOMOVE·SPOMAT 기능 색, LAB 제품 중심 구성을 제한된 예외로 남겼다.

## 2. 확인한 근거

### 문서

- `docs/SPOKEDU_MASTER_PRODUCT_CONTRACT.md`
- `app/spokedu-master/MASTER_VISUAL_SYSTEM.md`
- `app/spokedu-master/MASTER_SURFACE_MATRIX.md`
- `app/spokedu/docs/PUBLIC_MARKETING_DESIGN_CONTRACT.md`
- `docs/SPOKEDU_MASTER_SPRINT_BRIEF_TEMPLATE.md`
- `SPOKEDU_PUBLIC_AUDIT.md`

### 현재 코드

- Home: `app/spokedu/page.tsx` → `home-landing.tsx` → `home-web/home-web-landing.tsx`
- 공통 공개 헤더와 IA: `site-chrome.tsx`, `data/site.ts`
- 공용 토큰과 유틸: `app/globals.css`, `lib/ui-classes.ts`
- 기관수업: `education-hub-landing.tsx`, `education-hub.module.css`
- 개인수업: `private-landing.tsx`
- SPOMOVE: `spomove-program-landing.tsx`, `spomove-program.module.css`
- SPOMAT: `spomat-landing.tsx`
- LAB 공개 랜딩: `(spokedu-public)/subscription/page.tsx` → `spokedu-master/landing/CommercialLanding.tsx`, `landing.module.css`

`SPOKEDU_DESIGN_UX_AUDIT.md`와 `design-audit-captures/`는 저장소에서 찾지 못했다. 오래된 캡처나 존재하지 않는 자료를 근거로 결함을 확정하지 않았다.

## 3. 보존할 기존 디자인 요소

- Home의 강한 영문 에디토리얼 Display와 Blue/Navy 브랜드 인상
- 현재 투명 SPOKEDU 워드마크
- 현재 공개 내비게이션의 메뉴명과 목적지 의미
- 기관수업의 오렌지 개성
- 개인수업의 학부모 맥락을 돕는 제한적 틸 강조
- SPOMOVE의 다크 미디어 Hero와 빨강·노랑·초록·파랑 기능 색
- SPOMAT의 제품 기능 색과 제품 설명 중심 구조
- LAB 공개 랜딩의 실제 제품 화면 중심 설득 방식
- LAB 로그인 후 작업용 SaaS UI와 공개 브랜드 랜딩의 목적상 분리

## 4. 제안한 변경 사항

| 항목 | 현재 관찰 | 제안 |
|---|---|---|
| Primary CTA | Home 파랑, 기관 오렌지 pill, SPOMOVE 텍스트형 등 표현 차이 | 공개 사이트의 같은 중요 행동은 파랑 50/48px, 반경 10px로 통일 |
| 제목 체계 | Home 최대 108px, 기관 H1 72px, LAB 최대 74px, SPOMOVE 별도 소형 scale | 일반 H1 64/36, H2 44/28, H3 22/18로 정리하고 Home Display만 예외 |
| 반경 | 8px부터 pill·22px·32px까지 혼재 | 버튼 10px, 카드 16px을 기본으로 설정 |
| 콘텐츠 폭 | Home 1368px, 기관 1280px, LAB 1120~1220px 등 복수 축 | 공개 공통 기준 1280px과 48/32/20px gutter 사용 |
| 카드 | 서비스·조건·사례가 유사한 카드 문법으로 반복되는 구간 존재 | Service/Evidence/Information 역할별 문법 분리 |
| Header | 공용 공개 헤더와 LAB 로컬 헤더가 별도 | 공개 브랜드 표면의 규칙을 정리하되 로그인 후 LAB 헤더는 제외 |
| 이미지 | 현재 Home의 일부 자산은 내부 문서상 합성 자산 | 실제 현장·실제 제품 화면만 증거로 사용 |

고객에게는 페이지마다 버튼 의미를 다시 학습하지 않아도 되고, 첫 화면에서 자기 경로를 더 빠르게 찾으며, 실제 현장 사진을 브랜드 주장의 근거로 인식할 수 있다는 이점이 있다.

## 5. 의도적인 예외

1. **Home Display 92px 시안:** 기존 108px의 강한 브랜드 특징은 유지 대상이다. 이번 split hero에서는 `MOVEMENT`의 단어 중간 줄바꿈을 피하려고 92px을 제안했다. 108px은 더 넓은 전폭 구성에서 유지 가능한 선택지다.
2. **기관 오렌지:** 카드 상단 선, Eyebrow, 번호 등 맥락 표식에만 사용한다. 작은 오렌지 본문은 대비 문제 때문에 사용하지 않는다.
3. **개인 틸:** 학부모 경로의 보조 표식으로만 사용하며 Primary CTA에는 사용하지 않는다.
4. **SPOMOVE·SPOMAT 4색:** 기능 의미가 있으므로 브랜드 블루로 치환하지 않는다.
5. **LAB:** 공개 랜딩에는 공통 브랜드 연결을 제안하지만 로그인 후 대시보드에 공개 헤더를 강제하지 않는다.

## 6. 시안과 시각 검증

### 산출물

- 독립 HTML: `docs/design/phase-1a/design-system-preview.html`
- 데스크톱: `docs/design/phase-1a/captures/desktop-1440.png`
- 모바일: `docs/design/phase-1a/captures/mobile-390.png`
- 모바일 메뉴 열림: `docs/design/phase-1a/captures/mobile-menu-open-390.png`

### Playwright 결과

| 검사 | 1440px | 390px | 메뉴 열림 390px |
|---|---|---|---|
| 문서 가로 넘침 | 없음 | 없음 | 없음 |
| 이미지 로딩 | 3/3 정상 | 3/3 정상 | 3/3 정상 |
| 로고·CTA 겹침 | 없음 | 해당 없음(CTA 숨김) | 없음 |
| 버튼/제목 clipping | 없음 | 없음 | 없음 |
| 한글 제목 줄바꿈 | 자연스러움 | 자연스러움 | 메뉴 항목 정상 |
| CTA 위계 | 파랑 Primary 우선 | 파랑 Primary 우선 | 상담하기 Primary 우선 |
| 브라우저 오류 | 없음 | 없음 | 없음 |

검사 시 로고는 846×135, Hero 사진은 2400×1800, Evidence 사진은 807×514의 실제 픽셀로 디코딩됐다. Hero는 데스크톱과 모바일 모두 4:3 프레임에서 수업 참여자와 공간 맥락이 함께 보이도록 크롭했다.

색 대비는 WCAG 상대 휘도 방식으로 사용 조합을 확인했다. 흰색/Brand Primary `5.14:1`, 흰색/Brand Navy `16.17:1`, Text Primary/흰색 `16.05:1`, Text Secondary/흰색 `6.19:1`, 제한적 틸/흰색 `4.87:1`이다. Accent Orange/흰색은 `3.24:1`이므로 작은 텍스트 색으로 쓰지 않고 굵은 선과 색상 샘플 같은 비텍스트 강조에만 사용했다.

## 7. 미검증 및 발견 사항

- 저장소에 기존 `design-audit-captures/`가 없어 과거 Production 캡처와의 side-by-side 비교는 수행하지 못했다.
- 운영 Production의 computed style과 현재 배포 화면은 이번 범위에서 새로 수집하지 않았다. 현재 적용 코드와 기존 감사 보고서를 근거로 삼았다.
- 저장소에는 Pretendard 폰트 파일이 없고 CSS font stack만 존재한다. 캡처 환경은 선언된 Pretendard 우선 스택을 사용했으나 실제 glyph는 OS fallback일 수 있다. 외부 폰트 다운로드는 하지 않았다.
- 내부 이미지 문서에서 `home-hero-gym-motion.jpg`, `home-service-institution.jpg`, `home-service-private.jpg`는 합성으로 표시되어 이번 시안에서 제외했다. 실제 위례초 현장으로 확인된 `home-hero-field.webp`를 Hero에 사용했다.
- 기존 감사서에 언급된 `/spomove/catalog`, robots/sitemap, SPOMAT 가격, `/contact` 전송 검증 문제는 디자인 범위 밖이며 수정하지 않았다.
- 시안의 메뉴 링크는 구조 확인용 정적 앵커다. 운영 경로·기능을 변경하지 않는다.

## 8. 사용자 승인 필요 항목

1. Home의 한글 메시지를 주제목으로, 영문 `MOVEMENT BECOMES LEARNING.`을 보조 Display로 두는 위계
2. split hero에서 영문 Display를 92px로 사용하고, 108px은 전폭 구성에서만 검토하는 기준
3. 기관 오렌지를 CTA가 아닌 표식으로 제한하는 범위
4. 개인 틸을 분류 보조색으로만 남기는 범위
5. 공개 사이트 공통 콘텐츠 폭을 1280px로 통일하는 방향
6. 모바일 메뉴를 흰색 전체 너비 패널과 그룹형 구조로 사용하는 방향

승인 전까지 모든 항목은 제안 상태다. Phase 1-B 구현은 별도 명시적 지시가 있어야 시작한다.
