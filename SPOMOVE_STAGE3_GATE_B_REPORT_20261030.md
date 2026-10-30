# SPOMOVE Stage 3 Gate B 로컬 수정 보고서

**GATE_B1_PASS / GATE_B2_PASS**  
**GATE_B_LOCAL_COMPLETE / GATE_C_APPROVAL_PENDING**

## 범위와 기준선

기준 HEAD는 `61a3b74657ee42ea4a6694baeb09e10c83b25629`이며 시작 시 로컬 HEAD·origin/main·원격 main이 모두 일치했다. Git 원격 조회 외 pull/fetch/reset/checkout/clean/rebase는 실행하지 않았다. 시작 미커밋 파일 목록과 F18/F19 관련 소스 SHA256은 `.spomove-gate-b/start-status.txt`, `baseline.json`, 원본 바이트는 `before/`에 보존했다. 대상 엔진 파일에는 다른 작업자의 변경이 없었다.

Gate A의 Request 전달 한 줄 변경을 그대로 유지했다. F02/F03/F04/F11/F16, F20, 인증·구독·DB·마이그레이션은 수정하지 않았다. commit/push/deploy도 하지 않았다. 사용자의 이번 지시를 명시적인 Sprint 범위로 적용했다.

## 실제 수정 파일 및 diff

| 단계 | 파일 | 변경 |
|---|---|---|
| B1 | `app/admin/spomove/training/_player/lib/roundNormalization.ts` | 공개 선택값 10/15/20/30만 정확히 보존하는 3줄 추가 |
| B1 테스트 | 같은 디렉터리 `roundNormalization.test.ts` | 공개·반복 정규화·레거시·비정상 입력·Number Cart 보호 19개 |
| B2 | `app/admin/spomove/training/_player/components/GoalkeeperReactionTraining.tsx` | 횟수 스폰/진행/완료와 시간 종료 분리, 마지막 공 도착 후 전환, 일회 완료 및 타이머 정리 |
| B2 테스트 | 같은 디렉터리 `GoalkeeperReactionTraining.test.ts` | 실제 컴포넌트 스케줄·Three 장면을 가상 시계로 검증하는 57개 |
| 파생 산출물 | `app/lib/spomove/generated/spomoveGuideSourceDigests.generated.ts` | 기존 생성기로 visualGoalkeeper 소스 digest 한 항목만 갱신 |

`EngineRouter.tsx`, ColorTracker 컴포넌트, 공식 프리셋, Teacher 커리큘럼, 기존 결과/저장 스키마는 변경하지 않았다. Router와 ColorTracker가 이미 같은 정규화 함수를 호출하므로 공유 함수의 정확한 값 보존만으로 이중 축소를 해결했다. 골키퍼도 실제 스폰의 소유자인 컴포넌트에서 수정해 Router의 시간을 늘리는 우회를 쓰지 않았다.

전체 전후 diff: `.spomove-gate-b/gate-b.diff`. 최종 소스 원본과 SHA256: `after/`, `source-hashes-final.json`. 신규 회귀 테스트 전체 내용도 diff에 포함했다. 생성된 digest는 현재 런타임 소스와 동기화하기 위해 필요했으며 CMS의 저장된 source 승인값을 재작성하지 않았다. 골키퍼의 기존 편집 콘텐츠가 Source Changed로 표시될 수 있으며, 이를 자동 재승인하지 않는다.

## B1 — GATE_B1_PASS

**근본 원인:** 공개 Setup은 10/15/20/30을 전달하지만 레거시 nearest-option 정규화가 `[2,3,5,10]`으로 다시 매핑해 15/20/30을 10으로 축소했다. Router와 ColorTracker 양쪽에서 이 함수가 적용됐다.

**선택한 수정:** 정확히 일치하는 공개 선택값은 그대로 반환한다. 기존 레거시 옵션 상수 `[2,3,5,10]`과 비정상 입력의 기존 fallback/반올림/근접값 선택은 유지했다. Number Cart 함수/옵션과 다른 반응형 엔진을 변경하지 않았다. 임의 값 전체를 허용하도록 정규화를 제거하지 않았다.

