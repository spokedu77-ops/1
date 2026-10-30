# CENTER SETTLEMENT — Stage 1 로컬 구현 보고

**상태: `LOCAL_IMPLEMENTATION_COMPLETE / RELEASE_PENDING`**  
검증일: 2026-10-30 (Asia/Seoul). 승인 범위: 사용자의 Stage 1 구현 지시. 운영 DB DDL/DML, 실제 매핑 저장, commit, push, deploy는 실행하지 않았다.

## 1. 변경 파일 및 주요 diff

| 파일 | 변경 |
|---|---|
| `app/admin/centers/[id]/CenterDetailClient.tsx` | 상단 요약, 기본정보 / 수업·금액 / 정산 / 운영기록 4개 탭, 특이사항 접기, 상세·편집 강사료 표시, 연결 저장 중 닫기·탭 전환 보호 |
| `app/admin/centers/components/CenterTeacherFees.tsx` | 기존 관리자 API에서 강사 UUID와 DB 등급표 조회, 원본·역할별 단가 표시, 공동 주강사 중복 표시 억제 |
| `app/admin/centers/components/CenterSettlementPanel.tsx` | 기존 MASTER API로 연결·후보·이름 공란·수동 항목 분류, 적용 월별 policy 단가 조회, 확인 후 연결·해제 |
| `app/lib/centers/teacherFeePreview.ts` | 기존 계산 함수 결과에 DB 출처·미선택·미등록 상태만 부여하는 표시 어댑터 |
| `app/api/admin/settlement-sheet/route.ts` | `kind: center-link` 추가, MASTER 인증·UUID·revision·동일 연결 검사, 로컬 DB 전용 제한, 원자적 감사 이력. 기존 `kind: center` 연결 변경에도 같은 로컬 제한·감사 적용 |
| `app/lib/centers/teacherFeePreview.test.ts` | 기존 단가 계산 일치, 등급·개별 우선순위, 0원, fallback 미표시 검증 |
| `app/admin/centers/centers.integration.test.ts` | 기존 CRUD 회귀 유지, 실제 선택 시 단가 갱신, 공동 주강사 중복, 일반 관리자 정산 제한 검증. 외부 fetch 격리 |
| `app/api/admin/settlement-sheet/route.test.ts` | 1:N·중복·UUID·충돌·원본 보존·production 차단·권한 회귀 검증 |
| `scripts/qa-center-settlement-stage1.mjs` | 외부 네트워크를 차단한 실제 컴포넌트 로컬 fixture 렌더링·연결·저장·전후 촬영 |

전체 변경 diff: [implementation.diff](stage1/implementation.diff). 기존 센터 CRUD 서버 액션, 수업 쓰기, 월별 정산 처리 및 복원·확정 보호 분기는 변경하지 않았다. 작업 중 확인된 inventory 영역의 별도 변경은 이 제출물에 포함하지 않았다.

핵심 연결 diff의 의미:

```ts
// 기존 API의 MASTER 인증 이후에만 실행
if (kind === 'center-link') {
  // production 또는 원격 Supabase URL이면 LOCAL_ONLY / 423
  // strict { id: 정산 TEXT id, rev: 현재 revision, center_id: UUID | null }
  // 현재 revision 확인 → UUID 실재 확인 → 동일 policy 중복 요청 409
  // 기존 payload 보존 + center_id + _centerLinkHistory
  // UPDATE ... WHERE id = policyId AND revision = expectedRevision
  // 갱신 행 없음: REVISION_CONFLICT / 409
}
```

## 2. 기존 함수·API 재사용

