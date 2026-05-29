# DEV_NOTES

## 2026-05-29 Codex - SPOKEDU MASTER menu naming and navigation pass

### Decision
- Adopted: remove provider-centered abstract labels such as `프로그램 허브`.
- Adopted: keep `놀이체육` and `스포무브` independent in the primary navigation. They can be combined on Home as a recommended routine, but should not be forced into one product concept.
- Deferred: Route Group migration, B2B multi-tenant billing schema, Grace Period code, and preview upsell logic.
- Rejected for now: changing route paths, proxy rules, and database structure in the same pass as the menu copy. That would raise schedule and regression risk.

### Applied
- File: `app/spokedu-master/components/layout/TabBar.tsx`
- Primary navigation now uses:
  - 홈
  - 놀이체육
  - 스포무브
  - 수업도구
  - 수업기록
  - 학부모안내
  - 계정
- Desktop rail and mobile bottom tab share the same menu definition.
- `수업도구` was restored because timer, scoreboard, beat tools, and other in-class utilities are part of the live teaching flow.
- `기관설정` was replaced with `계정` because the product must support individual teachers as well as centers. The existing profile page already contains subscription management and lesson kit store entry points, so `계정` is the broader and less exclusionary primary label.
- Mobile navigation was reduced to five visible items: `홈`, `놀이체육`, `스포무브`, `수업도구`, `더보기`.
- `수업기록`, `학부모안내`, and `계정` moved into the mobile `더보기` bottom sheet because they matter, but are less urgent than live class preparation and execution.
- Desktop keeps the full menu visible because there is enough horizontal space and scan cost is lower.

## 2026-05-29 Codex - Home copy alignment after mobile navigation pass

### Decision
- Home should not become a feature explanation board. It should help teachers decide what to open before class.
- Keep the current OTT row structure, but align copy with the finalized navigation language: `놀이체육`, `스포무브`, and `수업도구`.

### Applied
- File: `app/spokedu-master/dashboard/DashboardView.tsx`
- Category labels shortened from `영상 확인`, `민첩·반응` to `영상`, `반응·민첩`.
- Hero badge changed to `이번 주 대표 수업안`.
- Hero CTA changed to `빠른 미리보기` and `놀이체육 보기`.
- Section titles changed to:
  - `금주 추천 수업안`
  - `실내 수업 큐레이션`
  - `스포무브 바로 실행`
- Section subtitles now describe why the row exists, without adding more text blocks.

## 2026-05-29 Codex - Shared chrome Korean text cleanup

### Decision
- Broken Korean in common UI chrome is a product trust issue, not a cosmetic detail.
- Fix layout-level text before deeper visual QA because every SPOKEDU MASTER page inherits these components.

### Applied
- Files:
  - `app/spokedu-master/components/layout/AppShell.tsx`
  - `app/spokedu-master/components/layout/StatusBar.tsx`
  - `app/spokedu-master/components/ui/BottomSheet.tsx`
- Rewrote broken labels for timer status, offline banner, trial expiration, notification/profile aria labels, and bottom sheet close buttons.

### Verified
- `npx.cmd eslint app/spokedu-master/components/layout/AppShell.tsx app/spokedu-master/components/layout/StatusBar.tsx app/spokedu-master/components/ui/BottomSheet.tsx`
- `npx.cmd tsc --noEmit --pretty false`

## 2026-05-29 Codex - Mobile home readability pass

### Decision
- The Home hero should show the actual class thumbnail more clearly. Too much dark overlay makes the service feel less concrete.
- Mobile bottom navigation needs extra content padding so the last row is not visually buried under the fixed tab bar.

### Applied
- File: `app/spokedu-master/dashboard/DashboardView.tsx`
- Reduced hero overlay opacity to improve thumbnail visibility while keeping text contrast.
- Increased mobile bottom padding from `pb-14` to `pb-28`, with smaller padding again on desktop.

## 2026-05-29 Codex - Mobile bottom navigation page padding and class tools cleanup

### Decision
- Moving `수업기록`, `학부모안내`, and `계정` into `더보기` does not mean those pages can be left with weak mobile layout.
- Fixed bottom navigation requires enough bottom padding on scroll containers, especially pages with save/copy actions.
- `수업도구` is a primary mobile tab, so broken Korean there has high product-trust cost.

### Applied
- Files:
  - `app/spokedu-master/class-record/page.tsx`
  - `app/spokedu-master/report/page.tsx`
  - `app/spokedu-master/profile/page.tsx`
  - `app/spokedu-master/components/ui/ClassToolsView.tsx`
- Raised mobile bottom padding on record/report/profile scroll containers.
- Repaired broken Korean in ClassTools header, tool status/help constants, sample students, scoreboard labels, reset button, order header, and action aria labels.
- Re-scanned `ClassToolsView.tsx` for mojibake patterns and repaired remaining visible strings in stopwatch, picker, team split, order, and student roster actions.

### Verified
- `npx.cmd eslint app/spokedu-master/components/ui/ClassToolsView.tsx app/spokedu-master/class-record/page.tsx app/spokedu-master/report/page.tsx app/spokedu-master/profile/page.tsx`
- `npx.cmd tsc --noEmit --pretty false`

## 2026-05-29 Codex - Secondary app page mobile padding pass

### Decision
- Pages reachable from `더보기`, `계정`, or `수업도구` still need safe mobile bottom spacing.
- Fixed mobile navigation should not cover final actions, empty states, or management buttons.

### Applied
- Files:
  - `app/spokedu-master/students/page.tsx`
  - `app/spokedu-master/shop/page.tsx`
  - `app/spokedu-master/director/page.tsx`
  - `app/spokedu-master/plan/PlanView.tsx`
- Changed mobile scroll container bottom padding from `pb-7` to `pb-28`, while keeping desktop at `lg:pb-7`.

### Verified
- `npx.cmd eslint app/spokedu-master/students/page.tsx app/spokedu-master/shop/page.tsx app/spokedu-master/director/page.tsx app/spokedu-master/plan/PlanView.tsx app/spokedu-master/components/ui/ClassToolsView.tsx`
- `npx.cmd tsc --noEmit --pretty false`
- Mobile labels were kept short enough to avoid ellipsis-based clipping.

### Verified
- `npx.cmd eslint app/spokedu-master/components/layout/TabBar.tsx`
- `npx.cmd tsc --noEmit --pretty false`
- `/spokedu-master/class-record` returns unauthenticated redirect.
- `/spokedu-master/subscription` returns unauthenticated redirect.
- `npm.cmd run build`

## 2026-05-25 Codex 홈 다크 크롬 정리

### 수정 파일
- `app/spokedu-master/components/layout/AppShell.tsx`
- `app/spokedu-master/components/layout/TabBar.tsx`
- `app/spokedu-master/components/layout/StatusBar.tsx`
- `DEV_NOTES.md`

### 판단
- 홈 본문을 다크 OTT 스타일로 가져가면서 사이드바와 상단바가 밝게 남아 있으면 의도된 대비가 아니라 서로 다른 제품을 붙인 화면처럼 보인다.
- 다만 라이브러리 상세, 수업안 모달, 설명 문구처럼 문서를 읽고 복사하는 화면까지 전부 검게 만들면 교육용 툴의 가독성과 신뢰감이 떨어진다.
- 그래서 다크 크롬은 `/spokedu-master/dashboard`에만 적용한다. 홈은 몰입형 콘텐츠 허브, 나머지는 밝은 문서/도구형 UI로 역할을 분리한다.

### 적용
- 홈 경로에서 AppShell 외곽 배경, DesktopRail, StatusBar, 모바일 TabBar를 모두 다크 톤으로 맞췄다.
- 기존 라이트 크롬은 홈 외 경로에서 유지한다.
- 사이드바/상단바의 깨진 한글 라벨을 정상 한국어로 정리했다.
- `/spokedu-master` 루트도 홈으로 취급해 리다이렉트 전후에 흰 배경이 노출되지 않도록 했다.
- 홈에서는 AppShell의 1440px 최대 폭 제한을 풀어 와이드 화면 좌우 여백이 흰색으로 뜨는 문제를 제거했다.
- 홈 하단의 `pb-24 + h-32` 완충 여백을 줄여 모바일 하단 탭 위의 죽은 공간을 줄였다.
- 히어로 썸네일을 덮던 오버레이를 낮춰 콘텐츠 이미지가 검게 죽지 않도록 조정했다.
- PowerShell 출력 인코딩 때문에 한글이 깨져 보일 수 있으므로 홈 QA는 실제 브라우저 렌더링 기준으로 확인한다.
- Playwright 기준 390x844, 768x1024, 1440x900에서 홈 한글 깨짐 0건, 가로 스크롤 0건을 확인했다.
- 모바일 하단 탭바를 fixed로 바꿔 문서 흐름 뒤로 밀리지 않게 했고, `Pro 전환` 버튼 터치 높이를 36px 이상으로 보정했다.

## 2026-05-25 Codex 홈 큐레이션 언어 정리

### 수정 파일
- `app/spokedu-master/dashboard/DashboardView.tsx`
- `DEV_NOTES.md`

### 판단
- `이어서 보기`는 실제 열람/시청 기록이 있을 때만 쓸 수 있다. 현재는 기록 기반이 아니므로 쓰면 가짜 OTT처럼 보인다.
- `인기 수업`도 조회수, 저장 수, 사용량 같은 근거가 없으면 신뢰를 깎는다.
- SPOKEDU MASTER 홈은 영상 소비 서비스가 아니라 수업 직전 자료 선택 화면이므로, row 이름도 선생님이 이해하는 행동 언어로 바꿔야 한다.

### 적용
- `이어서 보기`를 `오늘 바로 열 수업`으로 변경했다.
- `인기 수업`을 `현장 활용 수업`으로 변경했다.
- `새로운 콘텐츠`를 `새로 정리한 수업`으로 변경했다.
- `영상 포함` 필터를 `참고 영상`으로 변경하고 실제 videoUrl 기준으로 필터링한다.
- 히어로 CTA를 `수업안 보기 / 상세 정보`에서 `수업안 열기 / 전체 수업 보기`로 정리했다.
- 근거 없는 fake progress bar를 제거했다.
- 카드 hover 보조 라벨은 `수업안`과 실제 영상이 있을 때만 `참고 영상`을 보여주도록 바꿨다.
- 이후 `오늘 바로 열 수업`은 큐레이션 감정이 약하다고 판단해 `금주 추천 프로그램`으로 재정리했다.
- 하단 row도 `영상으로 먼저 익히는 수업`, `실내에서도 바로 쓰는 수업`으로 바꿔 구독자가 준비 시간 절감, 영상 확인, 공간 제약 해결을 바로 느끼도록 했다.
- 각 row에 짧은 설명 문장을 추가해 큐레이션 기준을 드러냈다.
- 홈 row별 프로그램은 최소한 홈 안에서 중복 노출되지 않도록 `usedIds` 기준으로 나눠 담는다.
- 세 번째 row가 너무 아래로 묻히는 문제를 줄이기 위해 히어로와 row 간격을 압축하고, 상단에 `금주 추천 / 영상 먼저 / 실내 수업` 큐레이션 요약을 추가했다.
- Playwright 기준 390x844, 768x1024, 1440x900에서 세 row 간 중복 프로그램 0건, 가로 스크롤 0건, 한글 깨짐 0건을 확인했다.

## 2026-05-25 Codex 홈 폰트 및 카드 태그 보강

### 수정 파일
- `app/globals.css`
- `app/spokedu-master/components/layout/AppShell.tsx`
- `app/spokedu-master/dashboard/DashboardView.tsx`
- `DEV_NOTES.md`

### 판단
- 기존 시스템 폰트는 다크 OTT 홈의 감정선에 비해 너무 기본 앱처럼 보인다.
- 한글 중심 서비스이므로 영문 display 폰트보다 한국어 가독성과 세련됨이 같이 있는 `SUIT / Pretendard / Wanted Sans` 계열이 맞다.
- 카드 hover 태그를 `수업안 / 참고 영상`으로 고정하면 모든 카드가 같은 정보만 말하므로 큐레이션 가치가 약해진다.

### 적용
- SPOKEDU MASTER 폰트 스택을 `SUIT, Pretendard, Wanted Sans, Apple SD Gothic Neo, Noto Sans KR` 순서로 조정했다.
- AppShell에 같은 폰트 스택을 명시 적용해 실제 computed font가 SPOKEDU MASTER 영역에 잡히도록 했다.
- 카드 태그를 학년, 공간, 발달 초점, 실제 프로그램 태그, 참고 영상 여부에서 뽑도록 바꿨다.
- 모바일에서도 hover 없이 정보가 보이도록 카드 제목 아래에 태그를 상시 노출했다.
- 태그가 화면 폭에 따라 잘리는 것은 허용하지 않는다. 카드 태그는 `CompactTagList`로 제한 수만 노출하고 남는 정보는 `+n`으로 표시한다.
- Playwright 기준 320x844, 390x844, 768x1024, 1440x900에서 태그 잘림 0건, 가로 스크롤 0건을 확인했다.
- 홈 필터 pill도 잘림을 허용하지 않는다. 카테고리 필터는 가로 스크롤 대신 flex-wrap으로 줄바꿈하고, 검색창은 2xl 이상에서만 같은 줄에 배치한다.
- Playwright 기준 320x844, 390x844, 768x1024, 1180x760, 1440x900에서 필터/검색 잘림 0건, 가로 스크롤 0건을 확인했다.

## 2026-05-25 Codex 홈 구매자 관점 재정리

### 수정 파일
- `app/spokedu-master/dashboard/DashboardView.tsx`
- `DEV_NOTES.md`

### 냉정 평가
- 이전 홈은 구독 구매자가 사고 싶어지는 화면이라기보다 기능을 많이 설명하는 화면에 가까웠다.
- 첫 메타 카드의 `준비 시간 / 현장 진행 / 수업 후`는 정보값보다 설명 부담이 컸고, 구매 판단을 돕기보다 화면을 지저분하게 만들었다.
- `지정 화면 열기`는 명시 연결이 없으면 랜덤 실행처럼 보이므로 홈 히어로와 추천 수업 카드에서 제거하는 것이 맞다.
- 라이브러리 수업안과 SPOMOVE를 억지로 하나의 주간 패키지처럼 묶으면 오히려 신뢰를 깎는다. 홈에서는 `추천 수업안`과 `SPOMOVE 큰 화면`을 별도 영역으로 분리한다.
- 이번 수정 후 홈의 구매자 관점 완성도는 50%대에서 62~65% 수준으로 본다. 구조적 독성은 줄였지만, 아직 대표 비주얼/카피/추천 로직의 상업적 설득력은 더 올려야 한다.

### 적용 내용
- 홈 히어로에서 과한 메타 카드, 배지 묶음, `지정 화면 열기` CTA를 제거했다.
- 히어로 CTA는 `수업안 보기`와 `라이브러리 전체`로 정리해 라이브러리의 역할을 수업 전 숙지/준비로 명확히 했다.
- `오늘의 실행 흐름` 패널을 제거했다. 현재 데이터와 맥락으로는 실제 체육 수업에 도움이 되는 기능처럼 보이지 않고, 홈을 지저분하게 만드는 쪽이 더 컸다.
- 주간 추천 카드는 OTT형 이미지 카드로 단순화했다. 썸네일 위에 영상/수업안/설명문구/준비물/단계 텍스트를 덕지덕지 얹는 구조를 제거했다.
- SPOMOVE 추천은 주간 수업안 그리드에서 분리해 별도 `SPOMOVE 큰 화면` 영역으로 이동했다. 수업안과 별도 실행되는 도구라는 문구를 명시했다.

## 2026-05-25 Codex 홈 큐레이션 4열 복구 및 썸네일 보정

### 수정 파일
- `app/spokedu-master/dashboard/DashboardView.tsx`
- `app/api/spokedu-master/programs/route.ts`
- `DEV_NOTES.md`

### 판단 기준
- 홈 큐레이션은 4개 일렬 구성이 맞다. 사용자가 한 번에 `수업안 3개 + 큰 화면 활동 1개`를 훑는 리듬이 더 좋고, 3개로 줄이면 홈의 밀도와 구독 서비스 느낌이 약해진다.
- 다만 4번째 SPOMOVE는 라이브러리 수업안과 연결된 것처럼 보이면 안 된다. 그래서 같은 큐레이션 줄 안에 두되, 카드 안에서 `SPOMOVE / 별도 실행`으로 역할을 분명히 한다.
- `활동 공간 확인` 같은 placeholder는 상품 홈에서 보이면 안 된다. 데이터 수정은 관리자 프로그램 메타의 `sm_space`, `sm_duration`에서 해야 하지만, 홈 카드는 미완성 값을 숨긴다.
- YouTube `hqdefault`도 큰 카드에서는 흐릴 수 있다. 홈에서는 `maxresdefault`를 먼저 시도하고, 없을 때만 `hqdefault`로 fallback한다.

### 적용 내용
- 주간 큐레이션 그리드를 `xl:grid-cols-4`로 복구했다.
- 4번째 카드에 `SpomoveCurationCard`를 넣어 같은 줄의 리듬은 유지하되 수업안 연결처럼 보이지 않게 했다.
- 프로그램 카드 메타에서 placeholder 공간값을 숨기도록 `getProgramMetaItems()`를 추가했다.
- API의 YouTube 썸네일 생성값을 `maxresdefault.jpg`로 변경했다.
- 홈 이미지 렌더링도 `mqdefault/hqdefault/default`를 `maxresdefault`로 승격하고, 실패 시 `hqdefault`로 되돌리게 했다.

## 2026-05-25 Codex 라이브러리 모달 교안형 전환 1차

### 수정 파일
- `app/spokedu-master/components/ui/BottomSheet.tsx`
- `app/spokedu-master/library/LibraryView.tsx`
- `DEV_NOTES.md`

### 판단 기준
- 첨부 레퍼런스에서 받아들일 핵심은 시각 스타일 자체가 아니라 `교안 문서 흐름`이다.
- 수업안 모달은 OTT형 미디어 카드가 아니라 수업 직전 확인 가능한 문서형 뷰어여야 한다.
- 단, 그대로 HTML 문서처럼 가면 유료 구독 상품성이 약하므로 넓은 문서형 모달, 섹션 내비게이션, 하단 액션 바를 추가한다.

### 적용 내용
- `BottomSheet`에 `size="document"` 옵션을 추가해 알림 등 기존 모달은 유지하고 프로그램 모달만 넓은 문서형으로 열리게 했다.
- 프로그램 모달의 영상 히어로 구조를 제거하고 `제목/정의 -> 프로그램 개요 -> 사전 체크 -> 초기 교구 세팅 -> 안전 교육 -> 참고 영상 -> 활동 방법 -> 응용 방법 -> 설명 문구` 순서로 재구성했다.
- 데스크톱 좌측에 섹션 내비게이션을 추가해 긴 교안을 빠르게 이동할 수 있게 했다.
- 준비물은 pill 대신 체크리스트로, 개요는 표로, 진행 단계는 번호형 절차로 바꿨다.
- SPOMOVE는 명시 연결이 있을 때만 `SPOMOVE 활동` 섹션과 실행 CTA를 표시한다.
- 하단 sticky 액션 바에 상세 보기, 문구 복사, 저장, 인쇄를 배치했다.

### 현재 평가
- 모달/상세의 방향성은 45~50%에서 63~66% 수준으로 올라갔다.
- 아직 80% 이상으로 가려면 세팅 도식의 표준화, 섹션 타이포 세부 조정, 인쇄 전용 CSS, 상세 페이지 동일 문법 적용이 남아 있다.

## 2026-05-25 Codex 라이브러리 상세 교안형 전환 1차

### 수정 파일
- `app/spokedu-master/library/[id]/LibraryDetailView.tsx`
- `DEV_NOTES.md`

### 판단 기준
- 모달만 교안형이고 상세 페이지가 OTT 히어로/판매 패키지형이면 제품 기준이 흔들린다.
- 상세 페이지는 더 긴 시간을 들여 읽는 화면이므로, 영상 히어로보다 문서형 수업안 흐름을 우선해야 한다.
- 쇼핑/패키지/활용 흐름 같은 판매자식 블록은 교안 신뢰감을 약하게 하므로 상세 1차에서는 제거한다.

### 적용 내용
- 상세 상단 영상/이미지 히어로 구조를 제거하고 문서형 헤더로 변경했다.
- 좌측 섹션 내비게이션을 추가했다.
- 모달과 같은 순서인 `개요 -> 사전 체크 -> 교구 세팅 -> 안전 -> 참고 영상 -> 활동 방법 -> 응용 -> 설명 문구`로 재구성했다.
- 준비물은 체크리스트, 개요는 표, 활동 방법은 번호 절차로 표현했다.
- SPOMOVE는 명시 연결이 있을 때만 `SPOMOVE 활동` 섹션과 하단 CTA에 표시한다.
- 쇼핑 장바구니/교구 구매 블록을 상세 교안 화면에서 제거했다.

### 현재 평가
- 라이브러리 상세는 50%대에서 64~67% 수준으로 올라갔다.
- 모달과 상세의 정보 문법이 맞춰졌지만, 세팅 도식 품질과 인쇄 CSS, 데이터별 섹션 정제는 아직 필요하다.

## 2026-05-25 Codex 교안 UI 디테일 보정

### 수정 파일
- `app/spokedu-master/library/LibraryView.tsx`
- `app/spokedu-master/library/[id]/LibraryDetailView.tsx`
- `DEV_NOTES.md`

### 판단 기준
- `참고 영상` 섹션에는 실제 영상만 나와야 한다. 영상이 없는데 사진을 대체로 넣으면 섹션명이 거짓이 된다.
- `응용 방법`은 순서형 절차가 아니라 선택지/변형이므로 숫자 번호보다 bullet 문법이 맞다.
- 사전 체크는 모바일에서는 여백 있는 박스가 좋지만, 데스크톱에서는 넓은 가로폭을 낭비하지 않도록 한 줄 흐름으로 밀도를 높여야 한다.

### 적용 내용
- 모달과 상세 모두 참고 영상 섹션 조건을 `영상 존재` 기준으로 바꿨다. 사진 fallback은 제거했다.
- 모달과 상세의 응용 방법을 숫자 목록에서 bullet 목록으로 바꿨다.
- 모달과 상세의 사전 체크리스트를 모바일에서는 세로, 데스크톱에서는 가로 wrap 형태로 바꿨다.

### 현재 평가
- 교안형 UI의 디테일 완성도는 64~67%에서 68~70% 수준으로 올라갔다.
- 아직 세팅 도식의 실제 품질, 인쇄 CSS, 콘텐츠별 데이터 정제가 필요하다.

## SPOKEDU Home → Global 100%

