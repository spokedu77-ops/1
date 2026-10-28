# 센터관리 성능 기준선

작성일: 2026-10-29 KST. 보완 판정: CONDITIONAL APPROVAL / IMPLEMENTATION PENDING. 상태: 정적 감사 완료 / 정상 관리자 실측 불가 원인 확인 / 구현 승인 대기.

## 기준 환경과 보존

- BASE_SHA: `f9016abd8c086dbf4d36686f1cf5b36a35f620da`
- 실제 감사 대상은 HEAD 단독이 아닌 기존 dirty worktree다. `CentersClient.tsx`의 세 링크에 사용자가 추가한 `prefetch={false}`가 이미 존재한다. 이 변경을 개선 성과로 계산하면 안 된다.
- 최초 감사 시작 시 수정 28개, 미추적 7개. 이번 보완 시작 시 수정 28개, 미추적 12개(제출 문서 5개 포함). 기존 애플리케이션 파일은 수정하지 않았다. 배포, 업무 DB 쓰기, Git stage/commit/push/branch/PR 없음. 아래 정상 비밀번호 로그인 과정의 Auth 세션 발급은 업무 데이터 변경과 구분한다.
- 로컬 Next.js 16.2.11, React 19.2.3, Playwright 1.61.1(package.json 기준). dev와 production 성능을 혼합 비교하지 않는다.
- 보완 종료 시 다른 작업으로 보이는 AppShell 및 접근 게이트 관련 변경이 추가로 관찰됐다(수정 30개/미추적 15개). 이 작업은 해당 파일을 수정하지 않았다. 따라서 시작 시 수량은 현재 전체 상태와 구분하며, 향후 전후 성능 비교 시 앱 셸 변경 영향도 고정해야 한다.

## 실제 실행 결과

기본 포트 조사에서는 리스너가 보이지 않았으나, 서버 시작 시 Next가 기존 dev PID 31944 및 `http://localhost:3000`을 보고했다. 기존 프로세스를 종료하지 않고 사용했다. 제한 환경의 127.0.0.1 바인딩은 EACCES였고, 승인된 재시도에서 기존 서버를 발견했다.

로컬 Playwright Chromium으로 `/admin/centers` 진입을 실행했다. 별도 세션 없는 DOMContentLoaded까지 214ms였으나 화면은 ‘권한 확인 중’이었다. **214ms는 목록 로딩 성능값이 아니다.**

기존 `.tmp/spm-master-auth/storage-state.json`은 localhost용이지만 관리자 자격이 없었다. 토큰을 출력하거나 문서에 복사하지 않았다.

| 실제 검사 | 결과 |
|---|---|
| 저장된 인증으로 센터 목록 진입 | `/teacher/my-classes`로 이동 |
| GET `/api/auth/check-admin` | 200, `admin:false`, `reason:forbidden` |
| GET `/api/admin/settlement-sheet` | 403, `Forbidden` |
| 센터 목록/상세 정상 데이터 | 접근 불가 |
| 모달 개폐 | 현재 상세 모달 없음, N/A |

이 결과는 해당 세션의 접근 차단 증거이며, 모든 권한 조합의 QA PASS가 아니다. 공유 Playwright MCP 탐색 호출은 지연되어 로컬 설치 Playwright를 사용했다.

## 보완 감사: 인증 실패 원인 확정

정적 판정 경로는 `check-admin/route.ts` → `requireAdmin()` → `isPlatformAdminUser()` → `platformAdminIdentity.ts`다. 관리자 인정 조건은 운영진/환경 이메일 또는 users의 admin/master 역할·is_admin=true 또는 profiles의 admin/master 역할이다. URL의 type=admin이나 QA 환경변수 이름 자체는 자격을 부여하지 않는다.

