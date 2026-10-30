# SPOMOVE Stage 3 Gate C 로컬 수정 보고서

**GATE_C1_PASS / GATE_C2_PASS**  
**GATE_C_LOCAL_COMPLETE / GATE_D_APPROVAL_PENDING**

판정은 아래에 명시한 로컬 소스와 검증 범위에 한정한다. 운영 배포·실계정 권한·모든 기기·모든 오류 원인의 통합 PASS가 아니다.

## 1. 선행 조건과 보존

작업 시작 시 로컬 HEAD·origin/main·읽기 전용 원격 main 조회가 모두 `61a3b74657ee42ea4a6694baeb09e10c83b25629`로 일치했다. 미커밋 목록, Gate B 5개 파일의 SHA256, 이번 수정 전 원본 바이트는 `.spomove-gate-c/baseline.json`, `start-status.txt`, `before/`에 보존했다. 초기 Gate B 해시 5개 모두 일치했다. 기본 전체 테스트 비교 기준은 3,168 PASS / 2 SKIP이다.

Gate B의 흰 공 정규화·골키퍼 엔진·두 회귀 테스트는 변경하지 않았다. 생성된 소스 digest는 C1에서 실제로 바뀐 Visual/Router 항목만 기존 생성기로 갱신했다. visualGoalkeeper digest는 Gate B 값을 유지한다. 공식 프리셋 설정·ID·이전 결과 데이터·수업 완료 저장 계약을 변경하지 않았다. Gate A Request 전달 수정도 보존했다.

기존 센터·재고·리포트 관련 변경은 수정하지 않았다. Git stage/commit/push/deploy, DB·마이그레이션, 인증·구독 정책 변경은 수행하지 않았다. Stage 1 증거 폴더 누락, Stage 2 manifest 불일치는 기존 보류 상태로 유지하며 이번 결과로 복구 완료 처리하지 않는다.

## 2. 변경 파일과 전후 diff

전체 **Gate C 시작 시점 → 최종** diff는 `.spomove-gate-c/gate-c.diff`에 보존한다. HEAD 대비 diff에는 이미 있던 Gate B 변경이 섞이므로 Gate C 산출물에서는 시작 스냅샷을 기준으로 분리했다. MemoryGameApp·Teacher·EngineRouter는 C1/C2가 공유하는 파일이므로 아래 변경 목적을 함께 확인해야 한다.

| 구분 | 파일 | 실제 변경 |
|---|---|---|
| C1 | `app/admin/spomove/training/_player/lib/trainingResultSummary.ts` | 기존 legacy stoppedEarly와 명시적 네 상태를 함께 해석. 공통 결과에 선택적 completionReason/stims 전달 |
| C1 | `.../_player/MemoryGameApp.tsx` | 하위 stoppedEarly/명시 상태와 실제 stims 보존, 실행당 결과 전달 guard, 재실행 때 guard 초기화, 준비 중 취소/런타임 실패 구분 |
| C1 | `.../_player/components/VisualReactionTraining.tsx` | 자연 완료/STOP 경합 guard, 준비 중 취소 구분, 시작·프레임·resize 콜백 예외를 failed로 전달 |
| C1 | `.../_player/components/TrainingRunErrorBoundary.tsx` (신규) | React/lazy 실행 자식 오류를 failed로 전달. 에셋 재시도·복구 로직은 추가하지 않음 |
| C1 | `.../_player/components/TrainingResultScreen.tsx` | 기존 sessionResultModel의 제목·상태 뱃지를 모든 호출부에 적용 |
| C1 | `app/teacher/spomove/page.tsx` | 공통 결과의 completionReason 전달, legacy stoppedEarly 호환 |
| C1 | `app/spokedu-master/spomove/session/EngineRouter.tsx` | 명시 상태 우선 + 기존 STOP/natural fallback 유지, React 실행 오류 전달 |
| C1 파생 | `app/lib/spomove/generated/spomoveGuideSourceDigests.generated.ts` | visualFlowFlash/simonBalloon/engineRouter digest 동기화. CMS 저장 source 승인은 수정하지 않음 |
| C2 | `.../_player/lib/lockViewportScroll.ts` | 획득별 idempotent release, 원래 overflow 선언·축·우선순위 복원, 마지막 소유자 해제 후 microtask 복원 |
| C2 | `MemoryGameApp.tsx` | runtime와 result 사이에 부모 잠금 소유권 유지 |
| C2 | `teacher/spomove/page.tsx` | runner/result를 가로지르는 상위 소유자 사용, 재실행 raw lock 제거 |
| C2 | `app/admin/spomove/training/page.tsx` | portal 수명 소유권으로 교체, 강제 전역 해제 호출 제거 |
| C2 | `app/spokedu-master/spomove/session/page.tsx` | 실행에서 획득한 release 핸들만 해제, finish와 unmount에서 idempotent 정리 |
| 회귀 | `trainingCompletion.test.ts`, `VisualReactionTraining.terminal.test.ts`, `lockViewportScroll.test.ts` (신규) | 총 16개: 상태·측정값·경합·오류·취소·StrictMode·중첩 소유·스타일 복원 |

