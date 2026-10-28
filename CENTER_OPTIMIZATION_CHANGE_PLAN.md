# 센터 최적화 변경 계획 및 승인 요청

2026-10-29 KST 보완본. **CONDITIONAL APPROVAL / IMPLEMENTATION PENDING. 정상 관리자 기준선 미완료.** 이 문서는 승인된 Sprint Brief가 아니라 PO 재판정용 검토안이다.

## 제출 문서

- [기준선 및 실제 로컬 실행 결과](CENTER_PERFORMANCE_BASELINE.md)
- [쿼리 감사와 목록 계약](CENTER_QUERY_AUDIT.md)
- [상세 기능 목록 및 모달 설계](CENTER_MODAL_ARCHITECTURE.md)
- [정산 연결·단가·보존 설계](CENTER_SETTLEMENT_INTEGRATION.md)

## 순서와 예상 영향 범위

| 단계 | 제안 작업 | 예상 파일/영향 |
|---|---|---|
| P0 선행 감사 | 기존 세션/QA 계정의 관리자 자격 부재 원인 확인 완료. 정상 관리자/master 세션은 미확보. 정상 기준선 보완이 다음 선행 조건 | 진단·보고서만. 역할/allowlist 변경·검사 우회 금지 |
| P0 성능 후보 A | 별도 목록 DTO, 표시 필드 보존 projection/직렬화, 기존 필터의 응답 순서 보호 | centers/actions/centers.ts, lib/centers/types.ts, CentersClient.tsx 및 prop 타입 경계. 서버 검색·350ms debounce 재구현 없음 |
| P0 성능 후보 B | 활성 강사 선택지 조회를 편집 시작으로 이동 | CenterDetailClient.tsx. 모달과 독립 적용·검증 |
| P1 UI C | 클릭 때만 모달 코드/단건 로드, 공용 상세 재사용, 상태 유지 및 부분 반영 | centers/[id]/page.tsx, CenterDetailClient.tsx, CentersClient.tsx, 필요한 Hub 상태, 신규 모달/controller. 직접 URL 유지 |
| P1 정산 | 선택 기반 center_id 연결, 정책 preload 분리, 원본 참고 및 명시적 반영 | settlement-sheet/route.ts, SettlementSheet.tsx, settlementSheetCore.ts, 필요 시 신규 읽기 endpoint |
| P2 조건부 성능 | 실제 수량 기반 pagination, 지역 debounce, 캘린더 chunk 분리, 목록 행 memo/중복 DOM 재구성, 상세 조건부 캐시 | 각각 실제 rows/요청 빈도/trace/bytes로 이익 확인 후 범위 확정. 전부를 패키지로 구현하지 않음 |
| P2 별도 제안 | DB catalog/실행계획 기반 인덱스, 전체 월 history 지연화 | 현재 DDL/migration 변경 계획 없음. 별도 필요성·승인 요구 |

`app/spokedu-master` 제품/런타임을 수정하지 않는 관리자 범위다. 호출 추적으로 해당 제품 SSOT에 영향이 드러나면 canonical 계약을 읽고 범위 승인을 다시 확인한다. 글로벌 adminAuth/레이아웃 및 기존 정산 계산/복원 로직을 성능 명목으로 전역 변경하지 않는다. Next API 구현 전 관련 설치본 가이드를 읽는다.

## 예상 효과와 위험

목록의 빈 상세 키 제거 및 페이지 경계로 전송/렌더 비용을 줄일 수 있다. 현재 표시 연락처/시간표를 보존하므로 projection만으로 50% 감소를 보장하지 않는다. 실제 데이터가 적고 이미 빠르면 pagination/캐시 복잡성을 줄인다. 모달은 목록 유지와 접근 경험 개선이며 단독으로 DB 비용 개선을 보장하지 않는다.

주요 위험은 동명 cursor 정렬/필터 이탈 후 페이지 정확성, 늦은 응답, 모달 중첩 편집·업로드·포커스, 민감 캐시 및 권한 변경, 기존 dirty 파일 충돌, 정산 정책 ID와 운영 센터 ID 혼동, 전체 정책에 의존하는 일괄/내보내기 기능 누락이다. 각 변경은 기존 동작을 먼저 보존하고 효과를 계측한다.

## A–D 영향도 요약과 과잉 개발 제거

