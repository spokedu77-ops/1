# SPOMOVE FORENSIC AUDIT — STAGE 2

**최종 판정: AUDIT_INCOMPLETE / FIX_NOT_STARTED**  
2026-10-30, Asia/Seoul. 제품 수정·DB 변경·stage·commit·push·브랜치 생성·배포 없음.

기존 [F01~F15 보고서](SPOMOVE_FORENSIC_AUDIT.md)는 유지한다. 시작 시 보고서의 바이트 복사본은 [stage1-report-preserved.md](.spomove-audit-stage2/stage1-report-preserved.md)에 보존했다. 수정 제안은 [별도 계획](SPOMOVE_FIX_PLAN.md)에만 둔다.

## 1. 결론과 감사의 경계

공식 Preset **100개 전부**, Teacher **33개 전부**에 자동 순회를 시도했다. 모든 ID를 시도했다는 것과 모든 실행 단계가 검증됐다는 것은 다르다. 공식 Preset 중 완료까지 관측되지 않은 항목, 실제 Next 전체 레이아웃, 브라우저·실기기 검증이 남아 있어 AUDIT_COMPLETE로 선언하지 않는다.

이번 Stage에서 확인한 핵심 사항:

- F11: 실제 Session 클라이언트 실행 중 unmount 후 html/body 스크롤 잠금 잔류를 재현했다.
- F02/F03: Teacher의 종료 문구와 retry 잠금 문제는 여러 프로그램에서 반복 관측됐다. 프로그램별 목록은 coverage-summary에 있다.
- F01: 실제 타이머가 pause flag를 무시하는 것은 재확인했다. 그러나 현재 Session 소스에서 `paused`에 진입하는 사용자 전이를 찾지 못했다. 원본 감사의 공통 훅 재현을 현재 사용자 pause 화면 장애로 확대하지 않는다.
- F12/F13: 비운영 신원·조회 fixture로 실제 인증 함수를 실행했다. 허용 동작은 확정했지만, 정책 위반 여부는 계약 확인 필요다.
- 신규 F16: 빈 이미지 팩에서 autoLaunch가 Get ready 상태로 무기한 진행 대기한다.
- 신규 F17: Next production build가 금지된 page 추가 export 때문에 타입 검사에서 실패한다.
- 신규 F18: 흰 공 찾기의 공개 반복 선택값이 엔진에서 축소된다.
- 신규 F19: 골키퍼의 고정 60초 스폰 제한과 반복 완료 조건이 충돌한다.

**P0 확정 없음. P0 부재를 보증하지 않는다.** 운영 계정·운영 DB·실제 기관 테넌트에 대한 침투/쓰기 검증은 하지 않았다.

## 2. 기준선, 기존 증거, 동시 변경

HEAD와 원격 main은 모두 `685fe9eed8ee42a57ed1fea89902ffa792529094`였다. 원격은 `git ls-remote origin refs/heads/main`으로 읽기 전용 확인했다.

시작 시 이미 `SPOMOVE_FORENSIC_AUDIT.md`, 홈페이지 소스, 삭제 파일, 미추적 QA script와 `.vscode/` 등이 있었다. [시작 상태](.spomove-audit-stage2/start-git-status.txt)와 [2,266개 소스 해시](.spomove-audit-stage2/start-source-hashes.json)를 저장했다. 감사 중 범위 밖 마케팅 파일의 동시 변경이 관측됐으며 되돌리거나 포함해 발행하지 않았다. [변경 비교](.spomove-audit-stage2/source-drift.json)의 `coreDrift`는 SPOMOVE·관련 인증·layout 기준 검사다.

이 컴퓨터에서 이전 `.spomove-audit/`는 없었다. 로컬 전체 Git 이력과 tree, 원격 main SHA, 연결 GitHub 파일 검색에서도 해당 증거 폴더를 찾지 못했다. 따라서 과거 스크린샷·JSON을 이번에 재확인했다고 주장하지 않는다. 기존 보고서와 Git에 있던 보고서는 보존하지만, 다른 컴퓨터의 미추적 증거를 복구한 상태는 아니다. 원본의 옛 `.spomove-audit/` 링크는 역사적 참조다.