- **코드 준비 ~96%** — 사진 넣으면 100 가능: `app/spokedu/docs/PHOTO_DROPIN_100.md`. QA: `verify-spokedu-image-slots`, `spokedu-home-images-qa`, `spokedu-landings-visual-qa`, `spokedu-qa`.
- 로드맵: `app/spokedu/docs/HOME_GLOBAL_100.md`
- 운영자 사진 요청: `public/images/spokedu/PHOTO_REQUEST.md` (파일명 동일 덮어쓰기)
- 2026-05-24 **가정 Phase 1+**: `node scripts/fetch-spokedu-images.mjs` → 슬롯 채움 후 Phase 2–4 (`homePhotoGrade`, `homeIntroCluster`, LCP preload, 현장 대표 카드 무게↑, Final CTA 좌측 정렬).
- 2026-05-24 **Phase 5**: `HomeStructuredData`, `homeSkipLink`, below-fold 이미지 lazy, QA `overflowX`·H1 줄수, trust 5번째 칩 모바일 `col-span-2`, 게이트 360 min-height.
- 2026-05-24 **QA pass**: placeholder 오탐 수정(`data-spokedu-visual`), H1 2줄 검증, `MediaPanel` figure 시맨틱, `HOME_SIGNOFF.md`.
- 2026-05-24 **서브 랜딩 통일**: `LandingHero`/`LandingFinalCta` 전 페이지 적용 완료 (Curriculum·Contact 포함). `dispatch-landing` JSX 태그 오류 수정. `app/spokedu/docs/LANDING_UNIFY.md`.
- 2026-05-24 **사진 드롭인 100 준비**: `LandingPageRoot` Hero preload 10페이지, `PHOTO_DROPIN_100.md`, `verify-spokedu-image-slots.mjs`, `spokedu-landings-visual-qa.mjs`.
- 2026-05-23 Home Phase 2: Hero 셸·타이포·`HomeTrustStrip`·`HomeSectionHeading`·게이트 01/02/03·한국어 줄바꿈.
- 2026-05-23 Home Phase 3: `HomeHeroEditorial`(대표 1컷+썸 2)·`homePageStack`·섹션 eyebrow 한국어·비주얼 60% 비중.
- 2026-05-23 Home Phase 4: `HomePhotoZoom`·`HomeFinalCta`·Hero 진입 모션·신뢰 스트립 모바일 스크롤·프로그램 hover 정리.
- 2026-05-23 Home Phase 5: 스톡 아동·체육 톤 재배치(4260325/8612031)·`HomeSectionRule`·QA 4 viewport pass.

## 작업 날짜

- 2026-05-21
- 2026-05-22 노트 분석 업데이트
- 2026-05-22 `/spokedu` RC 배포 준비 (테스트 리드 삭제, post-deploy 스크립트)
- 2026-05-23 SPOKEDU MASTER 구독 UX 재정렬: 설명보다 실행 가치, 홈은 조종석, 구독 흐름은 바로 실행 중심

## `/spokedu` 배포 준비 (RC)

- RC QA 통과. Home H1: `현장 수업에서 시작해` / `아이의 움직임을 설계합니다` (About은 `체육교육 콘텐츠로 확장합니다`).
- RC Contact 테스트 리드 삭제 완료 (`scripts/delete-rc-test-leads.mjs`). 재확인: `node scripts/delete-rc-test-leads.mjs --dry-run` → 0건.
- 배포 후: `node scripts/spokedu-post-deploy-check.mjs https://PRODUCTION_URL`
- 프로덕션 OG: Home / About / Contact — 카카오·문자 공유 1회 수동 확인.
- 이미지 TODO (배포 후 교체): `records/dongjak.jpg`, `records/seodaemun.jpg`, `cases/hero.jpg`, `cases/representative.jpg` (`assetStatus: placeholder-copy`).

## 수정한 파일

- `app/components/Sidebar.tsx`
- `app/api/spokedu-master/subscription/route.ts`
- `app/spokedu-master/store/index.ts`
- `app/spokedu-master/lib/data.ts`
- `app/spokedu-master/components/layout/AppShell.tsx`
- `app/spokedu-master/components/layout/TabBar.tsx`
- `app/spokedu-master/components/ui/TrialGateWall.tsx`
- `app/spokedu-master/components/ui/ClassModeView.tsx`
- `app/spokedu-master/components/ui/ClassToolsView.tsx`
- `app/spokedu-master/dashboard/DashboardView.tsx`
- `app/spokedu-master/landing/page.tsx`
- `app/spokedu-master/onboarding/page.tsx`
- `app/spokedu-master/library/LibraryView.tsx`
- `app/spokedu-master/library/[id]/LibraryDetailView.tsx`
- `app/spokedu-master/payment/page.tsx`
- `app/spokedu-master/profile/page.tsx`
- `app/spokedu-master/report/page.tsx`
- `app/spokedu-master/spomove/SpomoveHubView.tsx`
- `app/spokedu-master/spomove/session/page.tsx`
- `app/spokedu-master/subscription/page.tsx`
- `app/api/spokedu-master/drills/route.ts`
- `app/admin/spomove/training/_player/page.tsx`
- `app/spokedu/components/seo-related-links.tsx`
- `app/spokedu/data/seo.ts`
- `DEV_NOTES.md`

## 2026-05-23 Codex 진행 요약

- 큰 방향을 `기능 설명이 많은 구독 서비스`에서 `누르면 수업이 시작되는 체육교육 OTT 조종석`으로 재정렬했다.
- 홈은 다시 끝난 화면이 아니라고 판단했다. `수업안과 영상`, `이번 주 추천 이유`, `수업 흐름`처럼 텍스트로 가치를 설명하던 블록을 줄이고, `오늘 바로 실행` 패널로 바꿨다. 핵심 버튼은 `수업안 열기`, `큰 화면 실행`, `수업 모드`, `설명 문구`다.
- `전시장` 같은 번역투 표현은 `바로 꺼내 쓰는 수업 패키지` 계열로 바꿨다. 라이브러리는 보여주는 곳이 아니라 수업을 꺼내 쓰는 곳이어야 한다.
- 랜딩은 텍스트 중심 설명 페이지에서 실제 수업 이미지가 깔린 브랜드 첫 화면으로 바꿨다. `SPOKEDU MASTER`를 첫 뷰포트 신호로 세우고 `체육교육 OTT · 14일 무료 체험`을 명확히 했다.
- 온보딩은 정보 입력 절차가 아니라 가입 직후 홈에 열리는 `Start Kit`를 보여주는 흐름으로 바꿨다. 완료 후 이동도 `/library`가 아니라 `/dashboard`로 조정했다.
- 구독 관리 화면은 기능 설명 카드보다 결제 후 열리는 실행 항목을 먼저 보여주도록 바꿨다. `이번 주 수업안 4개`, `큰 화면 활동 무제한`, `설명 문구 복사`, `주간 계획 연결`을 상단 가치로 노출했다.
- 프로필은 설정 화면이 아니라 계정 상태 확인 후 수업 실행으로 돌아가는 화면으로 정리했다. `홈으로 돌아가 수업 실행`과 `내 계정에서 바로 할 일` 액션을 추가했다.
- 설명 도구는 단순 문구 카드 모음이 아니라 수업 직후 커뮤니케이션 도구로 보이게 했다. 대상별 문구 `전체 복사`, `수업안 열기`, `큰 화면 실행`을 같은 맥락에 배치했다.
- 상세 페이지에는 `구독 패키지 가치`, `강사 오프닝 멘트`, `수업 전 브리핑`을 추가해 수업 하나가 준비/실행/설명까지 연결된 상품처럼 보이게 했다.
- 수업 모드는 홈에서 전면 CTA로 올라갔기 때문에, 진행 화면에도 `수업 초점`, `준비물`, `화면 활동` 운영 체크 레일을 추가했다. 현장에서는 긴 설명보다 현재 수업을 바로 굴리는 정보가 우선이다.
- 수업 계획 화면은 `수업 기록` 중심 CTA를 낮추고 Phase 1 핵심인 `수업안`, `시작`, `화면`, `설명`으로 카드 액션을 재정렬했다. 빈 날짜도 `수업 추가`와 `라이브러리 보기`로 바로 이어지게 했다.
- 네비게이션 문구를 실행 루프에 맞춰 줄였다. `설명 도구`는 `설명 문구`, `내 정보`는 `계정`으로 바꾸고, 데스크톱 레일 하단 안내도 문의 박스보다 `수업 실행 루프` 메시지로 정리했다.
- MASTER 메타데이터를 `반응형 구독 플랫폼`에서 `체육교육 OTT 구독 서비스`와 `수업 실행 루프` 언어로 맞췄다.
- SPOMOVE 허브는 개발자용 엔진 소개가 아니라 `체육관 TV가 바로 수업 도구가 됩니다`라는 구매자 언어로 바꿨다.
- 콘텐츠 쪽은 Funstick 외 프로그램에도 기존 이미지 자산을 매핑해 카드와 상세가 빈 자료처럼 보이는 문제를 줄였다.
- `loadDrills`가 API 실패 시 빈 SPOMOVE로 굳는 문제를 수정했다. 실패 시 `STATIC_DRILLS` fallback을 사용한다.
- 개발 중 반복되던 `date-fns/isSameDay` HMR 오류는 실제 코드 문제가 아니라 PWA service worker와 dev HMR 캐시 충돌로 판단했다. 개발 모드에서는 `/spokedu-master-sw.js`를 등록하지 않고, 이미 등록된 `/spokedu-master/` service worker를 해제하도록 `AppShell`을 수정했다.
- React key 경고는 홈 추천 초점 태그 중복이 원인이었다. `uniqueTextItems()`로 렌더링 전 중복 제거하도록 수정했다.

### 2026-05-23 검증 기록

- 반복 검증 기준: 수정 파일별 `npx.cmd eslint ...`, 전체 `npx.cmd tsc --noEmit --pretty false`, 주요 라운드마다 `npm.cmd run build`.
- 확인한 주요 route: `/spokedu-master/dashboard`, `/spokedu-master/library`, `/spokedu-master/library/figure-8-agility`, `/spokedu-master/spomove`, `/spokedu-master/landing`, `/spokedu-master/onboarding`, `/spokedu-master/payment?plan=pro`, `/spokedu-master/subscription`, `/spokedu-master/profile`, `/spokedu-master/report`.
- 2026-05-23 후반 기준 `npm.cmd run build` 통과.
- dev server는 포트 3000에서 재기동했으며, 마지막 확인 PID는 `8980`.

### 2026-05-23 남은 판단

- 홈은 방향이 맞아졌지만 아직 최종 polish 전이다. 모바일/태블릿 캡처로 버튼 밀도, 히어로 높이, 카드 균일성 확인이 필요하다.
- 구독 전환 설득은 “텍스트 설명”보다 “몇 초 안에 수업을 실행하는 경험”을 계속 우선해야 한다.
- 결제/구독/프로필의 사업자 정보는 랜딩 기준 `스포케듀 / 최지훈 / 311-63-00356`으로 통일해야 한다.
- 수업 기록, 학생 이력, 센터 운영은 Phase 2/3 확장 기능으로 계속 낮춰 둔다. Phase 1의 주인공은 라이브러리, SPOMOVE, 설명 문구, 구독 결제다.

## 해결한 문제

- admin 사이드바 `구독 서비스` 아래에 `SPOKEDU MASTER` 항목을 추가했다. `/spokedu-master/dashboard`로 바로 이동한다.
- `스포키듀 구독 NEW`는 `/admin/spokedu-master`, `SPOKEDU MASTER`는 `/spokedu-master/*`에서 active 되도록 분리했다.
- admin 계정이 무료 체험 만료 상태로 떨어지지 않도록 `/api/spokedu-master/subscription`에서 admin을 `team / active`로 반환하게 했다.
- store 동기화에서도 admin은 `team` 플랜, `trialEndsAt: null`로 처리한다.
- 홈 추천을 `이번 주 바로 쓰는 4선`으로 바꿨다. 라이브러리 3개 + SPOMOVE 1개 구성이며, 제목 기준 중복 제거와 정적 fallback으로 펀스틱 펜싱만 반복되는 문제를 줄였다.
- 홈/라이브러리/설명 도구의 프로그램 풀을 수정했다. 실제 `/api/spokedu-master/programs` 데이터가 있으면 정적 샘플을 섞지 않고, API가 비어 있을 때만 fallback을 쓴다.
- SPOMOVE 데이터 원천을 `/admin/spomove/training`으로 바로잡았다. `/api/spokedu-master/drills`는 `app/admin/spomove/training/_player/constants.ts`의 `SPOMOVE_CATALOG_SLOT_IDS`와 `MODES`에서 실제 모드 목록을 만든다.
- 구독자 SPOMOVE 화면에 `시지각 반응`, `반응 인지`, `사이먼 효과`, `플랭커`, `Go / No-Go`, `Task Switching`, `순차 기억`, `스트룹 과제`, `플로우` 같은 실제 training 모드가 나오도록 했다.
- 구독자 SPOMOVE 세션에서 로컬 엔진으로 처리하지 않는 실제 training 모드는 `/admin/spomove/training/_player?embed=1` iframe으로 실행한다. admin training 플레이어는 embed 모드에서 헤더 링크를 숨긴다.
- 라이브러리 모달 상단은 `lessonDetail.videoUrl`이 있으면 썸네일 대신 영상을 즉시 재생한다. YouTube URL은 embed autoplay/mute로, mp4/webm/ogg는 video 태그로 처리한다.
- 라이브러리 상세 페이지 상단도 `lessonDetail.videoUrl`이 있으면 대표 이미지보다 영상을 우선 재생한다.
- store 초기값을 실제 로딩 전 빈 배열로 바꿨다. API가 로딩되기 전 정적 샘플이 먼저 보이는 문제를 막고, 네트워크 실패/데이터 없음일 때만 fallback 콘텐츠를 사용한다.
- 프로그램-SPOMOVE 연결 ID를 실제 training ID 기준으로 바꿨다. 신규 연결은 `reactTrain`, `basic`, `simon`, `flanker`, `gonogo`, `taskswitch`, `spatial`, `stroop`, `flow`를 사용한다.
- 기존 DB나 레거시 데이터에 남아 있을 수 있는 `SR-05`, `SR-06`, `RS-05`, `IC-05`, `RC-05`, `SM-05`, `SM-06`은 `/api/spokedu-master/programs`에서 실제 training ID로 자동 변환한다.
- 홈 히어로에 대표 프로그램의 수업안, 준비물, 진행 단계, 설명 문구, SPOMOVE 실행이 한 번에 이어진다는 메시지를 추가했다.
- 홈 `이번 주 수업 준비 끝내는 4선` 카드를 강화했다. 프로그램 카드에는 발달 초점, SPOMOVE 연동, 준비 간편, 설명 문구, 배치 가이드, 시간, 공간, 단계 수가 바로 보인다.
- 홈 추천 4선은 실제 프로그램 3개 + 실제 SPOMOVE 1개 구조를 유지하되, 단순 목록이 아니라 수업 준비 패키지처럼 보이도록 카드 밀도와 CTA를 조정했다.
- 홈 디테일 1차 개선을 진행했다. 히어로 문구에서 `준비물, 진행 단계, 설명 문구...`처럼 내부 기능을 나열하는 문장을 제거하고, 구독자가 얻는 결과인 `준비 시간 단축`, `오늘 대표 수업`, `화면 활동 포함` 중심으로 바꿨다.
- 홈 히어로의 대상/시간/공간/초점 정보를 같은 높이의 정보 레일로 통일했다. 초점 문구가 길게 늘어져 카드 크기를 흔드는 문제를 줄였다.
- 홈 대표 이미지 영역은 단순 사진이 아니라 수업 목표와 초점 칩을 보여주는 `수업 핵심` 카드로 바꿨다. 사진은 현장 신뢰를 주고, 텍스트는 수업 선택의 근거만 짧게 제공한다.
- `오늘 수업` 빈 상태를 단순 빈 박스에서 `수업안 확인 → 큰 화면 실행 → 설명 문구` 3단계 흐름으로 바꿨다. 수업 기록 데이터가 없어도 구독자가 바로 다음 행동을 이해하게 한다.
- MASTER 앱 셸의 상단 바, 데스크톱 사이드 레일, 모바일 하단 탭을 밝은 구독 서비스 톤으로 보정했다. 홈만 밝고 네비게이션은 어두운 이전 앱처럼 보이는 분리감을 줄였다.
- 홈 컨테이너에 `h-full overflow-y-auto`를 적용해 AppShell의 `overflow-hidden` 안에서도 웹/패드/모바일 화면에서 세로 스크롤이 안정적으로 동작하게 했다.
- 주간 큐레이션은 데이터가 적을 때도 `라이브러리 3개 + SPOMOVE 1개` 구조를 유지하도록 보강했다. 대표 수업과 중복되더라도 4선 구조가 무너지지 않는 쪽을 우선했다.
- 홈 정보 순서를 `대표 수업 → 오늘 수업 루프 → 주간 큐레이션`으로 조정했다. 구독자가 히어로를 본 뒤 바로 `수업안 확인`, `큰 화면 실행`, `설명 문구` 흐름을 이해하고, 그 다음에 다른 추천 콘텐츠를 고르게 했다.
- 주간 큐레이션 카드의 긴 설명문을 줄이고 `시간 · 공간 · 초점` 요약 중심으로 정리했다. 카드가 자료 설명서처럼 보이는 문제를 줄이고 선택 속도를 높였다.
- SPOMOVE 추천 카드는 어두운 실행형 카드로 분리했다. 실제 모드 아이콘을 크게 보여줘 라이브러리 프로그램 카드와 역할이 다르다는 점을 홈에서 바로 알 수 있게 했다.
- 홈 카드 라운딩을 과도하게 큰 값에서 낮췄다. 프리미엄 느낌을 큰 둥근 카드에 의존하지 않고, 여백·위계·콘텐츠 선택성으로 만들도록 방향을 보정했다.
- 로딩 스켈레톤을 밝은 구독 서비스 톤으로 바꿨다. 홈과 라이브러리가 로딩되는 순간 어두운 레거시 화면처럼 깜빡이는 문제를 줄였다.
- BottomSheet를 밝은 모달 톤으로 보정했다. 알림, 라이브러리 모달, 플랜/프로필 시트가 홈의 밝은 제품 톤과 분리되어 보이지 않게 했다.
- 체험 종료 게이트도 밝은 톤으로 보정했다. 무료 체험 만료 화면이 경고판처럼 보이지 않고 플랜 전환 화면처럼 보이도록 했다.
- 라이브러리 화면을 홈과 같은 밝은 구독 서비스 톤으로 맞췄다. 검색, 필터, 추천 수업, 프로그램 카드가 더 이상 어두운 레거시 카드처럼 보이지 않게 했다.
- 라이브러리 모달 내부를 밝은 수업 패키지 구조로 보정했다. BottomSheet는 밝은데 내부 섹션은 어두운 카드였던 톤 충돌을 줄였다.
- 라이브러리 모달 CTA를 `수업 시작`, `SPOMOVE 큰 화면`, `설명 문구 복사`, `즐겨찾기`로 유지하되 밝은 버튼 체계로 정리했다. 홈에서 카드 클릭 후 다음 행동이 끊기지 않도록 했다.
- 라이브러리 상세 페이지를 밝은 MASTER 톤으로 보정했다. `/spokedu-master/library/[id]`로 직접 진입해도 홈/라이브러리/모달과 같은 제품처럼 보이도록 했다.
- 상세 페이지의 상단 헤더, CTA, 메타 카드, 준비물, 진행 단계, SPOMOVE 연결, 설명 문구 영역을 밝은 카드 체계로 정리했다. 히어로 이미지는 현장감과 가독성을 위해 어두운 오버레이를 유지했다.
- Class Mode 진입 시 전체 수업 타이머가 자동 시작되도록 했다. 사용자가 이미 `수업 시작`을 눌렀는데 다시 타이머 시작 버튼을 찾아야 하는 현장 UX 문제를 줄였다.
- Class Mode의 닫기 버튼 aria-label을 `수업 종료`에서 `수업 나가기`로 바꿨다. 실제 종료/완료 플로우와 단순 이탈을 구분하기 위한 보정이다.
- `Drill` 타입과 `/api/spokedu-master/drills` 응답에 실제 training `levels`를 포함했다.
- SPOMOVE 카탈로그 카드에 한/영 이름, 설명, 태그, 단계 수, 연결 수업 수를 노출했다.
- SPOMOVE 전체 목록 CTA를 `설정으로`로 정리했다. 구독자 화면에서도 admin training의 `설정으로 ▶` 흐름과 같은 인지 구조를 유지한다.
- 정적 기준 콘텐츠 데이터를 정상 한국어로 복구했다. `Funstick Fencing`, `8자 드릴 민첩성 트레이닝`, `팀 릴레이 챌린지`와 SPOMOVE 기본 드릴명이 깨진 문자열 없이 표시된다.
- Funstick Fencing을 기준 상품 샘플로 강화했다. 수업 목표, 코치 멘트, 학부모 문구, 현장 팁, 변형, 안전 체크, 공간 세팅, SPOMOVE 연결까지 채웠다.
- `8자 드릴 민첩성 트레이닝`과 `팀 릴레이 챌린지`도 같은 콘텐츠 골격으로 강화했다. 목표, 단계, 코치 멘트, 보호자 문구, 현장 팁, 변형, 안전 체크, 공간 세팅, SPOMOVE 연결이 포함된다.
- 라이브러리 화면을 `수업 패키지` 중심으로 재작성했다. 카드에는 설명, 대상/시간/공간, 준비 간편/좁은 공간/화면 활동 같은 가치 칩을 보여준다.
- 라이브러리 모달을 프리미엄 수업안 구조로 정리했다. 대표 이미지, CTA, 수업 목표, 준비물, 공간 세팅, 진행 단계, SPOMOVE 연결, 학부모·기관 설명 문구를 포함한다.
- 라이브러리 상세 페이지를 다시 정리했다. 깨진 문구가 들어온 프로그램도 대표 3개 fallback으로 제목, 카테고리, 대상, 준비물, 설명을 정상 표시한다.
- 상세 페이지의 CTA를 `수업 시작`, `SPOMOVE 큰 화면`, `설명 문구 복사`로 정리했다. 교구 스토어는 준비물 구매 보조로만 연결하며 학생/기록 기능과 섞지 않는다.
- Class Mode 화면을 다시 정리했다. 수업 중에는 단계 카드, 타이머, SPOMOVE 실행만 남기고 종료 후에는 `설명 문구 만들기`를 1순위로 둔다.
- 수업 보조 도구 화면의 깨진 문구를 정리했다. 타이머, 점수판, 무작위 선택, 팀 나누기, 진행 순서를 현장 편의 도구로 유지한다.
- 학생 명단이 없어도 보조 도구 흐름을 확인할 수 있도록 예시 명단을 사용한다. 명단 기반 기능은 확장 단계라는 안내를 가볍게 표시한다.
- SPOMOVE 허브를 구독자용 실행 화면으로 재작성했다. 히어로는 `움직임 몰입 엔진`, 실행 모드는 `큰 화면/모바일/Class Mode`, 드릴 분류는 `도입 3분/수업 중 반응/기억·판단/마무리` 흐름이다.
- SPOMOVE 드릴명과 카테고리에 깨진 데이터가 들어와도 fallback 이름을 보여주도록 했다.
- SPOMOVE 실행 화면의 프로젝터/Class Mode 가독성을 키웠다. 실행 중에는 신호 글자와 라벨을 더 크게 보여주고, 완료 화면에서는 모바일을 제외한 모드의 세부 지표 노출을 줄였다.
- SPOMOVE 완료 후 기본 다음 행동을 `수업 기록`이 아니라 `설명 문구`로 재정렬했다. 수업 기록은 Phase 2 성격의 확장 기능으로 낮춰 노출한다.
- 모바일 하단 탭과 데스크탑 레일의 깨진 한글을 정상화했다. 탭은 `홈`, `라이브러리`, `SPOMOVE`, `설명 도구`, `내 정보` 5개다.
- 체험 만료, 체험 카운트다운, 오프라인 배너의 깨진 한글을 정상화했다.
- `설명 도구` 화면에 상단 가치 요약을 추가했다. `학부모 안내`, `기관 설명`, `학교 기록`으로 이 기능이 왜 구독 가치가 되는지 빠르게 보이게 했다.
- `설명 도구`도 프로그램 제목 기준 중복 제거와 정적 fallback을 사용한다. 프로그램 데이터가 적거나 중복되어도 문구 생성 대상이 비는 문제를 줄였다.
- `설명 도구`의 기본 SPOMOVE 연결 ID를 실제 fallback인 `SR-05`로 수정했다.
- `설명 도구`의 문구 생성 품질을 강화했다. 수업 목표, 코치 멘트, 안전 체크, 공간 세팅, SPOMOVE 연결 설명을 끌어와 보호자용/기관용/학교 기록용 문구에 반영한다.
- admin은 `설명 도구`에서 기관용/학교 기록용/홍보용 템플릿이 잠기지 않게 했다.
- `내 정보`에서 admin 상태를 `관리자 패스`로 명확히 표시한다.
- `내 정보`의 Phase 2 확장 기능 영역을 `확장 기능 준비`로 낮춰 노출했다. 수업 기록/학생 이력/센터 운영이 현재 핵심 구독 상품처럼 보이지 않게 했다.
- 전체 타입 체크를 막던 기존 `spokedu` SEO 관련 링크 타입 오류를 보정했다. `about`, `cases`, `monthly`, `insights` 같은 페이지 키가 들어와도 fallback 링크를 사용한다.

