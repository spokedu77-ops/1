# DEV_NOTES

## 작업 날짜

- 2026-05-21

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
- Class101/MasterClass식 패키징: 콘텐츠를 단순 목록이 아니라 완성된 수업 패키지로 보여준다.
- Class101/MasterClass식 상세 페이지: 대표 이미지, 수업 목표, 준비물, 단계, 현장 팁, 연결 활동을 한 화면에서 확인하게 한다.
- GoNoodle/MOJO식 화면 활동: 아이들이 바로 반응하는 SPOMOVE를 독립 실행 엔진으로 보여준다.
- Peloton/Apple Fitness식 실행 CTA: `큰 화면 실행`, `모바일`, `Class Mode`처럼 실행 맥락을 분리한다.
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
- Store는 교구 판매 영역이다. 학생/수업 기록/성장 리포트와 섞으면 안 된다.
- Phase 1은 라이브러리, SPOMOVE, 수업 설명 도구, 플랜/프로필 완성도가 우선이다.
- 수업 기록, 학생 이력, 카카오, 학부모 웹뷰, 원장 대시보드는 Phase 2/3로 미룬다.
- 수정 후에는 `npx.cmd tsc --noEmit --pretty false`와 필요한 lint/build를 확인한다.
- 2026-05-21 기준 `npx.cmd eslint`, `npx.cmd tsc --noEmit --pretty false`, `npm.cmd run build` 통과를 확인했다.
