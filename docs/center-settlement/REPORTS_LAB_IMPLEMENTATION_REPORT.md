# 센터 모달 직접 적용 / 정산 LAB 분리 — 구현·검증 보고

**상태: `LOCAL_IMPLEMENTATION_COMPLETE / RELEASE_PENDING`**  
검증일: 2026-10-30 (Asia/Seoul). 운영 DB 변경, commit, push, deploy 미실행.

## 1. 적용 결과 및 라우트

| 경로 | 역할 | 상태 |
|---|---|---|
| `/admin/centers` | 기존 센터 관리 + Stage 1의 4개 탭 모달 | 직접 적용 유지 |
| `/admin/centers/[id]` | 기존 상세 페이지, 같은 상세 컴포넌트 사용 | 유지 |
| `/admin/master/reports?tab=sheet` | 기존 정산 시트 안정 버전 | 기존 기능 유지 + 버전 전환 링크 |
| `/admin/master/reports?tab=teacher` | 기존 강사 정산 보고서 | 유지, LAB에 복제하지 않음 |
| `/admin/master/reports-lab` | 정산 시트 전용 LAB | 신규, MASTER 전용 |
| `/api/admin/settlement-sheet` | 기존 운영 정산 API | 이번 작업에서 변경하지 않음 |
| `/api/admin/settlement-lab` | MASTER 운영 스냅샷·센터 출처 조회 | 신규 GET 전용, 모든 쓰기 405 |

**센터 관리 LAB 라우트는 만들지 않았다.** 기존 호출 경로인 `CentersClient → CenterDetailModal → CenterDetailClient`에서 기본정보 / 수업·금액 / 정산 / 운영기록 탭을 바로 사용한다. 기존 센터 CRUD, 운영기록, 강사료 원본 조회 및 저장 로직은 Stage 1 상태를 유지했다.

양 정산 페이지 상단에 안정 버전 / LAB 전환 링크를 추가했다. 안정 페이지의 기존 정산 시트·강사 정산 탭과 query parameter 처리는 바꾸지 않았다.

## 2. 변경 파일과 diff

| 파일 | 내용 |
|---|---|
| `app/admin/master/reports/page.tsx` | 버전 전환 컴포넌트 import와 렌더링 2줄 추가 |
| `app/admin/master/reports/ReportVersionNav.tsx` | 두 페이지 간 링크 |
| `app/admin/master/reports-lab/page.tsx` | 서버 MASTER 검증, LAB만 렌더링 |
| `app/admin/master/reports-lab/SettlementLab.tsx` | 초기 read-only, 격리 작업 시작·폐기, 원본 대비 계산 비교, 센터·강사 단가 출처 검증 |
| `app/admin/master/reports-lab/LabSettlementSheet.tsx` | 기존 정산 시트 UI·기능 복제. 모든 저장을 주입된 LAB transport로 전달 |
| `app/admin/master/reports-lab/labTransport.ts` | 네트워크 없는 메모리 저장 환경. revision·UUID·확정 월 보호·복원·삭제 검사 |
| `app/admin/master/reports-lab/labTransport.test.ts` | 원본 보존·계산 비교·격리·저장·revision·확정 보호 검증 |
| `app/api/admin/settlement-lab/route.ts` | 기존 GET 재사용, MASTER 센터 출처 응답, 쓰기 거부 |
| `app/api/admin/settlement-lab/route.test.ts` | MASTER·401/403·조회·모든 쓰기 차단 검증 |
| `app/api/spokedu-master/programs/programGetValidation.test.ts` | 기존 TypeScript 오류 수정: `GET()` → `GET(new Request(...))`. 런타임 변경 없음 |
| `scripts/qa-reports-lab.mjs` | 기존 정산 회귀·신규 LAB 화면/저장/원본 보존 로컬 fixture 검증 |

전체 [구현 diff](reports-lab/implementation.diff), [검증·보존 해시](reports-lab/verification-summary.json).

