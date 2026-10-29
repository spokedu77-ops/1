# 센터관리 최적화 로컬 구현 보고

## 후속 수정 — 정산 금액 표시

사용자가 지적한 합계 칸의 계산식 노출을 수정했다. `150000+45000원`은 `195,000원`, `40000+55000원`은 `95,000원`으로 표시한다. 금액 입력에도 천 단위 콤마를 적용하고, 입력 시 콤마를 제거한 원래 값/계산식만 기존 저장 콜백에 전달한다. 기존 금액·요율·월별 계산 의미 및 DB 데이터는 바꾸지 않는다.

함께 확인한 문제는 수정 중 합계가 즉시 갱신되지 않던 점과 좁은 금액 칸의 잘림이다. 합계를 즉시 다시 표시하고 정책 표의 금액/선택 칸 최소 폭을 확보했다. 좁은 화면은 표 안에서 가로 스크롤한다. 계산 불가 값은 합계에 ‘계산식 확인 필요’로 표시한다.

변경: SettlementSheet.tsx, SettlementSheet.module.css, 신규 SettlementMoneyInput.tsx/settlementMoney.ts/settlementMoney.test.ts 및 fixture QA 스크립트. 모의 Playwright에서 계산된 합계·입력 콤마·수정 즉시 합계 갱신·기존 정산 값 보존을 확인했다. 관련 14개 테스트 및 전체 Vitest 3,052개 통과(기존 2개 skip), typecheck·변경 파일 ESLint 통과. 정상 관리자 실데이터 E2E는 여전히 NOT_MEASURED이며 배포하지 않았다. 아래 내용은 앞선 구현 보고다.

2026-10-30 KST. **LOCAL_IMPLEMENTATION_COMPLETE / RELEASE_PENDING**

- BASE_SHA: `a8a93158375d8e664cda1dddd60bc547e749ba71`
- IMPLEMENTATION_APPROVAL: APPROVED_WITH_SCOPE
- PRODUCTION_DEPLOYMENT: NOT_APPROVED
- PRODUCTION_MUTATION: NONE
- DB_MIGRATION: NONE
- COMMIT / PUSH / BRANCH / PR: NONE

## 구현과 영향 범위

센터 목록/상세 직접 URL/정산 페이지를 유지했다. 실제 표시 필드와 검색 의미를 보존하며 데이터 반환을 줄였고, 센터 선택에만 지연 모달을 띄운다. 기존 상세 컴포넌트를 공유하여 계약·연락처·강사 배정·시간표·운영 기록·민감 파일 및 비밀번호 기능을 그대로 제공한다. 활성 강사 선택지 조회는 편집 시점으로 이동했다.

모달을 닫으면 상세 트리가 unmount되고 민감 상태가 폐기된다. native dialog의 배경 비활성화와 포커스 복귀, body 스크롤 잠금/복구를 사용한다. 모바일은 화면 전체를 사용한다. 미저장 폼/히스토리와 진행 중 쓰기는 닫기에서 보호하고 페이지 unload도 경고한다. 내부 편집 dialog에는 포커스 순환과 ESC 처리를 추가했다. 목록 검색·필터·스크롤은 상세 밖에 유지되며 저장 응답의 행만 갱신한다.

정산은 기존 정책 id와 월별 centerId의 의미를 바꾸지 않는다. 운영 센터 연결은 별도 center_id를 정책 JSON에 저장한다. 센터 검색/선택은 master 서버 검사를 통과해야 하며, 기관명이 같다고 자동 연결하지 않는다. session_fee는 참고용이며 정산 정책의 instr/assist/rental/fee/cost나 수금 상태에 자동 대입하지 않는다.

## 변경 파일 목록

이번 작업에서 수정/추가한 파일은 아래와 같다. 작업 중 별도 변경된 curriculum/AppShell/OperationalDataProvider 등은 이 목록과 분리하며 수정하거나 되돌리지 않았다.

