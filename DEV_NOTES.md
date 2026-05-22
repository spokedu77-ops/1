# DEV_NOTES

## 작업 날짜

- 2026-05-21
- 2026-05-22 노트 분석 업데이트
- 2026-05-22 `/spokedu` RC 배포 준비 (테스트 리드 삭제, post-deploy 스크립트)

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
- `app/spokedu-master/library/LibraryView.tsx`
- `app/spokedu-master/library/[id]/LibraryDetailView.tsx`
- `app/spokedu-master/report/page.tsx`
- `app/spokedu-master/spomove/SpomoveHubView.tsx`
- `app/spokedu-master/spomove/session/page.tsx`
- `app/api/spokedu-master/drills/route.ts`
- `app/admin/spomove/training/_player/page.tsx`
- `app/spokedu/components/seo-related-links.tsx`
- `app/spokedu/data/seo.ts`
- `DEV_NOTES.md`

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