## 3. 검증 방법과 재현성

### 실제 코드와 fixture의 구분

1. MASTER/LAB: 실제 `session/page.tsx`, `EngineRouter`, 실제 엔진·Result·store를 import한 Chromium 클라이언트 harness.
2. Teacher: 실제 `teacher/spomove/page.tsx`, 원본 8주/33개 curriculum, 실제 공통 player와 Result.
3. 외부 경계만 대체: Next navigation/Link/Image/dynamic adapter, MasterAccessProvider snapshot, Supabase 조회·storage URL. 엔진 완료 callback을 임의 호출하거나 시험용 엔진으로 대체하지 않았다.
4. 모든 외부 브라우저 요청과 쓰기 요청 차단. DB mock의 insert/update/upsert/delete도 예외를 던지게 했다. 로컬 16개 SVG stimulus fixture를 사용했고 운영 이미지 변환을 사용하지 않았다.
5. 과일·동물 등의 SVG는 **감사용 합성 에셋**이다. 실제 상용 이미지의 지도 품질·가독성·저작물 배치 검증은 아니다.

이 harness는 실제 Next AppShell·서버 인증·styled-jsx 컴파일 전체를 재현하지 않는다. Vite에서 `jsx/global` style 속성 경고가 발생했고, scoped CSS와 전역 CSS의 우선순위가 Next와 같다고 가정하지 않았다. 클라이언트 실행 증거와 실제 Next rendered visual PASS를 분리한다.

### 시계와 입력

- 기본 전수 순회는 Playwright virtual clock의 500ms fastForward 단계를 사용했다. 프레임 정확성·실제 노출 시간·물리 이동 품질의 PASS가 아니다.
- 정답 공개, 다음, 질문 시작, 정답 목록, 결과 보기 등 원래 UI 조작을 수행했다. 화면에 사람이 답하는 활동의 확인 버튼을 누른 것이며 학생 정답·성과를 조작하지 않았다.
- 초기에는 수동 공개/다음 입력이 부족해 일부 기억 게임이 timeout이었다. 보완한 재시도는 별도 evidence 파일로 남겼다. 이러한 초기 대기를 제품 결함으로 확정하지 않는다.
- native RAF cadence의 runFor 재시도와 **시계 주입 없는 실제 시간 실행**도 분리 저장했다. 실제 시간 결과는 `realtime-results.json`, 30회·6초 골키퍼 조건은 `goalkeeper-count-result.json` 참조.
- 첫 3D dependency 최적화에 의한 Vite reload로 복구 화면이 나타난 사례가 있었다. 초기 실패는 유지하고 후속 서버에서는 HMR 및 새 의존성 discovery를 비활성화했다. 로딩·시계 실패는 무조건 제품 FAIL로 환산하지 않았다.

### 대상과 판정 데이터

- [catalog.json](.spomove-audit-stage2/catalog.json): 실제 코드에서 얻은 100/33개 입력과 engine/launch 설정.
- [coverage-summary.json](.spomove-audit-stage2/coverage-summary.json): 중복 ID를 제거한 단계별 최종 집계.
- [official-selected-evidence.json](.spomove-audit-stage2/official-selected-evidence.json), [teacher-selected-evidence.json](.spomove-audit-stage2/teacher-selected-evidence.json): 각 ID의 선택된 관측 기록과 원래 evidence 파일명.
- `EXECUTED`는 setup→run→stop result→retry→natural result→return이 관측됐다는 뜻이다. F02/F03/F18 같은 내용·수명주기 결함이 있으면 정상 PASS가 아니다.
- 재시도 중 성공한 단계가 이전에 실패한 전체 시도를 없애지 않는다. 원본 시도 JSON과 screenshot을 남겼다.

## 4. F01~F15 재판정과 교차 영향