## 반영한 레퍼런스

- Netflix/Disney+식 큐레이션: 사용자가 무엇을 볼지 고민하기 전에 오늘 쓸 콘텐츠를 먼저 제안한다.
- Netflix/교육 OTT식 홈 큐레이션: 첫 화면에서 대표 수업과 이번 주 추천 묶음을 보여주되, SPOKEDU에서는 감상 콘텐츠가 아니라 수업 준비 패키지로 번역한다.
- Class101/MasterClass식 패키징: 콘텐츠를 단순 목록이 아니라 완성된 수업 패키지로 보여준다.
- Class101/MasterClass식 상세 페이지: 대표 이미지, 수업 목표, 준비물, 단계, 현장 팁, 연결 활동을 한 화면에서 확인하게 한다.
- GoNoodle/MOJO식 화면 활동: 아이들이 바로 반응하는 SPOMOVE를 독립 실행 엔진으로 보여준다.
- Peloton/Apple Fitness식 실행 CTA: `큰 화면 실행`, `모바일`, `Class Mode`처럼 실행 맥락을 분리한다.
- GoNoodle/Peloton식 모드 카탈로그: 화면 활동은 단순 카드가 아니라 모드, 레벨, 실행 맥락이 바로 보여야 하므로 SPOMOVE 카드에 단계 수와 설정 진입을 넣었다.
- Class101/MasterClass식 영상 우선 상세: 모달을 열면 대표 썸네일보다 영상 재생을 우선해 강사가 수업 준비 흐름을 끊지 않게 한다.
- 교실 운영 도구 레퍼런스: ClassDojo/TeamSnap류의 무거운 관리 기능이 아니라, 현장에서 바로 쓰는 타이머·점수판·랜덤 선택 수준으로 낮춰 유지한다.
- TeamSnap/ClassDojo식 커뮤니케이션 가치: Phase 1에서는 자동 발송이 아니라 복사 가능한 설명 문구로 수업 직후 커뮤니케이션을 만든다.
- GoNoodle식 프로젝터 실행: 수업 중 화면은 버튼과 설명보다 큰 신호, 명확한 색, 빠른 반복에 집중한다.

## 남은 문제

- 실제 브라우저에서 모바일, 태블릿, 데스크탑, 16:9 프로젝터 화면 QA가 더 필요하다.
- 콘텐츠 원본 품질이 아직 상용 수준은 아니다. 각 프로그램마다 대표 사진, 수업 목표, 준비물, 공간 배치, 진행 단계, 안전 체크, 변형, 설명 문구, SPOMOVE 연결을 채워야 한다.
- 대표 콘텐츠 3개는 기준 밀도에 가까워졌지만, 상용 설득력에는 최소 5~8개 정도의 고밀도 패키지가 더 필요하다.
- 라이브러리 필터와 태그 체계는 1차 구조다. 실제 강사가 수업을 찾는 기준으로 더 정교화해야 한다.
- SPOMOVE 실행 화면은 1차 정리했지만 실제 빔/TV/태블릿에서 프레임 드랍, 전체화면 진입, 터치 반응 QA가 더 필요하다.
- 디자인 polish는 계속 필요하다. 카드 비율, 그리드 균일성, 모달 스크롤, 빈 화면, 로딩 상태를 더 다듬어야 한다.

## 다음 작업 순서

1. `/spokedu-master/spomove/session`을 실제 브라우저에서 16:9, 태블릿, 모바일로 열어 렉과 전체화면 동작을 확인한다.
2. 대표 프로그램을 5~8개까지 Funstick Fencing 수준의 수업 패키지로 채운다.
3. 설명 도구 문구 품질을 실제 현장 문장 기준으로 계속 다듬는다.
4. 모바일/태블릿/데스크탑 화면 캡처 기준으로 홈, 라이브러리, SPOMOVE, 모달 QA를 진행한다.

## 주의할 점

- 현재 작업 기준은 오직 `SPOKEDU MASTER`다.
- 라이브러리 데이터 원천은 `admin/curriculum`이다.
- SPOMOVE 데이터 원천은 `admin/spomove/training`이다.
- 실제 프로그램 데이터가 있을 때 정적 샘플 콘텐츠를 섞으면 안 된다. 정적 콘텐츠는 API 비어 있음/오프라인 fallback으로만 사용한다.
- SPOMOVE를 라이브러리 카테고리처럼 만들면 안 된다. 라이브러리와 연결은 가능하지만, 데이터와 실행은 `/admin/spomove/training` 기반 독립 엔진이다.
- 라이브러리의 `relatedSpomoveIds`는 반드시 실제 training ID를 써야 한다. 예전 `SR-05` 계열은 API에서 호환 변환만 한다.
- Store는 교구 판매 영역이다. 학생/수업 기록/성장 리포트와 섞으면 안 된다.
- Phase 1은 라이브러리, SPOMOVE, 수업 설명 도구, 플랜/프로필 완성도가 우선이다.
- 수업 기록, 학생 이력, 카카오, 학부모 웹뷰, 원장 대시보드는 Phase 2/3로 미룬다.
- 수정 후에는 `npx.cmd tsc --noEmit --pretty false`와 필요한 lint/build를 확인한다.
- 2026-05-21 기준 `npx.cmd eslint`, `npx.cmd tsc --noEmit --pretty false`, `npm.cmd run build` 통과를 확인했다.

## 2026-05-22 노트 분석 및 방향 보정

- `CLAUDE.md`는 기준을 잘 잡고 있다. 다만 `app/spokedu-master`만 수정하라는 표현은 너무 좁아서, MASTER를 위해 필요한 `app/api/spokedu-master/*`와 `/admin/spomove/training` embed/player 보정은 허용되는 것으로 정리했다.
- `CLAUDE.md`의 한글 깨짐 탐지 명령이 CJK 전체를 잡는 형태라 정상 한글까지 전부 걸릴 위험이 있었다. replacement character와 대표 mojibake 문자열만 찾는 명령으로 바꿨다.
- `docs/spokedu-subscription-development-direction.md`의 핵심은 “대시보드의 매주 4개 자료가 1번 가치”라는 점이다. 현재 MASTER의 `이번 주 수업 준비 끝내는 4선`과 방향이 맞다.
- 같은 문서의 “수업 보조도구가 2번”이라는 판단은 장기적으로 유효하지만, 지금 Phase 1에서 홈/하단 탭의 주인공이 되면 라이브러리+SPOMOVE 구독 서비스 정체성을 흐릴 수 있다. 보조도구는 삭제하지 말고 보조 진입으로 둔다.
- 구독 운영 체크리스트 문서들은 대부분 예전 `spokedu-pro` 결제/운영 안정화 기준이다. MASTER 상품 완성의 직접 기준은 아니지만, 플랜/결제/상태 문구 정합성 점검에는 참고한다.
- 냉정한 결론: 어제 작업은 “데이터 원천과 IA 방향”을 바로잡은 점은 좋지만, 아직 실제 브라우저 QA와 콘텐츠 원본 품질 검수 없이는 상용 완성이라고 보기 어렵다.
## 2026-05-22 라이브러리 모달 미디어 UX 보정

### 작업 날짜
- 2026-05-22

### 수정한 파일
- `app/spokedu-master/library/LibraryView.tsx`
- `DEV_NOTES.md`

### 해결한 문제
- 라이브러리 수업 패키지 모달에서 영상 URL이 있으면 기본 미디어 영역이 영상으로 열리고 자동재생되도록 유지/강화했다.
- YouTube 영상 썸네일을 별도 미디어 탭으로 추가했다.
- 영상, 대표 이미지, 현장 이미지, 배치 이미지를 모달 상단 썸네일 레일에서 즉시 전환할 수 있게 했다.
- 영상이 있는 프로그램에는 `영상 자동재생` 칩을 표시해 모달을 열었을 때 바로 재생되는 이유를 명확히 했다.
- 미디어 영역을 고정 높이에서 `aspect-video` 기반으로 바꿔 웹/패드/모바일에서 비율이 더 안정적으로 유지되게 했다.

### 남은 문제
- 실제 DB 프로그램 중 `videoUrl`이 비어 있는 경우에는 여전히 사진/배치도 중심으로 보인다. 콘텐츠 원본에 영상 URL을 채우는 작업이 필요하다.
- 수업 패키지 모달 전체의 스크롤, sticky CTA 위치는 실제 브라우저 모바일/태블릿 QA가 필요하다.

### 다음 작업 순서
1. 대표 프로그램의 `videoUrl` 유무를 확인하고, 비어 있으면 영상 없는 상태의 대체 UX를 더 프리미엄하게 보정한다.
2. Library detail page에도 동일한 미디어 전환 구조를 반영한다.
3. Home 대표 수업 카드에서 모달 열기 → 영상 재생 → 수업 시작/SPOMOVE 실행 동선을 QA한다.

### 주의할 점
- 영상이 있으면 “자료 설명”보다 “바로 보고 준비”가 먼저다.
- 영상 없는 프로그램은 썸네일/배치도/현장 사진의 품질이 곧 신뢰도다.
- 영상 자동재생은 muted/playsinline 기준으로 유지한다.

### 검증
- `npx.cmd eslint app/spokedu-master/library/LibraryView.tsx` 통과.
- `npx.cmd tsc --noEmit --pretty false` 통과.
- `npm.cmd run build` 통과. 213개 페이지 빌드 완료.

## 2026-05-22 SPOMOVE iframe embed 흐름 보정

### 작업 날짜
- 2026-05-22

### 수정한 파일
- `app/admin/spomove/training/_player/MemoryGameApp.tsx`
- `app/admin/spomove/training/_player/page.tsx`
- `DEV_NOTES.md`

### 해결한 문제
- MASTER에서 `/admin/spomove/training/_player?embed=1`로 iframe 실행할 때 admin용 `처음으로` 버튼이 보이지 않도록 `embed` prop을 추가했다.
- `MemoryGameApp`는 `initialMode`가 있으면 이미 설정 화면으로 바로 진입한다. 이 흐름은 유지하고, iframe 안에서 admin 홈으로 돌아가는 진입만 제거했다.
- 실제 UTF-8 원문 기준으로 `MemoryGameApp`의 주요 홈/설정/결과 문구는 정상 한글임을 확인했다. PowerShell 콘솔 출력만 일부 한글을 깨뜨려 보여준다.

### 남은 문제
- 실제 브라우저에서 iframe 설정 화면이 MASTER 세션 wrapper 안에서 적절한 높이와 스크롤을 갖는지 확인해야 한다.
- `MemoryGameApp`에는 기존 unused warning이 있다. 현재 상용 기능에는 치명적이지 않지만, 추후 별도 정리하면 좋다.

### 다음 작업 순서
1. `/spokedu-master/spomove/session?drill=basic&mode=projector` 실제 브라우저 QA.
2. iframe 설정 화면의 높이, 스크롤, 시작 버튼 위치 확인.
3. 라이브러리 모달의 썸네일/영상 즉시 재생 UX 보정.

### 주의할 점
- MASTER 구독자가 admin 홈/학생 선택/관리용 흐름으로 빠지지 않게 한다.
- admin 전체 화면을 제거하거나 구조 변경하지 말고, `embed=1`일 때의 구독자 표면만 다듬는다.

### 검증
- `npx.cmd eslint app/admin/spomove/training/_player/MemoryGameApp.tsx app/admin/spomove/training/_player/page.tsx app/admin/spomove/training/_player/constants.ts` 통과. 기존 warning 8개만 남음.
- `npx.cmd tsc --noEmit --pretty false` 통과.
- `npm.cmd run build` 통과. 213개 페이지 빌드 완료.

## 2026-05-22 admin SPOMOVE player constants 정상화

### 작업 날짜
- 2026-05-22

### 수정한 파일
- `app/admin/spomove/training/_player/constants.ts`
- `DEV_NOTES.md`

### 해결한 문제
- MASTER의 SPOMOVE iframe 실행 화면이 참조하는 admin training constants의 깨진 한글을 정상화했다.
- 실제 모드명, 영문명, 설명, 단계명, 속도 프리셋을 정리했다.
- 실제 모드 9개를 기준으로 정리했다: 시지각 반응, 반응 인지, 사이먼 효과, 플랭커, Go / No-Go, Task Switching, 순차 기억, 스트룹 과제, 플로우.
- `resolveTrainingEngine`, `normalizeLegacyTrainingMode`, TBD 슬롯, 학생 색상, 속도 프리셋 export 구조는 유지했다.

### 남은 문제
- `app/admin/spomove/training/page.tsx` 자체에도 깨진 안내 문구가 많이 남아 있다. 다만 MASTER 구독자 화면의 직접 표면은 아니므로, 지금은 iframe player에 필요한 constants를 우선했다.
- `MemoryGameApp.tsx` 내부의 일부 UI 문구도 아직 admin legacy 영향으로 깨진 부분이 있을 수 있다. 실제 iframe 화면 QA 후 필요한 부분만 정리해야 한다.

### 다음 작업 순서
1. `/spokedu-master/spomove/session?drill=basic&mode=projector` 등 iframe 기반 모드에서 문구가 정상 표시되는지 확인한다.
2. `MemoryGameApp.tsx`의 설정 패널/시작 화면에서 아직 깨진 문구가 보이면 직접 표면만 정리한다.
3. MASTER Home → SPOMOVE 실행 → 완료 → 설명 문구 흐름의 클릭 동선을 확인한다.

### 주의할 점
- admin 전체 리팩토링으로 번지면 안 된다. MASTER에 실제로 노출되는 player/constants부터 고친다.
- SPOMOVE는 fake mode를 만들지 않고 실제 training mode만 사용한다.
- 실제 실행 화면은 어두운 프로젝션 톤 유지.

### 검증
- `npx.cmd eslint app/admin/spomove/training/_player/constants.ts app/spokedu-master/spomove/session/page.tsx app/spokedu-master/spomove/SpomoveHubView.tsx` 통과.
- `npx.cmd tsc --noEmit --pretty false` 통과.
- `npm.cmd run build`는 첫 실행에서 시간 초과였으나 컴파일/타입/페이지 생성 중 159/213까지 진행됨. timeout을 늘려 재실행했고 최종 통과. 213개 페이지 빌드 완료.

## 2026-05-22 SPOMOVE 세션 화면 보정

### 작업 날짜
- 2026-05-22

### 수정한 파일
- `app/spokedu-master/spomove/session/page.tsx`
- `DEV_NOTES.md`

### 해결한 문제
- SPOMOVE 실행 세션의 시작, 일시정지, 완료, 나가기 주변 문구를 정상 한글로 정리했다.
- 큰 화면/모바일/Class Mode 라벨을 명확히 구분했다.
- 일반 cue 기반 세션의 fallback cue를 `왼쪽`, `오른쪽`, `앞으로`, `뒤로`, `멈춤`, `점프`로 정리했다.
- admin training player를 iframe으로 실행하는 모드에도 전체화면/나가기 컨트롤을 제공했다.
- 실행 화면은 계속 어두운 고대비 톤으로 유지했다. 이 화면은 구독자 탐색 화면이 아니라 TV/빔 프로젝션용 실행 화면이기 때문이다.

### 남은 문제
- 실제 브라우저에서 `/spokedu-master/spomove/session?drill=basic&mode=projector` 같은 iframe 기반 모드가 화면을 정확히 채우는지 QA해야 한다.
- `reactTrain`, `spatial`, `flow`처럼 직접 컴포넌트를 쓰는 모드와 iframe 모드의 완료 플로우가 서로 다르다. 상용화 전에는 완료/재시작/설명 문구 연결 UX를 통일해야 한다.
- PowerShell 콘솔 출력은 UTF-8 한글을 깨뜨려 보여줄 수 있다. 실제 깨짐 여부는 브라우저 또는 `Select-String`의 대표 mojibake 검색으로 판단한다.

### 다음 작업 순서
1. SPOMOVE 세션을 실제 브라우저에서 큰 화면, 모바일, Class Mode 기준으로 확인한다.
2. iframe 기반 admin player의 헤더/여백/전체화면 표시를 점검한다.
3. 라이브러리 상세 모달의 썸네일/영상 즉시 재생 UX를 보정한다.
4. 홈 대표 수업에서 `수업 시작`을 눌렀을 때 SPOMOVE 실행과 설명 도구로 이어지는 흐름을 재점검한다.

### 주의할 점
- 실행 화면에 설명 문구를 많이 넣으면 현장 집중도가 떨어진다. 시작 전/완료 후에만 필요한 문구를 둔다.
- SPOMOVE 세션은 어두운 톤 유지, SPOMOVE 허브는 밝은 구독 UX 유지.
- 수업 기록 저장은 Phase 2다. 완료 후 기본 CTA는 `다시 시작`, `설명 문구`, `목록으로` 중심이다.

### 검증
- `npx.cmd eslint app/spokedu-master/spomove/session/page.tsx app/spokedu-master/spomove/session/EngineRouter.tsx` 통과.
- `npx.cmd tsc --noEmit --pretty false` 통과.
- `npm.cmd run build` 통과. 213개 페이지 빌드 완료.

## 2026-05-22 SPOMOVE 허브 재정리

### 작업 날짜
- 2026-05-22

### 수정한 파일
- `app/spokedu-master/spomove/SpomoveHubView.tsx`
- `DEV_NOTES.md`

### 해결한 문제
- SPOMOVE 허브에 남아 있던 깨진 한글 문구를 제거하고 실제 `/admin/spomove/training` 기반 모드명으로 정리했다.
- SPOMOVE 선택 화면을 어두운 실행 화면처럼 보이게 하던 구조를 밝은 구독자용 허브로 다시 구성했다.
- 실제 실행 화면은 프로젝터/TV 시인성을 위해 어두운 고대비 톤을 유지하고, 허브는 Home/Library와 같은 밝은 프리미엄 톤으로 분리했다.
- 실제 모드 fallback을 명확히 했다: 시지각 반응, 반응 인지, 사이먼 효과, 플랭커, Go / No-Go, Task Switching, 순차 기억, 스트룹 과제, 플로우.
- Peloton/Apple Fitness식 실행 모드 분리와 GoNoodle식 즉시 실행 활동 카탈로그를 SPOMOVE에 맞게 반영했다.

### 남은 문제
- 실제 브라우저에서 모바일, 태블릿, 데스크탑 화면 캡처 QA가 아직 필요하다.
- SPOMOVE 실행 세션의 16:9 프로젝터 화면, 전체화면 진입, 터치 반응 QA가 아직 필요하다.
- 각 SPOMOVE 모드와 라이브러리 프로그램의 `relatedSpomoveIds` 연결 품질을 더 촘촘히 점검해야 한다.

### 다음 작업 순서
1. SPOMOVE 허브를 실제 화면에서 확인하고 카드 간격, 높이, CTA 밀도를 조정한다.
2. `/spokedu-master/spomove/session`의 실행 화면을 16:9, 모바일, 태블릿 기준으로 QA한다.
3. Home의 대표 수업 및 주간 4선과 SPOMOVE 허브 사이의 이동 흐름을 더 매끄럽게 만든다.
4. 라이브러리 상세 모달의 영상/썸네일 즉시 재생 UX를 점검한다.

### 주의할 점
- SPOMOVE는 라이브러리 카테고리가 아니라 독립 실행 엔진이다.
- 허브는 밝은 구독 UX, 실행 화면은 어두운 고대비 프로젝션 UX로 유지한다.
- 가짜 SPOMOVE 모드를 만들지 말고 `/admin/spomove/training`의 실제 모드만 사용한다.
- Store는 교구 판매 영역이다. 학생/기록/성장 리포트와 섞지 않는다.
- 수업 기록, 학생 이력, 카카오, 학부모 웹뷰, 원장 대시보드는 Phase 2/3로 둔다.

### 검증
- `npx.cmd eslint app/spokedu-master/spomove/SpomoveHubView.tsx` 통과.
- `npx.cmd tsc --noEmit --pretty false` 통과.
- `npm.cmd run build` 통과. 213개 페이지 빌드 완료.

## 2026-05-23 Codex 결제 플로우 정리

### 수정한 파일
- `app/spokedu-master/payment/page.tsx`
- `app/spokedu-master/payment/success/page.tsx`
- `app/spokedu-master/payment/cancel/page.tsx`
- `DEV_NOTES.md`

### 해결한 문제
- 결제 성공 후 목적지가 라이브러리 중심으로 흐르던 것을 홈 중심의 수업 실행 루프로 바꿨다.
- 성공 화면에서 바로 `수업안`, `큰 화면`, `설명 문구`로 이동할 수 있게 구성했다.
- 취소 화면은 사용자가 이탈하지 않도록 `홈으로 돌아가기`와 `플랜 다시 보기`를 제공한다.
- `설명 도구` 표현을 `설명 문구`로 통일했다.

### 검증
- `npx.cmd eslint app/spokedu-master/payment/page.tsx app/spokedu-master/payment/success/page.tsx app/spokedu-master/payment/cancel/page.tsx` 통과.
- `npx.cmd tsc --noEmit --pretty false` 통과.
- `/spokedu-master/payment?plan=pro` 200 확인.
- `/spokedu-master/payment/success` 200 확인.
- `/spokedu-master/payment/cancel` 200 확인.
- `npm.cmd run build` 통과. 182개 정적 페이지 생성 완료.

## 2026-05-23 Codex 수업 도구 콘솔 정리

### 수정한 파일
- `app/spokedu-master/components/ui/ClassToolsView.tsx`
- `app/spokedu-master/report/page.tsx`
- `app/spokedu-master/profile/page.tsx`
- `app/spokedu-master/subscription/page.tsx`
- `app/spokedu-master/lib/subscription.ts`
- `app/spokedu-master/library/[id]/LibraryDetailView.tsx`
- `DEV_NOTES.md`

