# SPOMOVE Stage 3 Gate A 최종 검증

기준 HEAD: `61a3b74657ee42ea4a6694baeb09e10c83b25629`. 로컬 변경과 검증만 수행하며 commit/push/deploy 및 DB 변경은 하지 않았다.

최종 상태: **GATE_A_PASS / GATE_B_APPROVAL_PENDING**. 기존 미커밋 변경이 있는 작업트리의 검증 결과이며 pristine HEAD 또는 운영 환경의 PASS를 뜻하지 않는다.

## 승인 파일과 diff

작업 시작 시 승인된 변경이 이미 작업트리에 적용돼 있었다. 중복 수정하지 않았으며 HEAD 대비 아래 한 줄만 변경됐음을 확인했다. 기존 입력·mock·기대값은 그대로다. 운영 API 구현·인증·캐시·조회 계약은 수정하지 않았다.

파일: `app/api/spokedu-master/programs/programGetValidation.test.ts:98`

```diff
-  const response = await route.GET();
+  const response = await route.GET(new Request('http://localhost/api/spokedu-master/programs'));
```

원인: 실제 GET 함수가 필수 Request 인자를 받도록 분리된 뒤 테스트 헬퍼가 인자 없이 호출했다. 쿼리가 없는 기존 목록 요청의 의미를 유지하는 유효한 Request를 전달한다. 기대값이나 API 타입을 완화하지 않는다. 정확한 diff는 `.spomove-stage3-review/gate-a-final/approved-file.diff`에도 보존했다.

## 이번 검증 및 재현성

이번 작업의 증거 디렉터리는 `.spomove-stage3-review/gate-a-final/`이다. 이전 보고서와 로그는 덮어쓰지 않았다. 현재 작업트리의 추적·비추적 소스를 새 임시 디렉터리에 복사해 검사했다. 실제 비밀 환경파일은 제외하고 공개 `.env.example`을 포함했다. public·node_modules는 원본에 junction으로 연결했으며 외부 HTTP 요청은 차단했다. 각 실행 JSON은 명령·시각·종료 코드를 기록한다. `workspace.json`에 검증 소스 위치를 기록했다.

| 검사 | 결과 | 증거 |
|---|---|---|
| Next typegen | PASS | `typegen.json` |
| 전체 TypeScript --noEmit, incremental false | PASS | `typescript.json`, `typescript.log` |
| 변경 파일 ESLint | PASS: 오류 0, 경고 0 | `eslint.json`, `eslint-results.json` |
| programGetValidation 전체 테스트 | 19 PASS / 0 FAIL | `targeted-results.json` |
| 기존 전체 테스트 | 3,092 PASS / 2 SKIP / 0 FAIL | `tests-results.json` |
| Next Production Build --webpack | PASS: exit 0 | `build.json`, `build.log` |

수정 전에는 이전 독립 전체 TypeScript 검사에서 TS2554가 발생했고, 현재 검사에서는 사라졌다. 같은 오류 재출력을 위해 승인된 변경을 되돌리지는 않았다. 이전 실패 증거는 `.spomove-stage3-review/typescript.log`에 그대로 보존했다.

검증 복사본과 검사 완료 시 현재 app/ 파일 1,838개의 바이트를 비교했고 차이는 없었다(`source-stability.json`). 새 제품 변경 없이 승인 파일의 한 줄 diff를 유지했으며 다른 기존 미커밋 파일은 보존했다.

비교 기준 3,081 PASS / 2 SKIP 대비 PASS 11개 증가 원인은 기존 작업트리에 새로 추가된 다른 작업의 테스트다. `app/admin/master/reports-lab/labTransport.test.ts` 7개, `app/api/admin/settlement-lab/route.test.ts` 4개가 추가됐다. 기존 테스트 삭제와 기존 테스트 상태 변경은 없다. 정확한 테스트 이름 비교는 `test-count-comparison.json`에 기록했다. 이 다른 작업의 파일은 수정하지 않았다.

## 감사 증거 보류

Stage 1 원본 `.spomove-audit/` 폴더 누락을 유지한다. Stage 2 manifest의 257개 경로 중 현재 바이트 해시가 다른 77개를 조사했다.

