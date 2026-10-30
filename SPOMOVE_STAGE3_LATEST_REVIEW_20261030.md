# SPOMOVE Stage 3 최신 코드 재검증 — 2026-10-30

이번 작업은 읽기 전용 제품 검증 및 수정 설계다. 제품 코드, DB, 권한, CMS 구조를 수정하지 않았고 Git stage/commit/push/deploy를 하지 않았다. 새 산출물은 이 보고서와 `.spomove-stage3-review/`뿐이다.

## 기준선 및 증거 보존

- 로컬 HEAD, 로컬 origin/main, 원격 main 모두 `61a3b74657ee42ea4a6694baeb09e10c83b25629`. 원격은 `git ls-remote https://github.com/spokedu77-ops/1.git refs/heads/main`으로 확인했다. fetch/pull/reset/checkout/clean/rebase는 실행하지 않았다.
- **BASELINE_MISMATCH**: SHA는 일치하지만 작업트리는 센터 정산·장비 재고 관련 기존 수정 12개와 다수 신규 파일을 포함한다. 검증 대상은 이 미커밋 소스까지 포함한 현재 작업트리다. 깨끗한 HEAD 단독 검증 결과로 해석하면 안 된다.
- SPOMOVE, ProgramsAdmin, Note 삭제 관련 기존 미커밋 충돌은 없다. 기존 Gate A 코드 변경은 이미 커밋 이력에 포함되어 있다. 최신 분리/헬퍼 수정을 다시 적용하지 않았다.
- 최근 6개 커밋 및 파일 목록: `.spomove-stage3-review/last-six-commits.txt`. 기존 변경 통계와 상태: `existing-change-stat.txt`, `final-status.txt`.
- Stage 1·2 및 Gate A/후속 보고서는 있다. Stage 1 보고서가 참조하는 `.spomove-audit/` 원본 증거 폴더는 현재 로컬에 없다.
- Stage 2 manifest 257개 경로는 모두 존재한다. 현재 작업 파일의 77개 해시가 manifest와 다르다. Git HEAD blob으로 다시 확인해도 15개 불일치가 남는다. 작업트리 차이는 줄바꿈 변환의 영향을 받을 수 있으므로 원본 손상으로 단정하지 않는다. 다만 완전한 원본 바이트 보존을 인증할 수 없다. `evidence-check.json`, `evidence-git-check.json`에 목록을 보존했다. 기존 증거를 수정하거나 재생성하지 않았다.

## Gate A — GATE_A_BLOCKED

현재 소스를 임시 디렉터리에 복사하고 의존성과 public만 junction으로 연결했다. 실제 비밀 환경파일은 복사하지 않았고 외부 HTTP 요청을 차단했다. 공개 `.env.example`은 소스 계약 검사에 포함했다. 경로·실행 시각·명령·종료 코드는 각 JSON에 기록했다.

| 검사 | 이번 실행 결과 | 증거 |
|---|---|---|
| Next typegen | PASS | `typegen.json`, `typegen.log` |
| 전체 tsc --noEmit | FAIL: TS2554 1건 | `typescript.json`, `typescript.log` |
| Next production build --webpack | PASS, exit 0 | `build.json`, `build.log` |
| 전체 기존 테스트 | 3,081 PASS / 2 SKIP / 0 FAIL | `tests-corrected-results.json` |
| API·CMS·Note 관련 테스트 | 141 PASS | `api-cms-results.json` |
| e654aa48 변경 TS/TSX 전체 ESLint | 오류 0 / 경고 0 | `eslint-results.json` |
| 보존 F18 실패 테스트 | 1 PASS / 3 FAIL | `f18-preserved-results.json` |

증거 파일은 모두 `.spomove-stage3-review/` 아래에 있다. 첫 전체 테스트 실행은 임시 복사 과정에서 `.env.example`을 누락해 실패했다. `tests-results.json`을 폐기하지 않고 보존했으며, 파일을 복사한 후 전체를 다시 실행한 결과가 위 최종 수치다. 커밋 메시지의 수치는 재사용하지 않았다.

현재 tsc 오류: `app/api/spokedu-master/programs/programGetValidation.test.ts:98`의 `route.GET()`에 필수 Request 인자가 없다. 최신 `programCatalogHandlers.ts:493` GET은 Request를 요구한다. 제안하는 별도 Gate A 수정은 이 테스트 호출에 실제 GET Request를 전달하는 최소 변경이다. 테스트 기대값이나 운영 API 타입을 완화할 이유는 없다. **아직 수정하지 않았다.**

Build PASS와 전체 tsc FAIL은 모순이 아니다. 설치된 Next의 `dist/lib/typescript/runTypeCheck.js:115–121`은 test/spec 파일 진단을 빌드 오류 판정에서 제외한다. 독립 tsc 결과를 대체할 수 없다.

