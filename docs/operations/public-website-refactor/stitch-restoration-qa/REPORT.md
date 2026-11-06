# SPOKEDU Canonical Stitch Restoration — 구현 및 로컬 QA

작성일: 2026-11-06 (KST)

**판정: 구조·코드 구현 완료 / 로컬 QA 부분 통과 / 최종 시각 승인 보류 / 커밋·배포 없음.**

## 기준선과 변경 보존

- BASELINE_SHA: 0891c5c7015bee30ea11fdf2f9668418e7ed519e.
- FINAL_LOCAL_SHA: 동일 HEAD 위의 미커밋 변경. staging/commit/push/deploy를 수행하지 않았다.
- 기존 education 2단계 변경을 보존하고 02 제목을 “수업 운영 및 결과 공유”로 확정했다.
- 작업 전 education diff 사본: C:/Users/joker/AppData/Local/Temp/spokedu-stitch-implementation-20261106/education-before.patch.
- 기존 장비 파일 3개와 supabase/config.toml, vercel.json의 시작 시점 해시를 보존했다.
- 작업 도중 관찰된 범위 외 변경: CentersClient.tsx, CentersHubClient.tsx, SettlementSheet.tsx, Sidebar.tsx. 이번 구현에서 수정하거나 되돌리지 않았다.
- 이미지 파일 변경·삭제 0건. SEO 데이터·공개 라우트·사이트맵 변경 0건.
- 상세 파일·보존 목록: [preservation.json](preservation.json).

## 구현 완료

| 페이지 | 완료한 구조와 기능 |
|---|---|
| / | Hero → 01–03 → 공식 실적 → 실제 사례 → 단일 CTA. 독립 서비스 허브와 다크 영역 제거 |
| /private | Hero/서비스 안내 → 01–03 → 기존 3열 레슨 카드 → 단일 CTA. /private#apply 및 기존 운영 조건 보존 |
| /education | Hero → 프로그램 6종 → 운영 과정 01–02 → 공식 실적 → 단일 CTA. 03의 피드백·행정 지원 조건은 02에 보존 |
| /about | Hero/공식 지표 → 01–03 → 실제 운영진 3명 → 단일 CTA. 공개 사례 수를 기업 지표로 표시하던 문제 교정 |
| /spomove | Hero → 기존 01–04 → 4개 과제 유형 예시 → 단일 CTA. 전체 기능 수·성과 지표로 표현하지 않음 |

공식 지표는 marketing-public-metrics.ts를 소비한다. 운영진·프로그램·사례·연혁 원본 데이터와 실제 제품 의미는 유지했다. 인라인 상담은 기존 /contact 유형별 페이지로 연결하며 API·DB·동의 구현을 변경하지 않았다.

ConsultationLink는 기존 classType, operation, program, proposal, intent 및 유입 태그를 전달한다. 도착 유형과 이미 지정된 program은 외부 쿼리로 덮어쓸 수 없고 임의 redirect 매개변수는 전달하지 않는다.

## 실제 제거한 코드·파일

파일 삭제:
- app/spokedu/website/styles/spomove-experience.css — 사례 공통 간격·contain 규칙을 website.css로 보존·이전한 뒤 삭제.

제거한 실행 연결과 미사용 코드:
- 홈 service-paths, 독립 spomove-experience, 전용 이미지/아이콘 import.
- homeRefinement의 audiences, spomoveSteps와 미사용 metrics 별칭.
- EducationSystem, ClassConditions, EducationDetails, EducationFAQ, EducationCases.
- PrivateSupport, PrivatePracticalInfo.
- AboutHistory, AboutIntroduction, AboutFacts의 구형 화면 구현.
- 참조 없는 SpomoveFlow와 SpomoveFieldPhoto의 미사용 Home 분기.
- 해당 출력에만 쓰이던 CSS·import. 제거한 이름의 실행 참조는 website 범위에서 0건이다.

관련 데이터 파일과 다른 legacy 랜딩 파일은 삭제하지 않았다. 데이터 보존과 화면 출력 제거를 구분했다. 생성 CSS는 build-website-styles.mjs로 재생성했다.

## 디자인 원본과의 차이