경로의 `.../_player`는 `app/admin/spomove/training/_player`다. `trainingResultRichContent.ts`는 이미 completionReason을 받으면 canonical truth로 문구를 바꾸므로 수정하지 않았다. 기존 `sessionResultModel.ts`의 네 상태와 MASTER/LAB terminal receipt 계약도 수정하지 않았다.

## 3. C1 원인·구현·증거

하위 엔진은 STOP 시 stoppedEarly=true를 만들었지만 MemoryGameApp.handleReactTrainComplete가 이 필드를 버렸다. Admin/Teacher 결과 호출부도 종료 사유 없이 기본 완료 문구를 사용했다. Visual의 예약된 자연 완료와 STOP이 경합할 때 중복 callback 가능성도 있었다.

명시적 completionReason을 우선하고 기존 boolean fallback은 보존했다. 결과 전달은 실행마다 한 번으로 제한하고 새 실행에서만 초기화한다. 색 lane 매핑·경과 시간 계산·실제 자극 집계를 변경하지 않았다. 네 상태를 서로 합치지 않으며, 준비 countdown 중 취소와 런타임 오류도 natural_complete로 변환하지 않는다. MASTER/LAB의 runId·terminal receipt·자연 완료에서만 수업 완료 동작을 허용하는 기존 조건을 유지했다.

실제 Canvas 예외 주입 과정에서 React Error Boundary가 timer/RAF/ResizeObserver 콜백 예외까지 처리하지 못한다는 점을 확인했다. Visual의 해당 실행 콜백에서 오류를 failed로 전달하도록 했으며, 전역 error listener나 자동 재실행·이미지 준비 복구는 추가하지 않았다.

### 수정 전 → 수정 후

- C1 요구 테스트는 수정 전 실패하고 수정 후 PASS다(`c1-red.json`, `c1-green.json`, `targeted.json`).
- 더 직접적인 비교를 위해 **시작 시 보존한 원본 바이트를 별도 임시 환경에 덮어** 실행했다. 작업트리를 되돌리지 않았다. 원래 Admin player는 STOP 후 payload.stoppedEarly=false, completionReason 없음 및 기본 완료 화면을 재현했다(`before-browser.json`, `c1-before-false-complete.png`, `before-workspace.json`). 이는 정합성 보류된 Stage 2 증거의 재사용이 아니라 별도 실행이다.
- 수정 후 Admin 공통 player 4상태, Teacher 4상태, MASTER/LAB 4상태를 로컬 실제 Chromium 엔진으로 확인했다(`c1-browser.json`, `c1-cross.json`). MASTER/LAB receipt의 사유도 화면과 일치했다.
- Visual 실제 컴포넌트 가상 시계 테스트는 STOP 우선/자연 완료 우선 경합 모두 callback 1회, 준비 중 취소, Canvas 예외 failed를 확인했다. 중도 종료 뒤 새 실행의 자연 완료는 실제 Next Admin 흐름에서 확인했다.

