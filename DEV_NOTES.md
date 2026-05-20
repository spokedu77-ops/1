# DEV_NOTES

## 작업 날짜

- 2026-05-20

## 수정한 파일

- `app/layout.tsx`
- `app/spokedu/components/case-proof-card.tsx`
- `app/spokedu-master/dashboard/DashboardView.tsx`
- `app/spokedu-master/library/LibraryView.tsx`
- `app/spokedu-master/library/page.tsx`
- `app/spokedu-master/library/[id]/LibraryDetailView.tsx`
- `app/spokedu-master/lib/data.ts`
- `app/spokedu-master/spomove/SpomoveHubView.tsx`
- `app/spokedu-master/spomove/page.tsx`
- `app/spokedu-master/spomove/session/page.tsx`
- `app/spokedu-master/spomove/session/EngineRouter.tsx`
- `app/spokedu-master/components/ui/ClassModeView.tsx`
- `app/spokedu-master/components/ui/ProgramThumb.tsx`
- `app/spokedu-master/components/ui/BottomSheet.tsx`
- `app/spokedu-master/report/page.tsx`
- `app/spokedu-master/layout.tsx`
- `app/spokedu-master/components/layout/TabBar.tsx`
- `app/spokedu-master/components/layout/StatusBar.tsx`
- `app/spokedu-master/components/layout/AppShell.tsx`
- `app/spokedu-master/profile/page.tsx`
- `app/spokedu-master/payment/page.tsx`
- `app/spokedu-master/payment/success/page.tsx`
- `app/spokedu-master/payment/cancel/page.tsx`
- `app/spokedu-master/subscription/page.tsx`
- `app/api/spokedu-master/programs/route.ts`
- `app/api/spokedu-master/drills/route.ts`
- `app/api/spokedu-master/payment/create-checkout/route.ts`
- `DEV_NOTES.md`

## 해결한 문제

- SPOKEDU MASTER의 기준을 `라이브러리 + SPOMOVE + 수업 설명 도구 + 플랜/프로필` 중심의 구독자 플랫폼으로 재정렬했다.
- 라이브러리 원천은 `admin/curriculum`, SPOMOVE 원천은 `admin/spomove/training`으로 정리했다. MASTER에서는 데이터를 가져오되 구독 서비스용 UX와 모달로 다시 포장한다.
- 홈 화면을 관리자 대시보드처럼 보이지 않게 바꾸고, 오늘 추천 패키지, 빠른 실행, 최근 수업 흐름, 수업 보조 도구 진입을 전면에 배치했다.
- 라이브러리를 단순 목록이 아니라 수업 패키지 선택 화면으로 재구성했다. 검색, 빠른 필터, 추천, SPOMOVE 연계, 즐겨찾기, 상세 모달 흐름을 넣었다.
- 프로그램 상세 페이지를 프리미엄 수업안 구조로 다시 만들었다. 사진/썸네일, 목표, 준비물, 공간 세팅, 진행 단계, SPOMOVE 연결, 안전 체크, 변형 수업, 설명 문구가 이어진다.
- Funstick Fencing 예시의 장점을 반영했다. 실제 수업 사진, 교구가 보이는 장면, 공간 배치, 진행 단계, 수업 의도, 시각 자료가 모달과 상세 페이지의 기준이 되도록 했다.
- SPOMOVE를 라이브러리 안의 작은 카테고리가 아니라 독립 실행 엔진으로 정리했다. 큰 화면 실행, 모바일 실행, Class Mode 연결, 카테고리별 드릴 흐름을 분리했다.
- Class Mode를 수업 중 강사가 보는 화면으로 재구성했다. 전체 타이머, 단계 타이머, 진행 카드, SPOMOVE 연결, 종료 후 기록/설명 도구 동선을 유지했다.
- `수업 보조 도구`는 삭제하지 않고 Phase 1의 보조 유틸리티로 남겼다. 하단 탭이 아니라 홈/수업 흐름에서 필요할 때 진입하는 구조가 맞다.
- `/report`를 Phase 1에 맞춰 `수업 설명 도구`로 재정의했다. 카카오 자동 발송이나 학기말 리포트보다 먼저, 복사 가능한 학부모/기관/학교용 설명 문구에 집중한다.
- 결제/구독/프로필 화면의 과도한 경고와 깨진 문구를 줄이고, 불안 유발 UI보다 안심과 업그레이드 이유가 보이도록 정리했다.
- `next/font/google` 의존성을 제거했다. 외부 Google Fonts 다운로드가 막혀도 production build가 가능하도록 시스템 폰트 스택으로 바꿨다.
- 기존 `/spokedu` 쪽 `case-proof-card.tsx`의 잘못된 import 경로와 깨진 한글 라벨을 수정했다. 이 파일은 MASTER가 아니지만 전체 production build를 막고 있어서 최소 수정했다.
- `npm run build`가 최종 통과했다.

## 반영한 레퍼런스 원칙