1. 실제 사업 문구·공식 실적·실제 사진/UI로 원본의 가상 주장과 생성 이미지를 대체하는 기존 매핑을 유지했다.
2. 영문·숫자는 Plus Jakarta Sans, 한글은 Pretendard Variable로 실제 로드됨을 확인했다. 원본 HTML의 한글 플랫폼 대체 서체와 다르다.
3. Tailwind 3 원본과 Tailwind 4의 responsive leading/tracking 우선순위 차이를 생성기에서 보정했다. 25개 화면의 H1 크기·굵기·행간·자간 측정은 원본과 일치했다.
4. 긴 공식 값 10,000+가 원본 64px 적용 시 작은 폭에서 잘렸다. 기존 Stitch 역할을 사용해 지표를 390px에서는 36px, 768/1024px에서는 44px, 1440/1920px에서는 64px로 표시했다. **원본 HTML과 다른 반응형 보정**이며 최종 시각 검토 대상이다. [metrics-final.json](metrics-final.json): 15개 실적 영역에서 내부 잘림·수평 넘침 0건.
5. About은 가상 4인이 아닌 실제 3인 카드다. 기존 카드의 통일된 표현을 유지했다.
6. SPOMOVE 정보 영역의 숫자 대신 과제 이름·설명을 사용해 높이·줄바꿈이 원본과 다르다.
7. 가상 전화 폼 대신 기존 상담 링크를 사용한다. Private/About/Education/SPOMOVE CTA의 원본별 외곽·제목 크기는 각각 유지했다.
8. 한글 단어 중간 분절을 막기 위한 keep-all을 유지했다. 승인된 실제 문구 길이 때문에 원본과 줄바꿈·자연 높이가 다르다.
9. About의 작은 태그 6개는 대비 확보를 위해 기존 primary-container 대신 기존 primary 토큰을 사용했다. 브랜드 토큰 값은 변경하지 않았다.
10. 공통 헤더·푸터는 기존 서비스 것을 유지했다. 원본의 가상 헤더·푸터를 복사하지 않았다.

새 유틸리티와 복원된 타입 역할은 web-stitch 페이지에 한정했다. 비대상 페이지의 기존 full-width CTA와 글꼴 우선순위를 보존했다.

## 이미지 미해결 — 해결됨으로 판정하지 않음

- P1/P4/P6 후보는 적용하지 않았다.
- P5 private-small-group.jpg 후보는 적용하지 않았다. “2~4명” 조건도 바꾸지 않았다.
- 최지훈 대표는 기존 방송 캡처가 남아 있다. 승인된 비방송 대체 원본이 없다.
- 개인수업 03은 실제 피드백 자료가 없다. 기존 활동 사진이 남아 있으며 피드백 자료 확보로 판정하지 않는다.
- private-coaching.jpg는 Private에서 여전히 3회 사용한다. 반복 사진 문제는 미해결이다.
- cross-route 재사용과 파일명이 다른 동일 사진의 기존 감사 결과를 유지한다. 이미지 파일을 정리 명목으로 삭제하지 않았다.

## 검증 결과와 재현 명령

| 검증 | 결과 | 증거 |
|---|---|---|
| TypeScript | PASS | npm.cmd run typecheck; 종료 코드 0 |
| Build | PASS | npm.cmd run build; 종료 코드 0, [build-final.log](build-final.log) |
| 전체 Vitest | 3,234 통과 / 0 실패 / 기존 대기 5 | npm.cmd test -- --reporter=json --outputFile=docs/operations/public-website-refactor/stitch-restoration-qa/vitest-final.json; [JSON](vitest-final.json) |
| 관련 최신 테스트 | 51 통과 | npm.cmd test -- app/spokedu/data/site-ia.test.ts app/spokedu/website |
| 변경 범위 ESLint | 오류 0 / 경고 18 | [lint-changed.json](lint-changed.json). 이미지·stylesheet 관련 경고를 숨기지 않음 |
| 원래 lint:all | FAIL | 기존 .next-local-integration 및 .spomove-* 감사 산출물 포함. [lint.log](lint.log), [분리 결과](lint-source.json). 대상 밖 산출물·설정은 수정하지 않음 |
| 원본/실제 5페이지 × 5폭 | 캡처 및 측정 완료 | 390/768/1024/1440/1920px. 이미지 로딩 오류·문서 수평 넘침·브라우저 JS 오류 0. [비교 시안](comparison.html), [측정](rendered.json) |
| 실적 내부 잘림 | PASS | 최종 보정 후 15개 영역 0건. [metrics-final.json](metrics-final.json) |
| 상담 모의 E2E | 3유형 성공·실패 6개 확인 | 동의 전 전송 0, 유형·선택값·유입 정보 전달, 성공 초기화, 실패 초안 보존. 실제 POST는 가로채 모의 응답 사용 |
| /private#apply | 진입 유지 | 기존 anchor 안의 단일 상담 CTA에서 실제 유형별 폼으로 이동 |
| 모바일 메뉴 | 확인 | 열기, Escape 닫힘, 포커스 복귀 |
| 대상 외 스타일 | 4페이지 × 2폭 경계값 차이 0 | 동일 로드 상태에서 이전 CSS와 비교: [outside-css-equivalence.json](outside-css-equivalence.json) |
| 공개 목적지 | 확인 | records, 사례 상세, contact, partners, spomat, catalog 응답 200 |
| SEO·사이트맵 영향 | 코드 변경 없음 | 기존 메타데이터·사례 목적지 보존, [preservation.json](preservation.json) |
| 삭제 코드 참조 | 실행 참조 0 | website 런타임 범위 검색. 음성 assertion·계약·원본 자료의 역사적 명칭은 별도 |
| git diff --check | PASS | 해당 변경 범위 공백 오류 없음 |