| 내부 상태 | 최종 표시 |
|---|---|
| natural_complete | 정상 완료 |
| stopped_early | 중도 종료 |
| cancelled | 실행 취소 |
| failed | 실행 오류 |

검증한 비정상 결과에서 완료·완주·성공을 자동 판정하는 문구는 없었다. 활동의 정의·설정 분량과 실제 측정값은 구분한다. 모든 가능한 기기 오류/엔진 내부 예외를 수집했다는 의미는 아니다.

## 4. C2 원인·구현·증거

Teacher의 재실행 버튼이 반환할 주체 없이 raw lock을 추가했다. forceUnlock은 다른 소유자를 함께 지우고 원래 clip/scroll을 빈 문자열로 바꿨다. MASTER 실행 잠금에는 finish 외 route 이탈/unmount의 반환 경로가 없었다.

각 획득이 자기 release를 반환하도록 바꿨다. 중복 해제는 아무 소유자도 추가로 지우지 않는다. 기존 overflow/overflow-x/overflow-y 선언과 !important를 저장하고 마지막 소유자가 없을 때 복원한다. layout-effect 획득과 microtask 복원으로 같은 commit의 handoff/StrictMode 재획득 사이에서 잠금이 풀리지 않게 했다. 다른 CSS 속성을 통째로 덮어쓰지 않는다.

Teacher와 Admin은 runtime/result를 가로지르는 부모 소유권을 유지한다. MASTER는 자기 runtime release만 finish/unmount에서 정리한다. result와 다른 modal의 소유권은 독립적이다. 제품 코드의 forceUnlock 호출을 제거했고, 호환 export도 live owner를 지우지 않게 했다. SPOMOVE 외부 시스템을 리팩터링하지 않았다.

### 수정 전 → 수정 후

- 소유권 회귀 테스트: 수정 전 **1 PASS / 6 FAIL**, 수정 후 **7 PASS** (`c2-red.json`, `c2-green.json`).
- 원본 바이트의 별도 브라우저 실행에서 Teacher 3회 재실행→목록 후 hidden 잔류(F03), MASTER 실행→unmount 후 hidden 잔류(F11)를 독립 재현했다(`before-browser.json`).
- 수정 후 실제 Next Teacher에서 두 viewport 각각 재실행 10회·STOP·result·목록 복귀, Vite 엔진에서 외부 modal 소유자가 있는 3회 재실행을 확인했다. 다른 소유자가 남으면 hidden을 유지하고 마지막 release 후 clip!important/scroll로 복원됐다.
- 실제 Next Admin의 STOP→결과→재실행→자연 완료→목록 복귀와 MASTER/LAB의 STOP→재실행 Setup→실행 중 경로 이탈 및 실제 브라우저 뒤로 가기를 390/1440 각각 확인했다.

| 범위 | 증거 | 확인 |
|---|---|---|
| 실제 Next Teacher, 390/1440 | `next-browser.json`, `next-teacher-result-*.png` | 10회 반복 중 hidden 유지, 마지막 목록에서 clip/scroll |
| 실제 Next Admin, 390/1440 | `next-admin.json`, `next-admin-*.png` | 정상·STOP·retry·result·복귀 |
| 실제 Next MASTER/LAB, 390/1440 | `next-browser.json`, `next-master-route-exit-*.png` | STOP·retry와 실행 중 다른 경로 이동 cleanup |
| 실제 Next 브라우저 뒤로 가기, 390/1440 | `next-back.json` | 실제 시계 사용, 실행 중 history back 후 원래 스타일 복원 |
| 중첩 modal, 390/1440 | `owned-browser.json` | 다른 소유권 유지, 이중 release 안전, priority 복원 |
| StrictMode·축별 스타일 | `lockViewportScroll.test.ts` | 3/10회 mount 교체·unmount·중복 해제 |