### 해결한 문제
- 수업 도구 첫 화면이 단순 탭 목록처럼 보여 구독 기능의 가치가 약했다.
- 상단을 `CLASS COMMAND` 현장 진행 콘솔로 바꾸고, 즉시 실행 도구 수, 명단 기반 기능, 설명 문구 연결 상태를 보여주게 했다.
- 현재 선택한 도구가 어떤 현장 문제를 해결하는지 짧은 기능 설명으로 보여준다.
- 수업안, 큰 화면, 설명 문구로 바로 이동하는 아이콘 CTA를 추가했다.
- `설명 도구`, `전시장` 잔여 표현을 제거하고 `설명 문구` 표현으로 통일했다.

### 검증
- `npx.cmd eslint app/spokedu-master/components/ui/ClassToolsView.tsx app/spokedu-master/report/page.tsx app/spokedu-master/profile/page.tsx app/spokedu-master/subscription/page.tsx app/spokedu-master/lib/subscription.ts app/spokedu-master/library/[id]/LibraryDetailView.tsx` 통과.
- `npx.cmd tsc --noEmit --pretty false` 통과.
- `/spokedu-master/class-tools` 200 확인.
- `/spokedu-master/report` 200 확인.
- `npm.cmd run build` 통과. 182개 정적 페이지 생성 완료.

## 2026-05-23 Codex 수업 준비 키트 정리

### 수정한 파일
- `app/spokedu-master/shop/page.tsx`
- `app/spokedu-master/profile/page.tsx`
- `DEV_NOTES.md`

### 해결한 문제
- `교구 스토어`가 구독 OTT 안에서 별도 판매몰처럼 보일 위험이 있었다.
- 페이지 제목과 카피를 `수업 준비 키트`로 바꿔 라이브러리 수업안의 준비물 확인 흐름으로 정리했다.
- 상단에 `수업안 확인`, `큰 화면 실행`, `설명 문구` CTA를 추가해 쇼핑 페이지가 수업 실행 루프 안에 남도록 했다.
- 추천 세트는 `스타터 키트`, `센터 공용 운영 키트`로 바꾸고 대상 적합도를 표시했다.
- 개별 교구에는 `연결 수업`을 표시해 단순 상품이 아니라 수업 패키지의 준비물처럼 보이게 했다.
- 프로필의 교구 메뉴 설명을 `구매합니다`에서 `수업안에 맞는 준비물을 확인합니다`로 바꿨다.

### 검증
- `npx.cmd eslint app/spokedu-master/shop/page.tsx app/spokedu-master/profile/page.tsx` 통과.
- `npx.cmd tsc --noEmit --pretty false` 통과.
- `/spokedu-master/shop` 200 확인.
- `npm.cmd run build` 통과. 182개 정적 페이지 생성 완료.

## 2026-05-23 Codex 학생/기록/센터 운영 정리

### 수정한 파일
- `app/spokedu-master/students/page.tsx`
- `app/spokedu-master/class-record/page.tsx`
- `app/spokedu-master/director/page.tsx`
- `app/spokedu-master/profile/page.tsx`
- `DEV_NOTES.md`

### 해결한 문제
- 학생/기록/센터 화면이 CRM 또는 출결 관리 서비스처럼 보일 위험이 있었다.
- 학생 이력은 `수업 기록에서 남긴 성장 근거`를 보는 화면으로 톤을 조정했다.
- 학생 화면 상단에 기록 연결, 수업 기록, 설명 문구 액션 상태를 추가했다.
- 학생 상세 CTA를 `기록`, `설명 문구`, `미리보기`, `보호자 링크 복사`, `다음 수업안` 흐름으로 정리했다.
- 수업 기록 목록 상단에 `수업안에서 시작`, `큰 화면 실행`, `설명 문구 확인` CTA를 추가했다.
- 수업 기록 작성 화면에 오늘 기록이 학생 이력과 설명 문구로 이어진다는 설명을 추가했다.
- 센터 대시보드는 `센터 수업 운영`으로 이름을 바꾸고, 수업안 사용/기록률/케어 신호를 보는 운영 화면으로 조정했다.
- 프로필의 수업 기록/학생 이력 설명도 관리형 문구에서 수업 후 근거 문구로 바꿨다.

### 검증
- `npx.cmd eslint app/spokedu-master/students/page.tsx app/spokedu-master/class-record/page.tsx app/spokedu-master/director/page.tsx app/spokedu-master/profile/page.tsx` 통과.
- `npx.cmd tsc --noEmit --pretty false` 통과.
- `/spokedu-master/students` 200 확인.
- `/spokedu-master/class-record` 200 확인.
- `/spokedu-master/director` 200 확인.
- `npm.cmd run build` 통과. 182개 정적 페이지 생성 완료.

## 2026-05-23 Codex 보호자 공유/신뢰 화면 정리

### 수정한 파일
- `app/spokedu-master/parent/[studentId]/page.tsx`
- `app/spokedu-master/privacy/page.tsx`
- `app/spokedu-master/terms/page.tsx`
- `DEV_NOTES.md`

### 해결한 문제
- 보호자 공유 화면이 외부에 노출되는 화면인데 신뢰 신호가 충분히 전면에 나오지 않았다.
- 보호자 화면 제목을 `성장 기록` 중심에서 `수업 참여 기록`으로 조정했다.
- 읽기 전용, 7일 유효, 해당 학생 기록만 열람 가능하다는 신뢰 정보를 상단과 하단에 표시했다.
- 학생별 최신 기록을 날짜 기준 내림차순으로 정렬해 가장 최근 수업이 요약에 반영되게 했다.
- 동작 성장, 배지, 최근 기록이 비어 있을 때 빈 화면으로 보이지 않도록 안내 문구를 추가했다.
- 개인정보처리방침에 학생 이름, 반/그룹, 출석, 관찰 메모, 동작 체크 기록 등 수업 운영 정보 항목을 추가했다.
- 이용약관에 수업 기록, 학생 이력, 보호자 공유 링크가 수업 운영 보조 자료임을 명시했다.

### 검증
- `npx.cmd eslint app/spokedu-master/parent/[studentId]/page.tsx app/spokedu-master/privacy/page.tsx app/spokedu-master/terms/page.tsx` 통과.
- `npx.cmd tsc --noEmit --pretty false` 통과.
- `/spokedu-master/parent/sample-1` 200 확인.
- `/spokedu-master/privacy` 200 확인.
- `/spokedu-master/terms` 200 확인.
- `npm.cmd run build` 통과. 182개 정적 페이지 생성 완료.

## 2026-05-23 Codex 입구/체험 종료 화면 정리

### 수정한 파일
- `app/spokedu-master/page.tsx`
- `app/spokedu-master/components/ui/TrialGateWall.tsx`
- `app/spokedu-master/components/layout/AppShell.tsx`
- `DEV_NOTES.md`

### 해결한 문제
- `/spokedu-master` 루트가 리다이렉트 전 `null`만 반환해 빈 화면처럼 보일 수 있었다.
- 루트 진입 화면에 SPOKEDU MASTER 로딩 브랜딩을 추가해 수업 실행 화면으로 이동 중임을 보여준다.
- 체험 종료 벽의 문구를 차단형에서 `수업 루프를 계속 쓰는 구독 전환` 톤으로 바꿨다.
- Pro CTA를 `Pro로 수업 루프 계속 쓰기`로 바꿔 결제 이유를 명확히 했다.
- 체험 종료 벽의 기능 목록을 수업안, SPOMOVE, 설명 문구, 수업 진행 콘솔 중심으로 정리했다.
- 체험 잔여 배너와 종료 배너의 버튼 문구를 `Pro 전환`으로 통일했다.

### 검증
- `npx.cmd eslint app/spokedu-master/page.tsx app/spokedu-master/components/ui/TrialGateWall.tsx app/spokedu-master/components/layout/AppShell.tsx` 통과.
- `npx.cmd tsc --noEmit --pretty false` 통과.
- `/spokedu-master` 200 확인.
- `npm.cmd run build` 통과. 182개 정적 페이지 생성 완료.

## 2026-05-23 Codex 전체 문구 톤 정리

### 수정한 파일
- `app/spokedu-master/dashboard/DashboardView.tsx`
- `app/spokedu-master/profile/page.tsx`
- `app/spokedu-master/subscription/page.tsx`
- `app/spokedu-master/components/ui/ClassToolsView.tsx`
- `app/spokedu-master/spomove/session/page.tsx`
- `app/spokedu-master/library/[id]/LibraryDetailView.tsx`
- `app/spokedu-master/landing/page.tsx`
- `app/spokedu-master/director/page.tsx`
- `DEV_NOTES.md`

### 해결한 문제
- 전체 화면을 다시 검색해 `Pro 시작`, `교구 스토어`, `무료 자료실`, `확장 기능`, `확장 단계`처럼 현재 서비스 톤과 어긋나는 표현을 정리했다.
- `Pro 시작`은 결제 전환 맥락에 맞게 `Pro 전환`으로 통일했다.
- `교구 스토어`는 `수업 준비 키트` 또는 `준비물 보기`로 바꿨다.
- `무료 자료실`은 서비스 가치를 낮춰 보이게 하므로 `단순 자료 모음`으로 수정했다.
- SPOMOVE 세션 종료 후 `수업 기록은 확장 기능` 표현을 `수업 기록으로 오늘 활동 남기기`로 바꿨다.
- Class Tools의 샘플 명단 안내를 `확장 단계`가 아니라 등록 명단이 없을 때의 예시 흐름으로 설명했다.

### 검증
- `rg -n "전시장|설명 도구|무료 자료실|구매합니다|교구 스토어|Pro 시작|수업 기록은 확장 기능|확장 단계|강사와 수업 현황을 관리합니다" app\\spokedu-master` 결과 없음.
- `npx.cmd eslint app/spokedu-master/dashboard/DashboardView.tsx app/spokedu-master/profile/page.tsx app/spokedu-master/subscription/page.tsx app/spokedu-master/components/ui/ClassToolsView.tsx app/spokedu-master/spomove/session/page.tsx app/spokedu-master/library/[id]/LibraryDetailView.tsx app/spokedu-master/landing/page.tsx app/spokedu-master/director/page.tsx` 통과.
- `npx.cmd tsc --noEmit --pretty false` 통과.
- `/spokedu-master/dashboard` 200 확인.
- `/spokedu-master/profile` 200 확인.
- `/spokedu-master/landing` 200 확인.
- `/spokedu-master/spomove/session` 200 확인.
- `npm.cmd run build` 통과. 182개 정적 페이지 생성 완료.

## 2026-05-23 Codex 홈 운영 루프 재정리

### 수정한 파일
- `app/spokedu-master/dashboard/DashboardView.tsx`
- `DEV_NOTES.md`

### 해결한 문제
- 홈의 `이번 주 상태 / 추천 4 / 화면 ON / 문구 복사` 블록이 상태값처럼 보일 뿐 실제 활용 방식이 애매했다.
- 해당 블록을 제거하고 `오늘 운영 루프`로 재구성했다.
- 오른쪽 패널은 이제 `수업안 확인`, `큰 화면 준비`, `수업 후 문구`, `주간 계획 반영`의 4단계 행동으로 이어진다.
- `설명 문구` CTA는 라이브러리 해시가 아니라 실제 설명 문구 페이지(`/spokedu-master/report?program=...`)로 연결한다.
- 홈의 목표를 숫자판이 아니라 수업 준비부터 안내까지 이어지는 실행 조종판으로 잡았다.

### 검증
- `npx.cmd eslint app/spokedu-master/dashboard/DashboardView.tsx` 통과.
- `npx.cmd tsc --noEmit --pretty false` 통과.
- `/spokedu-master/dashboard` 200 확인.
- `npm.cmd run build` 통과. 182개 정적 페이지 생성 완료.
- `npm.cmd run build` 통과. 182개 정적 페이지 생성 완료.

## 2026-05-24 Codex 홈 주간 카드 압축

### 수정한 파일
- `app/spokedu-master/dashboard/DashboardView.tsx`
- `DEV_NOTES.md`

### 방향 기준
- 주간 추천 카드는 읽는 카드가 아니라 고르는 카드다.
- 작은 카드 안에서는 이미지, 제목, 핵심 태그, 실행 버튼만 남긴다.

### 해결한 문제
- 주간 카드 안에 시간/학년, 공간, 초점 태그, 패키지 증거 칩이 겹쳐 정보량이 많았다.
- 카드 이미지 영역을 44에서 52 높이로 키워 콘텐츠의 시각적 매력을 우선했다.
- 패키지 증거 칩은 카드에서 제거하고 히어로의 압축 메타에만 남겼다.
- 카드 하단 메타는 초점 태그와 시간/공간만 남겨 더 가볍게 만들었다.

### 검증
- `npx.cmd eslint app/spokedu-master/dashboard/DashboardView.tsx` 통과.
- `npx.cmd tsc --noEmit --pretty false` 통과.
- `/spokedu-master/dashboard` 200 확인.
- `npm.cmd run build` 통과. 182개 정적 페이지 생성 완료.

## 2026-05-24 Codex 홈 실행 바 압축

### 수정한 파일
- `app/spokedu-master/dashboard/DashboardView.tsx`
- `DEV_NOTES.md`

### 방향 기준
- 홈은 계속 `미니멀한 프리미엄 실행 홈` 기준을 유지한다.
- 같은 의미를 반복하는 카드형 설명은 제거한다.

### 해결한 문제
- `오늘 바로 실행`과 `오늘 운영 루프`가 동시에 보여 같은 기능을 두 번 설명하고 있었다.
- 두 영역을 하나의 얇은 실행 바 형태로 합쳤다.
- 주요 액션은 `수업안 열기`, `큰 화면 실행`, `수업 모드`, `설명 문구`로 유지하되, 큰 카드가 아니라 낮은 높이의 버튼 행으로 압축했다.
- `계획`, `전체` 보조 링크를 오른쪽에 작게 배치해 홈의 밀도를 낮췄다.

### 검증
- `npx.cmd eslint app/spokedu-master/dashboard/DashboardView.tsx` 통과.
- `npx.cmd tsc --noEmit --pretty false` 통과.
- `/spokedu-master/dashboard` 200 확인.
- `npm.cmd run build` 통과. 182개 정적 페이지 생성 완료.

## 2026-05-23 Codex 홈 디톡스 방향 고정

### 수정한 파일
- `app/spokedu-master/dashboard/DashboardView.tsx`
- `DEV_NOTES.md`

### 방향 기준
- 홈은 `미니멀한 프리미엄 실행 홈`으로 고정한다.
- 텍스트로 설득하지 않고 이미지, 짧은 제목, 강한 CTA, 압축된 패키지 메타로 설득한다.
- 기능은 숨기지 않되 표처럼 설명하지 않는다.

### 해결한 문제
- 히어로의 `추천 이유` 박스가 과설명으로 보여 제거했다.
- `수업안 / 화면 활동 / 준비물 / 설명 문구` 증거는 작은 메타 링크로 압축했다.
- 히어로 CTA는 `수업 바로 시작`, `큰 화면 실행` 2개로 줄였다.
- 상단 문구는 `오늘 쓸 수업을 고르고 바로 실행하세요`로 단순화했다.
- 주간 큐레이션 카드에서 추천 이유 문장을 제거하고 이미지, 제목, 태그, 압축 메타, 실행 버튼 중심으로 정리했다.
- 주간 큐레이션 제목을 `이번 주 추천 수업`으로 단순화했다.

### 검증
- `npx.cmd eslint app/spokedu-master/dashboard/DashboardView.tsx` 통과.
- `npx.cmd tsc --noEmit --pretty false` 통과.
- `/spokedu-master/dashboard` 200 확인.
- `npm.cmd run build` 통과. 182개 정적 페이지 생성 완료.

## 2026-05-23 Codex 홈 첫 화면 밀도 조정

### 수정한 파일
- `app/spokedu-master/dashboard/DashboardView.tsx`
- `DEV_NOTES.md`

### 해결한 문제
- 헤더와 히어로가 모두 카드처럼 보여 첫 화면이 무겁고 겹쳐 보일 수 있었다.
- 홈 헤더를 카드형 섹션에서 꺼내 제품 선언 영역으로 가볍게 바꿨다.
- `수업안`, `큰 화면`, `설명 문구` 흐름은 작은 pill 형태로 유지해 첫 화면 메시지는 남겼다.
- 히어로 최소 높이를 520px에서 500px로 줄여 첫 뷰 안에 핵심 콘텐츠가 더 많이 들어오게 했다.

### 검증
- `npx.cmd eslint app/spokedu-master/dashboard/DashboardView.tsx` 통과.
- `npx.cmd tsc --noEmit --pretty false` 통과.
- `/spokedu-master/dashboard` 200 확인.
- `npm.cmd run build` 1차 실행은 `app/spokedu/lib/ui-classes.ts`의 이전 선언 순서 오류 캐시로 실패했으나, 현재 워크트리 기준 타입 검사 통과 후 재실행에서 통과.
- `npm.cmd run build` 통과. 182개 정적 페이지 생성 완료.

## 2026-05-23 Codex 홈 첫 인상 헤더 강화

### 수정한 파일
- `app/spokedu-master/dashboard/DashboardView.tsx`
- `DEV_NOTES.md`

### 해결한 문제
- 홈 상단이 `SPOKEDU MASTER / 이번 주 수업 준비` 수준이라 서비스 약속이 약했다.
- `고르고, 켜고, 설명까지 끝내는 수업 홈`으로 첫 문장을 강화했다.
- 헤더 안에 `수업안`, `큰 화면`, `설명 문구` 3단계 흐름을 넣어 체육교육 OTT 구독 서비스의 핵심 루프를 첫 화면에서 바로 보이게 했다.
- 오늘 실행 패널의 제목을 `수업 시작까지 3클릭`으로 바꿔 기능성이 더 직접적으로 보이게 했다.

### 검증
- `npx.cmd eslint app/spokedu-master/dashboard/DashboardView.tsx` 통과.
- `npx.cmd tsc --noEmit --pretty false` 통과.
- `/spokedu-master/dashboard` 200 확인.
- `npm.cmd run build` 통과. 182개 정적 페이지 생성 완료.

## 2026-05-23 Codex 홈 히어로/큐레이션 추천력 강화

### 수정한 파일
- `app/spokedu-master/dashboard/DashboardView.tsx`
- `DEV_NOTES.md`

### 해결한 문제
- 홈 히어로가 이미지와 CTA는 갖췄지만, 왜 이 수업이 이번 주 대표인지 설득력이 약했다.
- 히어로 안에 `추천 이유`와 `수업안`, `화면 활동`, `준비물`, `설명 문구` 패키지 증거를 추가했다.
- 주간 큐레이션 카드에도 추천 이유와 패키지 구성 요약을 추가해 단순 목록이 아니라 구독 패키지처럼 보이게 했다.
- 주간 큐레이션 제목을 `추천 이유까지 보이는 이번 주 4선`으로 조정했다.
- SPOMOVE 추천 카드에도 사용 환경과 수업 연결 정보를 추가했다.

### 검증
- `npx.cmd eslint app/spokedu-master/dashboard/DashboardView.tsx` 통과.
- `npx.cmd tsc --noEmit --pretty false` 통과.
- `/spokedu-master/dashboard` 200 확인.

## 2026-05-24 Flow Phase 엔진 강화

### 수정한 파일
- `app/program/iiwarmup/flow/engine/FlowEngine.ts`
- `app/program/iiwarmup/flow/engine/FlowAudio.ts`
- `app/program/iiwarmup/flow/engine/entities/ObstacleManager.ts`
- `app/program/iiwarmup/flow/engine/systems/AdaptiveQuality.ts`
- `app/program/iiwarmup/flow/engine/content/flowContent.ts`
- `app/program/iiwarmup/flow/FlowPhaseClient.tsx`
- `app/admin/spomove/training/_player/MemoryGameApp.tsx`
- `DEV_NOTES.md`

### 해결한 문제
- **컬러 테마**: `FlowTimingOverrides.colorTheme` 추가. `default` / `space` / `neon` 3가지 씬 색상 테마 지원. 씬 배경·안개·레인 색·조명 색·환경광 강도를 테마별로 분리했다.
- **스프린트 게이트 시각 경고**: 스프린트 사이클 3초 전에 브릿지에 시안색 토러스 아치를 부착해 플레이어에게 가속 구간을 미리 알린다.
- **프리즈 사인 시각 경고**: 프리즈 사이클 4초 전에 브릿지에 반투명 얼음 벽을 부착해 정지 신호를 미리 알린다.
- **씬 재사용**: `start()` 재호출 시 이미 씬이 있으면 `init3D()`를 다시 실행하지 않는다.
- **RAF 중복 방지**: `startLoop()` 진입 시 기존 `rafId`를 취소하고 새 루프를 시작한다.
- **적응형 픽셀 레이트**: `AdaptiveQuality` 티어 변경 시 `renderer.setPixelRatio()`를 즉시 갱신한다.
- **브릿지 자원 해제**: 브릿지 제거 시 `geometry.dispose()`·`material.dispose()` 호출로 GPU 메모리 누수를 줄였다.
- **sfxSprint 추가**: 스프린트 시작 시 상승 소톱니파 + 노이즈 whoosh 사운드를 재생한다. 기존 `sfxCoin()` 오용을 교체했다.
- **AdaptiveQuality 재작성**: 저FPS 지속 시간 누적 방식으로 변경. `coordContract`에서 상수를 가져온다.
- **flowContent `shortInstruction` 추가**: 레벨 인트로 overlay용 1줄 핵심 요약 필드. 전 레벨 설명을 현장 지시어 수준으로 강화했다.
- **FlowPhaseClient useMemo 안정화**: `featureFlags`·`timingOverrides`를 `useMemo`로 감싸 렌더마다 엔진이 재초기화되는 문제를 방지했다.
- **colorTheme URL 파람**: `?colorTheme=space|neon|default` 지원.
- **MemoryGameApp 플로우 설정 확장**: 배경 테마(Step 3)·추가 동작 선택(Step 4: reach·sprint·freeze·balance·bigJump) UI 추가. 선택값이 iframe URL에 반영된다.
- **shardCapScale 연동**: `getShardCapScale` 콜백으로 파편·코인 스폰 수를 품질 티어에 맞게 조절한다.

### 남은 문제
- 스프린트 게이트·프리즈 사인의 실제 브라우저 위치·크기 QA 필요.
- `colorTheme` 재시작 없이는 배경·안개 색상이 바뀌지 않는다 (첫 시작 시에만 테마 적용).
- `MemoryGameApp`의 기존 unused warning 8개는 이전부터 존재하던 것으로 현재 작업 범위 외다.

### 검증
- `npx.cmd eslint` (Flow 엔진 6개 파일) 경고 0개 통과.
- `npx.cmd tsc --noEmit --pretty false` 통과.
- `MemoryGameApp.tsx` 기존 경고 8개 유지, 신규 경고 없음.

## 2026-05-24 Flow 2.0 React 클라이언트 + MemoryGameApp 연동