F17: page는 default re-export만 갖고 실제 컴포넌트는 ProgramsAdmin에 있다. GA-BLOCK-01: about 인물 데이터는 공통 HOME_SECTION03_PEOPLE spread를 사용하며 중복 nameEn 선언이 없다. GA-BLOCK-02: Note 헬퍼는 일반 모듈로 분리돼 있고 DELETE가 호출한 뒤 delete_document 감사 로그를 기록한다. 관련 mock/계약 테스트는 통과했지만 실제 운영 계정의 저장·삭제·감사 로그·복원 통합 PASS는 선언하지 않는다.

## F20 조사

`SpomoveContentManager` 자체는 탭 목록/렌더 분기에 없으며 초기 activeTab도 유효 탭 검사 후 첫 탭으로 교정된다. 그러나 실제 공식 편집 경로는 별도로 존재한다.

`/admin/spokedu-lab/spomove` (MASTER 원본 경로로 rewrite) → `spomove-catalog` → `SpomoveCatalogManager` → 공식 카드 클릭 → `SpomoveEditModal`.

두 컴포넌트는 `useSpomoveContentData`를 통해 같은 콘텐츠 pack을 읽고, `/api/admin/think-asset-pack`에 expected_updated_at과 함께 저장한다. 모달은 가이드/카드 정보/고급 편집과 저장·삭제 핸들러를 제공한다. 카드 직접 링크로 모달 ID를 여는 URL 계약은 확인되지 않았다. 카탈로그 경로와 모달 경로는 코드로 연결돼 있다.

기존 split 테스트는 문자열 `SpomoveContentManager` 존재만 확인하고 compact 테스트도 소스 문자열을 확인하므로 실제 화면 도달성의 증거가 아니다. 과거 후속 조사에는 `a2dfd112f`에서 카탈로그로 화면 기능을 이전한 기록이 있다. 레거시 함수 영구 폐기의 제품 승인까지 증명하지는 못한다. 삭제/재연결하지 않았다.

로컬 Next 브라우저 조사 결과와 제한은 `.spomove-stage3-review/cms-results.json`에 기록한다. 인증과 콘텐츠 읽기는 브라우저 mock이며 실제 DB 쓰기는 차단한다. 따라서 이 검사는 실제 계정 권한·RLS·영속 저장의 통합 검증이 아니다.

**F20_FALSE_POSITIVE — 공식 콘텐츠 편집 화면 도달 불가라는 가설에 한정.** 현재 Next 화면에서 `/admin/spokedu-lab/spomove` 직접 진입 → 공식 카탈로그 → 첫 카드 클릭 → 가이드/카드 정보/고급 모달 진입을 1440px·390px 모두 확인했다. pageerror는 모두 0이었다. 실제 편집 필드 및 저장·삭제 버튼이 렌더링됐다. `cms-1440.png`, `cms-390.png`와 최종 JSON을 보존했다. 첫 시도는 다른 section 버튼 선택, 두 번째 시도는 PowerShell 파이프의 한글 선택자 인코딩 손실로 실패했으며 각각 별도 JSON에 남겼다. 선택자를 바로잡은 후 정상 진입했다. 이 자동화 실패를 제품 결함으로 집계하지 않는다. 레거시 함수 미사용과 잘못된 초기 탭 값은 남아 있지만 기능 전체의 단절 근거는 아니다. 실제 계정 로그인·전체 카드별 필드 동등성·저장/삭제 왕복과 정식 시각 QA는 UNVERIFIED다.

## Gate B — APPROVAL_PENDING

Gate A가 차단돼 있어 Gate B 구현 착수 조건은 충족되지 않았다. 아래는 승인 검토용 예비 설계이며 GATE_B_READY 선언이나 적용 승인이 아니다. 수정 전후 제품 diff는 **없음**이다. 수정 후 PASS는 미실행이다.

### F18 최소 변경안

- 원인: `EngineRouter.tsx`와 `ColorTrackerReactionTraining.tsx`가 모두 legacy `[2,3,5,10]` 정규화를 수행한다. 15/20/30이 10으로 축소된다. Router만 고치면 컴포넌트에서 다시 축소된다. `MemoryGameApp.tsx`도 같은 헬퍼를 소비하므로 전역 옵션 교체는 내부/Teacher 규칙을 바꿀 위험이 있다.
- 승인 후보 제품 파일: `app/spokedu-master/spomove/session/EngineRouter.tsx`, `app/admin/spomove/training/_player/lib/roundNormalization.ts`, `app/admin/spomove/training/_player/components/ColorTrackerReactionTraining.tsx`. 공유 player 호출부는 호환성 조사 대상으로 두고 필요성이 입증될 때만 별도 명시한다.
- 설계: 공개 실행 선택값 10/15/20/30과 기존 내부 라운드 규칙을 명시적으로 구분한다. 공개 옵션을 엔진 경계에서 검증하고 컴포넌트가 재축소하지 않게 한다. legacy `[2,3,5,10]` 지원과 NumberCart 별도 규칙은 보존한다. 기존 F18 실패 테스트 3개는 완화/삭제하지 않는다. 승인 후 어떤 헬퍼가 공개 계약을 소유할지 명확히 고정하고 실제 Router→컴포넌트 검증을 추가한다.
- 카운트 의미: 현재 stims는 완료 라운드 수, laneCount는 패널별 정답 구역 수다. 2패널에서 laneCount 합이 라운드 수의 2배가 될 수 있다. 이를 실제 측정된 학생 응답 수로 재해석하거나 stims를 2배로 바꾸지 않는다.
- 검증: 4개 선택값 × 1/2패널, Setup→Router→HUD→Result→retry→recent/URL 값 일치. legacy 2/3/5/10 및 NumberCart, Sequential Memory/dive-standard 예외 보호. 비정상/누락/NaN/범위 밖 입력의 fallback을 공개와 내부 경계별로 확인한다.

