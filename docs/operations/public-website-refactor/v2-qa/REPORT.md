# SPOKEDU PUBLIC V2 — 로컬 구현 및 검증 결과

판정: **LOCAL_IMPLEMENTATION_COMPLETE / PRODUCTION_NOT_DEPLOYED**

작성일: 2026-11-04 (KST). 기준 HEAD: `225a9111149da052db5fe6728f05df950f98b4a9`.
사용자의 조건부 승인에 따라 Public 범위의 구현·로컬 QA를 수행했다. 공식 실적 재검증을 요구하지 않으며, 기존 ‘실적 숫자 보류’ 제안은 철회했다.

## 1. 수정 파일과 영향 범위

| 변경 파일 | 목적 |
|---|---|
| `app/spokedu/website/pages/home.tsx` | 실제 홈을 승인된 6섹션으로 구현. 고객별 진입·실적·사례·문의 연결 |
| `app/spokedu/website/pages/home.module.css` (신규) | 홈 전용 반응형 구성·공통 카드·타입·사진·CTA·SPOMOVE 다크 섹션 |
| `app/spokedu/website/data/home.ts` | 활성 홈 원고와 이미지 역할 정리. 실적은 공통 원본 참조 |
| `app/spokedu/data/marketing-public-metrics.ts` | 사용자 확정 공식 실적 4개. 기존 V0 export 호환 유지 |
| `app/spokedu/data/public-brand-copy.ts` (신규) | 운영진 공통 문구·공식 직함·SPOMOVE/SPOMAT/LAB 공통 정의 |
| `app/spokedu/data/education-system.ts` (신규) | 4MOVE 자체 교육 체계와 적용 대상 |
| `app/spokedu/data/site.ts` | 소개를 첫 번째로 이동. 우측 LAB·문의 및 Footer 경로 유지 |
| `app/spokedu/components/site-chrome.tsx` | 링크의 aria-current, 모바일 현재 메뉴 밑줄; 기존 메뉴 동작 보존 |
| `app/spokedu/data/about-page.ts` | 공식 직함·공통 프로그램 정의 참조 |
| `app/spokedu/data/about-founder.ts` | 대표 직함을 공통 공식 직함에 맞춤; 개별 자격·이력 보존 |
| `app/spokedu/components/home-web/home-section03-people.ts` | 기존 이름·사진·개별 자격을 유지하며 직함만 공통 원본 참조 |
| `app/spokedu/website/pages/about.tsx` | 운영진 공식 문구와 OUR PEOPLE 소개 |
| `app/spokedu/data/curriculum-page.ts` | 기존 안내의 운영진 문구를 동일 원본으로 통일 |
| `app/spokedu/website/components/content-sections.tsx` | 기관 페이지용 4MOVE 안내 추가 |
| `app/spokedu/website/pages/education.tsx` | 기존 기관 운영 정보 보존 + 4MOVE 공통 안내 삽입 |
| `app/spokedu/website/data/education.ts` | SPOMOVE·월간스포츠 프로그램 카드의 사진 주제 정합성 개선 |
| `app/spokedu/website/pages/spomove.tsx` | H1·SPOMOVE·SPOMAT·LAB 정의 정합성 개선 |
| `app/spokedu/data/spomove-program-page.ts` | 공개 H1·공통 정의·공개 설명 흐름 THINK 정합성 |
| `app/spokedu/data/spomove-public-catalog-page.ts` | 소개 페이지로 안내하는 문장을 SEE·THINK·MOVE로 일치 |
| `app/spokedu/data/spomat-page.ts` | 물리적 4색 매트·센서 없음·과제별 활용 범위를 공통 정의로 표시 |
| `app/spokedu/data/field-records-catalog.ts` | 매동·동작·동행 사례의 기존 field-editorial 매핑을 공통 썸네일에 적용. catalog 썸네일 필수 타입으로 실제 불변식 표현 |
| `app/spokedu/data/site-ia.test.ts` | 승인된 GNB·H1·THINK 및 공유 경로 소비 검증으로 갱신 |
| `app/spokedu/data/field-records-catalog.test.ts` | 파일명·폴더만 고정하던 검사를 로컬 파일 실재 검증으로 변경. 원격 fetch 금지 유지 |
| `app/spokedu/website/public-v2.contract.test.ts` (신규) | 실제 SSR 마크업의 6섹션·공식 지표·개별 자격·문의 의도·매트 설명·사례 매핑 검증 |
| `app/spokedu/docs/PUBLIC_MARKETING_DESIGN_CONTRACT.md` | 기존 V1 계약을 승인된 V2 순서·실제 렌더·범위로 갱신 |
| `docs/SPOKEDU_PUBLIC_WEBSITE_SSOT.md` | 기존 Public SSOT의 GNB·교육 진입·홈 역할·근거 정책 갱신 |
| `docs/operations/public-website-refactor/PUBLIC_V2_PHASE_1_2_PROPOSAL.md` | 사용자 승인과 수정 지시 반영. 숫자 보류 철회 |