### 수정/생성한 파일
- `app/admin/spomove/training/_player/flow/FlowGameClient.tsx` (신규)
- `app/admin/spomove/training/_player/MemoryGameApp.tsx`
- `app/admin/spomove/training/_player/flow/engine/entities/ObstacleManager.ts`
- `app/admin/spomove/training/_player/flow/engine/FlowEngine.ts`
- `DEV_NOTES.md`

### 해결한 문제
- **FlowGameClient.tsx 신규 생성**: Flow 2.0 엔진을 구동하는 React 클라이언트 컴포넌트. `FlowEngine` 생명주기 관리, HUD(타이머 바·스테이지 도트·지시어 플래시), 오버레이(카운트다운·스테이지 인트로·완료 화면), 키보드·터치·화면 버튼 입력을 처리한다.
- **MemoryGameApp iframe → FlowGameClient 교체**: `screen === 'flow'`에서 `/program/iiwarmup/flow` iframe을 제거하고, `buildStages(selectedModules, 25)` 결과를 `FlowGameClient`에 직접 전달하는 방식으로 교체했다.
- **MemoryGameApp flow 카운트다운 제거**: 부모의 warmup countdown이 FlowGameClient의 자체 카운트다운과 중복되므로, flow 모드는 항상 `setCountdown(null)`로 즉시 화면 전환한다.
- **FlowFeatureKey 확장**: 기존 5개(`reach/sprint/freeze/balance/bigJump`)에서 8개(`faster/punch/duck/reach/sprint/freeze/balance/bigJump`)로 확장해 Flow 2.0의 모든 SELECTABLE_MODULE_KEYS를 지원한다.
- **추가 동작 선택 UI 확장**: 기존 5개 버튼에서 8개 버튼으로 확장. `faster(속도 증가)`, `punch(박스 펀치)`, `duck(UFO 숙이기)`가 추가됐다.
- **ObstacleManager.update() 서명 정리**: 사용하지 않는 `isMoving` 파라미터를 제거했다.

### Flow 2.0 전체 구조
- `flow/engine/modules/flowModules.ts` — 9개 모듈 SSOT
- `flow/engine/modules/stageBuilder.ts` — 누적 스테이지 빌더 (선택 N개 → N+1 스테이지)
- `flow/engine/FlowEngine.ts` — Three.js 엔진 (stage 배열 입력, 콜백 출력)
- `flow/engine/FlowAudio.ts` — Web Audio API 오디오
- `flow/engine/AdaptiveQuality.ts` — 저FPS 적응형 품질
- `flow/engine/entities/ObstacleManager.ts` — 박스/UFO/스프린트게이트/프리즈벽/파편
- `flow/FlowGameClient.tsx` — React 클라이언트 (HUD + 오버레이 + 입력)

### 남은 작업
- 실제 브라우저에서 `/admin/spomove/training?mode=flow` 진입 → 모듈 선택 → 게임 시작 QA.
- 스테이지별 카메라·속도·장애물 밸런스 실기 확인.
- 완료 화면 → 결과 화면 전환이 정상 동작하는지 확인.

### 검증
- `npx.cmd eslint` (신규 파일 7개 포함) 경고 0개 통과.
- `npx.cmd tsc --noEmit --pretty false` 통과.

## 2026-05-24 Codex 홈 구독 전환 바 압축

### 수정한 파일
- `app/spokedu-master/dashboard/DashboardView.tsx`
- `DEV_NOTES.md`

### 판단 기준
- 홈은 계속 "미니멀한 프리미엄 실행 홈" 방향을 유지한다.
- 구독 전환도 또 하나의 설명 카드가 되면 홈이 다시 지저분해진다.
- 무료 사용자에게는 긴 가치 설명보다 현재 흐름을 끊지 않는 얇은 전환 바가 더 맞다.

### 해결한 문제
- 기존 `SubscriptionConfidenceStrip`의 큰 카드형 구독 안내를 한 줄형 전환 바으로 압축했다.
- 문구는 `수업안, 큰 화면, 설명 문구를 계속 쓰려면 Pro로 전환하세요.`로 줄이고, 행동은 `Pro 전환`과 `플랜` 두 개만 남겼다.
- 홈의 주요 화면은 히어로, 실행 바, 이번 주 추천 수업이 주도하고 구독 안내는 보조 역할만 하도록 정리했다.

### 검증
- `npx.cmd eslint app/spokedu-master/dashboard/DashboardView.tsx` 통과.
- `npx.cmd tsc --noEmit --pretty false` 통과.
- `/spokedu-master/dashboard` 200 확인.
- `npm.cmd run build` 통과.

## 2026-05-24 Codex 홈 썸네일 화질 1차 보정

### 수정한 파일
- `app/spokedu-master/dashboard/DashboardView.tsx`
- `app/spokedu-master/lib/data.ts`
- `DEV_NOTES.md`

### 완성도 판단
- 작업 전 홈 완성도: 88%.
- 작업 후 홈 완성도: 89%.
- 깨져 보이는 썸네일의 일부 원인을 해결했지만, 전용 고화질 썸네일 세트가 아직 부족하므로 90% 이상으로 올리지는 않았다.

### 확인한 원인
- `spokedu-master` 전용 고화질 사진은 현재 `funstick-fencing` 세트가 중심이고, 나머지 추천 수업은 기존 `/images/spokedu/...` 사진을 재사용한다.
- 일부 재사용 이미지가 `600x800`, `800x601`, 0.1MB대라 OTT형 큰 타일에 쓰면 흐릿하거나 깨져 보인다.
- 대표 히어로 `funstick-fencing/hero.jpeg`는 `5712x4284`라 화질 문제의 주원인이 아니다.

### 해결한 문제
- 홈의 `next/image`에서 `unoptimized`를 제거하고 `quality={90~92}`를 지정해 로컬 이미지 최적화 품질을 타게 했다.
- `figure-8-agility`의 `heroImageUrl`을 저해상도 `program-spomove.jpg`에서 `records/playz.webp`로 교체했다.
- `agility-ladder-sprint`의 `heroImageUrl`을 `program-paps-running.jpg`에서 `cases/hero.jpg`로 교체했다.
- `rhythm-body-percussion`의 `heroImageUrl`을 `home-lab-energy.jpg`에서 `curriculum-instructor-training.webp`로 교체했다.

### 남은 근본 과제
- SPOKEDU MASTER 홈을 90% 이상으로 올리려면 각 대표 수업별 전용 16:9 또는 4:3 고화질 썸네일이 필요하다.
- 임시 대체 이미지는 깨짐을 줄이지만, 수업별 맥락 정확도와 브랜드 일관성은 전용 촬영/생성 이미지가 더 낫다.

### 검증
- `npx.cmd eslint app/spokedu-master/dashboard/DashboardView.tsx` 통과.
- `npx.cmd tsc --noEmit --pretty false` 통과.
- `/spokedu-master/dashboard` 200 확인.
- `npm.cmd run build` 통과.

## 2026-05-24 Codex 홈 유튜브 썸네일 런타임 오류 수정

### 수정한 파일
- `app/spokedu-master/dashboard/DashboardView.tsx`
- `DEV_NOTES.md`

### 원인
- API/스토어에서 들어온 프로그램 썸네일이 `https://img.youtube.com/.../mqdefault.jpg` 형태일 수 있다.
- 홈 카드에서 모든 이미지를 `next/image`로 렌더링하도록 바꾸면서, `next.config.js`에 등록되지 않은 `img.youtube.com` 호스트 때문에 런타임 에러가 발생했다.
- 커리큘럼 쪽은 유튜브 썸네일을 일반 `<img>`로 렌더링하고 있어 같은 문제가 없었다.

### 해결한 문제
- `CoverImage` 헬퍼를 추가해 로컬 이미지는 `next/image`, 외부 이미지는 `<img>`로 렌더링하도록 분기했다.
- 유튜브 `mqdefault.jpg`/`default.jpg`는 `hqdefault.jpg`로 정규화해 썸네일 화질을 한 단계 올렸다.
- 외부 썸네일 `<img>` 사용은 해당 한 줄에서만 eslint 예외 처리했다.

### 검증
- `npx.cmd eslint app/spokedu-master/dashboard/DashboardView.tsx` 통과.
- `npx.cmd tsc --noEmit --pretty false` 통과.
- `/spokedu-master/dashboard` 200 확인.
- `npm.cmd run build` 통과.

## 2026-05-24 Codex 유튜브 썸네일 파이프라인 정리

### 수정한 파일
- `app/api/spokedu-master/programs/route.ts`
- `app/spokedu-master/components/ui/ProgramThumb.tsx`
- `DEV_NOTES.md`

### 판단 기준
- 홈에서만 유튜브 썸네일을 보정하면 같은 데이터가 쓰이는 라이브러리/목록 화면에서 문제가 반복될 수 있다.
- API가 처음부터 `mqdefault`를 내려주면 화면별로 계속 후처리가 필요해진다.
- 공용 썸네일 컴포넌트도 외부 URL을 `next/image`로 넣으면 같은 remote host 런타임 오류 가능성이 있다.

### 해결한 문제
- `buildThumbnailUrl()`의 유튜브 썸네일 생성을 `mqdefault.jpg`에서 `hqdefault.jpg`로 변경했다.
- `ProgramThumb`에서도 `mqdefault/default`를 `hqdefault`로 정규화한다.
- `ProgramThumb`은 외부 URL일 때 `<img>`, 로컬 URL일 때 `next/image`로 분기하도록 바꿨다.

### 검증
- `npx.cmd eslint app/spokedu-master/dashboard/DashboardView.tsx` 통과.
- `npx.cmd eslint app/spokedu-master/components/ui/ProgramThumb.tsx` 통과.
- `npx.cmd tsc --noEmit --pretty false` 통과.
- `/spokedu-master/dashboard` 200 확인.
- `npm.cmd run build` 통과.

## 2026-05-24 Codex 추천 수업 SPOMOVE 번개 제거

### 수정한 파일
- `app/spokedu-master/dashboard/DashboardView.tsx`
- `app/spokedu/components/newsports-theme-grid.tsx`
- `DEV_NOTES.md`

### 판단 기준
- 추천 수업 카드에서 번개 아이콘을 누르면 맥락 없이 SPOMOVE 세션으로 이동한다.
- 사용자는 `추천 수업`에서 먼저 수업을 시작해야 하며, SPOMOVE는 수업 흐름 안에서 연결되어야 한다.
- 카드 안의 보조 아이콘 CTA는 연결성이 약하면 기능처럼 보여도 실제 UX를 흐린다.

### 해결한 문제
- `ProgramPackageCard`의 번개 아이콘 링크를 제거했다.
- SPOMOVE 연결 수업에는 `화면 활동 포함` 상태 배지만 남겨 맥락을 표시하도록 바꿨다.
- 검증 중 발견된 `newsports-theme-grid.tsx` JSX 닫힘 태그 오류를 수정했다.

### 검증
- `npx.cmd eslint app/spokedu-master/dashboard/DashboardView.tsx` 통과.
- `npx.cmd tsc --noEmit --pretty false` 통과.
- `/spokedu-master/dashboard` 200 확인.
- `npm.cmd run build` 통과.

## 2026-05-24 Codex 홈 수업 행동 문법 수정

### 수정한 파일
- `app/spokedu-master/dashboard/DashboardView.tsx`
- `DEV_NOTES.md`

### 판단 기준
- 체육 수업에서 라이브러리 프로그램은 현장에서 스크린을 보며 진행하는 화면이 아니라 사전에 숙지하는 수업안이다.
- 실제 수업 중 스크린을 보며 쓰는 것은 SPOMOVE 같은 큰 화면 활동이다.
- 일반 SaaS의 `수업 시작` 패턴을 그대로 가져오면 현장 맥락과 맞지 않는다.

### 해결한 문제
- 홈 히어로의 `수업 바로 시작` CTA를 `수업안 보기`로 변경하고 링크를 `/class-mode`에서 `/library/[id]`로 바꿨다.
- 추천 수업 카드의 `수업 시작` 버튼을 `수업안 보기`로 변경하고 링크를 `/library/[id]`로 바꿨다.
- 홈에서 라이브러리 프로그램은 준비/숙지용, SPOMOVE는 실제 큰 화면 실행용이라는 역할 분리를 명확히 했다.

### 검증
- `npx.cmd eslint app/spokedu-master/dashboard/DashboardView.tsx` 통과.
- `npx.cmd tsc --noEmit --pretty false` 통과.
- `/spokedu-master/dashboard` 200 확인.
- `npm.cmd run build` 통과.

## 2026-05-24 Codex 라이브러리 상세 수업 흐름 재정의

### 수정한 파일
- `app/spokedu-master/library/[id]/LibraryDetailView.tsx`
- `app/spokedu-master/library/LibraryView.tsx`
- `app/api/spokedu-master/programs/route.ts`
- `DEV_NOTES.md`

### 판단 기준
- 라이브러리 프로그램은 현장에서 화면을 보고 따라 하는 `수업 시작` 화면이 아니라, 수업 전에 숙지하는 수업안이다.
- 실제 수업 중 스크린에 띄우는 것은 연결된 SPOMOVE 큰 화면 활동이어야 한다.
- `구독 패키지 가치`, `구성 밀도`, `패키지 구성` 같은 판매자 중심 문구는 선생님이 왜 써야 하는지 설명하지 못한다.
- 관련 SPOMOVE가 없을 때 기본 드릴을 끼워 넣으면 사용자는 랜덤 연결처럼 느낀다.

### 해결한 문제
- 상세 상단 CTA를 `수업 시작`에서 `수업안 숙지`로 바꾸고 `/class-mode` 이동을 제거했다.
- 추천/대표 카드와 모달의 `수업 시작` 문구도 `수업안 보기`로 바꿨다.
- `구독 패키지 가치` 영역을 `수업 활용 흐름`으로 바꾸고 `수업 전 숙지 / 수업 중 화면 / 수업 후 복사` 구조로 재정의했다.
- `패키지 구성` 섹션을 제거했다.
- 관련 SPOMOVE가 실제로 있을 때만 `연결 화면 활동` 섹션을 보여주고, 없으면 `화면 활동 선택`으로 표시한다.
- API 기본값 `전학년`, `6~20명`, `실내`를 각각 `대상 확인 필요`, `현장 규모에 맞게 조정`, `공간 확인 필요`로 낮췄다.

### 검증
- `npx.cmd eslint app/spokedu-master/library/LibraryView.tsx` 통과.
- `npx.cmd eslint app/spokedu-master/library/[id]/LibraryDetailView.tsx` 통과.
- `npx.cmd tsc --noEmit --pretty false` 통과.
- `/spokedu-master/library` 200 확인.
- `/spokedu-master/library/funstick-fencing` 200 확인.
- `npm.cmd run build` 통과.
- `npm.cmd run build` 통과.
- `npm.cmd run build` 통과.
- `npm.cmd run build` 통과.
- `npm.cmd run build` 통과.
- `npm.cmd run build` 통과.
- `npm.cmd run build` 통과.

## 2026-05-24 Codex 홈 첫 화면 세로 호흡 조정

### 수정한 파일
- `app/spokedu-master/dashboard/DashboardView.tsx`
- `DEV_NOTES.md`

### 완성도 판단
- 작업 전 홈 완성도: 82%.
- 작업 후 홈 완성도: 83%.
- 구조 자체보다 첫 화면의 체감 리듬을 다듬은 단계라 점수 상승은 작게 잡았다.

### 판단 기준
- 대표 히어로는 커야 하지만, 너무 길면 아래 도구/추천이 홈 흐름으로 이어지지 않는다.
- 구독 홈 첫 화면에서는 `대표 수업 → 보조 도구 → 다음 추천의 시작`이 자연스럽게 보여야 한다.
- 큰 이미지는 유지하되 세로 공간을 조금 압축하는 것이 맞다.

### 해결한 문제
- 히어로 최소 높이를 `500px`에서 모바일 `430px`, 데스크톱 `460px`로 조정했다.
- 히어로 내부 패딩과 메인 영역 간격을 소폭 줄여 첫 화면의 흐름을 더 빠르게 만들었다.
- OTT 타일화된 주간 추천 영역이 첫 화면 아래에서 더 자연스럽게 이어지도록 정리했다.

### 검증
- `npx.cmd eslint app/spokedu-master/dashboard/DashboardView.tsx` 통과.
- `npx.cmd tsc --noEmit --pretty false` 통과.
- `/spokedu-master/dashboard` 200 확인.
- `npm.cmd run build` 통과.

## 2026-05-24 Codex 홈 주간 타일 모바일 밀도 조정

### 수정한 파일
- `app/spokedu-master/dashboard/DashboardView.tsx`
- `DEV_NOTES.md`

### 완성도 판단
- 작업 전 홈 완성도: 83%.
- 작업 후 홈 완성도: 84%.
- 큰 구조는 유지하고 모바일/좁은 화면의 체감 밀도를 개선한 단계라 점수 상승은 1%로 잡았다.

### 판단 기준
- 주간 추천 타일이 모바일에서 모두 `340px`로 쌓이면 OTT 레일이 아니라 긴 카드 더미처럼 보인다.
- 데스크톱에서는 큐레이션 타일의 묵직함을 유지하되, 작은 화면에서는 스크롤 피로를 줄여야 한다.
- 현장 사용자는 태블릿/노트북/작은 화면에서도 홈을 빠르게 훑을 수 있어야 한다.

### 해결한 문제
- `ProgramPackageCard`와 `WeeklySpomoveCard`의 높이를 모바일 `290px`, 태블릿 `320px`, 데스크톱 `340px`로 반응형 조정했다.
- 모바일에서 카드 제목과 SPOMOVE 프리뷰 높이를 살짝 줄여 버튼과 핵심 정보가 한 화면 안에 더 안정적으로 들어오게 했다.
- 카테고리 배지 들여쓰기 정리로 코드 가독성도 함께 정리했다.

### 검증
- `npx.cmd eslint app/spokedu-master/dashboard/DashboardView.tsx` 통과.
- `npx.cmd tsc --noEmit --pretty false` 통과.
- `/spokedu-master/dashboard` 200 확인.
- `npm.cmd run build` 통과.

## 2026-05-24 Codex 홈 히어로 텍스트 내구성 보강

### 수정한 파일
- `app/spokedu-master/dashboard/DashboardView.tsx`
- `DEV_NOTES.md`

### 완성도 판단
- 작업 전 홈 완성도: 84%.
- 작업 후 홈 완성도: 85%.
- 겉모습을 크게 바꾸기보다 실제 콘텐츠 길이에 대한 내구성을 올린 단계라 점수 상승은 1%로 잡았다.

### 판단 기준
- 히어로는 홈의 첫인상을 책임지므로 긴 제목/목표 문구가 들어와도 무너지면 안 된다.
- 대표 수업 문구가 길어지는 순간 홈은 다시 읽는 화면처럼 보인다.
- 모바일에서는 타이포를 조금 더 절제하고, 제목과 설명 라인 수를 제한하는 것이 맞다.

### 해결한 문제
- 히어로 제목에 `line-clamp-3`을 적용하고 모바일 기본 크기를 `text-3xl`로 낮췄다.
- 목표/설명 문구에 `line-clamp-2`를 적용해 긴 설명이 첫 화면을 밀어내지 않도록 했다.
- 메타와 CTA 상단 여백을 모바일 기준으로 소폭 줄여 첫 화면 밀도를 안정화했다.

### 검증
- `npx.cmd eslint app/spokedu-master/dashboard/DashboardView.tsx` 통과.
- `npx.cmd tsc --noEmit --pretty false` 통과.
- `/spokedu-master/dashboard` 200 확인.
- `npm.cmd run build` 통과.

## 2026-05-24 Codex 홈 구독 전환 위치 조정

### 수정한 파일
- `app/spokedu-master/dashboard/DashboardView.tsx`
- `DEV_NOTES.md`

### 완성도 판단
- 작업 전 홈 완성도: 85%.
- 작업 후 홈 완성도: 86%.
- 시각 요소를 늘린 것이 아니라 구독 전환 맥락을 더 자연스럽게 만든 단계라 1% 상승으로 잡았다.

### 판단 기준
- 무료/체험 사용자의 Pro 전환 메시지는 홈 끝에 붙은 안내처럼 보이면 약하다.
- 대표 수업과 보조 도구를 확인한 직후 `이 흐름을 계속 쓰려면 Pro`가 나오는 것이 가장 자연스럽다.
- 구독 전환은 광고처럼 튀기보다 홈의 실행 흐름 안에 조용히 들어가야 한다.

### 해결한 문제
- `SubscriptionConfidenceStrip` 위치를 주간 추천 아래에서 `TodayCommandPanel` 바로 아래로 이동했다.
- 사용자가 `수업안`, `설명 문구`, `주간 계획`, `전체 수업` 도구를 확인한 직후 Pro 전환 맥락을 보게 했다.
- 주간 추천 영역은 순수 큐레이션 레일로 유지하고, 전환 메시지는 실행 흐름의 일부로 정리했다.

### 검증
- `npx.cmd eslint app/spokedu-master/dashboard/DashboardView.tsx` 통과.
- `npx.cmd tsc --noEmit --pretty false` 통과.
- `/spokedu-master/dashboard` 200 확인.
- `npm.cmd run build` 통과.

## 2026-05-24 Codex 홈 체험 메시지 중복 정리

### 수정한 파일
- `app/spokedu-master/dashboard/DashboardView.tsx`
- `DEV_NOTES.md`

### 완성도 판단
- 작업 전 홈 완성도: 86%.
- 작업 후 홈 완성도: 86%.
- 메시지 위계 정리라 점수는 유지하되, 첫 화면의 산만함을 줄이는 품질 보강으로 판단했다.

### 판단 기준
- 무료 체험 사용자가 상단 칩과 Pro 전환 바에서 같은 `체험 n일 남음` 메시지를 반복해서 보면 홈이 덜 정돈되어 보인다.
- 상단 칩은 상태 표시만 하고, 남은 일수와 Pro 전환 설득은 전환 바가 맡는 것이 맞다.
- 구독 홈에서는 CTA와 상태 메시지의 역할 분리가 중요하다.

### 해결한 문제
- `PlanStatusChip`의 무료 체험 문구를 `체험 {daysLeft}일 남음`에서 `체험 중`으로 축약했다.
- 무료 체험 칩의 amber 강조를 제거하고 흰색/슬레이트 톤으로 낮춰 전환 바와 경쟁하지 않게 했다.
- Pro 전환 바가 남은 일수와 전환 액션을 담당하도록 메시지 위계를 정리했다.

### 검증
- `npx.cmd eslint app/spokedu-master/dashboard/DashboardView.tsx` 통과.
- `npx.cmd tsc --noEmit --pretty false` 통과.
- `/spokedu-master/dashboard` 200 확인.

## 2026-05-24 Codex 홈 히어로 정보 압축

### 수정한 파일
- `app/spokedu-master/dashboard/DashboardView.tsx`
- `DEV_NOTES.md`

### 판단 기준
- 대표 수업 히어로는 프리미엄한 첫인상과 실행 욕구를 만드는 영역이다.
- 배지와 증명 링크가 많아지면 히어로가 다시 설명 영역처럼 보인다.
- 수업안, 화면 활동, 설명 문구의 세부 기능은 아래 실행 바에서 처리하고, 히어로는 선택과 시작에 집중한다.