- `computeTier`, `totalLessonsFromCounts`: 기존 `session_count + log_count` 등급 계산.
- `resolveDefaultSessionPrice`, `resolveDefaultAssistSessionPrice`: 센터 수업의 기존 분류값 **`regular_center`** 적용. 두 함수가 기존 `effectiveFees`를 호출한다. 계산기를 새로 만들지 않았다.
- `cloneTierFeeMap`: 기존 기본 표 복제. DB 출처가 없으면 해당 fallback 숫자를 계약 단가로 표시하지 않는다.
- `GET /api/admin/class-ops/reference`: `users`의 UUID·단가 및 기존 `fetchTeacherLogCounts` 결과 재사용. UUID로 선택 강사를 찾으며 이름으로 조회하지 않는다.
- `GET /api/admin/teacher-tier-fees`: DB 등급표와 컬럼별 원본 유무 확인. fallback을 섞어 반환하는 기존 fetch store 대신 원본 응답을 사용한다.
- `GET /api/admin/settlement-sheet?scope=centers`, `SettlementCenterLink`, `/api/admin/settlement-centers`: 기존 MASTER 조회·검색·연결 컴포넌트 재사용.
- `rateFor`, `currentSeoulMonthKey`: 기존 월별 policy 단가 선택·서울 기준 기본 월.
- `getCenterById`, `getActiveTeachers`, `updateCenter`, `deleteCenter`, 기존 운영기록 및 파일 액션: 호출과 저장 의미 유지.

## 3. 센터·정산 매핑

`centers.id` UUID ← 여러 정산 policy의 `payload.center_id` 구조다. 정산 TEXT id와 월별 row의 `centerId`는 바꾸지 않는다. 여러 policy가 같은 UUID를 가지는 것은 정상 1:N이며, 동일 policy를 이미 연결된 동일 UUID에 다시 연결하는 요청은 409다.

이름 정규화는 trim과 연속 공백 축약이며 **후보 분류에만** 사용한다. Stage 0의 전체 이름 일치 7건은 자동 연결되지 않는다. 모달은 선택 센터의 현재 응답을 기준으로 후보를 표시한다. 이름 공란은 별도 수동 검토로 남긴다. 이름이나 유형을 수정하거나 센터를 자동 생성하지 않는다. 모의 화면의 후보 수는 1건이며 운영 7건을 모방한 실제 데이터가 아니다.

연결·재연결·해제에는 확인 절차가 있고 기존 API에서 MASTER 권한, UUID, 대상 실재, revision을 검증한다. `_centerLinkHistory`에 작업자·시각·변경 전후 UUID·변경 전후 revision을 추가하며 연결과 같은 payload UPDATE에 포함한다. CAS 실패 시 연결과 감사 이력 모두 저장되지 않는다. 클라이언트가 보낸 감사 배열은 기존 `kind: center` 경로에서도 채택하지 않는다.

**로컬 제한:** 서버 `NODE_ENV !== production`이고 `NEXT_PUBLIC_SUPABASE_URL` 호스트가 loopback일 때만 매핑 변경을 허용한다. 원격 DB를 가리키는 `next dev`도 거부한다. 이번 검증에서는 로컬 DB에도 연결하지 않고 모의 쿼리·응답만 사용했다. 기존 정산 시트 UI를 통한 `kind: center` 연결 변경도 이 제한을 우회하지 못한다. 단가 편집 등 연결 외의 기존 저장 의미는 유지된다.

## 4. 강사료·금액 출처 검증

| 조건 | 결과 |
|---|---|
| `users.fee_center_main` 개별 단가 존재 | DB 등급표보다 우선, users 출처 표시 |
| 개별 단가 null + DB 등급별 단가 존재 | 합산 수업 횟수로 등급 산정 후 기존 resolver 결과 표시 |
| 수업 횟수 100 + 로그 6 | gold 적용; 모의 등급표 주강 51,000원 일치 |
| 보조 개별 단가 27,000원 | 기존 보조 resolver 결과와 일치 |
| 실제 편집 select에서 UUID 선택 | 62,000원 / 26,000원 자동 갱신, 수업·정산 저장 호출 없음 |
| 개별 단가 0 | 명시적 0원 유지 |
| UUID 미선택 / 조회 결과 없음 / DB 단가 없음 | 서로 다른 상태로 표시; fallback 숫자는 숨김 |
| 공동 주강사 UUID 중복 | 첫 슬롯만 금액 표시, 이후 슬롯은 중복 안내, 합산 없음 |
| 기존 backup 이름 문자열 | UUID 배정으로 해석하거나 이름으로 단가 추정하지 않음 |