## 5. 최종 품질 게이트와 Gate B 회귀

확정 전체 검사: `.spomove-gate-c/final-verification/`.

| 검사 | 최종 결과 |
|---|---|
| 전체 TypeScript | PASS |
| 변경 파일 ESLint | 오류 0 / 경고 0 |
| 전체 Vitest | **3,184 PASS / 2 SKIP / 0 FAIL** |
| Next Production Build --webpack | PASS |
| Gate B 회귀 unit 76개 | PASS. 필수 F19 48개 조합 포함 |
| F18 실제 엔진 | 10/15/20/30 × 1/2패널 8개 PASS (`b1-browser.json`) |
| F18 전체 Session 연속성 | 같은 8개 조합에서 결과·재실행 URL·최근 설정·STOP·복귀 PASS (`b1-continuity.json`) |
| F19 대표 브라우저 | 5개 PASS. 30회·6초, 보너스 유무, 더블 슛, 실제 시계 조건 포함 (`b2-browser.json`) |
| F19 결과·STOP·재실행·복귀 | 쉬움/보통 두 공식 경로 PASS (`b2-lifecycle.json`) |

전체 증가 16개는 이번 C1/C2 신규 테스트다. 기존 SKIP은 2개 그대로이며 테스트 제거·기대값 완화·skip 추가는 없다. 기존 source 계약 테스트 두 개가 초기 검사에서 실패했으나, 테스트를 바꾸지 않고 실제 legacy STOP 분기와 명시 사유 우선 처리를 함께 보존해 통과시켰다. 초기 exhaustive-deps 경고도 실제 dependency를 추가해 해소했다. 중간 실패 자료는 `verification/`에 유지한다. 최종 source 비교는 app/ 1,844개 파일에서 검사 복사본과 작업트리 차이가 없음을 기록한다(`source-stability.json`).

## 6. 환경 구분·실제 화면·콘솔

Vite 독립 harness는 현재 실제 엔진·SessionPage·TeacherPage를 실행하지만 Next navigation/auth/asset pack은 mock이다. 반면 `next-*.json`은 설치된 실제 Next 16.2.11 dev 서버의 페이지·portal·App Router 렌더링이다. 보호 경로 진입에는 localhost 전용 인증 fixture와 가짜 테스트 쿠키를 사용했다. 제품 proxy·인증 코드는 변경하지 않았다. DB 쓰기와 외부 자원 요청은 차단했고 실제 계정/RLS/영속 저장/배포 검증으로 해석하지 않는다. Next dev와 production build 결과도 구분한다.

390/1440 populated result 스크린샷을 직접 검토했다. 정확한 중도 종료 표시와 측정값/설정 분량 구분을 확인했다. 기존 디자인 승인이나 Surface Matrix의 시각 PASS를 갱신하지 않았다.

최종 Next 기능 시나리오의 uncaught page error는 0이었다. 다만 **콘솔 전체가 0인 것은 아니다**. `next-resource-probe.json`에 URL까지 수집했다.

- 외부 SUIT/Pretendard/Google Fonts 요청 차단에 따른 ERR_FAILED: 로컬 격리 정책의 의도된 결과.
- `/api/institution/status` 403: 비기관 Teacher fixture의 의도된 응답.
- `/_next/image`의 `/images/spokedu/brand/spomat-square-cutout.png` 요청 400: 현재 로컬 public 파일이 없고 응답은 “The requested resource isn't a valid image.”였다(`local-image-400.json`). 발생 시점·운영 상태는 미확정이며 C1/C2 수정 경로와 무관한 이미지 문제로 별도 기록한다. 이번에는 수정하지 않았다.

초기 인증 fixture 포트·선택자 인코딩·페이지 hydration 전 조작·가상 시계가 route transition을 막은 시험도 별도 원본으로 남겼다. 제품 결함으로 집계하지 않았으며, 최종 back 테스트는 실제 시계와 hydration 대기 후 성공했다.