| 파일 | 변경 이유 |
|---|---|
| app/lib/centers/types.ts | 목록 전용 CenterListItem |
| app/lib/centers/listItem.ts | 안전한 목록 projection 및 저장 후 필터 소속 판정 |
| app/admin/centers/actions/centers.ts | 목록 SELECT/응답 경량화, 기존 인증 유지 |
| app/admin/centers/CentersHubClient.tsx | 목록 타입 경계 |
| app/admin/centers/CentersClient.tsx | 동적 모달·부분 행 갱신·응답 경쟁/초기 중복 방어 |
| app/admin/centers/components/CenterDetailModal.tsx | native dialog 호스트·모바일 전체 화면·닫기 보호 연결 |
| app/admin/centers/[id]/CenterDetailClient.tsx | 상세 공유·강사 지연 조회·취소 응답 방어·미저장 보호·편집 접근성 |
| app/admin/centers/[id]/page.tsx | 직접 URL 유지, id별 상태 격리 |
| app/admin/master/reports/SettlementSheet.tsx | 최초 정책 preload 제거·기존 기능의 지연 로딩·센터 연결 UI |
| app/admin/master/reports/SettlementCenterLink.tsx | 명시 ID 검색/연결·최신 원본 참고 표시 |
| app/admin/master/reports/settlementSheetCore.ts | 금액 계산 변경 없이 nullable center_id 타입 추가 |
| app/api/admin/settlement-centers/route.ts | master 전용 최소 검색 및 선택 id 단건 조회 |
| app/api/admin/settlement-sheet/route.ts | sheet/policies 조회 범위 분리·센터 연결 검증·revision·확정 월 보호 |
| app/lib/centers/listItem.test.ts | 저장 후 검색/필터 판정 |
| app/admin/centers/actions/centers.optimization.test.ts | projection/단건 범위/비관리자 차단 |
| app/admin/centers/centers.integration.test.ts | 실제 컴포넌트 모의 통합·CRUD 목록 갱신·늦은 응답·닫기/저장 |
| app/api/admin/settlement-centers/route.test.ts | master 검사·최소 검색·배치 연결 확인·단건 상세 |
| app/api/admin/settlement-sheet/route.test.ts | 초기 정책 조회 제거·금액/기존 키 보존·충돌/확정 월 보호 |
| scripts/qa-center-optimization.mjs | 외부 네트워크 차단 격리 fixture Playwright 재현 |
| CENTER_PERFORMANCE_BASELINE.md | 실측/fixture/미측정 상태 갱신 |
| CENTER_QUERY_AUDIT.md | 실제 제거한 필드·요청 갱신 |
| CENTER_MODAL_ARCHITECTURE.md | 구현된 모달/캐시 경계 갱신 |
| CENTER_SETTLEMENT_INTEGRATION.md | 실제 연결·확정 월·정책 지연 로딩 반영 |
| CENTER_OPTIMIZATION_CHANGE_PLAN.md | 승인 및 로컬 구현 상태 연결 |
| CENTER_OPTIMIZATION_IMPLEMENTATION_REPORT.md | 최종 제출 보고 |

## BEFORE / AFTER 코드·쿼리 비교

| 대상 | BEFORE | AFTER |
|---|---|---|
| 목록 SELECT | created_at + 강사 관계 `(id,name)` 3개 | created_at 제외 + 관계 `(name)` 3개. 사용되는 관계는 제거하지 않음 |
| 목록 응답 | normalizeCenterRow로 상세 Center 형태에 빈 키 포함 | CenterListItem 14개 키만 직렬화 |
| 초기 목록 effect | ref skip, 개발 재실행 시 동일 조건 요청 가능 | 필터 key 비교로 같은 초기 조건 조회하지 않음 |
| 필터 응답 | 완료 순서대로 setCenters | requestVersion이 최신인 응답만 반영 |
| 목록 생성/삭제 | 성공 후 getCenters 전체 현재 조건 재조회 | 생성 응답을 삽입, 삭제한 id만 제거 |
| 목록 상태·상세 저장 | 상태는 로컬 갱신, 상세는 별도 페이지 | 반환 센터를 목록 DTO로 바꾸어 행 갱신/필터 이탈 제거; 전체 재조회 없음 |
| 상세 진입 | getCenterById + getActiveTeachers + getCenterHistory | getCenterById + getCenterHistory; 강사는 편집 시 조회 |
| 상세 UI | 상세 페이지 이동 | 목록 클릭은 dynamic 모달, 수정키/새 탭/직접 URL은 기존 경로 |
| 정산 첫 화면 | months + 전체 정책 payload + settings | scope=sheet: months + settings만. 기본 GET의 기존 응답 계약도 유지 |
| 정책 필요 기능 | 초기 전체 정책 상태에 의존 | 관리·기관명 입력·정규 일괄 추가·새 달 DB 생성·백업 때 scope=centers로 지연 로딩 |
| 기관명 입력 중 정책 응답 지연 | 초기 선로딩을 전제로 blur에서 즉시 정책 매칭 | 조회 완료 후 최신 행/월/잠금/빈 금액을 확인해 반영. 이미 바뀐 입력은 무시하고 기존 명시 총액·계산서·수금·비고를 보존 |
| 운영 센터 검색 | 없음 | id/name/status 20건 이하 + 해당 결과 ID들의 연결 상태 배치 조회 |
| 운영 센터 선택 | 없음 | 선택 id의 계약/참고 수업료/updated_at만 조회 |
| 정책 저장 | 무조건 upsert | 기존 payload 병합, expected revision 확인 및 조건부 update, 신규 insert |
| 확정 월 | unlock 플래그와 함께 금액 변경 가능; restore 별도 보호 없음 | unlock 때 내용 동일성 확인; 확정 월 존재 시 전체 restore 거부; 복원/삭제 쓰기에 locked=false 조건 |