공동 주강사 2·3은 주강사 역할을 유지한다. 함께 표시하는 보조 단가는 해당 강사를 보조로 배정했다는 뜻이 아닌 **보조 역할 참고 단가**다. 센터 배정 UUID와 기존 저장 필드 외에 강사료 숫자를 센터에 복제 저장하지 않는다.

`centers.session_fee`는 **센터 회당 청구 수업료**로 별도 표시한다. 정산 policy의 fee / instr / assist / rental / cost는 정산 탭에서 독립적으로 표시하고 rates 적용 월을 명시한다. 월별 스냅샷의 실제 확정 청구액을 policy 참고 단가로 대신 표시하지 않는다. 서로 다른 금액을 덮어쓰지 않는다. `bulkSessionDefaults`의 미선택 fallback 30,000 / 25,000원은 원본 코드 그대로다.

## 5. BEFORE / AFTER

실제 컴포넌트와 동일 fixture를 로컬 Chromium에서 촬영했다. BEFORE는 baseline `61a3b74657ee42ea4a6694baeb09e10c83b25629`의 상세 컴포넌트를 같은 크기의 모달 shell에 넣은 비교다. AFTER는 실제 `CenterDetailModal`과 목록을 사용한다. 인증된 Next 서버의 운영 데이터 E2E는 아니다.

| 폭 | BEFORE | AFTER 기본정보 | 수업·금액 | 정산 | 운영기록 |
|---|---|---|---|---|---|
| 390 | [보기](stage1/screenshots/before-390.png) | [보기](stage1/screenshots/after-390-0.png) | [보기](stage1/screenshots/after-390-1.png) | [보기](stage1/screenshots/after-390-2.png) | [보기](stage1/screenshots/after-390-3.png) |
| 768 | [보기](stage1/screenshots/before-768.png) | [보기](stage1/screenshots/after-768-0.png) | [보기](stage1/screenshots/after-768-1.png) | [보기](stage1/screenshots/after-768-2.png) | [보기](stage1/screenshots/after-768-3.png) |
| 1440 | [보기](stage1/screenshots/before-1440.png) | [보기](stage1/screenshots/after-1440-0.png) | [보기](stage1/screenshots/after-1440-1.png) | [보기](stage1/screenshots/after-1440-2.png) | [보기](stage1/screenshots/after-1440-3.png) |

화면 검사에서 4개 탭, 가로 넘침 방지, 세로 스크롤, 연결·해제, 각 폭의 기존 센터 저장 동작을 확인했다. 스크린샷은 모달 viewport 캡처이므로 긴 탭의 아래 내용은 세로 스크롤로 접근한다. 데이터가 있는 모바일·데스크톱 이미지를 직접 검토했다. **fixture 렌더링 검증 통과이며 운영 시각 승인으로 간주하지 않는다.**

## 6. DB·정산 원본 무변경 증빙

[preservation-evidence.json](stage1/preservation-evidence.json)에 이번 변경 범위와 보호 파일의 HEAD 대비 동일 여부·정규화 SHA-256을 기록했다.

- 운영 DB 접속 쿼리 실행 0, DDL 0, DML 0, 실제 매핑 저장 0. 운영 read-only 감사 스크립트도 재실행하지 않았다.
- Stage 0 `_audit_output.json` 변경 없음: 센터 52, 정산 policy 59, 이름 후보 7, 이름 공란 2, 월 키 4개가 기록된 **기존 감사 자료**다.
- 센터 CRUD·운영기록 액션, `bulkSessionDefaults`, `teacherTierSchedule`, 관리자 인증, 기존 reference·등급표·정산 검색 API, 정산 core·sheet·link 컴포넌트는 HEAD와 동일하다.
- 모의 API 테스트에서 센터 52건 / policy 59건을 구성하고 2개 policy의 같은 UUID 연결 및 하나의 연결 해제 후 개수와 기존 금액·확정 월 원본을 비교했다.
- 로컬 브라우저는 외부 호스트 요청을 차단한다. 모든 저장 응답은 메모리 fixture이며 Supabase로 전달되지 않는다.
- 이번 작업에서 SQL / migration 파일을 생성·수정하지 않았다. 다른 작업의 inventory migration 변경은 이 증빙의 대상이 아니다.

