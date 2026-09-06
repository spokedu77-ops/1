# SPOMOVE 2A — Stroop Arrow 대체 후보 보고서

READ-ONLY 공개 카탈로그는 유지했다. 잘못된 Public ID를 고치지 않고, 내부 HOLD 후보만 추가했다.

## A. 신규 ID

```text
stroop-arrow-direction-color-v2
```

- `catalogStatus: 'hold'`
- Public Hub / `isHubListedPreset` / `isHubRunnablePreset`: 비노출
- 기존 HOLD 22 인벤토리와 별개의 **2A 검증 후보**다. 재활성화하지 않는다.

### 내부 실행 방법

MASTER 세션 URL로 직접 연다. 수업 프로그램 추가 API는 HOLD를 거절하므로 클래스 세션에는 넣지 않는다.

```text
/spokedu-master/spomove/session?preset=stroop-arrow-direction-color-v2&rounds=20&sound=on&mode=projector&entry=start
```

Admin 개발자가 로그인된 MASTER에서 위 경로를 열면 EngineRouter → MemoryGameApp(stroop L1 + `stroopArrowResponse: 'movement'`)로 실행된다.

## B. 변경 파일

- `app/spokedu-master/spomove/officialSpomovePresets.ts`
- `app/spokedu-master/spomove/movements/activityFamilies.ts`
- `app/spokedu-master/spomove/spomovePadLayout.ts`
- `app/spokedu-master/spomove/session/EngineRouter.tsx`
- `app/spokedu-master/spomove/session/page.tsx`
- `app/spokedu-master/spomove/familyAudit/signatures.ts`
- `app/lib/spomove/spomoveGuideSemanticSnapshot.ts`
- `app/admin/spomove/training/_player/lib/signals.ts`
- `app/admin/spomove/training/_player/lib/resolveStroopArrowMoveTarget.ts` (신규)
- `app/admin/spomove/training/_player/components/SignalDisplay.tsx`
- `app/admin/spomove/training/_player/MemoryGameApp.tsx`
- `app/admin/spomove/training/_player/hooks/useTrainingTimer.ts`
- `app/admin/spomove/training/_player/hooks/useIntervalTimer.ts`
- `app/spokedu-master/spomove/stroopArrowDirectionColorV2.2a.test.ts` (신규)

`spomovePublicCatalogOrder.ts`는 변경하지 않았다.

## C. 기존 코드 재사용 부분

- `signals.ts` `pickArrowStroop` — 화살표 방향 + 랜덤 채움색 + `stroopArrowTask` (`direction` | `fill`)
- `SignalDisplay` `stroop_arrow` SVG
- compass 매핑 `SPATIAL_ARROW_COLOR_BY_DIRECTION` (UP→red, LEFT→green, RIGHT→yellow, DOWN→blue)
- Family `stroop-arrow` (`complexReaction` / `choiceControl`)
- 기존 stroop Operation 필드만 사용: `cueSeconds` 3, `rounds` 20. Runtime이 읽지 않는 값은 넣지 않음.

## D. 신규 코드 부분

- 프리셋 option `stroopArrowResponse: 'movement'` — **이 option이 있을 때만** 이동 경로 활성화
- `withStroopArrowMovementResponse`: reverse OFF, voice를 과제 Cue로 교체
- `resolveStroopArrowMoveTarget` 순수 함수
- 화면 상단 과제 Cue 배지 (`방향을 보세요` / `색을 보세요`)

기존 `mode === 'stroop'` 전체를 일괄 변경하지 않았다.

## E. SIGNAL

색이 채워진 화살표. 매 신호:

- `arrowId` (방향)
- `fillHex` (채움 색, 방향과 독립 샘플)
- `stroopArrowTask`: `direction` | `fill`
- `stroopArrowReverse`: 항상 `false` (이동 후보)
- `stroopArrowResponse`: `movement`

배경은 기존 L1과 같이 검정(`#000000`). `stroopArrowMode: 'bg'`는 이 후보에서 사용하지 않는다.

## F. SELECT

Cue로 고르는 차원만 알려 준다. 정답 단어(위/파란색)를 읽히지 않는다.

- DIRECTION → `방향을 보세요`
- COLOR (`fill`) → `색을 보세요`

MASTER 기본 `sound=on`은 beep 경로라 TTS는 켜지지 않는다. 규칙은 화면 Cue가 SSOT다. Admin voice 모드에서만 Cue TTS가 나간다.

## G. MOVE

`resolveStroopArrowMoveTarget`:

- COLOR → 채움색 SPOMAT
- DIRECTION → compass 패드 (파란 ↑ → red)

## H. Congruent 예시

```text
빨간 ↑
DIRECTION → UP → red
COLOR → red
둘 일치
```

## I. Incongruent 예시

```text
파란 ↑
DIRECTION → UP → red
COLOR → blue
충돌. 실제 선택이 필요함.
```

Congruent/Incongruent 비율은 기존 generator의 독립 샘플을 재사용한다. 50:50 등 신규 비율은 설계하지 않았다.

## J. 기존 프로그램 회귀 결과

자동 계약 테스트 기준:

```text
PASS
```

불변 확인:

- `stroop-arrow-reverse-08` engine: `basic` L1 color compass
- `reaction-cognition-space-direction-color-01b` 동일
- `stroop-arrow-bg-47` / `stroop-word-reverse-48` / `stroop-word-bg-49`에 `stroopArrowResponse` 없음
- stroop L2–L4 신호 타입 `stroop` 유지
- 옵션 없는 stroop L1은 기존처럼 `stroop_arrow`이며 movement 플래그 없음

## K. Public Catalog

```text
SPOMOVE_PUBLIC_CATALOG_FLAT_ORDER.length === 72
신규 ID 미포함
```

라이브러리 전체 크기는 CORE 43 + EXPANSION 52 = 95 (HOLD 후보 1개 추가). 공개 72는 그대로다.

## L. 기존 ID 변경 여부

```text
0건
```

`stroop-arrow-reverse-08` 삭제/HOLD/내용 변경 없음. `01b` 변경 없음.

## M. 미결정 사항

| 항목 | 상태 |
|------|------|
| reverse | **REVERSE RULE — HOLD FOR FOLLOW-UP.** 기존 reverse는 음성 힌트가 반대 차원을 말하는 Task Switching이다. 움직임 규칙에 그대로 적용하지 않았고 후보 기본값은 OFF. |
| difficulty | 미설계. 기존 stroop L1 `basic` 경로만. |
| family | 기존 `stroop-arrow` 재사용. 신규 Family 없음. |
| CMS | Live CMS publish 안 함. CODE SEED에도 넣지 않음. |
| asset | 정식 썸네일/가이드 영상 없음. |
| 네이밍 | 기술 ID만. 공개 제목은 후속. |
| congruent 비율 | 기존 독립 샘플 유지. 조정 필요 시 **PO DECISION REQUIRED**. |

## 수동 시각 검증

브라우저 자동화 도구가 이 세션에 없어, 실제 프로젝터 화면의 Cue 위치·화살표 선명도는 테스트자가 위 URL로 확인해야 한다.

확인 체크:

- 색 화살표가 선명한가
- 방향/색 Cue가 화살표를 가리지 않는가 (상단 배지)
- 충돌 자극에서 DIRECTION과 COLOR의 이동 위치가 다른가 (파란 ↑)

## 아직 하지 않은 것

Public 교체, 기존 ID HOLD, CMS publish, 정식 제목, 썸네일, 가이드 영상, 세션 migration.