| ID | Stage 2 판정 | 교차 서비스와 근거 |
|---|---|---|
| F01 | 공통 훅 결함 CONFIRMED; 현재 노출 위험은 조건부 | `runtimeClock.ts:20`, `:38`, `:47`, `:56`가 pause를 scheduling에 반영하지 않음. 실제 hook repro 및 Session flag 주입 후 natural_complete. `session/page.tsx`에는 pause에서 resume하는 코드와 overlay는 있으나 `setState('paused')`/동등 진입 없음. Admin/Teacher도 이번에 사용자 pause 경로를 확인하지 못함. 현재 노출 P1로 단정하지 않고 latent P2/계약 확인으로 한정 |
| F02 | CONFIRMED P1 유지 | Teacher33개 모두 stop 결과에 정상 완료/완주 표현 관측. 원본 Admin 재현은 유지하되 Stage 2 실제 Next 재현은 완료 못함. 성공한 MASTER 경로의 stop receipt는 `stopped_early`를 보존하므로 모든 서비스가 동일하게 잘못 기록된다고 하지 않음 |
| F03 | CONFIRMED P1 유지 | Teacher33개 모두 retry 후 return 기록에 html/body `hidden` 잔류. 최초 프로그램 한 개뿐 아니라 전 curriculum ID에서 반복. Admin의 force reset과 별개 |
| F04 | CONFIRMED P2 재현 | 실제 함수에 html=`clip`, body=`scroll` 후 lock→forceUnlock, 둘 다 빈 값. `cross-results.json`, 신규 unit repro |
| F05 | 기존 확정 유지, Stage 2 전체 rendered 확장 미완료 | source `training/page.tsx:1047-1051`, `:1084`, `:1102` 분기 보존. 새로운 실제 Next 매트릭스 진입이 timeout. 과거 화면 증거 파일은 현재 컴퓨터에서 복구되지 않음 |
| F06 | 기존 전역 CSS 사실 유지 | player/Result를 공유하는 경로 후보. Vite와 Next의 scoping 차이 때문에 이번 harness의 스타일을 실제 전역 CSS 피해의 최종 증거로 쓰지 않음 |
| F07 | STATIC CONFIRMED P2 유지 | Admin `training/page.tsx:701`의 잘못된 필드 전달 유지. 서로 다른 두 값의 실제 복원 UI 재현은 여전히 미완료 |
| F08 | STATIC CONFIRMED P2 유지 | `MemoryGameApp.tsx:925`, `:1170`, `:1190` 손상 TTS 리터럴. 이번 실청각·TTS 정상/실패 전수 미실행 |
| F09 | 기존 확정 유지; 이번 전 플랫폼 확대 미완료 | 하위 `exitFullscreen()` promise 처리 누락은 유지. 실제 Safari/모바일 fullscreen 실패·ESC는 미검증 |
| F10 | 기존 표시 ID 결함 유지 | `catalogBasicUiLevel` legacy 8→7 및 shape flag 분리 문제. 엔진 자체가 잘못 실행된다고 추가 추론하지 않음 |
| F11 | LIKELY → CONFIRMED P1 (클라이언트 unmount) | 아래 독립 재현. MASTER/LAB 공통 Session 코드 영향. 실제 Next 브라우저 back의 서버 경로까지 검증한 것은 아님 |
| F12 | 허용 동작 CONFIRMED; 정책 위반 판정 보류 | 아래 read-only auth fixture 2개. 서버 전체 관리자와 화면 제한의 의도에 대한 계약 확인 필요 |
| F13 | 허용 동작 CONFIRMED; 정책 위반 판정 보류 | 아래 users/기관/로그인 fixture 6개. users 행 존재 요구 정책 확인 필요 |
| F14 | 기존 치수 결함 유지 | Next styled-jsx 조건의 새 치수 검증 미완료. harness에서 44px가 나와도 개선됐다고 판정하지 않음 |
| F15 | LIKELY 유지 | 예약 완료 음성 handle 수명 문제의 실청각 재현은 미완료. source만으로 영구 메모리 누수라고 하지 않음 |