**한계:** 운영 DB의 작업 전후 row hash를 새로 비교한 증빙은 아니다. 최신 운영 건수나 제3자의 동시 변경 부재를 확인했다고 주장하지 않는다.

## 7. 전체 실행 검증 결과

| 검증 | 결과 |
|---|---|
| 대상 Vitest 7개 파일 | **36 / 36 PASS** |
| 기존 센터 CRUD 및 권한 회귀 | PASS (모의 액션·쿼리) |
| 정산 API MASTER·비인증·확정 월·복원 보호 | PASS |
| 신규 연결 API UUID·중복·1:N·revision/CAS·원격·production 차단·감사 | PASS |
| 강사 단가·출처·미선택·미등록·중복·선택 갱신 | PASS |
| 로컬 390·768·1440px 브라우저 | PASS_FIXTURE_ONLY, 브라우저 오류 0 |
| 변경 runtime 파일 ESLint | PASS |
| 변경 추적 파일 `git diff --check` | PASS |
| 저장소 전체 TypeScript | **FAIL: 범위 밖 오류 1건** |

TypeScript 오류: `app/api/spokedu-master/programs/programGetValidation.test.ts(98,32): TS2554: Expected 1 arguments, but got 0.` 이번 변경 파일의 진단은 없었으며 해당 범위 밖 테스트를 수정하지 않았다. 저장소 전체 테스트·build는 실행하지 않았다. 위 PASS는 승인된 대상 테스트 전체의 결과다.

실행 명령:

```powershell
node node_modules/vitest/vitest.mjs run app/admin/centers app/api/admin/settlement-sheet/route.test.ts app/api/admin/settlement-centers/route.test.ts app/lib/teacherTierSchedule.test.ts app/lib/centers/teacherFeePreview.test.ts
node scripts/qa-center-settlement-stage1.mjs
node node_modules/typescript/bin/tsc --noEmit --pretty false --incremental false
node node_modules/eslint/bin/eslint.js 'app/admin/centers/[id]/CenterDetailClient.tsx' app/admin/centers/components/CenterTeacherFees.tsx app/admin/centers/components/CenterSettlementPanel.tsx app/lib/centers/teacherFeePreview.ts app/api/admin/settlement-sheet/route.ts
```

브라우저 상세 결과: [rendered-qa-results.json](stage1/rendered-qa-results.json). QA 스크립트는 새 실행 시 `.tmp/center-settlement-stage1`에 결과를 쓴다. 제출한 `stage1` 파일은 이번 실행의 고정 사본이다.

## 8. 미해결 및 후속 단계

1. 범위 밖 TypeScript 오류를 별도 작업에서 해소해야 전체 typecheck가 녹색이 된다.
2. 실제 7개 후보와 공란 2개에 대한 관리자 판단·매핑은 미실행이다. 운영 저장은 별도 출시 승인과 로컬 제한 변경 검토 후에만 가능하다.
3. 현재 감사 이력은 기존 policy JSON 안에 있는 Stage 1 구현이다. 운영 출시 전 보존·접근·백업 복원 정책과 별도 불변 감사 저장소 필요 여부를 검토해야 한다. 기존 전체 복원 동작을 이번 단계에서 바꾸지 않았다.
4. 실제 관리자 세션·운영 데이터 E2E와 운영 화면 승인은 미실행이다. 로컬 또는 격리 staging에서 별도 승인된 쓰기 범위로 검증할 수 있다. 실제 local Supabase 트랜잭션 통합 검증도 이번 mock 결과와 구분해야 한다.
5. 보조/백업 이름의 UUID 전환, 센터별 강사 예외 계약료 저장, 일반 관리자용 제한 정산 API, 월별 정산 편집은 범위 밖이다. 이번 구현은 자동 표시와 출처 확인에 한정된다.

변경은 미커밋 상태다. commit·push·deploy 및 운영 마이그레이션은 수행하지 않았다.