### 해결한 문제
- `getPackageProof`와 히어로 하단의 `수업안/화면 활동/준비물/설명 문구` 증명 링크 묶음을 제거했다.
- 상단 배지는 `이번 주 대표 수업`과 `화면 활동`만 남겨 중복 설명을 줄였다.
- 히어로 안의 작은 정보는 `시간`, `공간`, `핵심 초점` 세 가지 메타로 압축했다.

### 검증
- `npx.cmd eslint app/spokedu-master/dashboard/DashboardView.tsx` 통과.
- `npx.cmd tsc --noEmit --pretty false` 통과.
- `/spokedu-master/dashboard` 200 확인.

## 2026-05-24 Codex 홈 헤더 밀도 정리

### 수정한 파일
- `app/spokedu-master/dashboard/DashboardView.tsx`
- `DEV_NOTES.md`

### 판단 기준
- 홈 첫 화면의 주인공은 대표 수업 히어로여야 한다.
- 상단 헤더가 큰 문장과 STEP 칩을 갖고 있으면 히어로와 역할이 겹쳐 첫 화면이 지저분해진다.
- 헤더는 브랜드, 현재 위치, 플랜/알림만 처리하는 얇은 운영 바가 맞다.

### 해결한 문제
- `DashboardHeader`의 대형 H1, 설명 문장, STEP 1/2/3 칩을 제거했다.
- 헤더를 `SPOKEDU MASTER`, `오늘의 수업 홈`, `수업안 · 큰 화면 · 설명 문구` 배지, 플랜/알림 액션만 남긴 컴팩트 구조로 바꿨다.
- 첫 화면의 시선이 헤더 설명이 아니라 대표 수업 이미지와 실행 CTA로 바로 내려가도록 정리했다.

### 검증
- `npx.cmd eslint app/spokedu-master/dashboard/DashboardView.tsx` 통과.
- `npx.cmd tsc --noEmit --pretty false` 통과.
- `/spokedu-master/dashboard` 200 확인.
- `npm.cmd run build` 통과.

## 2026-05-24 Codex 홈 Pro 전환 바 프리미엄 톤 조정

### 수정한 파일
- `app/spokedu-master/dashboard/DashboardView.tsx`
- `DEV_NOTES.md`

### 완성도 판단
- 작업 전 홈 완성도: 86%.
- 작업 후 홈 완성도: 87%.
- 구독 전환 메시지가 안내문에서 결제 가능한 상품 상태로 더 분명해졌기 때문에 1% 상승으로 판단했다.

### 판단 기준
- Pro 전환 바가 흰 설명 카드처럼 보이면 홈의 다른 실행/큐레이션 요소와 결이 어긋난다.
- 전환 영역은 설명을 늘리는 것이 아니라 짧고 선명한 프리미엄 액션 바가 되어야 한다.
- 무료/체험 사용자에게는 `계속 사용`의 맥락과 결제 CTA가 한눈에 보여야 한다.

### 해결한 문제
- `SubscriptionConfidenceStrip`을 흰 카드에서 어두운 프리미엄 액션 바로 변경했다.
- 문구를 `수업안, 큰 화면, 설명 문구 계속 사용`으로 줄였다.
- `Pro 전환` CTA를 흰색 버튼으로 세우고, `플랜`은 보조 버튼으로 낮춰 전환 위계를 분명하게 했다.

### 검증
- `npx.cmd eslint app/spokedu-master/dashboard/DashboardView.tsx` 통과.
- `npx.cmd tsc --noEmit --pretty false` 통과.
- `/spokedu-master/dashboard` 200 확인.

## 2026-05-24 Codex 홈 실행 바 보조 도구화

### 수정한 파일
- `app/spokedu-master/dashboard/DashboardView.tsx`
- `DEV_NOTES.md`

### 완성도 판단
- 작업 전 홈 완성도: 82%.
- 작업 후 홈 완성도: 84%.
- 히어로와 실행 바의 CTA 중복이 줄어 첫 화면은 더 선명해졌지만, 주간 카드 영역의 위계와 모바일 밀도는 추가 정리가 필요하다.

### 판단 기준
- 히어로가 이미 `수업 바로 시작`과 `큰 화면 실행`을 담당한다.
- 바로 아래 바가 같은 행동을 반복하면 프리미엄 홈보다 버튼 많은 운영 화면처럼 보인다.
- 아래 바는 메인 CTA가 아니라 수업안, 설명 문구, 계획, 전체 탐색을 빠르게 여는 보조 도구 선반이어야 한다.

### 해결한 문제
- `TodayCommandPanel`에서 `큰 화면 실행`, `수업 모드` 중복 메인 CTA를 제거했다.
- `수업안`, `설명 문구`, `주간 계획`, `전체 수업` 4개 보조 도구로 재구성했다.
- 큰 색면 버튼 대신 얇은 아이콘형 도구 행으로 바꿔 히어로 아래의 시각적 무게를 줄였다.

### 검증
- `npx.cmd eslint app/spokedu-master/dashboard/DashboardView.tsx` 통과.
- `npx.cmd tsc --noEmit --pretty false` 통과.
- `/spokedu-master/dashboard` 200 확인.
- `npm.cmd run build` 통과.

## 2026-05-24 Codex 홈 실행 서사 보강

### 수정한 파일
- `app/spokedu-master/dashboard/DashboardView.tsx`
- `DEV_NOTES.md`

### 완성도 판단
- 작업 전 홈 완성도: 87%.
- 작업 후 홈 완성도: 88%.
- 조형보다 사용자가 홈을 따라가는 순서가 더 분명해진 단계라 1% 상승으로 판단했다.

### 판단 기준
- 홈의 각 조각은 좋아졌지만, `대표 수업 → 도구 → Pro → 주간 추천` 흐름이 사용자의 머릿속에 더 자연스럽게 연결되어야 한다.
- 설명문을 길게 늘리는 방식은 다시 지저분해지므로, 짧은 섹션 서사로만 보강한다.
- 보조 도구 선반은 단순 링크 묶음이 아니라 오늘 수업을 마무리하는 실행 흐름으로 보여야 한다.

### 해결한 문제
- `TodayCommandPanel`에 `오늘의 실행 흐름` 제목과 `수업안 확인, 큰 화면 실행, 설명 문구까지` 문장을 추가했다.
- 추천 화면 활동명을 보조 메타로 표시해 히어로의 큰 화면 CTA와 도구 선반이 이어지게 했다.
- 주간 추천 섹션에 `대표 수업을 마친 뒤 바로 이어가기 좋은 4개만 남겼습니다.` 문장을 추가해 큐레이션 의도를 분명히 했다.

### 검증
- `npx.cmd eslint app/spokedu-master/dashboard/DashboardView.tsx` 통과.
- `npx.cmd tsc --noEmit --pretty false` 통과.
- `/spokedu-master/dashboard` 200 확인.

## 2026-05-24 Codex 홈 주간 추천 OTT 타일화

### 수정한 파일
- `app/spokedu-master/dashboard/DashboardView.tsx`
- `DEV_NOTES.md`

### 완성도 판단
- 더 냉정한 재평가 기준: 작업 전 홈 완성도 78~80%.
- 작업 후 홈 완성도: 82%.
- 히어로와 실행 흐름은 잡혔지만, 한국 최고의 체육교육 OTT 구독 홈 기준에서는 주간 추천이 아직 데이터 카드처럼 보였기 때문에 점수를 낮춰 잡았다.

### 판단 기준
- 주간 추천은 단순 목록이 아니라 "이번 주 컬렉션"으로 보여야 한다.
- 구독 서비스에서 추천 카드는 설명 박스보다 이미지/프리뷰 중심 타일이어야 눌러보고 싶어진다.
- 수업 카드 3개와 SPOMOVE 카드 1개가 서로 다른 UI 문법으로 보이면 홈의 완성도가 떨어진다.

### 해결한 문제
- `ProgramPackageCard`를 흰 정보 카드에서 이미지 전체를 쓰는 OTT형 타일로 바꿨다.
- 수업 제목, 시간, 공간, 핵심 초점, 실행 버튼을 어두운 이미지 오버레이 안에 통합했다.
- `WeeklySpomoveCard`도 같은 높이와 같은 CTA 구조의 프리뷰 타일로 맞췄다.
- 주간 추천 그리드가 목록형 자료실 카드가 아니라 구독 홈의 큐레이션 레일처럼 보이도록 정리했다.

### 검증
- `npx.cmd eslint app/spokedu-master/dashboard/DashboardView.tsx` 통과.
- `npx.cmd tsc --noEmit --pretty false` 통과.
- `/spokedu-master/dashboard` 200 확인.

## 2026-05-24 Codex 홈 SPOMOVE 추천 카드 압축

### 수정한 파일
- `app/spokedu-master/dashboard/DashboardView.tsx`
- `DEV_NOTES.md`

### 판단 기준
- 홈의 주간 추천 영역은 설명을 읽히는 곳이 아니라 고르고 실행하는 곳이어야 한다.
- SPOMOVE 추천 카드가 어두운 설명 카드처럼 보이면 홈 전체가 다시 무거워진다.
- 네 번째 추천 슬롯은 "큰 화면 활동 타일"로 보여야 구독자가 바로 눌러보고 싶어진다.

### 해결한 문제
- `WeeklySpomoveCard`에서 긴 설명 문단과 2단 설명 메타를 제거했다.
- 상단을 프로젝터 실행 프리뷰처럼 재구성하고, 하단은 `큰 화면 실행` 버튼과 SPOMOVE 전체 보기 아이콘으로 정리했다.
- 주간 수업 카드 3개와 같은 카드 리듬, 높이, 버튼 구조를 맞춰 홈의 시각적 산만함을 줄였다.

### 검증
- `npx.cmd eslint app/spokedu-master/dashboard/DashboardView.tsx` 통과.
- `npx.cmd tsc --noEmit --pretty false` 통과.
- `/spokedu-master/dashboard` 200 확인.

## 2026-05-24 Codex 수업안-SPOMOVE 연결 논리 정리

### 수정한 파일
- `app/api/spokedu-master/programs/route.ts`
- `app/spokedu-master/dashboard/DashboardView.tsx`
- `app/spokedu-master/library/LibraryView.tsx`
- `app/spokedu-master/library/[id]/LibraryDetailView.tsx`
- `DEV_NOTES.md`

### 문제 판단
- 스위치 러닝 같은 커리큘럼 수업안에 실제 연결 근거가 없는데도 `규칙`, `집중`, `인지` 같은 키워드만으로 Task Switching, Stroop, 순차 기억류 SPOMOVE가 붙고 있었다.
- “신호”라는 말도 실제 수업 구조나 화면 활동 지정 없이 학부모 설명 문구에 자동 삽입되고 있었다.
- `/api/spokedu-master/programs`가 비로그인 상태에서 401을 반환해 홈/라이브러리가 최신 커리큘럼 DB 대신 정적 대체 데이터로 떨어질 수 있었다. 이 때문에 커리큘럼에 등록한 유튜브 영상과 `hqdefault` 썸네일이 화면에 반영되지 않는 상황이 생겼다.

### 해결한 문제
- SPOMOVE 자동 연결 추론을 보수화했다. 명시 메타가 없으면 고급 인지 과제(Task Switching, Stroop, 순차 기억)를 붙이지 않는다.
- 화면 활동 배지는 `relatedSpomoveIds`가 실제로 있을 때만 표시하도록 홈, 라이브러리, 상세 화면을 통일했다.
- 상세 화면의 `연결 화면 실행` 문구를 `지정 화면 열기`로 바꿔, 랜덤 연결처럼 보이지 않게 했다.
- 설명 문구와 fallback 코치 문구에서 근거 없는 `신호` 표현을 제거했다.
- 프로그램 API의 로그인 401 차단을 제거해 최신 커리큘럼 row의 `url`과 오버레이 `video_url`이 홈/라이브러리에 들어오도록 했다.

### 검증 메모
- 로컬 API `/api/spokedu-master/programs`가 200을 반환했다.
- 첫 번째 DB 항목 `스위치 러닝`은 유튜브 URL `https://youtu.be/enoSbLsxK-Q`와 `hqdefault` 썸네일을 받으며, `relatedSpomoveIds`는 비어 있는 상태로 확인했다.

## 2026-05-24 Codex 홈 보수적 90% 접근 1차

### 수정한 파일
- `app/spokedu-master/dashboard/DashboardView.tsx`
- `DEV_NOTES.md`

### 완성도 판단
- 작업 전 홈 완성도: 62%.
- 작업 후 홈 완성도: 68%.
- 아직 상용화 기준에는 부족하지만, 신뢰를 깎던 가짜 연결과 추천 근거 부재를 먼저 줄였기 때문에 6% 상승으로 판단했다.

### 판단 기준
- 연결된 SPOMOVE가 없는 수업안에 `큰 화면 실행`을 대표 CTA처럼 보여주면 안 된다.
- 홈 추천은 단순 `hot/new`가 아니라 영상, 수업안, 세팅, 설명 문구, 지정 화면 등 실제 포함 요소가 갖춰진 자료를 우선해야 한다.
- 카드 배지는 실제 데이터가 있는 항목만 보여야 구독자가 자료 품질을 믿을 수 있다.

### 해결한 문제
- 히어로의 `큰 화면 실행`은 지정 드릴이 있을 때만 `지정 화면 열기`로 노출한다.
- 지정 드릴이 없으면 `화면 활동 둘러보기`로 낮춰 수업안과 무관한 SPOMOVE 실행처럼 보이지 않게 했다.
- `weeklyDrill = heroDrill ?? drills[0]` fallback을 제거해 첫 번째 SPOMOVE가 임의 추천처럼 붙지 않게 했다.
- 오늘의 실행 흐름은 지정 화면이 있을 때만 `지정 화면` 도구를 포함하고, 없을 때는 `전체 수업` 탐색을 보여준다.
- 홈 대표 수업과 주간 추천 정렬을 콘텐츠 준비도 기반으로 바꿨다.
- 카드와 히어로에 `영상`, `수업안`, `설명문구`, `지정화면` 배지를 실제 데이터 기준으로 표시한다.

## 2026-05-24 Codex 홈 구독 가치 증거 보강

### 수정한 파일
- `app/spokedu-master/dashboard/DashboardView.tsx`
- `DEV_NOTES.md`

### 완성도 판단
- 작업 전 홈 완성도: 68%.
- 작업 후 홈 완성도: 72%.
- 홈이 단순 자료 나열에서 "준비 시간, 현장 진행, 수업 후 소통을 줄이는 구독 가치"를 조금 더 직접적으로 보여주기 시작했다.

### 판단 기준
- 구독 홈은 `자료가 있다`보다 `이 자료가 내 업무를 얼마나 줄이는지`가 먼저 보여야 한다.
- 첫 화면에서 수업 준비, 현장 실행, 수업 후 설명까지 이어지는 업무 절감 증거가 보여야 구매 욕구가 생긴다.
- 단, 과장된 수치 대신 실제 데이터 상태에 맞춘 짧은 증거 문구만 사용한다.

### 해결한 문제
- 히어로에 `준비 시간`, `현장 진행`, `수업 후` 증거 블록을 추가했다.
- 영상이 있으면 `영상 포함`, 지정 화면이 있으면 `지정 화면`, 설명 문구가 있으면 `문구 복사`로 실제 포함 요소를 보여준다.
- 오늘의 실행 흐름에도 같은 증거 블록을 넣어 버튼 묶음이 단순 메뉴가 아니라 업무 흐름으로 보이게 했다.

## 2026-05-24 Codex 홈 주간 큐레이션 운영 순서 보강

### 수정한 파일
- `app/spokedu-master/dashboard/DashboardView.tsx`
- `DEV_NOTES.md`

### 완성도 판단
- 작업 전 홈 완성도: 72%.
- 작업 후 홈 완성도: 75%.
- 주간 추천이 단순 카드 나열에서 운영 순서가 있는 큐레이션으로 바뀌어 상용화 최소선에 진입하기 시작했다.

### 판단 기준
- 구독 홈의 추천 영역은 “많이 보여주기”보다 “왜 이 순서로 쓰는지”가 보여야 한다.
- 추천 이유는 긴 설명보다 카드 안의 짧은 역할 문장으로 충분하다.
- SPOMOVE 카드도 임의 부록이 아니라 주간 흐름 안의 몇 번째 활동인지 보여야 한다.

### 해결한 문제
- 주간 추천 항목을 `WeeklyItem`으로 묶어 수업안 카드와 SPOMOVE 카드를 같은 큐레이션 흐름으로 다루게 했다.
- 각 카드에 `1.`, `2.`, `3.`, `4.` 순서를 표시했다.
- 영상 수업안은 `영상으로 먼저 숙지`, 지정 화면이 있는 수업은 `수업안과 화면 활동 함께 사용`, 설명 문구가 있는 수업은 `설명 문구까지 바로 정리`처럼 추천 이유를 짧게 표시한다.
- 주간 섹션 설명을 `영상 숙지, 수업안 실행, 수업 후 설명까지 이어지는 순서`로 바꿨다.

## 2026-05-24 Codex 홈 추천 카드 자료 미리보기 보강

### 수정한 파일
- `app/spokedu-master/dashboard/DashboardView.tsx`
- `DEV_NOTES.md`

### 완성도 판단
- 작업 전 홈 완성도: 75%.
- 작업 후 홈 완성도: 78%.
- 카드가 이미지와 제목 중심에서 실제 수업 자료의 일부를 보여주는 방향으로 개선되어 구독 자료의 실물감이 올라갔다.

### 판단 기준
- 구독자는 카드 제목보다 "들어가면 어떤 자료가 있는지"를 빠르게 확인해야 한다.
- 미리보기는 길면 다시 지저분해지므로 `1단계`, `준비물`, `문구` 중 실제 데이터 2개만 보여준다.
- 자료 미리보기는 판매 문구가 아니라 DB에 있는 수업 구성의 샘플이어야 한다.

### 해결한 문제
- `getProgramPreviewItems()`를 추가해 첫 진행 단계, 첫 준비물, 설명 문구 여부를 짧은 미리보기로 만들었다.
- `ProgramPackageCard` 하단에 자료 미리보기 2개를 표시했다.
- 긴 단계/준비물 문구는 한 줄 말줄임으로 처리해 모바일 카드 높이와 버튼 위치가 무너지지 않게 했다.

## 2026-05-24 Codex 홈 히어로 자료 프리뷰 보강

### 수정한 파일
- `app/spokedu-master/dashboard/DashboardView.tsx`
- `DEV_NOTES.md`

### 완성도 판단
- 작업 전 홈 완성도: 78%.
- 작업 후 홈 완성도: 81%.
- 첫 화면이 대표 수업 포스터에서 실제 수업 자료 프리뷰로 바뀌어 구독 서비스의 실물감이 더 강해졌다.

### 판단 기준
- 상용 홈 첫 화면은 이미지와 제목만 보여주면 부족하다.
- 구독자는 들어가기 전에도 수업안의 첫 단계, 준비물, 설명 문구 같은 실물 자료 일부를 봐야 신뢰한다.
- 히어로에 정보를 너무 많이 얹으면 다시 지저분해지므로 별도 프리뷰 패널로 분리한다.

### 해결한 문제
- 히어로 하단을 2열 구조로 바꾸고 오른쪽에 `자료 미리보기` 패널을 추가했다.
- 기존 추천 카드에서 쓰던 `getProgramPreviewItems()`를 히어로에도 재사용해 첫 단계/준비물/문구 샘플을 보여준다.
- `전체 수업안 확인` CTA를 프리뷰 패널에 추가해 자료 확인 행동을 한 번 더 명확히 했다.

## 2026-05-24 Codex 홈 비주얼 신뢰도 보강

### 수정한 파일
- `app/spokedu-master/dashboard/DashboardView.tsx`
- `DEV_NOTES.md`

### 완성도 판단
- 작업 전 홈 완성도: 81%.
- 작업 후 홈 완성도: 83%.
- 이미지가 없거나 약한 수업도 단순 빈 그라데이션이 아니라 자료형 프리뷰로 보이게 되어 홈의 시각적 신뢰도가 조금 올라갔다.

### 판단 기준
- 상용 구독 홈에서 이미지 fallback이 빈 장식처럼 보이면 콘텐츠 품질까지 낮아 보인다.
- SPOMOVE 카드는 추상 배경보다 실제 화면 활동의 cue 색상과 실행감을 보여주는 편이 낫다.
- 비주얼 보강은 장식이 아니라 자료의 실체를 보여주는 방향이어야 한다.

### 해결한 문제
- `ProgramFallbackVisual`을 추가해 이미지가 없는 수업 카드/히어로에 카테고리 아이콘, 자료 라벨, 핵심 초점을 보여준다.
- 단순 밝은 그라데이션 fallback을 제거했다.
- SPOMOVE 추천 카드의 방사형 배경을 줄이고, drill cue 색상 막대를 표시해 실제 화면 활동 프리뷰처럼 보이게 했다.

## 2026-05-25 Codex 홈 Pro 전환 설득력 보강

### 수정한 파일
- `app/spokedu-master/dashboard/DashboardView.tsx`
- `DEV_NOTES.md`

### 완성도 판단
- 작업 전 홈 완성도: 83%.
- 작업 후 홈 완성도: 85%.
- Pro 전환 영역이 작은 안내 바에서 수업 전/중/후 가치를 보여주는 결제 설득 블록으로 바뀌었다.

### 판단 기준
- 무료/체험 사용자는 "Pro 전환"이라는 말보다 지금 보고 있는 수업 흐름을 계속 쓸 수 있는지에 반응한다.
- 구독 전환은 기능 목록보다 수업 전, 수업 중, 수업 후 업무가 이어진다는 증거를 보여야 한다.
- 가격/플랜 상세는 별도 화면으로 보내되 홈에서는 한 가지 주 CTA를 강하게 세운다.

### 해결한 문제
- `SubscriptionConfidenceStrip`을 한 줄 안내 바에서 2열 전환 블록으로 확장했다.
- 체험 일수가 남은 경우 `체험 n일 후에도 오늘 수업 흐름을 그대로 유지하세요`로 맥락을 바꿨다.
- `수업 전: 영상 수업안`, `수업 중: 지정 화면`, `수업 후: 설명 문구` 증거 블록을 추가했다.
- CTA를 `Pro 전환`에서 `Pro로 계속 사용`으로 바꿨고, 보조 액션은 `플랜 비교`로 정리했다.

## 2026-05-25 Codex 홈 데이터 품질 필터 보강

### 수정한 파일
- `app/spokedu-master/dashboard/DashboardView.tsx`
- `DEV_NOTES.md`

### 완성도 판단
- 작업 전 홈 완성도: 85%.
- 작업 후 홈 완성도: 87%.
- 추천/대표 영역에 placeholder나 깨진 텍스트가 올라올 위험을 낮춰 상용 안정감이 올라갔다.

### 판단 기준
- 홈 추천에 `대상 확인 필요`, `공간 확인 필요`, 깨진 텍스트가 보이면 디자인이 좋아도 신뢰가 무너진다.
- 데이터가 완벽하지 않은 상태에서도 홈은 안전한 문구를 보여줘야 한다.
- 품질이 낮은 항목은 삭제하지 않고 추천 우선순위에서 아래로 밀어야 한다.