### F11 — 실행 중 이탈의 잠금 잔류

- 파일: `session/page.tsx:768` acquisition, `:833` 정상 종료 release, `:905` unmount clock reset, `:946-955` leaveSession.
- 조건: 실제 Session client를 시작하고 준비 이후 root를 unmount한다.
- 기대: 이 화면이 획득한 lock이 해제되고 이전 overflow 복원.
- 실제: 반환 marker가 표시된 뒤에도 html/body 모두 `hidden`. terminal receipt는 null이다.
- 원인: 정상 finish와 달리 경로 이탈/unmount의 상위 lock 소유권 release 없음.
- 영향: MASTER와 LAB의 공유 client Session. child engine의 lock 정리가 상위의 수동 획득까지 없애지는 못한다.
- 증거: [cross-results.json](.spomove-audit-stage2/cross-results.json)의 `F11-unmount`, `F11-unmount.png`.

### F12/F13 — 비운영 인증 검증

실제 `requireAdmin`, `check-admin.GET`, `requireTeacherMaterialsAccess`를 실행하되 `auth.getUser`, users/profiles 조회, institution 조회만 fixture로 대체했다. Supabase service key는 유효하지 않은 감사 placeholder이며 네트워크 호출·실제 쓰기 없음.

| 조건 | 실제 함수 결과 |
|---|---|
| SPOMOVE 이메일 identity | requireAdmin ok; check-admin의 scope는 spomove |
| 일반 identity | 관리자 거부 403 |
| 로그인 + 비기관 + users 행 없음 | Teacher 자료 허용 |
| users.is_active=true | 허용 |
| users.is_active=false | 403 |
| 기관 identity | 403 |
| 비로그인 | 401 |
| users 조회 실패 | 403 |

파일: `platformAdminIdentity.ts:5-9`, `adminAuth.ts:101` 부근 및 `requireAdmin`, `api/auth/check-admin/route.ts`; `teacherAuth.ts:23-62`. F12의 연결된 write route는 `api/admin/think-asset-pack/route.ts:17-19`에서 requireAdmin을 사용한다. **이 감사에서 그 write route를 실제 계정으로 호출하지 않았다.**

`scope=spomove`가 보안 권한 경계라면 서버 정책 보완이 필요하지만, 전체 관리자의 화면만 제한하는 계약이면 권한 상승 결함이라고 할 수 없다. users 행 부재 허용 역시 현재 코드 주석의 “로그인/종료 강사”와 등록 강사 전용 정책 중 무엇이 계약인지 확인해야 한다. 별도 권한 결정 없이 수정하면 안 된다.

증거: [auth.test.ts](.spomove-audit-stage2/auth.test.ts), [auth-tests.json](.spomove-audit-stage2/auth-tests.json).

## 5. 신규 결함

### F16 — 빈 이미지 팩 autoLaunch의 무기한 대기 / P1 / CONFIRMED

- 파일: `MemoryGameApp.tsx:1088-1091` session slide snapshot; `:1206` 이후 pending auto start; `:2563-2581` manual Setup의 readiness 차단; `hooks/useTrainingTimer.ts:184-190` valid signal만 횟수 증가; `lib/assetRequirement.ts:60` 부근.
- 재현: 실제 Session `reaction-cognition-l3-fruit-exp`, 비운영 빈 팩 조회 결과, 시작 후 virtual 120초 진행.
- 기대: 필요한 이미지가 없으면 시작 차단 또는 명확한 오류/복귀 경로. 정상 훈련처럼 계속 대기하지 않음.
- 실제: `REPS 20 / STOP / Get ready`, terminal receipt 없음. STOP은 stopped_early 결과를 만든다.
- 원인: 수동 Setup의 asset readiness 차단과 autoLaunch 경로가 일치하지 않음. 유효 이미지 신호가 없으면 count 기반 완료에 도달하지 않는다.
- 영향: 이미지가 필요한 basic/theme autoLaunch 경로. MASTER/LAB에서 독립 재현. Teacher/Admin은 같은 player 경로지만 동일 빈 팩의 모든 테마를 별도로 재현한 것은 아님.
- 증거: [empty-assets-result.json](.spomove-audit-stage2/empty-assets-result.json), `F16-empty-assets.png`, 정상 fixture의 후속 동일 테마 실행 결과.
- 제한: 운영 팩이 실제로 비어 있다고 주장하지 않는다. 장애/빈 데이터 조건 결함이다.

