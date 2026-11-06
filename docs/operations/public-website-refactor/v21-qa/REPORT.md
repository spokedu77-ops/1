# SPOKEDU Public V2.1 — Before 복원 및 정밀 리팩토링

상태: **BEFORE_DESIGN_RESTORED / CONTENT_UPDATED / SPOMOVE_ADDED / VISUAL_QA_REVIEW_READY**

작성일: 2026-11-05 KST. 로컬 구현·검증 완료, 사용자 시각 검토 준비. Commit·Push·Production Deploy·운영 DB 변경 없음.

[영역별 전후 비교 뷰어](index.html)에서 375 / 768 / 1024 / 1440 / 1920px를 선택할 수 있다.

## A. 디자인 복원 결과

### 기준선 확인

기준 커밋: `225a9111149da052db5fe6728f05df950f98b4a9`.

`git show`로 해당 커밋의 실제 Home과 홈 데이터를 추출했다. `website.css`, `home-spomove.css`, `shared.tsx`, `SpomoveVisual.tsx`가 기준 커밋과 동일함을 내용 해시·줄바꿈 정규화 비교로 확인했다. 원본 사본과 [출처 기록](baseline-provenance.json)을 이 폴더에 보존했다.

이전 V2 보고서의 Before 캡처를 삭제하거나 덮어쓰지 않았다. 이번 비교에는 기준 커밋의 원본 마크업·데이터를 실제 홈 경로 `/?v21baseline=1`에서 임시 렌더해 얻은 새 Before를 사용했다. 처음 임시 별도 경로에 적용됐던 전역 앱 셸 폭 차이를 발견해 폐기하고, 동일 `/` 경로·동일 공개 셸로 5개 폭 모두 재촬영했다. 임시 쿼리 분기·라우트·컴포넌트는 빌드 전에 제거했다. **GNB는 양쪽 모두 V2 승인 순서로 유지**했으므로 기준 커밋의 과거 GNB까지 되돌린 캡처는 아니다.

### Before와 같은 디자인을 복원한 영역

| 영역 | 복원 내용 |
|---|---|
| Hero | 중앙 정렬, 기존 H1 3행, 알약 배지, 본문 폭, CTA 2개, 고정 높이 사진, 사진 위 캡션 배지, 라운딩·여백 |
| Quick Entry | Building2 / Users / BookOpen 아이콘, 파란 아이콘 배경, 흰 카드, 기존 패딩·그림자·보더·타입·텍스트 링크·3열 그리드 |
| Why SPOKEDU | 좌우 교차, 대형 배경 01·02·03, 2줄 제목 구성, 해시태그 필, 상세 링크, 기존 사진 프레임·거리·여백 |
| 실적 | 원래의 대형 파란 숫자, 데스크톱 4열·모바일 2열, 기존 라벨 타이포·간격 |
| 사례 | 기존 CaseCard 컴포넌트: 사진→배지→제목→대상/운영 정보→설명→링크 |
| 하단 CTA | 기존 큰 파란 라운드 배너, 동일 제목·설명·버튼 형태·패딩·모바일 세로 버튼 |

기존 공통 CSS·shared 컴포넌트는 수정하지 않았다. 전체 홈을 재설계했던 `home.module.css` import를 제거한 뒤 파일을 삭제했다. 새 디자인 시스템·전역 토큰 변경은 없다.

### 콘텐츠만 바꾼 영역

- Hero 배지는 공식 문구 **“연세대학교 체육교육학과 출신의 운영진”**. H1은 그대로이며 CTA는 `수업 상담하기 → /contact`, `수업 유형 살펴보기 → /education`으로 복원했다.
- Quick Entry는 승인된 기관·개인·LAB 설명을 이식했다. 카드 크기에 맞춰 의미를 보존하며 문장을 정리했고, 사진형 서비스 카드는 제거했다.
- Why는 승인된 교육 설계 / 포용적 현장 전문성 / 개발 역량의 제목·본문·태그·CTA를 적용했다. 03의 인지·판단·움직임 이미지 오버레이는 없다.
- 메인의 독립 4MOVE 카드 영역을 제거했다. Why의 교육 설계 태그와 개발 역량 본문에서 4MOVE를 언급하며 `/education`의 상세 4MOVE와 공통 데이터는 보존했다.
- 공식 실적은 `PUBLIC_OPERATING_METRICS`에서 변환 없이 렌더한다: **10,000+ 누적 운영 수업 / 500+ 출강 학교·기관 / 30+ 전문 지도자 / 98% 파트너 기관 재계약률**.
- 사례는 catalog의 **매동초등학교 / 동작거점형 우리동네키움센터 / 찾아가는 동행 체육교실** 데이터·사진·링크를 사용한다. 새 성과나 기관명을 만들지 않았다.

