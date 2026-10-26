# SPOKEDU LAB 22개 통합 결함 감사

기준: 2026-10-26, branch `main`, HEAD `9d7ab5dddde64c37f00f6081e065d6e46add95b0`. 외부 감사 주장을 가설로 두고 저장소 코드, SQL, 계약 테스트를 대조했다. Production DB·배포·Git publish는 수행하지 않았다.

> Stage 2 후속: 수업 출석·메모·완료 동시성은 `STAGE2_P0_*` 문서와 실제 로컬 PostgreSQL 9개 시나리오로 추가 검증되어 해당 데이터 유실 P0는 해결됐다. 아래 최초 22항목 표의 다른 DB/결제/브라우저 BLOCKED 판정은 그대로이며 전체 출시 판정을 바꾸지 않는다.

| Issue | 최초 주장 | 실제 판정 | 수정 여부 | 테스트 | 잔여 위험 |
|---|---|---|---|---|---|
| OLD-01 | 포커스 복귀가 미저장 수업 입력을 덮음 | NOT_REPRODUCED | No | PASS(정적+계약) | 실제 다중 브라우저 DB E2E는 BLOCKED |
| OLD-02 | 학생 보관이 과거 기록을 삭제 | CONDITIONAL | No | BLOCKED(DB) | 멤버십은 삭제되나 출석/관찰 snapshot은 유지; 복원 UI 없음 |
| OLD-03 | 동명이인 붙여넣기 자동 제거 | CONFIRMED | Yes | PASS | 서버 통합 DB 검증은 BLOCKED |
| OLD-04 | 학생 중복 제출 | NOT_REPRODUCED | No | PASS(코드) | 서로 다른 임의 키를 쓰는 두 탭은 별도 학생으로 의도상 구분됨 |
| OLD-05 | 환불 운영 기능 부재 | CONFIRMED | No | PASS(증거 확인) | P0 출시 차단 후보 |
| OLD-06 | 회원 목록 캐시가 강제 갱신을 막음 | CONFIRMED | Yes | PASS(정적/타입 대상) | 브라우저 E2E 미실행 |
| OLD-07 | 전체 수업 기록이 1,000행 이후 누락 | CONDITIONAL | No | BLOCKED(DB) | 명시적 range/cursor가 없어 Supabase 행 제한 의존 |
| OLD-08 | 학생 대량 등록이 순차 호출 | CONFIRMED | No | BLOCKED(성능 DB) | 50명은 50회 요청; 부분성공 표시는 존재 |
| OLD-09 | SPOMOVE JSONB 동시 저장 유실 | CONDITIONAL | No | BLOCKED(DB) | 관리자 전체 pack upsert 경로에 버전 충돌 계약 없음 |
| OLD-10 | 관리자 콘텐츠 상태 로직 중복 | DESIGN_DEBT | No | PASS(정적) | draft 공유를 피하려고 광범위 공통화 보류 |
| OLD-11 | 관리자/구독자 미리보기 불일치 | CONDITIONAL | No | BLOCKED(렌더) | 서로 다른 렌더 컴포넌트; 동일 fixture 시각 비교 필요 |
| OLD-12 | 즐겨찾기 에셋 팩 중복 조회 | CONDITIONAL | No | BLOCKED(네트워크 계측) | 화면 진입마다 직접 조회 경로 존재 |
| NEW-01 | 정적 프리셋 번들이 초기 번들 비대화 | CONDITIONAL | No | BLOCKED(번들 분석) | `officialSpomovePresets.ts` 82,611 bytes이며 여러 client surface가 정적 import |
| NEW-02 | 토너먼트 새로고침 시 진행 유실 | CONFIRMED | No | PASS(코드 재현) | 로컬/서버 복원 없음 |
| NEW-03 | 타이머가 실제 시간/오디오 차단에 취약 | NOT_REPRODUCED | No | PASS(코드) | iOS/Android 실제 기기 오디오는 BLOCKED |
| NEW-04 | 사다리 모바일 사용 불가 | NOT_REPRODUCED | No | BLOCKED(렌더) | 56px/인원 min-width와 가로 스크롤 존재; 실제 기기 QA 필요 |
| NEW-05 | 팀 분배가 불균등 | FALSE_POSITIVE | No | PASS | 2~4팀으로 정규화하는 제품 제한은 유지 |
| NEW-06 | 공개 퍼널 API 남용 가능 | CONDITIONAL | No | PASS(계약) | allowlist/길이/서버 키는 있으나 명시적 IP rate limit 없음 |
| NEW-07 | 즐겨찾기 레거시 분기 불필요 | FALSE_POSITIVE | No | PASS(마이그레이션) | hardening 마이그레이션 적용 여부를 운영 DB에서 확인 전 제거 금지 |
| NEW-08 | 내비게이션 활성/이탈 가드 오류 | NOT_REPRODUCED | No | PASS(정적) | 브라우저 조합 E2E는 BLOCKED |
| NEW-09 | Repomix 누락이 제품 결함 | FALSE_POSITIVE | No | PASS(저장소 직접 감사) | 원본 추출 XML 미제공으로 추출 원인 자체는 BLOCKED |
| NEW-10 | 통합 권한/기능 회귀 | NOT_REPRODUCED | No | PASS(대상 테스트) | 전체 DB·모바일·결제 E2E는 BLOCKED |