Stage 1의 미커밋 변경은 그대로 남아 있다. 위 diff는 **이번 정산 LAB 분리 작업 범위**이며 Stage 1 전체 diff를 중복 포함하지 않는다. 작업 공간의 inventory·SPOMOVE 등 다른 변경은 수정하거나 제출 범위에 넣지 않았다. Production Build는 현재 작업 공간 전체를 대상으로 통과했다.

## 3. DB 읽기·쓰기 경로

| 동작 | 기존 안정 버전 | 신규 LAB |
|---|---|---|
| 초기 조회 | 기존 `/api/admin/settlement-sheet` GET | `/api/admin/settlement-lab` GET → 기존 GET 재사용 |
| 기관 DB 지연 조회 | 기존 API `scope=centers` | 이미 읽은 스냅샷의 복사본 |
| 센터·계약 수업료·배정 UUID 출처 | 기존 센터 검색 API | MASTER 전용 LAB `scope=context`, 기존 검색 API |
| 강사 단가 출처 | 기존 시스템의 users·등급표 | 기존 `CenterTeacherFees`와 관리자 reference·등급표 API 재사용 |
| 월·기관·설정 저장 | 기존 운영 API PUT | **메모리 transport**, 서버 요청 없음 |
| 삭제·백업 복원 | 기존 운영 API | **메모리 transport**, 서버 요청 없음 |
| 서버에 직접 LAB PUT/POST/PATCH/DELETE | 해당 없음 | 항상 405, 운영 API에 전달하지 않음 |
| 새로고침·페이지 이동 | 운영 DB의 저장 상태 다시 조회 | 메모리 복사본 폐기, 읽기 전용 재진입 |

LAB의 최초 화면은 운영 스냅샷 읽기 전용이다. 편집 UI는 disabled fieldset으로 차단하고 transport도 쓰기를 거부한다. 사용자가 **격리 복사본 만들기**를 선택해야 해당 탭의 메모리 저장 환경을 생성한다. 이때도 서버 저장 경로는 열리지 않는다.

격리 저장은 DB·localStorage·sessionStorage·IndexedDB에 기록하지 않는다. 재시작 후 보존이 필요한 영구 저장 환경은 이번 구현 범위에 포함하지 않았다. 화면에 저장 위치와 새로고침·이동 시 폐기된다는 점을 명시했다. 테스트 백업 JSON은 기존 내보내기 기능으로 사용자가 별도 다운로드할 수 있다.

기존 `SettlementCenterLink`를 통해 UUID를 명시적으로 선택한다. 이름으로 운영 매핑을 확정하지 않는다. LAB의 기관 저장 transport가 UUID 형식과 조회한 센터 목록 내 실재 여부를 검증하며 1:N을 허용한다. 센터 연결·해제와 금액 변경은 격리 복사본에만 반영된다.

MASTER 검증은 LAB 서버 페이지와 GET API에서 모두 적용된다. 센터 context는 id·이름·회당 청구 수업료·배정 강사 UUID만 읽는다. 일반 관리자에게 MASTER 정산 payload를 제공하지 않는다. 운영 정산 API의 기존 권한·월별 확정·복원 보호 로직은 그대로다.

## 4. 계산·단가 재사용과 영향 범위

`settlementSheetCore.ts`, `settlementMoney.ts`, `SettlementMoneyInput`, 기존 CSS는 재사용하고 수정하지 않았다. `calculateRow`, `summarize`, `rowFromCenter`, `rateFor`, `centerFee`, `carryOver`, 기존 기본 월 선택을 새로 구현하지 않았다. LAB에 복제한 것은 정산 시트 UI와 그 화면 상태 처리이며 강사 정산 보고서는 복제하지 않았다.

비교 표는 최초 운영 스냅샷과 격리 복사본을 동일 `summarize / calculateRow`로 계산해 월별 총액·차이·경비·VAT·순수익을 나란히 표시한다. 최초 스냅샷은 작업 중 운영 DB 변경을 자동 반영하지 않는다.