| 구분 | 실제 확인 결과 | 해석 |
|---|---|---|
| 기존 저장 세션 | JWT exp `2026-10-11T19:04:18Z` (10월 12일 04:04:18 KST), 현재 만료 | stale 토큰. 만료만으로 앞선 forbidden의 원인을 설명하면 안 됨 |
| 저장 세션의 사용자 | 운영진 이메일 해당 없음, users 조회 200/빈 결과, profiles 조회 200/role=teacher | 현재 관리자 판정 조건 불충족 |
| 저장 토큰 issuer | 로컬 환경 Supabase project host와 일치 | 다른 프로젝트 토큰이라는 가설은 배제 |
| QA 자격증명 | 기존 저장 세션과 다른 사용자 | 같은 세션을 반복 시도한 것이 아님 |
| 로컬 `/login?type=admin&next=%2Fadmin%2Fcenters` 정상 로그인 | password grant HTTP 200, 화면 ‘관리자 권한이 없는 계정입니다’ | 비밀번호 인증 실패가 아니라 관리자 자격 거부 |
| QA 사용자의 현재 DB 자격 | users 200/빈 결과, profiles 200/role=teacher; 운영진/ADMIN_EMAILS 해당 없음 | 관리자 fallback 조건까지 모두 불충족 |
| 로그인 거부 후 check-admin | 200/admin=false/reason=no-session | 로그인 코드가 비관리자 계정을 거부하고 scope=local signOut한 결과 |

민감값 없는 진단은 Playwright 정상 로그인 화면 및 사용자별 id 필터를 적용한 role/is_admin 읽기 조회로 수행했다. 서비스 역할 조회는 두 계정의 자격 진단에만 사용했다. 센터 목록·상세·정산의 권한을 우회하여 측정하지 않았다. 토큰 발급용 admin.generateLink, 역할 변경, 환경 관리자 allowlist 추가, 쿠키 위조, UI 권한 캐시 주입은 수행하지 않았다.

제한 셸의 외부 요청 EACCES는 별도 환경 제약이었다. 허용된 네트워크 실행으로 역할 조회와 정상 로그인을 완료했으므로 이를 최종 측정 불가 원인으로 남기지 않는다. 브라우저 자동화와 로컬 서버는 동작한다. **현재 최종 원인은 사용 가능한 기존 저장 세션 및 QA 계정 둘 다 관리자 자격이 없다는 점이다.** 과거 사용자 브라우저의 다른 관리자 세션까지 실패한다고 주장하는 결과는 아니다.

## 정상 기준선 확보 불가와 대체 검증

현재 일반 관리자 또는 정산 master 세션을 확보하지 못했다. 따라서 목록·상세의 요청 수, Supabase 실행 수, 데이터 전송량, 서버 응답 시간, 렌더링 완료 시간은 모두 UNMEASURED다. HTTP 인증 성공 시간, 로그인 거부 시간, 정적 쿼리 경로 수를 이 지표에 대입하지 않는다.

후속 정상 측정에는 로컬 호스트에서 기존 권한을 가진 운영 계정의 정상 로그인(또는 그 계정이 직접 로그인한 로컬 브라우저 세션)이 필요하다. 현재 계정의 권한을 올려서 해결하는 안은 제외한다. 자격증명을 보고서나 채팅에 노출하지 않는다. 정산은 일반 admin과 별개로 기존 MASTER_EMAIL 조건 충족이 필요하다.

이번 단계에서 가능한 대체 검증은 아래와 같으며 실제 사용자 성능 인수 결과를 대체하지 않는다.

1. 코드 흐름과 SELECT/반환 DTO/호출 시점 대조로 조회 범위·기능 의존성 검증(실행 완료).
2. 정상 로그인 HTTP 200 후 관리자 거부 및 두 계정의 역할 읽기 확인(실행 완료). 권한 경계를 완화하지 않았다는 증거.
3. 기존 로컬 로그에 request ID별 서버 쿼리 계측이 있는지 확인하고, 없으면 서버 쿼리 수를 미측정으로 유지. 브라우저 Server Action POST 개수를 DB 쿼리 수로 환산하지 않음.
4. 승인 후 격리 fixture 환경에서 데이터 수량을 달리한 DTO 크기·렌더 추세·역순 응답 검증을 제안. mock/fixture는 합성 결과라고 별도 표기하고 운영 데이터 기준선으로 사용하지 않음. 이번에는 fixture 코드나 서버 계측 코드를 추가하지 않음.
5. 정상 세션 확보 후 아래 원래 계측 계획으로 baseline을 먼저 채움. 확보되지 않으면 PO가 미측정 상태를 인지한 채 다음 범위를 별도로 결정할 때까지 구현 PENDING.

정상 관리자 실측, populated 반응형 QA, 실제 센터 수, 실제 DB 실행계획은 모두 미완료다. 따라서 감사 문서 보완 완료와 성능 기준선 완료를 구분한다.

## 성능 지표 상태