### F19 최소 변경안

- 원인: Router가 durationSec=60과 targetReps를 함께 전달한다. 엔진은 nowSec < duration-1.5일 때만 스폰하지만 완료는 waveCount 목표를 기다린다. 더불어 후반 phase.id>=5는 bossSpawned 조건에 의존한다. 단순히 60초만 없애도 후반 분기가 막히면 해결되지 않는다.
- 승인 후보 제품 파일: `app/spokedu-master/spomove/session/EngineRouter.tsx`, `app/admin/spomove/training/_player/components/GoalkeeperReactionTraining.tsx`. 반복/시간 스케줄러를 순수 헬퍼로 분리할 경우 새 파일과 테스트를 승인 diff에 명시한다.
- 설계: 시간 모드는 deadline으로, 횟수 모드는 목표 waveCount로 스폰/종료를 결정한다. 횟수 진행률로 페이즈를 결정하고 모든 페이즈에 스폰 경로를 둔다. 횟수 모드가 고정 deadline이나 boss 플래그에 종속되지 않도록 한다. 마지막 wave와 250ms 완료 타이머 사이 초과 스폰도 방지한다. HUD는 횟수 진행을 표시해 TIME 0 대기를 없앤다.
- 보너스: 본편 목표 도달 후 기존 조건에서 정확히 한 번 진입, 기존 BONUS_TIME_SEC 종료 유지. 보너스에서 본편 waveCount를 늘리지 않는 현재 의미를 보존한다. 중도 종료 stoppedEarly 전달과 마지막 자극 처리 시점도 검증한다. 결과 사유 전달 전반 수정은 Gate C로 남긴다.
- 검증: 10/15/20/30 × 간격 1~6초 × tier 1/2 × 보너스 on/off의 96조합, 시간 모드 deadline, 전환 경계, 정상·보너스 중 중도 종료, background 복귀·RAF 지연·unmount. waveCount와 2구 자극의 projectile/stims 차이를 구분한다. 고정 시간 연장이나 목표 축소는 사용하지 않는다.

### 교차 영향 및 미검증

공식 100개·Teacher 33개의 실제 화면 재실행 교차 검증은 이번에 수행하지 않았다. 기존 Stage 2 coverage-summary를 현재 PASS로 승격하지 않는다. 승인 후 변경된 공유 엔진을 소비하는 MASTER/LAB/Teacher/Admin 경로와 무관한 엔진을 분리해 전자는 완료 시나리오, 후자는 기존 계약·대표 실행 회귀를 확인한다. 보너스·laneCount·URL/최근 설정은 특히 주의한다.

다음 공식 7개는 계속 미완료 추적 대상으로 유지한다: `visual-reaction-rush-39`, `visual-reaction-goalkeeper-easy-skeleton`, `visual-reaction-goalkeeper-42`, `visual-reaction-number-cart-l2`, `dive-standard`, `dive-color-gate-61`, `dive-random`. 이번 관측/정적 분석을 정상 완료 PASS로 바꾸지 않았다.

Gate C의 종료 사유·scroll lock, Gate D의 이미지 준비/복구, 권한·구독·DB는 변경 범위에서 제외했다.

## 제출 상태

- **BASELINE_MISMATCH** — 세 SHA는 일치. 기존 미커밋 변경 포함으로 pristine HEAD와 작업트리는 다르며, 과거 증거 전체 바이트 보존도 인증하지 못함.
- **GATE_A_BLOCKED** — 독립 전체 TypeScript 검사 TS2554 1건. Build와 테스트 PASS만으로 통과 처리하지 않음.
- **F20_FALSE_POSITIVE** — 로컬 실제 Next 화면에서 카탈로그 편집 모달 도달 확인. 인증/콘텐츠 데이터는 mock이며 운영 계정 통합 검증은 별도.
- **APPROVAL_PENDING** — Gate B 예비 설계 제출. Gate A 차단 해소 및 재검증 후 Gate B 적용 여부를 별도 승인해야 함.

다음 승인 검토 대상은 우선 `programGetValidation.test.ts`의 Request 전달 누락 최소 수정이다. 그 승인이 Gate B/C/D 적용이나 Git 발행 승인을 포함하지 않는다.