변경 범위 린트 명령:
node node_modules/eslint/bin/eslint.js app/spokedu/website app/spokedu/components/website-chrome.tsx app/spokedu/data/site-ia.test.ts scripts/build-website-styles.mjs --format json --output-file docs/operations/public-website-refactor/stitch-restoration-qa/lint-changed.json

렌더링 증거 생성 스크립트:
- node docs/operations/public-website-refactor/stitch-restoration-qa/run-qa.cjs
- node docs/operations/public-website-refactor/stitch-restoration-qa/final-handoff.cjs
- node docs/operations/public-website-refactor/stitch-restoration-qa/metrics-final.cjs

전체 렌더링을 마지막 보정마다 반복하지 않았다. 마지막 지표 변경은 영향을 받는 Home/Education/About의 15개 영역만 갱신했다. comparison.html은 갱신된 캡처를 참조한다.

## QA 실패·부분 검증·미검증

- **최종 Visual PASS를 부여하지 않는다.** 미승인 사진, 대표 방송 캡처, Private 피드백 자료, 반복 사진이 남아 있다.
- axe-core raw 결과는 5페이지의 장식 숫자 15개에 color-contrast를 표시한다. 숫자는 aria-hidden 장식이며 원본의 옅은 워터마크를 유지했다. 원시 결과를 삭제하거나 자동 PASS로 바꾸지 않았다.
- Home/Private/Education/About의 이미지 위 텍스트 대비에는 자동 판정 incomplete가 남는다. 전체 WCAG 적합성 PASS가 아니다.
- npm.cmd run qa:public-shell은 /spomove/catalog@390의 기존 main landmark 부재에서 실패했다. 해당 페이지 구현은 이번 범위에서 변경하지 않았다.
- /spokedu-lab 및 /admin 진입은 로컬 응답 timeout으로 BLOCKED다. 인증 후 관리자·결제·LAB 전체 E2E는 NOT_TESTED이며 코드를 변경하지 않았다.
- 실제 상담 API의 DB 저장 E2E는 NOT_TESTED다. 개인정보·업무 데이터가 기록되는 실제 제출은 하지 않았다. 기존 전송·동의 단위 테스트와 모의 화면 흐름으로 구분했다.
- 전체 Vitest의 기존 대기 5개는 실행되지 않았다. 이번 변경에서 테스트를 skip으로 바꾸지 않았다.

## 커밋·배포 전 잔여 위험

이미지 승인/원본 확보, 위 접근성·landmark·인증 영역 미검증, 전역 lint의 기존 산출물 오류가 남는다. 지표 반응형 보정과 실제 콘텐츠에 따른 원본 대비 높이 차이도 최종 시각 승인 시 확인해야 한다.
공유 작업 트리의 다른 변경과 이번 구현을 분리해 정확한 파일 범위를 검토해야 한다. 커밋·푸시·배포는 각각 별도 승인 대상이다.

## ?? ?? ? ?? ??

17? img ??? Next Image unoptimized? ????. ?? URL? ?????? ???? ??? ?? API? ???? ???. ???? ?? ??? ?? ??? ?? ?? ???.
?? Google Fonts link? ???? ?? Plus Jakarta Sans ?? ??? OFL ????? public/fonts/plus-jakarta-sans? ??? ?? CSS?? ????.
?? ??(--max-warnings 0)? ?? ??? 69?, QA ???? ?? ??? 4?? ????.