| 대상 | 확인 사실 / 실측 판정 | 예상 효과(추정) | 주요 회귀 |
|---|---|---|---|
| A 목록 | 범위 제한 없음·상세 모양 정규화. 실제 센터 수·전송량·느린 정도 미측정 | DTO 비용 감소; 페이지 필요성은 미확정 | 표시 연락처/시간표 제거, 페이지 누락, 검색 의미 변경 |
| B 상세/강사 | 상세는 이미 진입 후 단건 로드. 활성 강사만 편집 이전 전체 조회 | 읽기 전용 진입의 강사 선택지 조회 경로 1회 지연 가능 | 첫 편집 대기·오류, 배정값 표시/저장 |
| C 모달 | 현재 없음. 상세는 이미 목록 코드와 별도 진입. 번들 효과 미측정 | 목록 상태 유지·이동 UX, 추가 dialog 비용 가능 | 초기 JS 증가, 단건 이중 조회, 직접 URL·접근성 |
| D 정산 | 전체 정산 정책 payload 로드. 실제 병목 미측정 | 첫 화면 정책 bytes 감소 가능, 선택 요청 증가 가능 | 일괄·월 생성·export/restore·정책 ID 보존 |

변경 파일과 상세 위험은 각 도메인 문서의 A/B/C/D 표를 기준으로 한다. 위 ‘확인 사실’을 ‘실제 병목 확정’으로 읽으면 안 된다. 수치 개선 예측은 제시하지 않으며 목표와 측정 결과를 구분한다.

제거/보류한 개발 항목:

- 서버 검색 및 검색 debounce 신규 구현 제거: 기존 동작 그대로 유지.
- 기존 상세를 목록에서 분리하는 중복 작업 제거: 현재 이미 분리되어 있음.
- 사용자 prefetch=false 변경을 신규 작업/성과로 계상하지 않음.
- pagination, 모든 행 memo, 모든 상세 캐시, version 전용 endpoint를 필수 구현에서 제거. 검증 결과에 따라 P2 선택.
- 대형 캘린더 라이브러리가 초기 로드된다는 추정 제거. 현재 캘린더는 자체 구현이며 정적 import 비용만 확인 대상.
- 모달 전환과 강사 지연 로딩을 별도 작업·별도 전후 비교로 분리.
- 전체 정산 월 history 로딩 재설계를 P1 필수 범위에서 제거. 전체 정책 preload 의존성만 우선 해결.

## 설계 불변식과 마이그레이션

`/admin/centers` 목록 유지 → 센터 클릭 시 모달 → `/admin/centers/[id]` 직접 URL 유지. `/admin/master/reports`도 유지한다. public.centers는 필요 컬럼·선택 id/검색 페이지만 조회한다. 모든 기존 센터·정산 정책·개인수업·확정 월 데이터를 보존하고, 기존 정책 ID를 운영 센터 ID로 치환하지 않는다. 서버 인증 및 민감정보 조회 정책은 동일하게 유지한다.

목록 DTO/상세 UI/읽기 endpoint 분리에는 DB 마이그레이션이 필요 없다. 제안한 nullable center_id JSON 확장도 DDL은 필요 없다. 인덱스/FK/컬럼 추가나 backfill은 이번 범위에 없으며, 증거 확보 시 별도 제안한다. 운영 DB 변경·배포는 계속 금지다.

## 회귀 검증 계획

다음 항목은 현재 NOT RUN이며, 구현 승인 후 로컬 격리 데이터에서 실행한다. 실데이터 저장/삭제/업로드는 금지한다.

예외적으로 실제 완료한 검증은 기존 저장 계정의 관리자 거부, 정상 QA 비밀번호 인증 성공 후 관리자 거부, 두 계정의 현재 역할 읽기 확인뿐이다. 이는 정상 관리자/정산 master의 허용 동작이나 전체 회귀 QA 완료를 의미하지 않는다.

| 시나리오 | 관찰 기준 |
|---|---|
| 1 목록 최초 진입 | SSR 업무 조회 및 hydration 이후 중복 요청 분리, bytes/표시 시간 |
| 2 검색 | 기존 4필드 검색 의미, debounce, 역순 응답 차단 |
| 3 상태 필터 | active/paused/ended/전체, 지역 조합, page reset |
| 4 첫 상세 열기 | 클릭 전 상세 코드·데이터 없음, 선택 id만 조회 |
| 5 닫기 | 상세 unmount, list 조회 0, 포커스·스크롤 복귀 |
| 6 같은 센터 재열기 | in-flight dedupe/신선도/민감정보 폐기, 조회량 증가 없음 |
| 7 다른 센터 열기 | 이전 응답·파일·비밀번호 혼입 없음 |
| 8 상세 수정 저장 | 전체 기능 목록 동등성, 오류/취소/파일 업로드 포함 |
| 9 저장 후 목록 | 행만 갱신, 검색·필터·정렬·페이지·스크롤 보존 |
| 10 직접 URL | 새 탭/새로고침/없는 UUID/뒤로가기 정상 |
| 11 정산 센터 검색 | 최소 DTO, 정책 preload 없음, 동명 구별 |
| 12 정산 센터 선택 | 명시 center_id, 기존 policy ID/개인수업 보존 |
| 13 원본 수정 후 재조회 | 최신 참고 정보, 자동 요율/월 금액 덮기 없음 |
| 14 기존 정산 보존 | 확정 월 불변, 미확정 선택 반영, 연간/일괄/undo/저장/export/backup/restore 보존 |
| 15 권한 없는 요청 | anon/teacher/admin非master/master, 서버 액션·파일·새 endpoint 거부 경계 |