**Red → Green:** 보존된 `.spomove-audit-stage2/volume-contract.test.ts`의 테스트·기대값을 변경하지 않고 수정 전 1 PASS/3 FAIL, 수정 후 4 PASS를 확인했다(`b1-red.json`, `b1-green.json`). 기존 테스트 바이트 해시는 Gate A 기록과 동일하다(`preserved-f18-test.json`). B1 회귀 19개도 PASS다.

**실제 엔진 검증:** 로컬 Chromium에서 현재 EngineRouter→실제 Canvas 엔진으로 10/15/20/30 × 1/2패널 8개 조합 모두 HUD 목표·완료 stims·자연 완료 1회를 확인했다(`b1-browser.json`). 그 뒤에만 B2 수정에 착수했다.

**전체 Session 연속성:** 같은 8개 조합으로 현재 SessionPage의 Setup→HUD→결과→같은 설정 준비→재실행 URL→owner가 설정된 mock store의 최근 설정에 동일 rounds가 유지됐다. 재실행 후 STOP 결과와 목록 복귀도 확인했다(`b1-continuity.json`).

라운드/stims는 훈련 라운드 수다. 매 라운드 1패널은 하나, 2패널은 두 개의 정답 구역이 laneCount/colorCounts에 집계된다. 2패널의 합계가 라운드의 두 배임을 별도 검증했으며 실제 학생 반응이나 정답률을 측정한 것으로 해석하지 않았다. 표시된 공 수(9/13개)는 추적 자극 구성이고 실행 라운드 수와 다르다. 기존 저장 기록을 재계산하지 않았다.

## B2 — GATE_B2_PASS

**근본 원인:** Router가 전달한 durationSec=60에 스폰이 종속됐지만 완료 조건은 waveCount 목표를 기다렸다. 스폰이 끊긴 뒤에는 목표에 도달할 수 없었다. 단순 deadline 제거만으로는 후반 phase 분기와 마지막 공 처리/완료 경쟁까지 해결되지 않는다.

**수정 전 독립 재현:** 실제 골키퍼 컴포넌트의 결정적 테스트에서 30회·6초가 200초 후에도 완료 callback 0회였다(`b2-red.json`). 별도 실제 Chromium에서도 가상 210초 후 TIME 0·9 COMBO·callback 0을 재현했다(`b2-browser-red.json`, `b2-red-time0.png`). 과거 Stage 2 증거를 수정 근거로 재사용하지 않았다.

**수정 동작:**

- 횟수 모드는 waveCount/target으로 페이즈 진행률과 HUD를 결정하고 모든 페이즈에서 목표까지 실제 스폰한다. deadline으로 스폰을 자르거나 목표를 줄이지 않는다.
- 마지막 wave를 더 스폰하지 않으며, 이미 제시한 마지막 공들이 모두 도착한 뒤에만 본편 완료 또는 보너스 전환을 허용한다. 더블 슛은 한 wave이고 결과 stims는 실제 공 도착 수라는 기존 집계를 유지한다.
- 시간 모드는 기존 duration clamp·deadline·스폰 규칙을 유지한다. 보너스는 기존 조건에서 한 번만 시작하며 기존 15초 종료를 유지한다. 보너스의 waveCount 비가산 의미도 유지한다.
- natural end에도 running guard를 적용하고 STOP의 stoppedEarly=true를 유지한다. countdown/interval/RAF 및 골키퍼의 일회 효과 timeout을 stop/end/unmount에서 정리한다. 공유 결과·저장 코드와 다른 엔진의 타이머는 건드리지 않았다.

**결정적 검증 57 PASS:** 반복 4개 × 간격 6개 × 보너스 유무의 필수 48개 조합, 기존 60초 초과 재현, 시간 모드 2개, 더블 슛, 마지막 wave 도착 후 보너스 1회/15초 종료, 준비·본편·보너스 중 STOP, unmount를 포함한다. 완료 후 30초를 더 진행해 callback/자극 증가가 없고 타이머 0임을 검사했다. Three WebGLRenderer와 Canvas drawing만 mock이며 실제 컴포넌트의 스폰·projectile·종료 스케줄을 실행했다(`b2-green.json`, 최종 전체 테스트에도 포함).