## 7. 공식 100개·Teacher 33개와 남은 범위

공식 100개, Teacher 33개를 다시 순회했다(`official-coverage.json`, `teacher-coverage.json`). 일반 순회에서 공식 93개·Teacher 33개의 결과 화면 단계를 관측했다. **정상 제품 PASS율이 아니다.** 각 row의 STOP/retry/복귀 존재 여부는 별도 필드로 기록하며 결과 화면 도달만으로 전 단계 PASS를 주지 않았다. 일괄 순회에는 거친 가상 시계와 synthetic asset을 사용했다.

일반 순회 미완료 7개는 flash-33, rush-39, white-ball-hard, simon-balloon-flash-05, simon-balloon-hard, dive-color-gate-61, dive-standard다. 시간 0/자극 부족 또는 물리·프레임 진행과 가상 시간 차이, 순회 시간 예산 초과가 관측됐다. 다른 원인의 자연 완료는 미검증 상태를 유지한다. 흰 공 hard는 별도 F18 분량 검사에서 완료했다. 이들 다른 엔진의 스폰·시간·이미지 준비 로직은 수정하지 않았다.

| 기존 미완료 공식 경로 | 이번 상태 |
|---|---|
| visual-reaction-rush-39 | STOP·retry 관측, 자연 완료/복귀 미검증 |
| visual-reaction-goalkeeper-easy-skeleton | 결과 단계 관측 + 별도 정상/STOP/retry/복귀 회귀 PASS |
| visual-reaction-goalkeeper-42 | 위와 같음. Gate B 완료 조건 보존 |
| visual-reaction-number-cart-l2 | 결과 단계 관측. 순회 탐색기의 STOP/복귀 미검증 |
| dive-standard | 시간 예산 내 자연 완료·복귀 미검증 |
| dive-color-gate-61 | 시간 예산 내 자연 완료·복귀 미검증 |
| dive-random | 결과 단계 관측, STOP/retry/복귀 미검증 |

## 8. 영향·보류·종료 경계

영향은 SPOMOVE 공통 결과 표시와 viewport 잠금 소유권이다. Admin·Teacher가 더 이상 STOP을 기본 완료로 표시하지 않으며, MASTER/LAB의 기존 receipt 및 수업 완료 의미는 유지된다. 시간 모드·반복 모드·F18/F19 자극 완료 조건은 바꾸지 않았다. 기존 Source Changed 편집 검증은 런타임 소스 변화에 맞게 갱신되지만 저장된 CMS 승인을 자동 변경하지 않는다.

Stage 1 원본 누락과 Stage 2 해시 불일치는 계속 보류다. 신규 소스·원본 snapshot·시험 스크립트·JSON·PNG·log의 SHA256은 `.spomove-gate-c/evidence-manifest.json`에 기록한다. Gate B 보존 비교와 기존 증거의 변화 여부도 별도 JSON에 기록한다. Gate B 증거 142개는 모두 원래 해시와 일치했고, Gate B 엔진·정규화·회귀 테스트 4개도 동일하다. 생성 파일 전체 해시는 C1 소스 변경으로 달라졌으나 visualGoalkeeper 항목은 유지됐다. Gate A 테스트 수정의 해시도 동일하다(`gate-a-preservation.json`).

실계정·운영 저장의 exactly-once·실기기 Safari/WebKit·GPU/오디오·전체 오류 종류·미완료 공식 경로·새로 관측한 로컬 이미지 400은 미검증 또는 별도 확인 대상이다. 이번 Guard는 한 실행의 중복 callback을 막으며 서버 데이터 전체에 대한 중복 저장 보장을 새로 정의하지 않는다. Gate D의 F16/에셋 복구, F01 및 기타 P2/P3, CMS·디자인·권한·구독·DB·배포는 시작하지 않았다. 모든 변경은 미커밋 상태다.