### 실제 제거한 데이터와 호출

목록 DB projection에서 `created_at`, `main_teacher.id`, `mt2.id`, `mt3.id`를 제거했다. 반환 JSON에서는 `address`, `access_note`, `contract_start`, `contract_end`, `session_fee`, `main_teacher_id`, `main_teacher_2_id`, `main_teacher_3_id`, `instructors_default`, `criminal_check_facility_id`, `criminal_check_files`, `created_at` 총 12개 키를 제거했다. 이 중 대부분은 기존 목록 SELECT에도 없었고 정규화가 넣던 빈 값이었다. 실데이터를 선로딩하다 제거한 것으로 설명하지 않는다.

읽기 전용 상세 열람에서 getActiveTeachers 1회가 사라졌다(편집 시작으로 이동). 모달 닫기 자체는 목록 조회를 발생시키지 않는다. 생성/삭제 후 전체 목록 getCenters도 제거했다. 초기 정산 scope=sheet에서는 전체 정책 업무 쿼리 1개 및 정책 payload를 제거했다. Auth 쿼리는 그대로 유지하므로 위를 실제 전체 Supabase 쿼리 감소량으로 단정하지 않는다.

## 검증 결과와 한계

정확한 최종 명령/수치는 아래 검증 기록에 따른다. fixture와 정상 관리자 E2E를 구분한다.

| 검사 | 결과 |
|---|---|
| npm.cmd run typecheck | PASS |
| 변경 파일 ESLint | PASS, 오류/경고 없음 |
| npm.cmd run lint:all | PASS exit 0, 오류 0 / 범위 밖 경고 6 |
| 관련 Vitest | PASS, 해당 8개 파일의 30개 테스트가 전체 실행에 포함 |
| 전체 Vitest | PASS, 458개 파일 통과 / 1개 파일 skip, 2,986개 테스트 통과 / 기존 2개 테스트 skip |
| npm.cmd run build | PASS, production build 및 247개 정적 페이지 생성 |
| 컴포넌트 모의 통합 | 초기/선택 단건/강사 지연/생성·삭제·저장 행 갱신/닫기/재열기/타 센터/역순 검색 응답/dirty 보호 PASS |
| API·액션 모의 단위 | 비관리자/일반 admin의 master API 거부, projection, 기존 금액·policy ID·rates·unknown key 보존, revision 충돌, 확정 월 변경·restore 차단 PASS |
| Playwright 격리 fixture | 375/768/1024/1280/1440px 목록·모달 및 정산 연결 캡처/시각 검토. 모바일 전체 화면·모달 unmount·닫기 조회 0·편집/저장·금액 보존·가로 넘침 격리·느린 정책 응답/빠른 blur 이후 기존 수금 데이터 보존 PASS_FIXTURE_ONLY |
| 정상 관리자/master 실데이터 E2E | NOT_MEASURED. 유효 관리자 세션 미확보. 앞선 인증 진단은 기준선 문서 참조 |

Playwright harness는 별도 Vite 호스트에서 **실제 변경 컴포넌트**와 모의 액션/HTTP 응답을 사용한다. Next.js 앱의 관리자 인증을 바꾸거나 우회하지 않으며 Supabase에 연결하지 않는다. 외부 요청은 차단한다. 이전 상세 소스는 BASE_SHA의 git show 결과로 비교한다. 합성 테스트를 운영 인수 PASS로 표시하지 않는다.

재현: `node scripts/qa-center-optimization.mjs`. 결과와 PNG는 `.tmp/center-optimization-qa/`에 생성된다. 테스트 스크립트는 별도 mock 경계를 적용하므로 실제 Next Action/RSC 실행 시간·압축 chunk 크기나 서버 DB 실행시간을 검증하지 못한다.

| 모의 환경 비교 | BEFORE | AFTER | 판정 |
|---|---:|---:|---|
| 읽기 전용 상세 action/fixture HTTP 호출 | 3 (상세/강사/히스토리) | 2 (상세/히스토리) | 같은 모의 데이터로 브라우저 관찰 |
| 2센터 목록 JSON 응답 본문, 비압축 UTF-8 | 1,682B | 1,036B | fixture 응답 비교. 646B 감소, 약 38.4%; 실제 목록/RSC 전송 개선율 아님 |
| 닫기 후 목록 재조회 | — | 0 | 5폭 fixture 관찰 |
| 정상 관리자 초기 요청/중복/DB 쿼리 수 | NOT_MEASURED | NOT_MEASURED | 추정으로 채우지 않음 |
| 실제 서버 응답/클라이언트 렌더/목록 표시 시간 | NOT_MEASURED | NOT_MEASURED | 30% 목표 달성 여부 미판정 |
| 실제 초기 목록 데이터 전송량 | NOT_MEASURED | NOT_MEASURED | 50% 목표 달성 여부 미판정 |
| 실제 정산 정책 수/전송량/실행계획 | NOT_MEASURED | NOT_MEASURED | 코드·모의 검증만 완료 |