이 폴더의 HTML 비교 뷰어·캡처 스크립트·JSON·로그·PNG는 로컬 QA 산출물이다. 별도 제품·디자인 SSOT를 만들지 않았다. 레거시·병행 파일은 삭제하지 않았다.

**보존한 사용자 작업:** `app/admin/iiwarmup/assets/page.tsx`, `app/admin/iiwarmup/layout.tsx`, 관리자 자산 컴포넌트 기존 파일 6개와 미추적 CSS, `app/layout.tsx`. 이번 작업은 해당 파일을 수정하지 않았다. MASTER·관리자·API·DB·결제·권한·인증·세션 코드는 수정하지 않았다.

## 2. 메인 전후 스크린샷

[전후 비교 뷰어 열기](index.html) — 홈 폭 선택, 데스크톱/모바일 GNB, 동기 스크롤, 원본 보기 및 주요 서브페이지 링크를 제공한다.

| 폭 | 변경 전 | 변경 후 |
|---|---|---|
| 375px | [전체](before/home-375.png) | [전체](after/home-375.png) |
| 768px | [전체](before/home-768.png) | [전체](after/home-768.png) |
| 1024px | [전체](before/home-1024.png) | [전체](after/home-1024.png) |
| 1440px | [전체](before/home-1440.png) | [전체](after/home-1440.png) |
| 1920px | [전체](before/home-1920.png) | [전체](after/home-1920.png) |

변경 후 6섹션: [Hero & Quick Entry](after/section-brand-1440.png), [Why](after/section-why-spokedu-1440.png), [4MOVE](after/section-education-system-1440.png), [SPOMOVE](after/section-spomove-experience-1440.png), [실적·사례](after/section-field-stories-1440.png), [상담](after/section-next-step-1440.png).

폰트·이미지 decode 완료 후 캡처했다. 섹션별 캡처에서는 sticky 헤더가 본문을 가리는 촬영 문제를 제거했고, 최종 변경 후 캡처에서는 개발 오버레이만 숨겼다. 제품 렌더 코드를 바꾼 것은 아니다. 원본 사진과 모바일·데스크톱 캡처를 직접 열어 Hero 인물, 발, 교구, SPOMOVE 화면·매트, 글자 줄바꿈을 검토했다. 정적 검사만으로 visual PASS를 선언하지 않았다. 별도 Target Reference는 지정되지 않았다.

## 3. GNB 전후

기존: 기관·학교 → 개인·소그룹 → SPOMOVE → 수업사례 → 소개.

변경: **소개 → 기관·학교 → 개인·소그룹 → SPOMOVE → 수업사례**. 우측 LAB outline / 문의 filled 유지. 로고 `/`, 하위 catalog·SPOMAT·파트너 Footer 연결 유지.

- 데스크톱: [전](before/gnb-desktop.png) / [후](after/gnb-desktop.png)
- 모바일: [전](before/gnb-mobile.png) / [후](after/gnb-mobile.png)

375px 메뉴에서 순서·현재 소개 링크 aria-current·밑줄, Escape 닫힘, 버튼 포커스 복귀, 메뉴 선택 후 닫힘을 확인했다. 1024px에서는 기존 xl 전환 기준에 따라 메뉴 버튼을 유지한다. 1440px에서는 5개 메뉴가 한 줄로 표시된다.

## 4. 공식 실적 4개

