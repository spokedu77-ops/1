# SPOMOVE 2B — Stroop Word Switch / Reverse 내부 후보

ISOLATED CANDIDATE IMPLEMENTATION / NO PUBLIC REPLACEMENT

## CANDIDATE A

`stroop-word-switch-movement-v2`

- `catalogStatus: 'hold'`
- `internalCandidate: true`
- engine: `{ mode: 'stroop', level: 2, stroopWordResponse: 'movement', stroopWordRuleMode: 'switch' }`
- Family: `stroop-word`
- Pad: `grid2x2` (색 SPOMAT, compass 아님)
- reverse 고정 `false` — Cue 차원을 그대로 따라 해당 색 패드로 이동

## CANDIDATE B

`stroop-word-reverse-movement-v2`

- `catalogStatus: 'hold'`
- `internalCandidate: true`
- engine: `{ mode: 'stroop', level: 3, stroopWordResponse: 'movement', stroopWordRuleMode: 'reverse' }`
- Family: `stroop-word`
- Pad: `grid2x2`
- reverse 고정 `true` — Cue가 가리킨 차원의 **반대 정보**로 이동 (보색/반대 패드 아님)

## PUBLIC 72

**PASS**

`SPOMOVE_PUBLIC_CATALOG_FLAT_ORDER.length === 72`  
두 후보 ID는 Public order에 없음. Hub 비노출.

## OLD L2 UNCHANGED

**PASS**

`stroop-arrow-bg-47` engine 유지: `{ mode: 'stroop', level: 2 }`  
신규 option 없음.

Regression freeze: Public L2/L3는 계속 같은 generator 분기 `if (level === 2 || level === 3)` 를 공유하며, option이 없으면 `Math.random() < 0.5` 로 reverse를 섞는다. 이번 단계에서 이 경로를 바꾸지 않았다.

## OLD L3 UNCHANGED

**PASS**

`stroop-word-reverse-48` engine 유지: `{ mode: 'stroop', level: 3 }`  
신규 option 없음. 위 공유 분기 그대로.

## L4 UNCHANGED

**PASS**

`stroop-word-bg-49` engine 유지: `{ mode: 'stroop', level: 4, stroopWordMode: 'bg' }`  
`stroopKind: 'bg_interference'` 경로에 Word movement option이 붙지 않음.

## 2A ARROW CANDIDATE UNCHANGED

**PASS**

`stroop-arrow-direction-color-v2` engine 유지: `{ mode: 'stroop', level: 1, stroopArrowResponse: 'movement' }`  
Word option을 Arrow에 적용하지 않음.

## L2 RULE

**SWITCH**

Cue 차원(의미 또는 글자색)을 그대로 선택.

## L3 RULE

**REVERSE**

Cue 차원의 반대 정보 선택.  
`meaning + reverse → ink` / `ink + reverse → meaning`  
색깔 자체의 반대색·패드 반대 위치 규칙을 만들지 않음. 기존 Public reverse 의미와 동일.

## MEANING NORMAL

**PASS** — word red / ink blue / task meaning / reverse false → `red`

## INK NORMAL

**PASS** — task ink / reverse false → `blue`

## MEANING REVERSE

**PASS** — task meaning / reverse true → `blue`

## INK REVERSE

**PASS** — task ink / reverse true → `red`

## INVALID INPUT

**PASS**

task 없음·invalid task·인식 불가 word/ink 색 → `null` (임의 SPOMAT 금지)

## VISUAL CUE

**PASS**

기존 Word renderer 유지 + 상단 Rule Cue만 추가 (후보 movement 신호에만).

- L2: `단어 뜻` / `글자 색`
- L3: `단어 뜻 · 반대로` / `글자 색 · 반대로`
- 정답 색 이름·「가세요」 금지
- MASTER beep 경로에서 화면 Cue가 규칙 SSOT. voice 모드면 동일 Cue만 TTS

Public 47/48/49에는 이 Cue가 나타나지 않음 (브라우저 확인).

## BROWSER L2

**PASS** (admin, 1920×1080)

단어·글자색 표시, `단어 뜻` / `글자 색` Cue 모두 관측, overlay/error 없음.

## BROWSER L3

**PASS** (admin)

`단어 뜻 · 반대로` / `글자 색 · 반대로` 모두 관측. 구독자 direct URL은 차단.

## CONSOLE

**PASS** — pageerror / console.error 0

## TYPECHECK

**PASS** — `npx tsc --noEmit --pretty false`

## LINT

**PASS** — 변경 파일 `eslint --max-warnings 0`

## BUILD

**PASS** — `npm run build`

## ACCESS

2A `internalCandidate` + `canLaunchInternalSpomoveCandidate` 재사용.  
일반 MASTER 구독자 URL 실행 → `지원하지 않는 SPOMOVE 활동입니다.`  
Admin 검증 실행 가능.

## WORD / INK CONGRUENCE

현재 `pair()` 는 서로 다른 pool index만 고르므로 word meaning hex ≠ ink hex (항상 incongruent).  
**CONGRUENT WORD STIMULUS FOUND** 없음. 비율 재설계 없음.

## FAMILY

두 후보 모두 기존 `stroop-word` Family 재사용. 신규 Family 없음.

참고(이번 변경 아님): Public `stroop-arrow-bg-47` 은 런타임이 Word L2인데 Family map은 여전히 `stroop-arrow` 다. 2B 후보와 무관하며 Public 교체 때 정리 대상.

## PO DECISIONS

없음. STOP A–D 해당 없음.

- Word meaning → color ID: `COLORS[].name` / hex 매핑으로 안정적으로 해석 가능
- Cue는 signal content `stroopWordTask` + `stroopWordReverse` 와 동기
- 기존 reverse는 차원 반전이며 저장 의미 변경 없음
- Public L2/L3 동작 변경 없이 candidate option만 분기

## FINAL

**PASS**

```text
PUBLIC 72
├─ stroop-arrow-bg-47
├─ stroop-word-reverse-48
└─ stroop-word-bg-49
   → 기존 동작 그대로

INTERNAL CANDIDATES
├─ stroop-word-switch-movement-v2
│  └─ Cue 차원을 그대로 따라 이동
│
└─ stroop-word-reverse-movement-v2
   └─ Cue 차원의 반대 정보를 따라 이동
```

2B PASS 이후에도 Public 교체는 하지 않는다.