## 핵심 근거

- OLD-01: `OperationalDataProvider` soft reload는 서버 snapshot만 갱신한다. 편집기는 `useSessionDraft`, `useSessionAttendance`, `SessionCapturePanel`에서 별도 draft/dirty ref를 갖고 dirty 또는 저장 중에는 provider 갱신을 재적용하지 않는다. 캡처 저장은 `capture_version`과 RPC row lock, API 409를 사용한다.
- OLD-02: `spokedu_master_soft_delete_student`는 `spokedu_master_class_students`만 제거하고 학생에 `deleted_at`을 설정한다. 완료 수업의 attendance 및 class-record child는 snapshot 이름을 보유한다. 다만 명시적 restore RPC/UI가 없어 복원 가능성은 검증 완료가 아니다.
- OLD-03: `parseRosterPaste`의 이름 기반 `Set`이 두 번째 김민준을 제거했고, UI choice 역시 이름을 key로 사용했다. 두 곳 모두 행 단위로 수정했다.
- OLD-04: 생성 UI는 draft별 UUID를 `legacyId`로 재사용하고 API는 `(owner_id, legacy_id)`로 조회하며 DB unique index가 최종 방어한다. 이름 unique는 없다.
- OLD-05: `BillingOperationsPanel`은 `RefundRequestPanel availability="schema_pending"`와 빈 rows를 고정 전달한다. SQL draft와 review helper는 있으나 적용 migration, 접수/승인 API, Toss cancel 실행 경로가 없다.
- OLD-07: GET은 owner filter와 안정적 날짜 정렬은 있으나 `.range()`/cursor/limit이 없다. Supabase 프로젝트의 서버 최대행 설정을 넘는 완전성을 코드가 보장하지 않는다.
- NEW-03: 종료시각 `Date.now()` 차이를 100ms마다 계산하고 시작/재개 사용자 동작에서 AudioContext를 resume한다. 오디오 실패와 무관하게 상태 전이는 시간 계산으로 완료된다.
- NEW-05: Fisher-Yates 후 `index % normalizedTeamCount`로 정확히 한 번 배정되며 팀 크기 차이는 최대 1이다. 비정상 팀 수는 2~4로 정규화된다.
- NEW-07: 20260902 단계 migration은 nullable 추가→backfill→NOT NULL hardening 순서다. 운영 적용 상태를 모르는 API의 schema fallback은 현재 제거할 수 없다.

## 데이터 흐름 요약

- 학생/반: UI draft → OperationalDataProvider → capability API → service-role RPC → owner-scoped tables → DTO → provider state. 이름은 표시값이고 UUID가 식별자다.
- 수업 캡처: local draft/dirty → session-captures API → owner capability → optimistic-version RPC → parent/child tables → 새 version → draft clean. 409는 remote change로 노출된다.
- 환불: 현재는 결제/구독/incident 조회까지만 연결된다. 환불 request/event SQL은 draft이며 런타임 흐름이 끊겨 있다.
- SPOMOVE 콘텐츠: 관리자 local state → `think_asset_packs` upsert → subscriber별 pack query → preset merge/render. pack 단위 동시성 token이 확인되지 않았다.
- 현장 도구: Provider roster/session attendance → component-local state. 타이머는 end timestamp 기반이고 토너먼트는 component state만 사용한다.