### F17 — Production Build page export 차단 / P1 / CONFIRMED

- 파일: `app/admin/spokedu-master/programs/page.tsx:1612`의 `export function SpomoveContentManager`; 생성 검사 `.next/types/app/admin/spokedu-master/programs/page.ts:14`.
- 재현: 추적된 현재 작업 파일을 격리 폴더에 복사, .env 파일·운영 key 제외, 외부 네트워크 차단 후 `next build --webpack`.
- 기대: 유효한 Next page export 계약을 만족하고 production build 완료.
- 실제: webpack compile은 통과했지만 page 타입 검사에서 `SpomoveContentManager`가 허용된 page export index signature와 충돌, exit 1.
- 원인: Next page 모듈을 일반 재사용 컴포넌트 export 위치로도 사용함.
- 영향: SPOMOVE CMS/관련 Admin page를 포함하는 **전체 Next production build**. 상용 runtime을 지금 중단시키는 배포 장애가 발생했다고 주장하지 않는다. 새 artifact 생성이 차단된다.
- 증거: [production-build.log](.spomove-audit-stage2/production-build.log), [production-build-result.json](.spomove-audit-stage2/production-build-result.json), [build-metadata.json](.spomove-audit-stage2/build-metadata.json).
- 구분: 첫 Turbopack 시도는 격리 node_modules junction의 root 경계 오류였다. 그 infrastructure 오류를 제품 결함으로 분류하지 않았다. 지원되는 webpack 재시도에서 위 제품 오류를 확인했다.

### F18 — 공개 반복 선택값과 White Ball 엔진 불일치 / P1 / CONFIRMED

- 파일: `session/EngineRouter.tsx:557-562`, `training/_player/lib/roundNormalization.ts:1-17`; `session/page.tsx`의 10/15/20/30 선택 및 rounds 전달; `resolveSpomoveExecutionVolume.ts:190-191`.
- 재현: `visual-reaction-color-tracker-l2`의 Setup 기본 20회로 시작.
- 기대: PD-018에 따라 선택값이 실행 목표·HUD·결과·retry까지 동일 의미로 유지됨.
- 실제: Setup `총 반복 20회`, 실행 `ROUND 1 / 10`. normalizeColorTrackerRounds는 15/20/30을 모두 최대 10으로 바꾼다.
- 원인: 공개 공통 선택기는 새 계약을 따르지만 엔진 경계에 과거 [2,3,5,10] 허용값 정규화가 남음.
- 영향: 공개 흰 공 찾기 보통/어려움 계열의 engine level 9. 2패널의 학생 응답 수와 round 수를 혼동해 1패널의 20→10 축소를 정당화하지 않는다. Number Cart도 별도 제한 옵션을 쓰므로 추가 정합 대상이며 보류/내부 공개 여부는 구분해야 한다.
- 증거: 해당 preset의 `official-selected-evidence.json` Setup/running, [volume-contract.test.ts](.spomove-audit-stage2/volume-contract.test.ts), [final-new-tests.json](.spomove-audit-stage2/final-new-tests.json)의 15/20/30 세 실패.
- 결과: 전 과정을 수행한 ID도 이 내용 결함 때문에 제품 PASS가 아니다.

### F19 — 골키퍼 시간 제한과 횟수 종료 충돌 / P1 / CONFIRMED