**실제 Chromium 5개 대표 조건 PASS:** 10회·1초·단일·보너스 없음, 30회·6초·더블 가능·보너스 없음, 20회·3초·보너스 있음, 15회·1초·더블 가능·보너스 있음, 가상 시계를 쓰지 않은 10회·1초 실행(약 15초 실제 경과). callback은 모두 한 번이었다(`b2-browser.json`).

**전체 Session 수명주기:** 골키퍼 쉬움/보통 두 공식 프리셋에서 자연 완료→재실행 Setup→STOP→100초 추가 진행→목록 복귀를 확인했다. 종료 receipt는 stopped_early를 유지하고 최근 항목은 프로그램당 한 개였다(`b2-lifecycle.json`). 운영 DB 쓰기는 차단했으므로 실제 서버 결과 저장의 중복 여부를 통합 PASS로 선언하지 않는다. 취소/오류를 자연 완료로 바꾸는 새 경로는 추가하지 않았다.

## 통합 검증과 환경 한계

최종 전체 검증 증거 디렉터리는 `.spomove-gate-b/current-final/`이다. 소스 검사는 현재 추적·비추적 파일을 임시 작업공간에 복사해 실행하며 비밀 환경파일은 제외하고 외부 요청을 차단했다. Next Build는 실제 설치된 Next 16.2.11의 production build --webpack이다.

| 최종 검사 | 결과 | 증거 |
|---|---|---|
| 전체 TypeScript | PASS, exit 0 | `current-final/typescript.json` |
| 변경 5개 파일 ESLint | 오류 0 / 경고 0 | `current-final/eslint-results.json` |
| 전체 기존+신규 테스트 | 3,168 PASS / 2 SKIP / 0 FAIL | `current-final/tests-results.json` |
| 전체 Next Production Build | PASS, exit 0 | `current-final/build.json`, `build.log` |
| 최종 소스 일치 | app/ 1,840개 파일 차이 없음 | `source-stability.json` |

전체 테스트는 3,168 PASS / 2 SKIP으로 Gate A의 3,092 PASS / 2 SKIP 대비 회귀 76개가 추가됐다. 기존 테스트 제거·상태 변경·skip 추가는 없다. 변경 파일 ESLint 오류/경고 0, 전체 TypeScript와 Production Build PASS를 확인했다. 첫 검증 시 신규 Canvas mock의 overload 타입과 갱신 전 digest 검사에서 실패했으며 최종 소스에서 해소했다. 실패 로그도 지우지 않았다.

브라우저는 새 `.spomove-gate-b/`의 독립 Vite harness에서 현재 실제 SessionPage/EngineRouter/Canvas/Three 엔진과 TeacherPage를 실행했다. Next navigation/dynamic/image 및 인증·asset pack은 명시적 로컬 mock이며, 실제 SSR·middleware·운영 계정 권한·영속 DB·상용 이미지/오디오·실기기는 UNVERIFIED다. synthetic assets를 사용했다. Next production build PASS를 브라우저 전체 제품 PASS로 바꾸지 않는다. 시각 디자인 PASS도 선언하지 않는다.

최초 전체 검증 이후 다른 작업자의 `LegacyInventoryClient.tsx`, `equipment/rpcMap.ts` 변경을 source 비교로 발견했다. 다음 검사 중에는 LegacyInventory의 오류 toast 한 줄이 추가로 바뀌었다. F18/F19 충돌은 없었으며 두 파일을 수정하지 않고 최신 소스를 새로 복사해 전체 검증을 다시 수행했다. `current-final/` 실행 완료 시 app/ 1,840개 파일 모두 현재 작업트리와 일치했다. 이전 차이는 `initial-snapshot-drift.json`, `second-snapshot-drift.json`, `concurrent-inventory-drift.diff`에 보존한다.

## 공식 100개 / Teacher 33개 교차 영향

공식 100개 전부 재순회했다(`official-coverage.json`, 이번 소스의 `current-catalog.json`). 일괄 순회에서 결과 화면 단계가 관측된 것은 92개, 자연 완료 미확인은 7개, Setup 진입 미확인은 1개다. 이 수치는 실행 단계 관측이며 **제품 정상 PASS율이 아니다**. STOP·retry·복귀의 단계별 존재 여부는 각 row에 따로 기록했으며 결과 화면만 관측된 항목을 전 단계 PASS로 취급하지 않는다.