센터 UUID 출처 패널은 `centers.session_fee`, 정산 policy의 fee / instr / assist / rental을 구분한다. policy 표시값은 **rates 적용 전 원본**이라고 명시했다. 수업·월별 정산 화면의 적용 단가는 기존 `rateFor` 경로를 유지한다. 개별 단가 0도 미등록과 구분한다.

연결 센터의 주강사·공동 주강사 UUID로 기존 `CenterTeacherFees`를 자동 조회한다. 내부에서 기존 `computeTier`, `totalLessonsFromCounts`, `effectiveFees` 경로와 `resolveDefaultSessionPrice / resolveDefaultAssistSessionPrice`를 사용한다. DB 단가가 없으면 fallback 숫자를 계약 강사료로 표시하지 않는다. 공동 주강사를 보조로 재해석하거나 합산하지 않는다. 단가 차이가 있어도 운영 또는 LAB policy를 자동 덮어쓰지 않는다.

보존 증빙에서 기존 `SettlementSheet`, `TeacherSettlementReport`, 계산 core·CSS, 강사료 산정 함수, 센터 CRUD·운영기록 액션의 동일성을 확인했다. 기존 정산 API는 **이번 작업 시작 시 Stage 1 작업 트리 사본과 바이트 단위 동일**하다.

## 5. 센터 모달 검증 — 별도 결과

결과: **PASS_FIXTURE_ONLY**. [센터 전용 결과 JSON](reports-lab/center-rendered-qa.json).

- 390·768·1440px의 기본정보 / 수업·금액 / 정산 / 운영기록 탭 렌더링.
- 기존 센터 저장 동작, 연결·해제, 정산 금액·rates·확정 월 보존.
- 강사 DB 개별·등급별 단가 출처 표시, 미선택·미등록·공동 주강사 중복은 대상 단위·컴포넌트 테스트에서도 통과.
- 기존 센터 CRUD 테스트를 포함한 대상 회귀 테스트 통과.

| 폭 | 기본정보 | 수업·금액 | 정산 | 운영기록 |
|---|---|---|---|---|
| 390 | [화면](reports-lab/center-screenshots/after-390-0.png) | [화면](reports-lab/center-screenshots/after-390-1.png) | [화면](reports-lab/center-screenshots/after-390-2.png) | [화면](reports-lab/center-screenshots/after-390-3.png) |
| 1440 | [화면](reports-lab/center-screenshots/after-1440-0.png) | [화면](reports-lab/center-screenshots/after-1440-1.png) | [화면](reports-lab/center-screenshots/after-1440-2.png) | [화면](reports-lab/center-screenshots/after-1440-3.png) |

기존 센터 관리 경로의 실제 컴포넌트를 fixture로 렌더링한 검증이다. 별도의 센터 LAB 제품 페이지를 만든 결과가 아니다.

## 6. 기존 정산 회귀 / 신규 LAB 검증 — 별도 결과

결과: **PASS_FIXTURE_ONLY**. [정산 전용 결과 JSON](reports-lab/lab-rendered-qa.json).

| 구분 | 검증 |
|---|---|
| 기존 정산 | 월 원본 렌더링, 회기 변경 후 기존 API 형식의 자동 저장, 연간 화면 전환, 기관 단가 표시·명시적 저장 |
| 기존 정산 계산 | 표현식·VAT·경비·원천징수·부분 입금·조정·월 이월·rates·기본 월 선택 회귀 |
| 기존 정산 API | MASTER 권한, revision, 확정 월 수정·복원 보호 회귀 |
| LAB 최초 진입 | 모든 편집 비활성, 읽기만 가능 |
| LAB 격리 저장 | 회기 4 → 5, 기존 총액 400,000 / LAB 총액 500,000 / 차이 100,000 |
| LAB UUID | 격리 연결·해제, 잘못된 UUID·미존재 UUID 차단, 1:N 허용 |
| LAB 원본 보존 | 월 원본 및 운영 fixture가 그대로이며 기존 정산 쓰기 API 호출 없음 |
| LAB 복구 | 복사본 폐기·새로고침 후 회기 4·읽기 전용 상태 복귀 |
| 단가 출처 | 센터 수업료 100,000원과 강사 DB 개별 60,000원·등급 보조 30,000원 구분 |
| 화면 | 390·1440px 가로 넘침 없음, 브라우저 런타임 오류 0 |