| 지표 | 목록 | 직접 상세 | 정산 시트 |
|---|---|---|---|
| 초기 요청 수 / 중복 / 불필요 재조회 | 미측정 | 미측정 | 정상 진입 미측정 |
| Supabase 실제 쿼리 수 | 미측정 | 미측정 | 미측정 |
| JSON 및 RSC 실제 전송량 | 미측정 | 미측정 | 미측정 |
| 서버 응답 / 렌더 / 데이터 표시 시간 | 미측정 | 미측정 | 미측정 |
| 정적 업무 데이터 쿼리 경로 | centers 1개 | center 1 + teachers 1 + history 1 | months + policies + settings 3개 |

정적 개수는 브라우저 요청 수나 DB 실행계획상의 노드 수가 아니다. 각 서버 액션의 `requireAdmin()`에 Auth getUser가 있고 관리자 판별 캐시가 차가우면 users/profiles 조회도 추가될 수 있다. 레이아웃 권한 확인 요청, 개발 모드 effect 재실행, 서버 액션 직렬 처리 여부까지 실측해야 총량을 알 수 있다.

## 확인된 구조와 미확정 성능 가설

1. 목록 SELECT는 상세 전체 조회가 아니다. 그러나 상세 정규화 함수가 null/빈 배열 상세 키를 추가하여 직렬화한다.
2. 서버 필터 및 검색 debounce 350ms는 이미 존재한다. 지역 입력은 즉시 조회한다. 응답 순서 보호가 없어 오래된 응답이 최신 결과를 덮을 수 있다.
3. limit/range/cursor가 없어 필터 결과가 전부 전송된다(API 최대 행 제한에 따른 누락 가능성도 확인 필요).
4. 모바일 카드와 데스크톱 테이블을 모두 map하고 CSS로 숨긴다. 입력 상태 변경에도 부모와 양쪽 행 JSX가 다시 계산된다. 실제 렌더 시간은 미측정.
5. 목록 탭에서 캘린더 모듈을 정적 import한다. 캘린더는 조건부 마운트이므로 초기 캘린더 데이터 요청이 있다고 단정할 수 없다.
6. 상세는 편집 전부터 모든 활성 teacher/admin 선택지를 읽는다. 상세 소스는 63,637 bytes지만 이는 JS 번들 전송량이 아니다.
7. 정산 GET은 모든 월 payload와 모든 정산 정책 payload를 전송한다. `public.centers`를 선로딩하는 것은 아니다.
8. 목록 초기 effect skip ref가 있다. SSR+CSR 중복 조회가 항상 발생한다고 단정할 근거는 없다. 개발 effect 재실행은 별도 측정한다.

## 재현 가능한 후속 계측 계획

유효한 로컬 관리자 및 정산 master 세션, 운영 쓰기가 없는 데이터 환경부터 확보한다. 동일 데이터 스냅샷의 센터 수/상태별 수/히스토리 수와 환경 버전을 기록한다. 승인 전 서버 계측 코드 추가는 하지 않는다.

- 최초 cold 진입 1회와 warm 5회 이상, fresh context와 캐시 재방문을 구분한다. 첫 컴파일 비용은 별도 기록한다.
- Playwright request/response 이벤트로 method/path/status/start/end/encoded bytes를 수집하고 Server Action POST의 action 식별자를 구분한다. 민감한 요청/응답 본문은 저장하지 않는다.
- 목록 SSR은 JSON API가 아니라 HTML/RSC prop 직렬화를 포함한다. DB→서버 바이트, JSON 객체 UTF-8 크기, 브라우저 압축 전송 크기를 분리하고 이중 합산하지 않는다.
- Navigation Timing TTFB, 네트워크 완료, 실제 데이터 행 visible 후 2 RAF 시점을 각각 기록한다. 무결과 상태는 빈 상태 노출 시점으로 측정한다.
- 승인된 로컬 서버 계측에서 request ID별 Auth/권한 쿼리/업무 쿼리 수와 시간을 분리한다. 브라우저만으로 서버 Supabase 개수를 추정하지 않는다. 렌더 CPU는 로컬 브라우저 trace로 확인한다.
- 검색 타이핑·상태·지역 필터·역순 응답·저장·삭제·탭 재진입을 분리한다. 저장/삭제 검증은 로컬 테스트 데이터에서만 한다.
- 변경 후 같은 조건에서 bytes 감소율과 표시 시간 개선율을 산출한다. 50%/30%는 목표이며 현재 달성 여부는 UNKNOWN이다.

375/768/1024/1280/1440px populated QA는 관리자 접근 불가로 NOT RUN. 정적 감사는 visual PASS가 아니다.