### 새로 추가한 SPOMOVE 영역

채택 방식: **A — full-width `#0B0F17` + 기존 1184px 콘텐츠 레일**. 대형 다크 라운드 컨테이너 방식은 구현하지 않았다.

Why 03 직후에 실제 색 반응 실행 화면 `edu-07.webp`와 실제 수업 사진 `edu-03.webp`를 배치했다. 두 이미지는 서로 다른 과제 예시이며 같은 촬영·동일 과제 장면이라고 주장하지 않는다. 실행 화면과 수업 사진의 캡션을 분리하고 원본 내용을 contain으로 보존한다.

사진 아래 하나의 ordered process로 **01 SEE → 02 THINK → 03 MOVE**를 표시한다. 모바일에서는 화면→현장→과정 순서로 세로 배치한다. 독립 거대 카드·네온·회전·장식 그라데이션은 없다.

주 CTA는 `/spomove`, `/spomove/catalog`. `/spomat` 보조 링크도 유지했다. SPOMAT은 과제에 따라 사용하는 물리적 4색 매트이며 센서·압력 감지 장치로 설명하지 않는다. 모든 활동에서 필수라고 표현하지 않는다.

### 의도적으로 달라진 부분

1. 실적과 사례는 두 별도 섹션 대신 **하나의 `field-stories` 영역**으로 묶었다. 기존 숫자·CaseCard 디자인을 쓰고 중간 40px 간격과 짧은 전환 설명으로 연결한다. 사례 배경을 흰색으로 이어 강한 색상 구획을 없앴다.
2. Why 02는 V2에서 확인한 포용체육 현장 사진, Why 03은 기존 실제 LAB 화면을 쓴다. 03 UI는 기존 이미지 프레임 안에서 contain 처리해 화면 양끝이 잘리지 않게 했다.
3. 동행 사례 사진만 **기존 220px 프레임 안에서 contain**으로 표시한다. 넓은 카드에서 지도자 머리·발이 잘리는 것을 피하기 위한 개별 사진 처리이며 카드 구조·크기는 유지했다.
4. 승인된 원고 길이 때문에 일부 작은 폭의 자연 높이는 달라진다. 이를 숨기려고 패딩·폰트·사진 비율을 바꾸지 않았다. 상세 값은 아래 비교에 기록했다.

## B. 실제 전후 비교

### 전체 홈

| 화면 | Before | V2.1 After |
|---|---|---|
| 1440px | [전체](before/home-1440.png) | [전체](after/home-1440.png) |
| 375px | [전체](before/home-375.png) | [전체](after/home-375.png) |
| 768px | [전체](before/home-768.png) | [전체](after/home-768.png) |
| 1024px | [전체](before/home-1024.png) | [전체](after/home-1024.png) |
| 1920px | [전체](before/home-1920.png) | [전체](after/home-1920.png) |

### 같은 화면 폭·영역별 나란히 비교

| 영역 | 1440px | 375px |
|---|---|---|
| Hero | [비교](compare/hero-1440.png) | [비교](compare/hero-375.png) |
| Quick Entry | [비교](compare/quick-1440.png) | [비교](compare/quick-375.png) |
| Why SPOKEDU | [비교](compare/why-1440.png) | [비교](compare/why-375.png) |
| 대형 실적 | [비교](compare/metrics-1440.png) | [비교](compare/metrics-375.png) |
| 사례 카드 | [비교](compare/cases-1440.png) | [비교](compare/cases-375.png) |
| 하단 CTA | [비교](compare/cta-1440.png) | [비교](compare/cta-375.png) |

통합 실적·사례: [1440px](after/proof-1440.png) / [375px](after/proof-375.png).