- Netflix/Disney+/교육 OTT: 첫 화면은 탐색보다 추천과 즉시 실행이 먼저 보여야 한다. 그대로 복제하지 않고 `오늘 추천 패키지`, `큰 화면 실행`, `수업 시작`으로 번역했다.
- Class101/MasterClass: 콘텐츠는 목록이 아니라 “이 수업을 왜 해야 하는지”가 보이는 패키지여야 한다. 프로그램 모달과 상세 페이지를 수업 의도 중심으로 바꿨다.
- Peloton/Apple Fitness+: 실행 CTA가 명확해야 한다. SPOMOVE와 Class Mode에서 `큰 화면 실행`, `모바일 실행`, `Class Mode` 동선을 분리했다.
- GoNoodle/MOJO: 아이들이 바로 반응하는 화면 활동은 별도 엔진으로 보여야 한다. SPOMOVE를 독립 탭과 실행 화면으로 정리했다.
- TeamSnap/ClassDojo/MOJO: 부모 커뮤니케이션은 락인의 근거지만 Phase 1에서는 자동 발송보다 안전한 설명 문구 복사가 먼저다.
- B2B SaaS/Notion/Linear: 보조 기능은 없애지 않고 핵심 흐름을 방해하지 않는 위치에 둔다. 수업 보조 도구를 홈의 보조 카드로 남겼다.
- Base44 참고 화면: 설명, 플랜, Class Mode가 독립 축으로 보이는 점은 채택했다. 다만 디자인과 정보 구조는 SPOKEDU MASTER 기준으로 다시 잡았다.

## 남은 문제

- 실제 브라우저에서 모바일, 태블릿, 데스크탑, 16:9 프로젝터 화면을 직접 확인해야 한다. production build는 통과했지만 화면 품질 QA는 아직 남았다.
- 콘텐츠 데이터 품질이 아직 상품 수준까지 완성된 것은 아니다. 사진, 공간 배치, 준비물, 단계 설명, 안전 체크, SPOMOVE 연결, 설명 문구가 부족한 프로그램은 계속 보강해야 한다.
- 라이브러리 필터와 태그 체계는 1차 구조만 잡혔다. 실제 구독자가 빠르게 수업을 찾는 기준으로 다시 정제해야 한다.
- SPOMOVE와 라이브러리의 연결은 UX 방향이 잡혔지만, 모든 실제 데이터에 안정적으로 매핑되었는지는 추가 점검이 필요하다.
- 디자인은 아직 최종 polish 단계가 아니다. 카드 밀도, 그리드 균일성, 모달 스크롤, 하단 탭, CTA 대비, 빈 화면, 로딩 상태를 더 다듬어야 한다.
- `app/globals.css` 등 일부 기존 파일에는 깨진 주석이 남아 있을 수 있다. 사용자에게 보이는 MASTER 화면과 API 응답은 우선 방어했지만, 전체 저장소의 주석/레거시 텍스트 청소는 별도 작업이다.
- `spokedu-pro`, `subscription-new`는 기준이 아니다. 장점만 MASTER에 흡수하고 직접 작업 기준으로 삼지 않는다.

## 다음 작업 순서

1. 실제 브라우저에서 `/spokedu-master/dashboard`, `/spokedu-master/library`, `/spokedu-master/library/[id]`, `/spokedu-master/spomove`, `/spokedu-master/spomove/session`, `/spokedu-master/report`, `/spokedu-master/profile`을 모바일/태블릿/데스크탑 기준으로 QA한다.
2. 카드 크기와 그리드 균일성을 점검한다. 특히 홈과 라이브러리의 카드 높이, 이미지 비율, CTA 위치, 스크롤 길이를 맞춘다.
3. 모달 UX를 상용 수준으로 다듬는다. 닫기, 뒤로가기, CTA 고정, 긴 내용 스크롤, 모바일 하단 시트 경험을 점검한다.
4. 콘텐츠 품질 기준표를 만든다. 각 프로그램마다 대표 사진, 목표, 준비물, 공간 배치, 3~6단계 진행, 안전 체크, 변형, 설명 문구, SPOMOVE 연결이 있는지 확인한다.
5. Funstick Fencing을 기준 템플릿으로 삼아 3~5개 대표 프로그램을 같은 수준으로 채운다.
6. SPOMOVE 실행 화면의 렉, 큰 화면 비율, 버튼 크기, 전체화면 상태, 프로젝터에서의 가독성을 점검한다.
7. PWA 설치 흐름과 오프라인/저속망 대응을 점검한다.
8. Phase 2 기능인 수업 기록, 학생 이력, 센터/학교 관리자, 카카오, 학부모 웹뷰는 메인 노출을 서두르지 말고, Phase 1 핵심 완성도를 높인 뒤 다시 올린다.

## 주의할 점

- 현재 작업 기준은 오직 `SPOKEDU MASTER`다.
- 라이브러리는 `admin/curriculum`에서 데이터를 가져온다. 원본 데이터 구조를 무리하게 바꾸지 말고 MASTER에서 구독자용 UX로 정리한다.
- SPOMOVE는 `admin/spomove/training`에서 데이터를 가져온다. 라이브러리 부속 기능이 아니라 독립 차별화 엔진이다.
- Store는 교구 판매 영역이다. 학생/수업 기록과 연결된 것으로 오해하면 안 된다.
- 수업 보조 도구는 중요도가 낮아서 삭제한 것이 아니다. 핵심 구독 루프를 방해하지 않도록 보조 진입으로 둔다.
- 문서는 정답이 아니다. 해외 레퍼런스와 실제 상품 판단을 기준으로 장점만 취한다.
- Phase 1의 성공 기준은 “구독자가 오늘 수업을 더 빨리 준비하고, SPOMOVE로 더 잘 실행하고, 수업 가치를 설명할 수 있는가”다.
- 한글 깨짐은 사용자에게 보이는 MASTER 화면과 API 응답부터 막는다. 레거시 파일 전체 청소에 시간을 모두 쓰지 않는다.
- 수정 후에는 `npx tsc --noEmit --pretty false`와 `npm run build`를 우선 확인한다.