일괄 순회 미확인: flash-33, rush-39, simon-balloon-flash-05, simon-balloon-hard-skeleton은 거친 가상 시계에서 TIME 0·목표 미달로 남았다. 원인이 실제 결함인지 시계의 callback 생략인지 독립 판정하지 않았고 이번 범위에서 수정하지 않았다. dive 2개는 렌더 진행/물리와 시계 진행이 달라 시간 예산 안에 미완료였다. `reaction-cognition-l5-mix-exp`는 15초 내 시작 버튼 미관측으로 차단됐으며 원인은 미확정이다. 흰 공 hard의 일괄 순회는 18/20에서 예산을 초과했지만 별도의 더 정확한 분량/Session 테스트에서 10/15/20/30 모두 완료했다. 원본 일괄 순회 row는 PASS로 덮어쓰지 않았다.

Teacher 33개도 모두 재순회해 결과 화면 단계를 관측했다(`teacher-coverage.json`). 현재 Teacher 33개에는 골키퍼/흰 공이 없고 반응형 활동은 풍선·벽돌·두더지·카모플라쥬의 기존 time-mode 경로다. Admin MemoryGameApp은 골키퍼에 targetReps 없이 기존 duration을 전달하므로 time-mode 경로를 유지한다. Admin의 흰 공은 같은 정규화를 사용하며 legacy 값은 회귀 테스트로 보존했다. MASTER/LAB은 같은 SessionPage→Router를 사용한다. Admin 전체 메뉴/권한의 독립 UI QA를 완료했다고 해석하지 않는다.

### 기존 공식 7개 경로 추적

| ID | 이번 관측 / 남은 제한 |
|---|---|
| visual-reaction-rush-39 | 실행·STOP·retry 관측. TIME 0·stims 3에서 자연 완료 미확인, 이번 범위 밖 |
| visual-reaction-goalkeeper-easy-skeleton | 결과 단계 관측. 별도 자연 완료·retry·STOP receipt·목록 복귀 검증 PASS |
| visual-reaction-goalkeeper-42 | 위와 같음. 30회·6초 조건도 별도 실제 엔진 PASS |
| visual-reaction-number-cart-l2 | 결과 단계 관측. 순회 STOP 탐색기에서 제어를 찾지 못해 STOP/retry/복귀는 미검증 |
| dive-standard | STAGE 2·14s까지 관측. 물리/시계 예산 내 완료 미확인, STOP/retry/복귀 미검증 |
| dive-color-gate-61 | 표시 9/20, 실제 진행 표시 8/20까지 관측. 이후 완료 미확인, 나머지 단계 미검증 |
| dive-random | 결과 단계 관측. STOP/retry/복귀는 미검증 |

## 증거 보존·회귀 위험·이후 경계

Stage 1 원본 증거 폴더 누락과 Stage 2 manifest 불일치는 이전 Gate A 최종 보고서의 보류 상태를 유지한다. 과거 증거·manifest를 덮어쓰지 않았다. Gate B 수정 근거는 이번 현재 소스의 독립 Red/Green 재현이다. 신규 증거의 path/bytes/SHA256은 `.spomove-gate-b/evidence-manifest.json`에 기록한다.

초기 브라우저 harness의 라우트 선택·PowerShell 한글 선택자·최근 owner 초기화 오류와 미완료 실험 자료도 남겼다. 최종 증거는 위에서 지정한 JSON이며 초기 harness 오류를 제품 결함으로 집계하지 않았다. `final/`, `final2/`는 중간 실패/검증, `verified/`, `current-verified/`는 이후 다른 작업자 변경이 발견된 중간 검사다. 현재 소스의 최종 통합 검사는 `current-final/`이다.

잔여 위험은 실제 계정/기기/브라우저 엔진별 GPU·background 동작·운영 저장 통합, 기존 미검증 공식 경로, Gate C/D 결함이다. 이번 변경은 레거시 설정·공식 프리셋 ID·과거 결과 데이터를 이관하거나 변경하지 않는다. 완료 callback guard는 로컬 중복 콜백을 막지만 서버 저장 전체의 exactly-once 보장은 이번 검증 대상이 아니다. Gate C·D와 운영 배포는 별도 승인 전까지 진행하지 않는다.