- 63개: 현재 CRLF를 LF로 정규화하면 기존 manifest 해시와 일치한다. 줄바꿈 변환의 바이트 영향으로 분류한다.
- 14개: LF 정규화만으로 일치하지 않는다. 기존 증거가 `337080c8`에서 일괄 추가되어 저장소 안에서 그 이전 작성·변경 이력을 복원할 근거가 없다. 실제 수정 시점과 이유는 **UNRESOLVED**다. 원본 손상 또는 특정 작업자의 변경으로 단정하지 않는다.
- 각 불일치 파일의 경로, manifest 원래 SHA256, 현재 SHA256, HEAD blob SHA256, 원인 분류를 `evidence-mismatches.json`과 `evidence-mismatches.md`에 모두 기록했다. 줄바꿈 외 원인을 추정으로 확정하지 않았다.
- 모든 영향을 받은 기존 증거는 독립 재현 전까지 `VERIFICATION_WITHHELD_PENDING_INDEPENDENT_REPRODUCTION` 상태다. 과거 manifest와 증거를 덮어쓰거나 새 해시로 정본을 교체하지 않았다. 이번 재현 자료는 과거 파일과 구분되는 새 증거다.

## F20

**FALSE_POSITIVE**. 이전 로컬 실제 Next mock 환경의 공식 카드→공용 편집 모달 진입 증거를 유지한다. 미사용 SpomoveContentManager 자체를 CMS 장애로 분류하지 않는다. 해당 함수의 삭제·재연결·리팩터링을 하지 않았다. 운영 계정의 권한·RLS·저장/삭제 왕복 검증 PASS를 뜻하지 않는다.

## Gate B 인계 기준 — 제품 변경 승인 대기

현재 관련 소스와 보존 실패 테스트의 SHA256은 `handoff-source-hashes.json`에 고정했다. 아래 설계는 구현 승인이 아니다. 공식 ID·설정·과거 결과 데이터·내부/보류 프로그램의 별도 규칙을 보존한다. Gate C/D와 혼합하지 않는다.

| 항목 | 현재 코드·독립 증거 | 기대 동작·수정 후보 | 주요 위험·수용 조건 |
|---|---|---|---|
| F18 | EngineRouter와 ColorTrackerReactionTraining에서 legacy 정규화 적용. 공개 15/20/30이 10으로 축소됨. 이번 새 작업공간에서 보존 volume-contract.test.ts 그대로 재실행: 10은 PASS, 15/20/30은 FAIL. `f18-known-failures.json` 참조 | EngineRouter.tsx, roundNormalization.ts, ColorTrackerReactionTraining.tsx를 후보로 고정. 공개 10/15/20/30 전달을 보존하고 내부 legacy 및 NumberCart 정규화와 구분 | 실제 Router→엔진과 로컬 브라우저에서 각 선택값×1/2패널 완료, Setup/HUD/Result/retry/recent/URL 일치. 라운드와 패널별 구역 수를 구분하며 실제 학생 응답으로 오해하지 않음. 기존 실패 기대값 완화/삭제 금지 |
| F19 | 현재 Router durationSec=60, targetReps 동시 전달. 엔진 deadline 스폰 제한과 waveCount 종료 조건 및 후반 bossSpawned 분기 충돌 확인. 과거 브라우저 증거는 정합성 보류이며 이번 범위에서 실제 엔진 독립 재현은 하지 않음 | EngineRouter.tsx, GoalkeeperReactionTraining.tsx를 후보로 고정. 횟수 모드는 목표 waveCount, 시간 모드는 deadline으로 종료. 보너스 단일 진입·기존 보너스 시간 종료 보존 | **승인 후 첫 단계는 현재 코드의 실제 엔진·브라우저 독립 재현. 재현과 소스가 일치해야 수정 근거로 채택.** 10/15/20/30×간격1~6초×tier1/2×보너스on/off 96조합, 시간모드, 마지막 스폰·보너스 전환, 중도종료·unmount·RAF 지연 검증. TIME 0 무한대기와 목표 초과 스폰 제거. 단순 시간연장·목표축소 금지 |

F18 알려진 실패 3개는 Gate B 증거로 분리했다. 기존 전체 테스트 기본 include는 app/**/*.test.ts이며 이 외부 감사 테스트를 Gate A 실패로 혼합하지 않는다. Gate A 통과가 F18/F19 해결을 뜻하지 않는다.

공식 100개·Teacher 33개에 대한 교차 영향 평가와 실제 엔진·브라우저 검증은 Gate B 수용 조건이다. 이번에는 이 전체 실행을 수행하지 않았으며 기존 정상 PASS를 재선언하지 않는다. 다음 공식 7개도 미완료 추적 상태를 유지한다: `visual-reaction-rush-39`, `visual-reaction-goalkeeper-easy-skeleton`, `visual-reaction-goalkeeper-42`, `visual-reaction-number-cart-l2`, `dive-standard`, `dive-color-gate-61`, `dive-random`.