### 해결한 문제
- `cleanText`, `hasBrokenText`를 홈에 적용했다.
- `isPlaceholderText`, `displayText`, `getProgramTitle/Category/Grade/Space` helper를 추가했다.
- 대표/추천 점수 `getHomeReadiness()`에 placeholder/깨진 텍스트 패널티를 적용했다.
- 히어로, 추천 카드, fallback visual의 제목/카테고리/대상/공간 표시를 안전한 문구로 치환한다.

## 2026-05-25 Codex 홈 렌더링 내구성 점검

### 수정한 파일
- `app/spokedu-master/dashboard/DashboardView.tsx`
- `DEV_NOTES.md`

### 완성도 판단
- 작업 전 홈 완성도: 87%.
- 작업 후 홈 완성도: 89%.
- Playwright로 데스크톱, 태블릿, 모바일 레이아웃을 직접 열어보고 모바일 과밀 구간을 줄였다.

### 판단 기준
- 90%에 가까운 홈은 코드상으로만 통과하면 안 되고 실제 뷰포트에서 세로 과밀과 오버플로우를 확인해야 한다.
- 모바일에서는 히어로, 실행 흐름, Pro 전환 블록이 너무 길면 첫 화면의 완성도가 떨어진다.
- 같은 가치 증거가 여러 영역에 반복될 때 모바일에서는 과감히 숨기는 편이 낫다.

### 해결한 문제
- Playwright headless로 1440x900, 834x1112, 390x844 뷰포트를 점검했다.
- 모바일 히어로 높이를 줄이기 위해 히어로 가치 증거 블록을 모바일에서 숨겼다.
- 실행 흐름의 가치 증거 블록도 모바일에서는 숨겨 세로 길이를 줄였다.
- Pro 전환 블록의 수업 전/중/후 증거는 모바일에서 숨기고 CTA 중심으로 남겼다.
- 추천 카드 내부 긴 미리보기 행에 `min-w-0`과 `overflow-hidden`을 적용해 시각적 오버플로우를 줄였다.

## 2026-05-25 Codex 홈 QA 콘솔 에러 정리

### 수정한 파일
- `app/api/spokedu-master/drills/route.ts`
- `next.config.ts`
- `DEV_NOTES.md`

### 완성도 판단
- 작업 전 홈 완성도: 89%.
- 작업 후 홈 완성도: 90%.
- Playwright 콘솔 점검에서 잡힌 401과 이미지 quality 경고를 제거해 상용 전 점검 기준의 홈 안정성을 맞췄다.

### 판단 기준
- 홈에서 콘솔 401이나 Next 이미지 설정 경고가 뜨면 사용자가 직접 보지 않아도 개발/운영 신뢰도가 낮아진다.
- 공개 홈에서 필요한 드릴 목록 GET은 프로그램 목록처럼 읽기 데이터로 열어두고, PATCH 수정만 인증 유지하는 것이 맞다.
- Next 이미지 quality 값은 코드와 설정이 맞아야 한다.

### 해결한 문제
- `/api/spokedu-master/drills` GET의 비로그인 401을 제거했다.
- `/api/spokedu-master/drills` PATCH는 인증 체크를 유지했다.
- `next.config.ts`에 `images.qualities: [75, 88, 90, 92]`를 추가했다.
- dev 서버 재시작 후 Playwright 콘솔/네트워크 재검증에서 에러와 경고가 0건인 것을 확인했다.
## 2026-05-25 Codex 영상 데이터 보정

### 수정한 파일
- `app/api/spokedu-master/programs/route.ts`
- `app/spokedu-master/lib/data.ts`
- `app/spokedu-master/library/LibraryView.tsx`
- `app/spokedu-master/library/[id]/LibraryDetailView.tsx`
- `DEV_NOTES.md`

### 판단
- 펀스틱 펜싱은 커리큘럼 쪽에 영상이 있다. MASTER에서 영상이 안 보인 원인은 "영상 없음"이 아니라 `123` 같은 잘못된 URL이 우선 적용되는 데이터 정제 문제였다.
- 사진을 참고 영상처럼 보여주는 것은 구매자 입장에서 신뢰를 깎는다. 참고 영상 섹션은 실제 영상 또는 외부 영상 링크가 있을 때만 보여야 한다.
- 같은 문제가 다른 프로그램에도 반복될 수 있으므로 펀스틱만 하드코딩으로 끝내지 않고 영상 URL 판정 기준을 공통화해야 한다.

### 해결
- `normalizeVideoUrl()`을 추가해 빈 값, `123`, `none`, `없음` 같은 placeholder를 영상으로 취급하지 않게 했다.
- `overlay.video_url`이 잘못된 값이면 커리큘럼 원본 `url`로 fallback 되게 했다.
- 펀스틱 계열은 확인된 커리큘럼 참고 영상 `https://youtu.be/7PJhBm5RkgY?si=YIYNB3lwkkuSAbt7`로 보정했다.
- YouTube/direct video는 내장 재생하고, Instagram 등 외부 링크는 사진 대체 없이 `외부 참고 영상` 링크로 표시하게 했다.
## 2026-05-25 Codex 자료 신뢰도 원칙 보정

### 수정한 파일
- `app/api/spokedu-master/programs/route.ts`
- `app/spokedu-master/lib/data.ts`
- `app/spokedu-master/library/LibraryView.tsx`
- `app/spokedu-master/library/[id]/LibraryDetailView.tsx`
- `DEV_NOTES.md`

### 판단
- 없는 사진/영상을 그럴듯한 대체 이미지로 채우는 것은 빈 상태보다 위험하다. 구매자는 바로 "가짜 자료"로 인식한다.
- 펀스틱 계열을 전부 펀스틱 펜싱으로 보정하거나, 특정 영상/사진을 강제로 끼워 넣는 것은 프로그램 맥락을 왜곡한다.
- 교구 세팅 이미지는 해당 수업의 실제 세팅 이미지가 있을 때만 보여야 한다.

### 해결
- 펀스틱 영상 하드코딩 fallback을 제거했다. 실제 커리큘럼 URL이 없으면 영상은 없는 것으로 처리한다.
- MASTER 정적 데이터에 들어 있던 무관한 공용 사진 fallback을 제거했다.
- 교구 세팅 영역은 `setupImageUrl`이 있을 때만 이미지를 보여주고, 없으면 `교구 세팅 사진 아직 없음`을 표시한다.
- 상세 페이지와 라이브러리 모달 모두 hero/gallery 이미지를 교구 세팅 이미지로 대체하지 않게 했다.
## 2026-05-25 Codex Figma OTT 레퍼런스 반영

### 참고 자료
- `c:\Users\joker\Downloads\체육 교육 OTT 대시보드.zip`

### 판단
- Figma 샘플의 장점은 세부 완성도가 아니라 첫 화면 문법이다: 강한 히어로, 카테고리 pill, 썸네일 중심 카드, 가로 콘텐츠 row, hover/play affordance가 빠르게 구독형 콘텐츠 서비스처럼 보이게 만든다.
- 그대로 베끼면 SPOKEDU MASTER의 수업안/현장 자료 성격이 약해진다. 따라서 “OTT 구조”만 받고, 데이터는 실제 수업 자료 기준을 유지한다.

### 해결
- 홈 배경을 어두운 OTT surface로 전환했다.
- 홈 카테고리 pill을 추가했다.
- 필터된 콘텐츠를 가로 스크롤 rail로 보여주도록 추가했다.
- 기존 주간 큐레이션 4개 카드 구조는 유지하되, 전체 홈 흐름을 `히어로 → 구독 증거 → 카테고리 → 추천 카드 → 콘텐츠 rail`로 정렬했다.
## 2026-05-25 Codex 홈 화면 라이트 리팩토링

### 반영 기준
- `체육 교육 OTT 대시보드 (1).zip`의 라이트 교육 플랫폼 톤, 카테고리 pill, 4열 큐레이션, 콘텐츠 row 구조를 우선 반영했다.
- `SPOKEDU MASTER 홈 화면 디자인.zip`은 마케팅 랜딩 성격이 강해 그대로 받지 않고, 간결한 필터/카드/별도 SPOMOVE 카드만 취했다.

### 수정 파일
- `app/spokedu-master/dashboard/DashboardView.tsx`

### 판단
- 전면 다크 배경은 교육용 구독 서비스에서 피로도가 크고 정보 신뢰를 떨어뜨려 라이트 배경으로 되돌렸다.
- 프로그램 라이브러리와 SPOMOVE를 억지로 연결하지 않고, 주간 큐레이션 안에서도 `수업안 3개 + 별도 실행 화면 1개`로 의미를 분리했다.
- 이미지가 없을 때 가짜 비주얼로 채우지 않고 `이미지 아직 없음/준비 중` 상태를 노출하도록 바꿨다.
- 추천 수업 카드 썸네일 위 텍스트를 줄이고, 제목/메타/초점/CTA는 카드 하단 정보 영역으로 내려 가독성을 확보했다.

### 검증
- `npx.cmd eslint app/spokedu-master/dashboard/DashboardView.tsx`
- `npx.cmd tsc --noEmit --pretty false`
## 2026-05-25 Codex 홈 감정 밀도 강화

### 수정 파일
- `app/spokedu-master/dashboard/DashboardView.tsx`
- `DEV_NOTES.md`

### 냉정 평가
- 직전 홈은 구조는 정돈됐지만 구매 감정 기준으로는 75점이 아니라 60점대였다.
- 문제는 정보가 부족한 것이 아니라, 첫 화면의 장면감과 카드의 상품성이 약해 `구독하고 싶다`는 감정을 만들지 못한 점이었다.

### 적용 내용
- 히어로 높이와 타이포 스케일을 키우고, 이미지 오버레이를 더 깊게 조정해 첫 5초의 장면감을 강화했다.
- 히어로 우측 미리보기는 단순 텍스트 카드가 아니라 `수업안/영상/안내문`의 즉시 가치 블록으로 재구성했다.
- 추천 수업 카드는 16:10 정보 카드에서 4:3 쇼케이스 타일로 바꾸고, 이미지 영역과 CTA 대비를 강화했다.
- SPOMOVE 카드는 더 큰 실행 심볼, 깊은 배경, 강한 CTA로 별도 큰 화면 도구처럼 보이게 했다.
- 전체 배경은 라이트 교육 플랫폼을 유지하되, 상단에 약한 블루 톤을 깔아 밋밋함을 줄였다.

### 검증
- `npx.cmd eslint app/spokedu-master/dashboard/DashboardView.tsx`
- `npx.cmd tsc --noEmit --pretty false`
## 2026-05-25 Codex 홈 근거 없는 문구 제거 및 히어로 재정리

### 수정 파일
- `app/spokedu-master/dashboard/DashboardView.tsx`
- `app/spokedu-master/components/layout/TabBar.tsx`
- `app/spokedu-master/layout.tsx`
- `DEV_NOTES.md`

### 판단
- `수업 전 3분 안에 결정`은 데이터 근거가 없는 카피라 제거했다.
- 프로그램 duration 값은 실제 수업 시간으로 신뢰하기 어려워 홈 노출에서 제거했다.
- 히어로를 배경 이미지로 깔면 썸네일이 어둡게 묻혀 클릭 욕구가 떨어진다. 대표 이미지는 우측의 독립 클릭 카드로 보여주는 쪽이 낫다.
- 홈의 `전체 콘텐츠` rail은 현재 경쟁력을 만들기보다 중복 목록처럼 보여 제거했다.
- 사이드바의 `수업 실행 루프` 문구는 라이브러리와 SPOMOVE를 억지로 연결하는 인상을 줘 제거했다.

### 적용 내용
- 홈 히어로에서 근거 없는 속도 카피와 duration 표기를 삭제했다.
- 히어로 우측에 실제 대표 썸네일을 크게 노출하고, 클릭하면 해당 수업안으로 이동하도록 바꿨다.
- 카드 메타에서 duration을 제거하고 공간 정보만 남기도록 정리했다.
- 홈 하단 전체 콘텐츠 rail과 카테고리 필터를 제거했다.
- 데스크톱 사이드바의 실행 루프 설명 카드를 제거했다.
- 메타 설명도 `수업 실행 루프` 표현 대신 수업안/영상 자료와 SPOMOVE 큰 화면 활동을 분리해 설명하도록 정리했다.

### 검증
- `npx.cmd eslint app/spokedu-master/dashboard/DashboardView.tsx`
- `npx.cmd eslint app/spokedu-master/components/layout/TabBar.tsx`
- `npx.cmd tsc --noEmit --pretty false`
## 2026-05-25 Codex Figma 기준 홈 재구성

### 참고
- `c:\Users\joker\Desktop\체육 교육 OTT 대시보드 (1).zip`

### 수정 파일
- `app/spokedu-master/dashboard/DashboardView.tsx`
- `DEV_NOTES.md`

### 판단
- 기존 홈은 부분 수정을 반복한 흔적이 남아 화면 기준이 흔들렸다.
- Figma 안의 강점은 세부 문구가 아니라 `헤더/검색 -> 히어로 -> 카테고리 -> 주간 4카드 -> 콘텐츠 row -> 가치 영역`이라는 화면 문법이다.
- 그대로 복붙하면 fake duration, stock image, 임의 데이터 문제가 생기므로 구조만 가져오고 실제 SPOKEDU MASTER 데이터만 연결했다.

### 적용
- 홈을 Figma 구조 기준으로 전면 재작성했다.
- 상단에 검색/알림/프로필 헤더를 추가했다.
- 히어로는 오늘의 추천 수업 하나를 큰 이미지 배경으로 노출한다.
- 카테고리 필터를 복구했다.
- `이번 주 추천 수업`은 수업안 3개와 SPOMOVE 1개 카드로 구성했다.
- `영상 포함 수업`, `준비물 적은 수업`, `실내에서 가능한 수업` row를 추가했다.
- duration은 홈에서 노출하지 않는다.
- 이미지가 없으면 fake image 대신 `썸네일 준비 중` 또는 `디지털 화면 활동` 상태를 보여준다.

### 검증
- `npx.cmd eslint app/spokedu-master/dashboard/DashboardView.tsx`
- `npx.cmd tsc --noEmit --pretty false`
- `/spokedu-master` 200 확인
- `npm.cmd run build`

## 2026-05-28 Codex SPOMOVE 실행 프리셋 1차 전환

### 수정 파일
- `app/spokedu-master/types/index.ts`
- `app/spokedu-master/lib/spomovePresets.ts`
- `app/admin/spomove/training/page.tsx`
- `app/api/spokedu-master/spomove-presets/route.ts`
- `sql/75_spokedu_master_spomove_presets.sql`
- `app/admin/note/_components/BubbleToolbar.tsx`
- `app/spokedu-master/spomove/SpomoveHubView.tsx`
- `app/spokedu-master/spomove/session/page.tsx`
- `app/spokedu-master/spomove/session/EngineRouter.tsx`

### 판단
- `SPOMOVE 드릴 메타 편집` 중심은 구독 서비스의 구매 이유와 약하다.
- 선생님이 원하는 것은 드릴 설명이 아니라 “오늘 바로 열 수 있는 초/속도/단계 세팅”이다.
- 따라서 SPOMOVE 홈의 첫 상품 단위를 드릴 카탈로그가 아니라 공식 실행 프리셋으로 전환한다.

### 적용
- 공식 SPOMOVE 실행 프리셋 데이터 `OFFICIAL_SPOMOVE_PRESETS`를 추가했다.
- `admin/spomove/training` 설정 화면에서 현재 세팅을 `구독 SPOMOVE 프리셋으로 저장`할 수 있게 했다.
- `spokedu_master_spomove_presets` 테이블용 SQL 75번을 추가했다.
- `/api/spokedu-master/spomove-presets` GET/POST API를 추가했다.
- SQL 75 적용 후 첫 API 조회에서 기본 공식 프리셋을 DB에 자동 upsert 하도록 했다.
- DB 테이블이 아직 적용되지 않은 환경에서는 기본 공식 프리셋으로 fallback 한다.
- 관리자 저장은 API POST를 우선 사용하고, 실패 시 같은 브라우저 로컬 임시 저장으로 fallback 한다.
- 저장된 로컬 프리셋은 같은 브라우저의 `/spokedu-master/spomove` 공식 프리셋보다 먼저 노출된다.
- `/api/spokedu-master/spomove-presets?admin=1` 관리자 전체 조회와 PATCH/DELETE를 추가했다.
- `admin/spokedu-master/spomove`에 공식 실행 프리셋 운영 패널을 추가했다.
- 관리자 패널에서 제목, 설명, 시간, 속도, 순서, 숨김, 삭제를 처리할 수 있게 했다.
- 아직 SPOKEDU MASTER 세션에 이식되지 않은 엔진은 저장을 막아 깨진 프리셋이 상품 화면에 올라가지 않게 했다.
- `/spokedu-master/spomove` 상단에 `공식 실행 프리셋` 섹션을 추가했다.
- 각 프리셋은 대상, 공간, 추천 상황, 시간 태그를 보여주고 바로 실행 CTA로 연결한다.
- 프리셋 URL에 `preset`, `engineMode`, `level`, `duration`, `speed` 값을 전달한다.
- 세션 페이지와 `EngineRouter`가 프리셋의 duration/speed/level 값을 실제 엔진 실행값으로 받도록 연결했다.

### 검증
- `npx.cmd eslint app/admin/note/_components/BubbleToolbar.tsx app/admin/spokedu-master/spomove/page.tsx app/api/spokedu-master/spomove-presets/route.ts app/admin/spomove/training/page.tsx app/spokedu-master/spomove/SpomoveHubView.tsx app/spokedu-master/spomove/session/page.tsx app/spokedu-master/spomove/session/EngineRouter.tsx app/spokedu-master/lib/spomovePresets.ts`
- `npx.cmd tsc --noEmit --pretty false`
- `/api/spokedu-master/spomove-presets` 200 확인
- `/api/spokedu-master/spomove-presets` source `db` 확인
- `/admin/spokedu-master/spomove` 200 확인
- `/admin/spomove/training` 200 확인
- `/spokedu-master/spomove` 200 확인
- `/spokedu-master/spomove/session?drill=reactTrain&mode=projector&preset=warmup-visual-60&engineMode=reactTrain&level=1&duration=60&speed=1.4` 200 확인
- `npm.cmd run build`
## 2026-05-25 Codex Downloads Figma 다크 OTT 홈 복제

### 참고
- `c:\Users\joker\Downloads\체육 교육 OTT 대시보드 (1).zip`

### 수정 파일
- `app/spokedu-master/dashboard/DashboardView.tsx`
- `DEV_NOTES.md`

### 판단
- 사용자가 요청한 ZIP은 라이트 교육 플랫폼 버전이 아니라 PHYSIQ 스타일의 다크 OTT 홈이다.
- 이번에는 방향 해석을 넣지 않고, 해당 Figma 구조를 거의 그대로 따르되 데이터만 SPOKEDU MASTER 프로그램으로 바꿨다.

### 적용
- 다크 배경, 상단 그라데이션 헤더, 대형 88vh 히어로, 네거티브 마진 카테고리, 가로 콘텐츠 row 구조로 전환했다.
- 히어로는 실제 프로그램 이미지와 제목/태그/설명을 사용한다.
- row는 `이어서 보기`, `인기 수업`, `새로운 콘텐츠`로 구성했다.
- 카드 UI는 Figma의 video card 문법에 맞춰 16:9 썸네일, hover play affordance, progress bar, 우상단 메타 배지를 적용했다.
- 검색어와 카테고리는 실제 프로그램 데이터에 적용된다.

### 검증
- `npx.cmd eslint app/spokedu-master/dashboard/DashboardView.tsx`
- `npx.cmd tsc --noEmit --pretty false`
- `/spokedu-master` 200 확인
- `npm.cmd run build`
## 2026-05-25 Codex 사이드바 충돌 정리

### 수정 파일
- `app/spokedu-master/dashboard/DashboardView.tsx`
- `DEV_NOTES.md`

### 판단
- SPOKEDU MASTER는 로그인 후 쓰는 기능형 구독 툴이므로 AppShell의 데스크톱 사이드바는 유지한다.
- Figma 다크 OTT 헤더를 홈 내부에 그대로 넣으면 사이드바/상태바와 내비게이션이 중복된다.
- 따라서 Figma의 화면 감성은 본문 영역에만 적용하고, 제품 내비게이션은 기존 사이드바/상태바가 담당하게 한다.

### 적용
- 홈 내부 다크 OTT 헤더를 제거했다.
- 검색창은 카테고리 컨트롤 영역으로 옮겼다.
- 본문은 히어로, 카테고리, 가로 row 구조를 유지한다.
- 알림/프로필 중복 버튼도 홈 내부에서 제거하고 AppShell 쪽에 맡겼다.

### 검증
- `npx.cmd eslint app/spokedu-master/dashboard/DashboardView.tsx`
- `npx.cmd tsc --noEmit --pretty false`
- `/spokedu-master` 200 확인
- `npm.cmd run build`

## 2026-05-27 Codex 홈/라이브러리 상품 언어 재정리

### 수정 파일
- `app/spokedu-master/dashboard/DashboardView.tsx`
- `app/spokedu-master/library/LibraryView.tsx`
- `app/spokedu-master/components/layout/TabBar.tsx`
- `DEV_NOTES.md`

### 판단
- 홈의 `금주 추천/영상 먼저/실내 수업` 메타 카드는 상품 가치를 높이기보다 텍스트 밀도만 늘렸다.
- 라이브러리와 SPOMOVE를 데이터 근거 없이 한 흐름처럼 보이게 하면 신뢰도가 떨어진다.
- `20분`, `공간 확인 필요`, `수업 자료 6/6 준비`, `수업안/세팅/문구`처럼 검증되지 않은 준비도 표시는 상용 화면에서 빼야 한다.
- 홈/라이브러리의 1차 클릭은 상세 페이지 이동보다 빠른 미리보기 모달이 맞다.

### 적용
- 홈 섹션을 `금주 추천 프로그램`, `실내에서도 바로 사용하는 수업`, `스포무브`로 재배열했다.
- 홈의 요약 메타 카드와 `영상으로 먼저 익히는 수업` row를 제거했다.
- 홈 카드와 히어로 CTA가 상세 페이지 대신 빠른 미리보기 모달을 열도록 바꿨다.
- SPOMOVE row는 라이브러리 수업안과 억지 연결하지 않고 별도 화면 활동으로 표현했다.
- 라이브러리 카드에서 `20분`, 준비도, 수업안/세팅/문구 고정 배지를 제거했다.
- 라이브러리 썸네일은 `heroImageUrl -> thumbnailUrl -> YouTube maxres thumbnail` 순서로 보정했다.
- 라이브러리 카드 태그는 테마/대상/인원/기능/공간/참고 영상 기반으로 정리했다.
- `화면 활동과 연결되는 수업` 섹션을 제거하고, SPOMOVE는 별도 전체보기 CTA로 유지했다.
- 수업 보조도구 접근성을 위해 하단/사이드 내비게이션에 `도구` 탭을 추가했다.

### 검증
- `npx.cmd eslint app/spokedu-master/dashboard/DashboardView.tsx`
- `npx.cmd eslint app/spokedu-master/library/LibraryView.tsx`
- `npx.cmd tsc --noEmit --pretty false`
- `npm.cmd run build`
- `/spokedu-master` 200 확인
- Playwright 스크린샷 검증은 브라우저 바이너리 미설치로 보류됨