## 기능 동등성과 잔여 위험

요청 범위의 로컬 테스트에서 회귀가 검출되지 않았다. 직접 상세 경로와 기존 상세의 계약·배정·일정·기록·첨부·비밀번호 처리 경로를 삭제하지 않았다. 다만 실제 권한 세션에서 Storage 업로드/다운로드/삭제, 비밀번호 보기·복사, 다중 운영자 동시 편집까지 완전 검증했다는 뜻은 아니다.

- 정상 관리자/master 및 실제 데이터 populated E2E와 실제 성능 인수 검증이 남아 있다. 승인 전보다 빨라졌다는 실측 주장은 하지 않는다.
- 전체 정책은 초기 진입에서 제외했으나 기존 기능을 보존하기 위해 관리/일괄/백업/기관명 입력 시 필요해지면 전체 정책을 지연 로딩한다. 모든 정책 관리의 검색/페이지화까지 재설계하지 않았다. 별도 pagination/장기 상세 캐시도 추가하지 않았다.
- 월별 모든 history 조회는 기존대로 유지한다. 검색·정렬 인덱스 및 JSON 연결 표현식의 실제 비용은 미측정이며 migration은 없다.
- 확정 월이 있는 전체 restore는 보호를 위해 거부한다. 기존의 명시적 ‘확정 해제’는 내용이 동일할 때만 가능하다. 이 보호 강화는 배포 전 운영 절차 확인 항목이다.
- restore는 기존처럼 여러 요청으로 실행된다. locked=false/revision 조건으로 확정 월 덮기를 방어하지만, 다른 오류가 발생한 전체 복원의 원자성까지 제공하지 않는다. 이를 위한 RPC/트랜잭션·DB 변경은 이번 범위 밖이다.
- 화면을 덮는 native modal과 beforeunload/상세 내 이동 보호를 제공한다. 브라우저 뒤로가기 등 App Router 클라이언트 이동을 전역 차단하는 새 navigation guard는 추가하지 않았으므로 정상 앱 셸과 함께 검증해야 한다.
- 작업 도중 다른 작업의 curriculum/MASTER 셸 변경이 워크트리에 생겼다. 해당 변경은 건드리지 않았고 전체 검사 결과는 그 공유 워크트리를 포함한다.

## 배포 전 필수 확인

1. 기존 권한을 가진 일반 관리자와 정산 master로 로컬 정상 로그인. 역할 변경/인증 우회 없이 15개 승인 시나리오를 실제 환경에서 검증한다.
2. 격리 테스트 DB 또는 승인된 읽기 전용 데이터에서 동일 규모·동일 앱 셸·동일 브라우저로 실제 요청/SQL 수/전송량/TTFB/렌더/표시 시간을 비교한다. fixture 수치와 합치지 않는다.
3. 다중 운영자 정책 충돌, 확정 월 수정·삭제·restore 차단 및 명시적 unlock, 개인수업·기존 월별 금액·백업 완전성을 확인한다.
4. 실제 Storage 및 민감정보 권한, 모달 포커스/ESC/스크롤·미저장 보호·브라우저 이동을 관리자 세션으로 확인한다.
5. 현재 dirty 파일 중 이번 변경 범위만 재검토한다. commit/push/DB migration/배포는 각각 별도 승인 후에만 수행한다.

## 검증 로그

- `.tmp/center-optimization-typecheck.log`
- `.tmp/center-optimization-eslint-changed.log`
- `.tmp/center-optimization-eslint-all.log`
- `.tmp/center-optimization-full-vitest.log`
- `.tmp/center-optimization-build.log`
- `.tmp/center-optimization-qa/results.json` 및 5폭 PNG

최종 확인: typecheck/build/full Vitest/변경 파일 ESLint 모두 exit 0. `git diff --check` 오류 없음(일부 파일의 Git CRLF 안내만 존재). 추가 패키지 설치 및 Git index 변경 없음.

공유 워크트리 검증 중 범위 밖 OperationalDataProvider의 동시 편집 중간 상태에서 `hasSameIds` 미정의로 typecheck가 한 번 실패했다. 해당 파일을 수정하지 않았으며, 외부 변경이 진행된 현재 파일에서 재실행한 최종 typecheck와 build는 exit 0이다. 이 이력을 숨기고 모든 실행이 처음부터 통과했다고 보고하지 않는다.