신규 SPOMOVE 전체: [1440px](after/spomove-1440.png) / [375px](after/spomove-375.png).

전체 페이지의 단순 픽셀 diff로 판정하지 않았다. 비교 PNG는 섹션 캡처를 나란히 배치한 것이며, 사례 Before는 원본 Section의 바깥 패딩만 제외해 같은 콘텐츠 레일로 맞췄다. 원본 캡처도 그대로 보존했다. 개발 오버레이와 섹션을 가리는 sticky 헤더만 캡처 시 숨겼고, 본문·사진을 합성하거나 수정하지 않았다.

### Computed style·DOM·bounding box

[before.json](before.json), [after.json](after.json), [comparison.json](comparison.json)에 기록했다. 5개 폭마다 **22개 대표 요소**의 tag/class, 실제 크기, font family/size/weight/line-height/letter-spacing, 패딩·라운딩·색·gap·그리드·이미지 fit/position을 비교했다.

- 대표 요소의 비교한 computed style 차이: **0건**. 이 결과는 새 SPOMOVE나 의도한 실적·사례 통합까지 Before와 동일하다는 뜻은 아니다.
- 1440/1920px: 측정한 22개 대표 요소의 width/height도 동일하다.
- 375px: Why 01 영역 높이 약 **99px 감소**. 원고 축약에 따른 변화이며 사진 크기·본문 스타일은 동일하다.
- 768px: Quick Entry 높이 약 **29px 증가**, Why 01 약 **99px 감소**, 첫 사례 카드 약 **26px 감소**. 원고 줄바꿈 및 대표 사례 교체의 영향이다.
- 1024px: Why 01 높이 약 **61px 감소**. 다른 대표 요소의 크기는 동일하다.
- 세 Quick Entry 카드의 높이·하단 링크 위치는 **모든 폭에서 서로 일치**한다. 768px의 추가 한 줄은 남아 있으며 Before와 높이까지 완전히 동일하다고 보고하지 않는다.

| 화면 폭 | Hero 사진 | H1 크기 | 실적 숫자 크기 |
|---|---|---|---|
| 375 | 335×220px | 23px | 33px |
| 768 | 720×480px | 32.64px | 48px |
| 1024 | 960×480px | 43.52px | 48px |
| 1440 / 1920 | 960×480px | 56px | 64px |

위 값은 Before와 After에서 일치한다. 실제 원본과 캡처를 열어 얼굴·동작·매트·스크린을 검토했다. 신규 이미지 또는 교체된 사진은 Before와 픽셀이 같다는 검사에서 제외하고, 프레임 보존과 내용 크롭을 별도로 판단했다.

## C. 기술 검증 및 파일 범위

### 이번 V2.1 수정 파일

| 파일 | 변경 |
|---|---|
| `app/spokedu/website/pages/home.tsx` | Before 마크업·shared 컴포넌트 복원, SPOMOVE 삽입, 실적·사례 통합 |
| `app/spokedu/website/data/home.ts` | V2.1 승인 원고·태그·프로세스, 기존 공식 데이터 참조 유지 |
| `app/spokedu/website/styles/spomove-experience.css` (신규) | 신규 SPOMOVE만의 scoped 스타일, 실적·사례 사이 간격, 동행 사진 개별 fit |
| `app/spokedu/website/public-v2.contract.test.ts` | 기능 계약 보존, V2 고정 구조 기대값을 V2.1로 갱신하고 디자인 구조 검사를 별도 describe로 분리 |
| `app/spokedu/docs/PUBLIC_MARKETING_DESIGN_CONTRACT.md` | 기존 문서에 V2.1 복원 기준·범위 반영 |
| `docs/SPOKEDU_PUBLIC_WEBSITE_SSOT.md` | 기존 문서의 메인 영역 구성 갱신 |

삭제 파일: **`app/spokedu/website/pages/home.module.css`**. import 제거와 전체 참조 확인 후 삭제했다. QA용 임시 baseline 라우트·Home 컴포넌트·홈 데이터도 제거했으며 최종 빌드에 포함되지 않는다.

### 검증 결과