- 파일: `session/EngineRouter.tsx:570-581`의 durationSec=60/targetReps/bonus; `GoalkeeperReactionTraining.tsx:630-639` 스폰 시간 제한, `:593` waveCount 증가, `:746-760` 완료·bonus 진입 조건.
- 재현: 실제 Session에서 합법적인 URL/Setup 조건 30회·자극 6초. 준비 후 virtual 120초. 별도로 시계 주입 없이 기본 설정의 두 골키퍼를 실제 시간으로도 실행했다.
- 기대: 선택된 반복 목표까지 gate/shot wave가 진행되고 그 이후 bonus·결과로 전이.
- 실제: 30회·6초 Setup이 확인됐으나 실행은 TIME 0과 STOP에 남는다. 자연 완료 없음. 실제 시간 시도도 약 106~110초의 active snapshot과 TIME 0을 남겼다.
- 원인: 반복 목표 완료는 waveCount를 요구하지만 스폰은 고정 duration의 마지막 1.5초 전에 멈춘다. 목표를 그때까지 채우지 못하면 시간 종료 조건은 targetReps가 있다는 이유로 무시되고, 더 이상 waveCount가 증가하지 않아 완료/bonus에 도달할 수 없다. 느린 cue 또는 프레임 지연 조건에서 특히 명확하다.
- 영향: 두 공식 골키퍼 Preset의 MASTER/LAB 직접 EngineRouter 경로. Admin/Teacher의 player는 별도 duration/target 전달이 있으므로 같은 고정 60초 caller 결함을 그대로 적용하지 않는다. child 컴포넌트의 유사 조건은 각각 검증 필요.
- 증거: [goalkeeper-count-result.json](.spomove-audit-stage2/goalkeeper-count-result.json), `F19-goalkeeper-count.png`, [realtime-results.json](.spomove-audit-stage2/realtime-results.json), `realtime-visual-reaction-goalkeeper-*.png`.
- 구분: 거친 가상 시계의 timeout만으로 확정한 것이 아니다. 원래 시계 재현과 고정 스폰 상한/선택 목표의 소스 충돌을 함께 확인했다.

## 6. 전수 시도 커버리지와 남은 범위

최종 수치는 [coverage-summary.json](.spomove-audit-stage2/coverage-summary.json)에 기록했다. 아래 수치는 마지막 집계 기준이며 상세 실패·미검증 ID는 같은 파일에 전부 있다.

| 단위 | 전체 | 실제 시도 | 전 단계 관측 | 정상 PASS 판단 |
|---|---:|---:|---:|---|
| 공식 Preset | 100 | 100 | 93 | 일부 내용 결함이 있으므로 93 PASS라는 뜻이 아님 |
| Teacher 프로그램 | 33 | 33 | 33 | F02/F03을 제외한 정상 판정 아님 |
| 기존 SPOMOVE/접근 테스트 | 785 | 785 | 785 PASS | 파일별 실제 testResults 참조 |
| 신규 repro/auth/volume 테스트 | 15 | 15 | 12 PASS / 3 FAIL | repro PASS에는 결함 재현 성공 포함 |
| Next Production Build | 1 webpack 재시도 | 1 | FAIL | F17, prerender/최종 artifact 단계 미도달 |
| 실제 Next Admin rendered 매트릭스 | 34테마×10폭 기준 | 진입 시도 | 0 완료 | 120/180초 응답 대기 timeout |
| Firefox/WebKit | 각 1 browser family | 0 | 0 | 설치된 binary 없음, 미실행 |
| 실제 모바일 Safari/Android·가로·safe area | 실기기 미확정 | 0 | 0 | viewport 축소를 실기기로 간주하지 않음 |

검사 항목을 한정한 PASS/FAIL/미검증 집계:

| 검사 assertion | 전체 | 실제 검증 | PASS | FAIL | 미검증 / 유보 이유 |
|---|---:|---:|---:|---:|---|
| 공식 client의 전 단계 출현과 정상 완료 receipt | 100 | 93 전 단계 관측 | 93 | 0 | 7 전 단계 미관측. 두 골키퍼는 별도 종료 실패를 확인; 나머지는 준비/시계/성능 한계 |
| 위 93개의 Setup와 retry Setup 텍스트 일치 | 93 | 93 | 93 | 0 | 내부 engine target의 정합 PASS와 다름; F18은 따로 실패 |
| Teacher stop 시 정상 완주 주장 금지 | 33 | 33 | 0 | 33 | 없음 |
| Teacher retry→목록 후 스크롤 잠금 해제 | 33 | 33 | 0 | 33 | 없음 |
| 신규 test assertion | 15 | 15 | 12 | 3 | 일부 PASS는 결함 재현 성공 |
| production build 완료 | 1 | 1 | 0 | 1 | F17 |
| 실제 Next Admin 기본 테마×폭 시각 검증 | 340 | 0 완료 | 0 | 0 | 340 미검증. 진입 timeout, 추가 선택 조합 분모는 별도 미확정 |

이 표의 93 PASS는 lifecycle 출현·receipt에 한정한다. 흰 공 찾기의 분량 축소 등 내용 결함이 있는 ID를 제품 정상 PASS로 바꾸지 않는다. 전체 제품 PASS 수를 산출할 만큼 모든 assertion을 검증하지 못했다.

공식 전체 100의 전 단계 미관측 항목은 골키퍼의 확인된 실패와 Rush/숫자 기차/DIVE의 준비·시계·성능 제한을 포함한다. 이 항목은 stop·complete·result·return을 모두 확인했다고 처리하지 않았다. 원본 timeout을 지우지 않았고, 독립 재현 결과가 있으면 함께 기록했다.

Teacher는 처음에는 30개만 자연 결과를 관측했고 기억 활동의 정상 입력을 추가해 잔여를 완료했다. 한 재시도의 임시 로딩 실패가 이전 또는 후속 성공을 무효화하지 않으며, 선택된 record와 원본 시도 파일을 함께 제공한다.

### 해상도·표시·lifecycle 범위

- 공식 기본 순회: 1440×900. Teacher 기본 순회: 390×900. 이는 두 viewport의 client component 검증이다.
- 성공한 공식 경로의 Setup/retrySetup 텍스트 일치와 receipt의 stop/natural reason을 집계했다. 모든 내부 engine props와 저장 backend를 완전히 round-trip 계측했다는 뜻은 아니다. F18처럼 Setup의 텍스트가 retry에서 같아도 실행 target은 틀릴 수 있다.
- Teacher 결과/복귀의 overflow와 각 화면 텍스트, button 치수, screenshot을 보존했다. 모든 screenshot을 사람 기준으로 전수 visual PASS 검토하지 않았다.
- 실제 Next Admin 34테마·10폭·개별 옵션 순회는 준비했으나 해당 Next dev route의 컴파일/응답이 끝나지 않아 첫 진입에서 timeout이었다. Vite 보조 상태 순회도 Next와 동일 scoping이라고 할 수 없고 안정적인 전체 결과를 확보하지 못했다. Stage 1의 340행을 Stage 2 재실행으로 재사용하지 않는다.
- 브라우저 확대, 네트워크/미디어 장애의 전체 조합, 실제 ESC/back/refresh, full screen 실패의 전 기기, 오디오 실청각·TTS·autoplay, 장시간 heap/GPU/AudioContext leak 검증은 남아 있다.
- 실행/결과 전체 상태 공간의 정확한 전체 분모는 아직 미확정이다. 100개 ID의 단일 기본값 순회를 난이도·추가 옵션 Cartesian 전수로 계산하지 않았다.

따라서 공식 **모든 ID의 시도는 완료**했지만, 요청한 모든 실행 단계·선택 상태·실제 renderer 확장은 **미완료**다.

## 7. 기존·신규 테스트 및 Build 증거

기존 테스트는 Stage 1 PASS를 재사용하지 않고 실행했다.