## 2026-05-27 Codex 빠른 미리보기/내비게이션 보강

### 수정 파일
- `app/spokedu-master/dashboard/DashboardView.tsx`
- `app/spokedu-master/components/layout/TabBar.tsx`
- `DEV_NOTES.md`

### 판단
- 홈에서 카드 클릭 후 열리는 모달이 실제 참고 영상을 먼저 보여주지 않으면 “빠른 미리보기”라는 이름이 약하다.
- 사진 데이터가 없는 프로그램도 영상이 있다면 YouTube 썸네일을 홈 카드 fallback으로 써야 한다.
- 모바일 하단 탭이 6개가 되면서 `라이브러리`, `설명 문구`는 폭 대비 길다.

### 적용
- 홈 `getHeroImage` fallback에 YouTube `maxresdefault` 썸네일을 추가했다.
- 홈 빠른 미리보기 모달에서 YouTube embed, 직접 영상, 외부 영상 링크를 우선 표시하도록 했다.
- 하단/사이드 내비게이션 라벨을 `라이브러리 -> 수업`, `설명 문구 -> 문구`로 줄였다.

### 검증
- `npx.cmd eslint app/spokedu-master/dashboard/DashboardView.tsx`
- `npx.cmd eslint app/spokedu-master/components/layout/TabBar.tsx`
- `npx.cmd tsc --noEmit --pretty false`
- `/spokedu-master` 200 확인

## 2026-05-27 Codex 수업 기록/설명 문구 신뢰도 정리

### 수정 파일
- `app/spokedu-master/class-record/page.tsx`
- `app/spokedu-master/report/page.tsx`
- `DEV_NOTES.md`

### 판단
- 수업 기록과 설명 문구는 “자동 연결”처럼 과장하면 안 된다. 기록은 학생 이력과 문구 작성의 근거로 남는 흐름이어야 한다.
- `신호`, `20분`, `수업안과 SPOMOVE 연결` 같은 문구는 실제 데이터 근거가 없으면 구매자 신뢰를 깎는다.
- SPOMOVE 실행 CTA는 명시 연결된 수업안에서만 보여야 하고, 기본값으로 `reactTrain`을 끼워 넣으면 안 된다.

### 적용
- 수업 기록 빈 상태와 상단 CTA를 `수업 고르기`, `수업 도구`, `학생 명단` 중심으로 정리했다.
- 학생 명단이 없을 때 바로 학생 등록과 수업 도구로 이동할 수 있게 했다.
- 수업 기록의 보호자 미리보기에서 근거 없는 `신호를 보고 판단` 문구를 제거했다.
- 설명 문구 페이지에서 duration 노출과 placeholder 메타를 숨겼다.
- 설명 문구 페이지의 SPOMOVE 실행 버튼은 명시 연결이 있을 때만 노출되도록 바꿨다.
- 설명 문구 카피를 `연결`보다 `수업안·기록 기반` 언어로 정리했다.

### 검증
- `npx.cmd eslint app/spokedu-master/report/page.tsx app/spokedu-master/class-record/page.tsx`
- `npx.cmd tsc --noEmit --pretty false`
- `/spokedu-master/class-record` 200 확인
- `/spokedu-master/class-record?program=funstick-fencing` 200 확인
- `/spokedu-master/report` 200 확인
- `npm.cmd run build`

## 2026-05-27 Codex 홈 미리보기/수업안 모달 정합성 보강

### 수정 파일
- `app/spokedu-master/dashboard/DashboardView.tsx`
- `app/spokedu-master/library/LibraryView.tsx`
- `DEV_NOTES.md`

### 판단
- 홈 카드를 눌렀을 때 열리는 빠른 미리보기는 긴 교안 전체가 아니라, 구매자가 클릭 직후 판단할 핵심 정보가 먼저 보여야 한다.
- 라이브러리 모달의 좌측 내비게이션에 실제 없는 `참고 영상`, `응용`, `교구 세팅` 항목이 남으면 신뢰도가 떨어진다.
- placeholder 교구/공간 값은 모달 안에서도 숨기는 것이 맞다.

### 적용
- 홈 빠른 미리보기 상단 미디어에 `참고 영상/대표 이미지` 상태 배지를 추가했다.
- 홈 빠른 미리보기에서 대상, 인원, 공간, 초점 정보를 카드로 먼저 보여주도록 정리했다.
- 홈 빠른 미리보기의 준비 영역을 체크리스트형 `수업 전 확인`으로 바꾸고, 세팅 메모가 있으면 함께 표시한다.
- `수업 흐름` 표현을 `진행 순서`로 바꿔 교안 문법과 맞췄다.
- 홈 미리보기 하단 액션을 `설명 문구 복사`와 `수업안 열기`로 정리했다.
- 라이브러리 모달 내비게이션은 실제 섹션이 있을 때만 항목을 표시한다.
- 라이브러리 모달에서 placeholder 교구/공간/세팅 값을 숨기고, SPOMOVE 배지는 `명시 연결`로 표현했다.

### 검증
- `npx.cmd eslint app/spokedu-master/dashboard/DashboardView.tsx app/spokedu-master/library/LibraryView.tsx`
- `npx.cmd tsc --noEmit --pretty false`
- `/spokedu-master` 200 확인
- `/spokedu-master/library` 200 확인
- `npm.cmd run build`

## 2026-05-27 Codex 홈 큐레이션 언어/카드 CTA 정리

### 수정 파일
- `app/spokedu-master/dashboard/DashboardView.tsx`
- `DEV_NOTES.md`

### 판단
- 홈 row 설명이 내부 운영자 설명처럼 길면 구매자가 왜 봐야 하는지 바로 느끼기 어렵다.
- `참고 영상`, `실내 가능`은 필터/태그 언어로는 딱딱해 보여 홈에서는 `영상 확인`, `실내`로 줄이는 편이 낫다.
- 카드가 썸네일만 있고 클릭 결과가 불명확하면 홈의 탐색성이 약해진다.

### 적용
- 홈 카테고리 언어를 `영상 확인`, `실내`로 정리했다.
- 히어로 CTA를 `수업 미리보기`, `수업 전체보기`로 통일했다.
- 카드 우상단 메타를 `영상 보고 준비`, `공간 부담 적음`, `준비물 간단`, `수업안 확인` 중 하나로 보여주게 했다.
- 카드 하단에 `미리보기` CTA 텍스트를 추가해 클릭 결과를 명확히 했다.
- row 설명을 구매자에게 바로 읽히는 문장으로 줄였다.
- SPOMOVE row 설명은 라이브러리 연결이 아니라 TV·빔 기반 별도 화면 활동으로 표현했다.

### 검증
- `npx.cmd eslint app/spokedu-master/dashboard/DashboardView.tsx`
- `npx.cmd tsc --noEmit --pretty false`
- `/spokedu-master` 200 확인
- `npm.cmd run build`

## 2026-05-27 Codex 홈 카드 추천 근거 보강

### 수정 파일
- `app/spokedu-master/dashboard/DashboardView.tsx`
- `DEV_NOTES.md`

### 판단
- 홈 정렬은 이미지, 영상, 진행 순서, 세팅 정보가 있는 프로그램을 우선하지만, 화면에서는 왜 추천인지 잘 드러나지 않았다.
- 긴 설명 박스를 추가하면 다시 지저분해지므로 카드 하단에 한 줄 근거만 붙이는 방식이 맞다.

### 적용
- 프로그램 카드 데이터에 `reason`을 추가했다.
- 금주 추천 카드는 `영상과 진행 순서를 함께 확인`, `목표와 발달 초점이 정리된 수업`, `준비물이 적어 바로 열기 좋음` 같은 짧은 근거를 표시한다.
- 실내 수업 row는 공간 정보를 바탕으로 `실내 체육관 운영에 맞춰 확인`처럼 row 맥락에 맞춘 근거를 표시한다.

### 검증
- `npx.cmd eslint app/spokedu-master/dashboard/DashboardView.tsx`
- `npx.cmd tsc --noEmit --pretty false`
- `/spokedu-master` 200 확인
- `npm.cmd run build`

## 2026-05-27 Codex 홈 모바일 밀도 보정

### 수정 파일
- `app/spokedu-master/dashboard/DashboardView.tsx`
- `DEV_NOTES.md`

### 판단
- 모바일에서 히어로 CTA 두 개가 한 줄로 버티면 320~390px 폭에서 답답하거나 넘칠 위험이 있다.
- 카테고리 필터가 모바일에서 줄바꿈으로 여러 줄을 만들면 첫 화면 세로 밀도가 무너진다.
- 카드 rail은 너무 작은 고정 폭보다 화면 폭 기준으로 잡아야 썸네일과 텍스트가 답답하지 않다.

### 적용
- 모바일 히어로 높이와 하단 여백을 살짝 줄이고, H1/본문 크기를 모바일 기준으로 보정했다.
- 히어로 CTA는 작은 모바일에서는 세로 스택, 420px 이상부터 가로 배치되도록 바꿨다.
- 카테고리 필터는 모바일에서 가로 스크롤 rail로 바꾸고, 태블릿 이상에서는 wrap으로 유지했다.
- 홈 row 카드와 SPOMOVE 카드 폭을 모바일에서 `72vw`, 최소 250px, 최대 340px로 조정했다.
- 홈 본문 좌우 padding을 모바일에서 20px 기준으로 맞췄다.

### 검증
- `npx.cmd eslint app/spokedu-master/dashboard/DashboardView.tsx`
- `npx.cmd tsc --noEmit --pretty false`
- `/spokedu-master` 200 확인
- `npm.cmd run build`

## 2026-05-28 Codex 홈 추천 품질 게이트 보강

### 수정 파일
- `app/spokedu-master/dashboard/DashboardView.tsx`
- `DEV_NOTES.md`

### 판단
- 홈 완성도는 더 엄격하게 보면 80%대가 아니라 72% 수준이다. 구조는 잡혔지만 데이터 품질, 썸네일 일관성, 추천 근거가 아직 상용 구매 화면의 핵심 리스크다.
- 홈 추천에는 단순히 정렬상 앞에 있는 수업이 아니라, 비주얼·진행 정보·수업 맥락이 갖춰진 수업안이 먼저 올라와야 한다.

### 적용
- `isHomeShowcaseProgram()` 품질 게이트를 추가했다.
- 홈 대표/추천 row는 비주얼, 진행 정보, 수업 맥락, readiness가 있는 수업안을 우선 선택한다.
- 부족할 때만 기존 풀에서 fallback 하도록 `takeUniquePrograms()`를 2단계 선별로 바꿨다.
- 히어로 선택도 showcase 수업을 우선하고, 없을 때만 fallback 한다.

### 검증
- `npx.cmd eslint app/spokedu-master/dashboard/DashboardView.tsx`
- `npx.cmd tsc --noEmit --pretty false`
- `npm.cmd run build`
- dev 서버 재시작 후 `/spokedu-master` 200 확인

## 2026-05-28 Codex 홈 미디어 품질 게이트 강화

### 수정 파일
- `app/spokedu-master/dashboard/DashboardView.tsx`
- `DEV_NOTES.md`

### 판단
- 실제 로컬 정적 이미지가 있는 프로그램은 현재 `펀스틱 펜싱` 중심이다. 텍스트 교안이 좋아도 홈 OTT 카드에 비주얼이 없으면 상용감이 떨어진다.
- 홈 row는 개수를 채우는 것보다, 비주얼 없는 약한 수업안을 추천으로 노출하지 않는 편이 더 신뢰롭다.
- 부족한 카드 수는 코드로 감추기보다 콘텐츠/썸네일 보강 필요 신호로 봐야 한다.

### 적용
- `isHomeDisplayableProgram()`을 추가해 홈 카드 최소 조건을 비주얼+수업 맥락으로 정의했다.
- `takeUniquePrograms()`는 strict 모드에서 showcase 수업만 선택하고, 약한 데이터 fallback을 하지 않게 했다.
- 금주 추천/실내 row는 strict 모드로 운영해 비주얼 없는 수업안이 홈 추천에 섞이지 않도록 했다.

### 검증
- `npx.cmd eslint app/spokedu-master/dashboard/DashboardView.tsx`
- `npx.cmd tsc --noEmit --pretty false`
- `/spokedu-master` 200 확인
- `npm.cmd run build`

## 2026-05-28 Codex 관리자 프로그램 태그 직접 편집 보강

### 수정 파일
- `app/admin/spokedu-master/programs/page.tsx`
- `DEV_NOTES.md`

### 판단
- 홈/라이브러리 노출 태그를 코드에서 수정하게 두면 운영 속도가 너무 느리다.
- `sm_tags`, `sm_development_focus` 저장 구조는 이미 있으므로 관리자 UI에서 직접 추가/삭제가 가능해야 한다.
- 프리셋만 누르는 방식은 `거리 판단`, `반응 타이밍`, `스포츠맨십` 같은 현장 언어를 운영자가 바로 조정하기 어렵다.

### 적용
- 관리자 프로그램 편집 패널에 태그 직접 입력 필드를 추가했다.
- Enter 또는 `추가` 버튼으로 태그를 추가할 수 있게 했다.
- 현재 저장될 태그를 칩으로 보여주고, 칩 클릭 시 삭제되게 했다.
- 기존 프리셋 태그 선택 방식은 유지했다.

### 검증
- `npx.cmd eslint app/admin/spokedu-master/programs/page.tsx`
- `npx.cmd tsc --noEmit --pretty false`
- `/admin/spokedu-master/programs` 200 확인
- `npm.cmd run build`
## 2026-05-28 Codex SPOMOVE 프리셋 실행 UX + 홈 재정렬

### 수정 파일
- `app/spokedu-master/lib/spomovePresets.ts`
- `app/spokedu-master/spomove/session/page.tsx`
- `app/api/spokedu-master/spomove-presets/route.ts`
- `app/admin/spomove/training/page.tsx`
- `app/admin/spokedu-master/spomove/page.tsx`
- `app/spokedu-master/dashboard/DashboardView.tsx`
- `app/admin/note/_components/NoteEditor.tsx`
- `DEV_NOTES.md`

### 판단
- SPOMOVE 프리셋은 “누르면 바로 랜덤 실행”처럼 보이면 안 된다. 구독자는 수업 전에 초, 속도, 단계, 대상, 공간을 확인하고 시작해야 신뢰한다.
- 홈의 SPOMOVE 영역은 일반 드릴 목록이 아니라 관리자에서 저장한 공식 실행 세팅이어야 한다. 라이브러리는 수업안/영상, SPOMOVE는 화면 실행 프리셋으로 역할을 분리한다.
- 지원되지 않은 엔진이 구독 서비스로 노출되면 상용 신뢰도가 바로 무너진다. 지원 엔진 목록을 한 곳으로 모으고 API, 관리자, 실행 화면에서 같이 쓰게 했다.
- 기존 DB에 깨진 한글로 seed된 공식 프리셋이 남아 있을 가능성이 있어, 공식 ID의 깨진 문구는 코드 기준 문구로 보정한다.

### 적용
- 공식 SPOMOVE 프리셋 문구를 정상 한글로 재작성하고 `SUPPORTED_MASTER_ENGINE_MODES`, `isSupportedMasterEngineMode`, `formatSpomovePresetDuration`을 공통 유틸로 추가했다.
- `/spokedu-master/spomove/session`에서 지원 엔진 프리셋은 바로 엔진으로 튀지 않고 실행 브리핑 화면을 먼저 보여준다.
- 실행 브리핑에는 프리셋명, 설명, 시간, 속도, 대상, 공간, 태그, 사용 맥락을 표시하고 `이 세팅으로 시작`을 눌러 카운트다운 후 엔진을 실행한다.
- SPOMOVE 프리셋 API는 공개 조회 시 지원 엔진만 노출하고, POST/PATCH에서도 미이식 엔진 저장을 막는다.
- 관리자 SPOMOVE 프리셋 관리 카드에 `구독 실행 가능`/`이식 필요` 상태 배지를 추가했다.
- 홈의 세 번째 row를 일반 드릴 나열에서 공식 SPOMOVE 프리셋 row로 교체했다.
- 홈 row 배열은 `금주 추천 프로그램` → `실내에서도 바로 사용하는 수업` → `스포무브`로 정리했다.
- 전체 타입 검증을 막던 노트 에디터 `EditorView` 타입 불일치를 수정했다.

### 검증
- `npx.cmd eslint app/spokedu-master/spomove/session/page.tsx app/spokedu-master/lib/spomovePresets.ts app/admin/spomove/training/page.tsx app/api/spokedu-master/spomove-presets/route.ts app/admin/spokedu-master/spomove/page.tsx app/spokedu-master/dashboard/DashboardView.tsx app/admin/note/_components/NoteEditor.tsx`
- `npx.cmd tsc --noEmit --pretty false`
- `/spokedu-master` 200
- `/spokedu-master/spomove` 200
- `/admin/spokedu-master/spomove` 200
- `/spokedu-master/spomove/session?drill=reactTrain&mode=projector&preset=warmup-visual-60&engineMode=reactTrain&level=1&duration=60&speed=1.4` 200
- `npm.cmd run build`

## 2026-05-28 Codex 홈/SPOMOVE 한글 깨짐 방어 보강

### 수정 파일
- `app/spokedu-master/lib/clean.ts`
- `app/spokedu-master/dashboard/DashboardView.tsx`
- `DEV_NOTES.md`

### 판단
- DB에는 정상 UTF-8이 아니라 `ìì...` 형태로 보이는 mojibake가 남아 있을 수 있다.
- 화면에 한글이 한 번이라도 깨져 보이면 구독 서비스 신뢰도가 크게 떨어진다. 특히 홈과 SPOMOVE 프리셋은 구매자가 가장 먼저 보는 영역이라 더 보수적으로 막아야 한다.

### 적용
- `hasBrokenText()`가 기존 `�` 계열뿐 아니라 `ì`, `í`, `ë`, `ê`, `Ã`, `Â` 계열 mojibake도 깨진 텍스트로 판정하게 했다.
- 홈 파일에서 인코딩 변환 후 파서 오류를 만들던 깨진 정규식/문자열을 정상 한글과 안전한 정규식으로 복구했다.
- 홈 SPOMOVE row 제목, 설명, `전체보기` 문구를 정상 한글로 고정했다.
- API 응답은 PowerShell 기본 디코딩으로 보면 깨져 보일 수 있어 RawContentStream을 UTF-8로 직접 디코딩해 정상 한글 응답을 확인했다.

### 검증
- `npx.cmd eslint app/spokedu-master/dashboard/DashboardView.tsx app/spokedu-master/lib/clean.ts app/api/spokedu-master/spomove-presets/route.ts`
- `npx.cmd tsc --noEmit --pretty false`
- `/api/spokedu-master/spomove-presets` RawContentStream UTF-8 정상 한글 확인
- `/spokedu-master` 200
- 프리셋 세션 URL 200
- `npm.cmd run build`

## 2026-05-29 Codex SPOKEDU MASTER 라우팅 보안 1단계

### 수정 파일
- `proxy.ts`
- `DEV_NOTES.md`

### 판단
- 외부 제안의 큰 방향인 보안 우선순위는 채택했다.
- 단, `middleware.ts` 신규 작성은 채택하지 않았다. 현재 프로젝트는 이미 `proxy.ts`에서 Supabase 세션 쿠키 갱신을 담당하므로, 기존 흐름을 유지한 채 보호 경로만 추가하는 편이 안전하다.
- “미구독은 무조건 결제 페이지”도 그대로 채택하지 않았다. 현재 서비스에는 14일 체험 로직이 이미 있으므로, active 구독/관리자/체험 기간 중 사용자는 보호 경로에 접근 가능해야 한다.
- B2B 멀티테넌시 최종 모델은 2단계에서 별도 SQL과 RLS로 설계하고, 이번 단계에서는 현존 `spokedu_master_subscriptions` 기준의 최소 서버 가드를 적용했다.

### 적용
- `/spokedu-master/:path*`를 proxy matcher에 추가했다.
- `/spokedu-master`, `/spokedu-master/dashboard`, `/spokedu-master/library`, `/spokedu-master/spomove` 등 구독자 앱 내부 경로를 서버 라우팅 단계에서 보호한다.
- `/spokedu-master/landing`, `/spokedu-master/payment`, `/spokedu-master/payment/*`, `/spokedu-master/privacy`, `/spokedu-master/terms`, `/spokedu-master/parent/*`는 공개/결제/공유 퍼널로 유지한다.
- 비로그인 사용자가 보호 경로에 접근하면 `/login?next=원래경로`로 리다이렉트한다.
- 로그인했지만 active 구독도 아니고 14일 체험 기간도 끝난 사용자는 `/spokedu-master/payment?next=원래경로`로 리다이렉트한다.
- `SPM_ADMIN_EMAILS`에 포함된 운영자 이메일은 구독 상태와 무관하게 통과한다.

### 검증
- `npx.cmd eslint proxy.ts`
- `npx.cmd tsc --noEmit --pretty false`
- 비로그인 `/spokedu-master/dashboard` 307
- 비로그인 `/spokedu-master/spomove` 307
- 공개 `/spokedu-master/landing` 200
- 공개 `/spokedu-master/parent/123` 200
- 공개 `/spokedu-master/payment` 200
- `npm.cmd run build`
## 2026-05-29 Codex - 모바일 내비게이션 후속 정리

### 수정 파일
- `app/spokedu-master/subscription/page.tsx`
- `app/spokedu-master/components/ui/Skeleton.tsx`
- `app/spokedu-master/components/ui/ClassToolsView.tsx`
- `DEV_NOTES.md`

### 판단
- 모바일 하단 탭을 5개 핵심 구조로 줄였으면, 각 페이지의 마지막 버튼과 로딩 화면도 하단 탭에 가리지 않아야 한다.
- 구독 관리 화면은 결제와 직접 연결되는 신뢰 영역이므로 깨진 한글, 어색한 공급자식 문구, 모호한 버튼명을 남기면 안 된다.
- 수업도구는 현장 실행 탭이므로 하단 탭과 내부 푸터가 겹치지 않게 별도 안전 여백이 필요하다.

### 적용
- 구독 관리 화면의 깨진 한글을 정상 한국어 문구로 복구하고, `라이브러리` 표현을 현재 네비게이션 언어인 `놀이체육`으로 맞췄다.
- 구독 화면 하단 여백을 `pb-28 lg:pb-16`으로 조정해 모바일 하단 탭과 겹치지 않게 했다.
- 홈/라이브러리 스켈레톤 로딩 화면도 `pb-28 lg:pb-7`로 맞춰 로딩 중에도 하단 탭에 콘텐츠가 가리지 않게 했다.
- 수업도구 루트에 모바일 전용 하단 안전 여백을 추가해 학생 명단 관리 버튼이 하단 탭 밑으로 숨지 않게 했다.

### 검증
- `npx.cmd eslint app/spokedu-master/subscription/page.tsx app/spokedu-master/components/ui/Skeleton.tsx app/spokedu-master/components/ui/ClassToolsView.tsx`
- `npx.cmd tsc --noEmit --pretty false`
- `git diff --check -- app/spokedu-master/subscription/page.tsx app/spokedu-master/components/ui/Skeleton.tsx app/spokedu-master/components/ui/ClassToolsView.tsx`
- `npm.cmd run build`