| 폭 | 기존 정산 | LAB 읽기 전용 | 격리 계산 비교 | UUID·단가 검증 |
|---|---|---|---|---|
| 390 | [화면](reports-lab/lab-screenshots/stable-390.png) | [화면](reports-lab/lab-screenshots/lab-readonly-390.png) | [화면](reports-lab/lab-screenshots/lab-edited-390.png) | [화면](reports-lab/lab-screenshots/lab-link-fees-390.png) |
| 1440 | [화면](reports-lab/lab-screenshots/stable-1440.png) | [화면](reports-lab/lab-screenshots/lab-readonly-1440.png) | [화면](reports-lab/lab-screenshots/lab-edited-1440.png) | [화면](reports-lab/lab-screenshots/lab-link-fees-1440.png) |

위 저장 테스트는 외부 호스트 요청을 차단하고 메모리 응답을 사용하는 브라우저 fixture 환경이다. 실제 운영 정산 API에 쓰지 않았다. Excel 외부 라이브러리 다운로드·실제 회계 파일 전수 대조·운영 MASTER 로그인 E2E는 수행하지 않았다.

## 7. TypeScript / Production Build / 실제 서버 경계

| 검사 | 결과 | 증빙 |
|---|---|---|
| 대상 회귀 테스트 13개 파일 | **81 / 81 PASS** | [테스트 로그](reports-lab/tests.log) |
| 저장소 전체 `tsc --noEmit` | **PASS, exit 0** | [검증 요약](reports-lab/verification-summary.json) |
| Production Build (`next build --webpack`) | **PASS, exit 0** | [전체 빌드 로그](reports-lab/build.log) |
| 변경 파일 ESLint | **PASS, exit 0** | [검증 요약](reports-lab/verification-summary.json) |
| 추적 파일 diff whitespace 검사 | PASS | 변경 범위 검토 |
| 로컬 Production 서버 비인증 LAB 조회 | **401** | [HTTP 결과](reports-lab/production-server-boundary.json) |
| 로컬 Production 서버 LAB PUT/POST/PATCH/DELETE | **모두 405** | 동일 HTTP 결과 |
| 로컬 Production 서버 비인증 기존 정산 조회 | **401** | 동일 HTTP 결과 |

기존 TypeScript 오류는 `programGetValidation.test.ts:98`의 인자 없는 `GET()` 호출이었다. 현재 GET의 `Request` 서명에 맞춰 테스트를 수정했고 해당 테스트도 회귀 실행에 포함했다. 프로그램 런타임 로직은 변경하지 않았다.

빌드 결과에 `/admin/centers`, `/admin/master/reports`, `/admin/master/reports-lab`, `/api/admin/settlement-lab`이 모두 포함됐다. 실제 Production 모드 서버를 로컬 3108 포트에서 잠시 실행해 비인증·쓰기 차단을 확인한 뒤 종료했다. 이것은 운영 배포가 아니다.

주요 재현 명령:

```powershell
node node_modules/vitest/vitest.mjs run app/admin/centers app/admin/master/reports app/admin/master/reports-lab app/api/admin/settlement-sheet/route.test.ts app/api/admin/settlement-centers/route.test.ts app/api/admin/settlement-lab/route.test.ts app/lib/centers/teacherFeePreview.test.ts app/lib/teacherTierSchedule.test.ts app/api/spokedu-master/programs/programGetValidation.test.ts
node node_modules/typescript/bin/tsc --noEmit --pretty false --incremental false
node node_modules/next/dist/bin/next build --webpack
node scripts/qa-center-settlement-stage1.mjs
node scripts/qa-reports-lab.mjs
```