| 값 | 화면 라벨 |
|---|---|
| 10,000+ | 누적 운영 수업 |
| 500+ | 출강 학교·기관 |
| 30+ | 전문 지도자 |
| 98% | 파트너 기관 재계약률 |

`PUBLIC_OPERATING_METRICS`가 단일 원본이다. `2,500+`를 현재 공식 지표에서 제거했고, index에 따라 지도자 라벨을 ‘본사 직영 관리’로 바꾸던 로직도 제거했다. 승인일을 집계 기준일로 창작하지 않았다.

05 섹션은 왼쪽 2×2 실적과 오른쪽 매동 사례 사진·설명, 이어지는 동작 키움센터·동행 수업 사례를 하나의 흐름으로 구성한다. 모바일에서는 지표→학교 사례→기관 사례 순서로 읽힌다. 별도 숫자 띠 배너·숫자 애니메이션은 없다.

## 5. 운영진 공식 문구

“**연세대학교 체육교육학과 출신의 운영진**”을 홈 Hero 신뢰 요소와 About 운영진 소개에 표시한다. 기존 curriculum 안내도 같은 원본을 참조한다.

직함: 최지훈—대표 / 김윤기—운영총괄 / 김구민—수업팀장. About 카드·대표 소개·기존 people 소비처를 일치시켰다. 김구민의 강원대학교 학력 등 기존 개별 학력·자격은 동일화하지 않았다.

## 6. 이미지 개선

- Hero는 기존 2400×1800 현장 사진을 4:3 프레임에 전체 표시한다. 과거 고정 480px 높이보다 원본 장면을 보존한다.
- Quick Entry는 실제 수업·개인 지도·LAB UI로 역할을 구분한다. 개인 사진은 아동의 발·사다리가 보이도록 크롭을 검토했다. 세로 현장과 UI는 contain으로 주요 내용을 보존한다.
- Why는 지도 조건 조정 / 참여 수준을 고려한 현장 / 실제 LAB 도구 화면을 구분한다. 동일 서비스 카드를 반복 설명하지 않는다.
- SPOMOVE는 실제 수업 `edu-03.webp`와 실제 색 반응 실행 화면 `edu-07.webp`를 분리해 캡션을 붙였다. 합성 이미지를 수업 사진으로 사용하지 않았다.
- 사례는 이미 `images.ts`에 명시돼 있던 매동·동작·동행 field-editorial 사진을 catalog 썸네일에 연결했다. 개인수업 장면이 연결돼 있던 매동·동행 썸네일을 정리하고, 동작도 기존 기관별 매핑 원본으로 통일했다. 원본 파일을 새로 생성·덮어쓰기하지 않았다.
- SHA-256으로 비교한 **새 홈 내부 동일 이미지 바이트 중복 그룹 0건**. 이는 전 사이트 중복 0건이라는 뜻은 아니다. Private·About의 기존 일부 재사용은 전면 디자인 교체 범위에 포함하지 않았다.

신규 촬영 사실이나 기관명 연결을 추측하지 않았다. 사진 게시 권리의 새 확인·확장도 하지 않았으며 기존 공개 자산의 로컬 사용 범위다. [원본 후보 검토 시트](assets-review.png), 원본별 로드·비율·fit·position은 [results.json](results.json)에 남겼다.

## 7. 서브페이지 정합성

| 표면 | 결과 |
|---|---|
| About | 공식 운영진 문구·직함·공통 프로그램 정의. 연혁·개별 이력 보존 |
| Education | 공통 4MOVE 안내와 프로그램 사진 정합성. 기존 수업 운영·상세·FAQ·문의 동작 유지 |
| Private | 서비스 본문·16가지 움직임 성향·Move Report 관련 기능 미변경. 기존 상담 진입 유지 |
| SPOMOVE | 화면을 보고 판단하고 움직이는 정의, THINK, 물리적 매트 설명과 LAB 안내 정합성 |
| SPOMAT | 전자 센서/압력 감지 없음, 모든 과제에서 필요한 것은 아님을 명시 |
| Records | 사례 catalog의 설명·프로그램·링크 유지, 3개 사진 매핑 수정. 기존 필터·상세 URL 유지 |
| Catalog | 공개 안내 문장의 THINK 일치. 콘텐츠 단계·실행 분류·실제 런타임 미변경 |
| LAB | 비로그인 랜딩 HTTP 200 및 화면 확인. 기존 인증·온보딩·결제·실행 소스 미변경 |