```text
node node_modules/vitest/vitest.mjs run app/admin/spomove/training/_player app/spokedu-master/spomove app/lib/spomove app/api/spokedu-master/spomove app/lib/server/teacherAuth app/lib/server/spokeduMasterAccess app/spokedu-master/lib/masterAccessModel app/spokedu-master/lib/spomoveTrialAccess --reporter=json --outputFile=.spomove-audit-stage2/existing-tests.json
node node_modules/vitest/vitest.mjs run --config .spomove-audit-stage2/vitest.config.ts --reporter=json --outputFile=.spomove-audit-stage2/final-new-tests.json
node .spomove-audit-stage2/build.cjs
```

신규 테스트 구성: 인증 8개, 실제 hook/lock의 관측 결함 repro 3개, PD-018 volume 4개. 합계 15개 중 12개 통과, volume 15/20/30 세 assertion 실패. 고친 코드의 회귀 테스트가 아니라 현재 결함을 드러내는 증거다.

Build는 `.spomove-audit-stage2/build-workspace/` 격리 복사본에서 수행했다. .env.local과 운영 credential을 복사하지 않았고, 외부 fetch/http/https는 preload guard로 차단했다. 다른 사람의 마케팅 변경이 포함된 시작 시점 작업 파일 snapshot을 사용했다. 따라서 감사 종료 시점의 모든 동시 마케팅 변경까지 build했다고 주장하지 않는다. F17 파일과 SPOMOVE 핵심 소스의 해시는 기준선과 같다.

실제 Next Admin 경로 시도는 별도 `next-dev.log`, `admin-matrix.cjs`, `next-repro.cjs`에 남겼다. dev server의 Ready나 webpack compile 성공을 rendered PASS 또는 production build 성공으로 처리하지 않았다.

## 8. 증거 파일과 재실행 안내

모든 Stage 2 증거는 `.spomove-audit-stage2/`에 있다. 핵심 재현 도구:

| 도구/결과 | 용도 |
|---|---|
| `snapshot.cjs`, start-source-hashes, stage1-report-preserved | 기준선·기존 보고서 보존 |
| `serve.mjs`, `harness.tsx`, `mocks/`, `assets/` | 실제 client 모듈 + 비운영 경계 |
| `runner.cjs`, official-results-shard*.json | 공식 100개 입력·상태·receipt·반환 |
| `teacher-runner.cjs`, teacher-*-results.json | Teacher33개, 후속 원래 입력 조작 |
| `summarize.cjs`, coverage-summary, *-selected-evidence | 중복 제거·실제 관측 및 미완료 ID 목록 |
| `cross.cjs`, cross-results | F01/F04/F11 독립 재현 |
| `auth.test.ts`, auth-tests | F12/F13 read-only 조건 |
| `runtime-repro.test.ts`, volume-contract.test.ts, final-new-tests | 재현·제품 계약 검증 |
| `empty-assets.cjs`, empty-assets-result | F16 |
| `build.cjs`, network-guard, production-build* | F17 및 비운영 build 제한 |
| `goalkeeper-count.cjs`, goalkeeper-count-result, realtime* | F19, coarse/native 시계 구분 |

raw 증거를 그대로 git publish하지 않았다. 설치·패키지 업데이트·운영 로그인도 하지 않았다. 합성 자산과 mock이 없는 운영 화면의 정상성을 이 자료로 보증하면 안 된다.

## 9. 최종 판정

**AUDIT_INCOMPLETE / FIX_NOT_STARTED**.

사유: 공식 일부 Preset의 전 단계 미관측, 실제 Next 레이아웃 전수 확장 실패, 주요 browser/실기기·오디오·장시간 안정성 미검증, F12/F13 정책 미확정, 이전 컴퓨터의 raw 증거 미복구. 실제로 수행한 시도와 확인된 실패는 모두 결과에 포함했고 미검증을 PASS로 처리하지 않았다.

수정은 [별도 계획](SPOMOVE_FIX_PLAN.md)에 정리했으며 승인 전에는 시작하지 않는다.