저장소 전체 테스트를 전수 실행한 것은 아니다. 승인 범위의 센터·정산 회귀와 기존 TypeScript 오류 관련 테스트를 실행했다.

## 8. 배포 및 비상 복구 절차 — 미실행

### 승인 후 배포

1. 이 보고서, 변경 파일 범위, 기존 정산 회귀 결과를 검토한다. 승인된 정확한 소스와 현재 안정 배포 식별자를 기록한다. 다른 작업의 미커밋 변경을 섞지 않는다.
2. 현재 구현에는 DB migration이나 LAB 쓰기용 환경변수가 필요 없다. LAB 서버의 쓰기 405를 그대로 유지하고 운영 DB 연결·권한 설정을 변경하지 않는다.
3. 승인된 배포 아티팩트에서 MASTER 계정으로 기존 정산 시트·강사 정산, 센터 모달, LAB 읽기를 최종 확인한다. 일반 관리자·비인증 계정에는 LAB 정산 payload가 없어야 한다.
4. 계산 비교·저장 시연은 LAB 격리 복사본에서만 진행하고 브라우저 네트워크에 운영 정산 PUT/DELETE가 없는지 확인한다. 실제 센터 CRUD·기존 운영 정산 저장은 별도로 승인된 검증 범위에서만 수행한다.
5. 기존 정산 기능 보존과 권한·쓰기 차단이 유지될 때 승인된 코드를 배포한다. 이번 보고 제출은 배포 권한으로 간주하지 않는다.

### 비상 복구

1. LAB 문제만 발생하면 사용자를 안정 버전 `/admin/master/reports?tab=sheet`로 전환한다. 필요한 격리 실험 결과는 폐기 전에 백업 파일로 내려받는다.
2. 코드 롤백이 필요하면 승인된 직전 안정 배포 아티팩트를 복구하고 버전 전환 링크와 LAB 경로를 포함한 변경을 함께 되돌린다. 기존 정산 UI·조회 및 401/403을 다시 확인한다.
3. LAB은 운영 DB에 쓰지 않으므로 **이 구현의 LAB 테스트 때문에 DB 되돌리기 SQL을 실행할 이유가 없다.** 메모리 복사본은 새로고침·종료하면 폐기된다.
4. 기존 센터 CRUD나 안정 정산 화면을 통한 실제 운영 저장은 코드 롤백으로 복구되지 않는다. 운영 데이터 사고가 있다면 쓰기 중단 → 영향 시각·테이블·감사 기록 확인 → 별도 승인된 백업/PITR 복구 절차를 사용한다. 페이지 전환이나 전체 백업 덮어쓰기로 임의 복구하지 않는다.
5. 향후 LAB에 영구 저장소를 추가할 경우 별도 DB/프로젝트·접근 키·스키마·복구 정책을 먼저 승인받는다. 현재 메모리 transport를 운영 API로 바꾸는 변경은 별도 작업이다.

## 9. 남은 범위와 한계

- 인증된 운영 MASTER 데이터 E2E와 배포 후 최종 확인은 미실행이다. 현재 증빙은 모의 데이터 브라우저, 모의 DB API 테스트, 로컬 실제 서버의 비인증/쓰기 차단 검증이다.
- 운영 52개 센터·59개 정산 policy의 최신 건수·전후 DB hash를 새로 실측하지 않았다. Stage 0 원본 감사 자료를 그대로 유지한다. 이번 작업에서 운영 DDL/DML·실제 매핑 저장은 하지 않았다.
- LAB 저장은 탭 메모리 환경이며 영구 격리 DB의 트랜잭션·동시 사용자 검증을 대신하지 않는다. revision 검사는 이 환경 내에서 시험한다.
- Stage 1의 센터 정산 연결은 기존 local-only 저장 제한을 유지한다. 이 작업으로 운영 연결 저장을 열지 않았다.
- 코드 변경은 미커밋 상태다. commit·push·deploy는 수행하지 않았다.
