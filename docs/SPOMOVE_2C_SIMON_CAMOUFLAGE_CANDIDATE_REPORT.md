# SPOMOVE 2C — Simon Camouflage CENTER / VARIANT 내부 후보

ISOLATED CANDIDATE IMPLEMENTATION / NO PUBLIC REPLACEMENT

## CANDIDATE A

`simon-camouflage-center-v2`

- `catalogStatus: 'hold'`
- `internalCandidate: true`
- engine: `{ mode: 'simon', level: 4, camouflagePlacement: 'center', camouflagePlacementResponse: 'preset' }`
- Family: `simon-mixed` (Public camouflage와 동일 재사용)

## CANDIDATE B

`simon-camouflage-variant-v2`

- 대조군. 새 Public 프로그램 목적이 아님.
- engine: `{ mode: 'simon', level: 4, camouflagePlacement: 'variant', camouflagePlacementResponse: 'preset' }`
- Family: `simon-mixed`

## PUBLIC 72

**PASS** — 신규 ID는 Public order에 없음.

## OLD CENTER PUBLIC UNCHANGED

**PASS**

`simon-camouflage-center-skeleton` engine 유지:

```ts
{ mode: 'simon', level: 4, camouflagePlacement: 'center' }
```

`camouflagePlacementResponse` 없음 → Simon L4 resolver가 **legacy variant** 를 반환.

브라우저: HUD `CAMOUFLAGE · … · 변형`, `data-camo-placement=variant`.

## BLACKOUT UNCHANGED

**PASS**

`visual-reaction-blackout-37` engine 유지:

```ts
{ mode: 'simon', level: 4, camouflagePlacement: 'variant' }
```

Runtime도 variant.

## CENTER RUNTIME

**PASS** — honor=preset + placement=center → `placementMode=center`. 반복 샘플 nx/ny = 0.5 / 0.5.

## VARIANT RUNTIME

**PASS** — honor=preset + placement=variant → `placementMode=variant`. 자극이 가장자리 규칙으로 이동. CENTER와 위치가 명확히 다름.

## CENTER VISUAL

**PASS**

Playfield/canvas 좌표 중심이 (0.5, 0.5)로 유지. HUD 높이 72px 때문에 **전체 뷰포트** 기하 중심보다 약간 아래지만, 기존 Camouflage playfield 중앙 로직이며 크게 벗어나지 않음. 잘림·overflow 없음. 1920×1080 / 1366×768 모두 동일.

## VARIANT VISUAL

**PASS** — 기존 변형 위치. HUD에 `변형` 표시.

## SIGNAL SAME ROOT

**PASS** — 동일 `CamouflageReactionTraining`, phase `NOISE → REVEAL → HOLD`.

## SELECT SAME ROOT

**PASS** — 숨은 목표 색 판단. 위치만 다름.

## MOVE SAME ROOT

**PASS** — `laneCount[colorIdx]` (위치 아님, 색 집계).

## TIMING

**PASS** — A/B `cueSeconds=2`, `rounds=20`, concurrent=1. 배치 때문에 reveal/hold 공식을 바꾸지 않음.

## FAMILY

**WARN** — 후보는 기존 `simon-mixed` 재사용 (Public camouflage와 같음). 신규 Family 없음.

`FAMILY REVIEW REQUIRED`: Public `visual-reaction-blackout-37` 은 같은 Camouflage 컴포넌트인데 Family가 `visual-blackout`. 이번 단계에서 수정하지 않음.

## BLACKOUT RELATION

**VARIANT**

같은 Root Mechanic (Camouflage Color Reveal).  
Candidate A와는 **placement가 다름** (center vs variant).  
Candidate B와는 placement가 같고, preset `cueSeconds`는 5 vs 2.  
SIGNAL/SELECT/MOVE/placement/timing이 전부 같지는 않으므로 TRUE DUPLICATE 아님. STOP C 해당 없음.

## ACCESS

**PASS** — 2A/2B `internalCandidate` 가드 재사용. 구독자 URL → `지원하지 않는 SPOMOVE 활동입니다.`

## CONSOLE

**PASS** — camouflage session에 pageerror/error overlay 없음.  
로그인 직후 admin dashboard fetch noise는 이번 화면과 무관.

## TYPECHECK

**PASS** — `npx tsc --noEmit --pretty false`

## LINT

**PASS** — 변경 파일 `eslint --max-warnings 0`

## BUILD

**PASS** — `npm run build`

## STOP CONDITION

**NONE**

- A: `pickCamouflageCenter`가 canvas 중앙을 구현함
- B: Public은 honor 없이 legacy variant 유지
- C: Blackout ≠ Candidate CENTER (placement + cueSeconds)
- D: Asset/CMS 재계약 없음. Public 중앙 별 썸네일은 Candidate A와 향후 재사용 가능 — **지금은 연결하지 않음**

## FINAL

**PASS WITH WARN** (Family 기존 불일치 기록만)

```text
PUBLIC 72
├─ simon-camouflage-center-skeleton
│  └─ 기존 동작 그대로 (legacy variant)
│
└─ visual-reaction-blackout-37
   └─ 기존 동작 그대로

INTERNAL
├─ simon-camouflage-center-v2
│  └─ CENTER
│
└─ simon-camouflage-variant-v2
   └─ VARIANT
```

2C PASS 이후에도 Public 교체는 하지 않는다.