| 검사 | 결과 |
|---|---|
| 관련 계약 테스트 | **2파일 / 7개 PASS**. Home 기능·표현 계약 4개, 문의 유형 resolver 3개. 수백 개 Public/MASTER 테스트 일괄 실행 없음 |
| TypeScript | `tsc --noEmit --pretty false` PASS |
| ESLint | 변경 TS/TSX 3파일, 오류 0 / 복원한 기존 img 사용 경고 2 |
| Production Build | PASS — [최종 로그](build.log), [종료 코드](build-result.json). 빌드의 정적 페이지 생성 수는 테스트 실행 수가 아님 |
| 홈 반응형 | 5개 폭 모두 overflow 0 / 깨진 이미지 0 |
| 링크 | 홈·GNB 내부 목적지 **11개 HTTP 200**, SPOMOVE·catalog·SPOMAT·LAB·동작 사례 상세 포함 |
| 문의 유형 | dispatch/private/spomove는 해당 폼 선택, bare contact 미선택. 실제 제출 없음 |
| 메뉴 | 승인 GNB 순서, 모바일 active 링크, Escape 닫힘·포커스 복귀·메뉴 선택 닫힘 PASS |
| 브라우저 | 검사 중 pageerror 0 |
| 사용자 작업 보존 | 시작 시 파일 해시 중 승인 범위 밖 **118개 파일 동일**, 예외 0 — [결과](preservation.json) |

실행 명령:

```text
node node_modules/vitest/vitest.mjs run app/spokedu/website/public-v2.contract.test.ts app/spokedu/contact/resolve-contact-inquiry-type.test.ts
node node_modules/typescript/bin/tsc --noEmit --pretty false
node node_modules/eslint/bin/eslint.js app/spokedu/website/pages/home.tsx app/spokedu/website/data/home.ts app/spokedu/website/public-v2.contract.test.ts
node node_modules/next/dist/bin/next build
```

[브라우저 링크·메뉴·문의 검사](interaction.json)에 세부 결과를 남겼다. 기존 운영진·공식 실적·4MOVE 데이터, 사례 사진 매핑, 서브페이지 수정, 관리자·Teacher·MASTER·DB·인증·결제·권한 코드를 변경하지 않았다. 현재 관리자 수업 선택 관련 미커밋 작업도 보존했다. Git reset/checkout/stage/commit/push를 실행하지 않았다.

## D. 최종 디자인 평가

**“기존 디자인의 장점을 유지하면서 새 콘텐츠를 적용했고 실제 사용자 관점에서 이전보다 좋아졌는가?”**

Before의 시각적 장점은 복원했다. 중앙 Hero, 익숙한 아이콘 카드, 대형 숫자 지그재그와 파란 CTA를 동일한 스타일로 되살렸고, 실제 비교에서 주요 치수가 일치한다. V2에서 홈 전체를 재설계했던 결과보다 요청한 기준에 맞는다.

콘텐츠 측면에서는 서비스 진입과 경쟁력 설명이 분리됐고, SPOMOVE 실제 화면·수업 장면·작동 과정을 한곳에서 볼 수 있으며, 실적과 사례가 끊기지 않는다. 4MOVE 상세를 기관 페이지에 두어 메인의 독립 카드 섹션도 줄였다. 이 점에서 사용자의 정보 이해 흐름은 개선됐다.

다만 **Before보다 미적으로 확실히 우수하다는 객관적 결론은 내리지 않는다.** 768px 카드 높이가 한 줄 늘어난 점, 작은 폭의 Why 높이 변화, LAB 화면의 작은 내부 글자, contain 처리한 동행 사진의 좌우 여백은 실제 캡처와 함께 검토할 부분이다. LAB UI는 전체 화면 보존을 우선했고, 색 반응 화면의 보조 상태 글자는 작지만 핵심 과제와 설명은 분리해 제공했다. 임의 점수나 ‘완벽한 개선’ 판정은 없다.

인증된 계정·실제 결제·운영 문의 제출은 하지 않았다. 해당 로직은 이번 범위에서 바뀌지 않았으며, 실거래 E2E 통과라고 주장하지 않는다. Production 성능·모든 서브페이지의 전면 시각 감사도 이번 검증 범위가 아니다.

최종 상태는 **사용자 시각 검토 준비**이며 Production에는 반영하지 않았다. 로컬: `http://127.0.0.1:3000`.