모든 UI 흐름은 375/768/1024/1280/1440px populated local QA로 확인한다. 기준선과 동일 데이터/브라우저/환경에서 초기 bytes ≥50% 감소, 표시 시간 ≥30% 개선 목표를 검증하고 중복 API/닫기 list 재조회 0 및 기능 회귀 0을 확인한다. 미달이면 실제 수치와 이유를 보고하며 PASS를 만들지 않는다.

## 승인 범위

이번 보완에서는 문서만 수정했다. 정상 관리자 기준선은 확보하지 못했으며, 원인과 대체 검증을 기준선 문서에 제출한다. 이후 PO가 승인 여부를 재판정한다. 정상 세션 확보 후 baseline을 먼저 측정하고 A/B/D 성능 작업과 C 모달 UI 작업을 구분하여 승인할 수 있다. P2는 이익이 입증된 항목만 별도 확정한다. 일반 조회/UI 변경에 DB 실행계획 확보를 무조건 작업 게이트로 삼지 않되, 인덱스 제안에는 필수 근거로 둔다.

운영 DB 변경/배포/Git 발행은 어떤 후속 코드 승인에도 자동 포함되지 않는다. 이번 ‘CONDITIONAL APPROVAL’은 코드/계측 삽입 승인으로 해석하지 않았다. 로컬 정상 로그인에 의한 Auth 세션 발급 외 사용자 역할·업무 데이터 변경은 없다.

## 요청 형식 보고

- BASE_SHA: f9016abd8c086dbf4d36686f1cf5b36a35f620da
- WORKTREE_STATUS: 기존 애플리케이션 수정 28개/미추적 7개 보존; 기존 제출 문서 5개만 보완; 애플리케이션 코드 변경 없음
- CONCURRENT_WORKTREE_CHANGES: 보완 도중 다른 작업의 AppShell/접근 게이트 변경 관찰. 종료 관찰값 수정 30개/미추적 15개(보고서 5개 포함). 해당 파일 미수정. 이후 동일 환경 비교 때 앱 셸 변경 영향 분리 필요
- INITIAL_QUERY_COUNT: UNMEASURED (정적 업무 경로 centers 1; Auth/권한/레이아웃 제외)
- INITIAL_PAYLOAD_SIZE: UNMEASURED
- INITIAL_LOAD_TIME: UNMEASURED (214ms는 권한 대기 문서 DCL이며 목록 기준값 아님)
- DETAIL_QUERY_COUNT: UNMEASURED (정적 center/teachers/history 각 1)
- DETAIL_LOAD_TIME: UNMEASURED
- CONFIRMED_BOTTLENECKS: 실제 지연 병목 미확정. 정적 확인: 범위 제한 없음, 상세 타입 정규화 전송 확장, 양쪽 반응형 DOM 생성, 편집 전 활성 강사 조회, 전체 정산 정책 preload
- OPTIMIZATION_PLAN: 정상 세션 기준선 보완 → P0 목록 DTO/기존 필터 경쟁 방어·강사 선택지 지연 → P1 모달 UI 및 정산 연결 독립 수행 → P2 계측 근거별 선택
- EXPECTED_IMPACT: 전송량 50%/초기 표시 30% 개선 목표, 달성 여부 미확정
- REGRESSION_RISKS: 기능 축소, 민감정보 캐시, 응답 경쟁, 페이지 경계, 정산 ID/요율/확정 월 보존
- PRODUCTION_MUTATION: NONE
- IMPLEMENTATION_APPROVAL: PENDING

- AUTH_FAILURE_CAUSE: 기존 저장 세션 만료 및 실제 계정 관리자 자격 부재. 별도 QA 계정은 password grant 200이나 users 없음/profiles teacher/운영진 조건 불충족으로 관리자 거부
- NORMAL_ADMIN_BASELINE: UNAVAILABLE — 정상 관리자/master 세션 미확보, 대체 검증은 성능 인수 결과로 대체하지 않음
- DB_MIGRATION_REQUIRED: NO for current proposed DTO/modal/query split/nullable JSON link; index/FK/column changes require separate evidence and approval