8개 표면 × 375/1440px = 16개 화면에서 HTTP 200, 가로 넘침 0, 이미지 로드 실패 0을 확인했다. 원본 캡처는 `after/{route}-{width}.png` 및 비교 뷰어에서 확인할 수 있다.

## 8. 테스트·빌드·브라우저 결과

| 검사 | 최종 결과 / 증거 |
|---|---|
| Production Build | PASS, 259개 정적 페이지 생성 완료 — [로그](build.log) |
| TypeScript | PASS (`tsc --noEmit --pretty false`) — [로그](typescript.log) |
| ESLint 변경 TS/TSX | 오류 0, 기존 img 경고 9 — [로그](eslint.log) |
| 자동화 테스트 | 259 files / 1,674 tests PASS — [로그](tests.log) |
| 홈 반응형 | 375/768/1024/1440/1920px 모두 6섹션·overflow 0·깨진 이미지 0 |
| 주요 서브페이지 | 8개 × 2폭, 모두 HTTP 200·overflow 0·깨진 이미지 0 |
| GNB·CTA 내부 링크 | 홈·헤더에서 수집한 13개 목적지 모두 HTTP 200 |
| 문의 의도 | dispatch/private/spomove별 해당 폼 표시, bare contact 미선택. 실제 제출 없음 |
| 브라우저 | 수집된 pageerror 0건; 모바일 메뉴 Escape·focus 복귀·선택 닫힘 PASS |
| 저속 네트워크 | 1.6Mbps/150ms/cold cache 로컬 dev: 375/1440px layout-shift 합계 0, Hero 로드 성공 — [측정](slow-network.json) |

테스트 필터 `app/spokedu`는 Vitest 경로 부분 일치로 `app/spokedu-master` 관련 테스트도 포함했다. 초기 TypeScript/구 계약 검사에서 나온 타입·옛 GNB/H1 고정 기대값은 수정 후 최종 검사를 통과했다. 성공한 최종 명령과 종료 코드는 [verification.json](verification.json)에 기록했다. PowerShell의 npm.ps1 실행 정책 제약 때문에 npm.cmd 및 저장소의 node 실행 파일을 사용했다.

## 9. 잔여 문제와 검증 한계

1. ESLint 경고 9건은 기존 About/Education/shared의 `<img>` 사용이다. 새 홈은 `next/image`를 사용한다. 이번 범위 밖 이미지 컴포넌트를 일괄 변경하지 않았다.
2. 저속 네트워크 로컬 dev의 LCP는 375px **12,084ms**, 1440px **12,656ms**였다. 개발 번들·외부 폰트·원본 이미지 조건의 측정이며 **운영 Core Web Vitals PASS로 판정하지 않는다**. 변경 전 같은 조건의 성능 표본이 없어 성능 회귀 없음도 단정하지 않는다. 레이아웃 안정성과 이미지 표시만 확인했다.
3. 인증된 실제 계정, 실제 결제, 운영 DB 문의 접수는 수행하지 않았다. 코드 비변경·자동화 테스트·비로그인 handoff 확인 범위에서 회귀를 검증했다. 실결제·운영 데이터 쓰기를 수행한 E2E PASS라고 보고하지 않는다.
4. 기존 기록 전체의 모든 사진 출처·모든 외부 블로그의 실제 가용성은 재감사하지 않았다. 변경한 3개 사례는 기존 매핑을 유지했고, 홈의 내부 링크와 로컬 원본·캡처를 검토했다.
5. 주요 서브페이지는 원고·공통 정의·연결 정합성 범위이며 전체 페이지 디자인을 전면 교체하지 않았다. 스크린리더 전문 감사·Production 성능 인증은 이번 결과에 포함하지 않는다.

모든 변경은 미커밋 상태다. **Commit·Push·Production Deploy·운영 DB 변경은 수행하지 않았다.** 로컬 개발 서버는 `http://127.0.0.1:3000`에서 확인할 수 있다.
