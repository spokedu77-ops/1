# SPOMOVE 2D — Color-Number Memory 이동 후보 보고서

ISOLATED CANDIDATE IMPLEMENTATION / NO PUBLIC REPLACEMENT

## CANDIDATE

`sequential-memory-color-number-movement-v2`

- `catalogStatus: 'hold'`
- `internalCandidate: true`
- engine: `{ mode: 'spatial', level: 4, spatialMemoryResponse: 'movement' }`
- Family: 기존 `sequential-memory` 재사용 (신규 Family 없음)
- Pad: `grid2x2` (색 SPOMAT. compass 미적용)

기억 메커니즘은 Public L4와 동일하다. 번호-색 연합을 만든 뒤 랜덤 번호 질문에 대해 **기억한 색 패드**로 이동하고, 교사가 기존 Space/Enter/버튼으로 정답을 공개한다. 센서 자동 판정은 없다.

```text
PUBLIC 72
└─ sequential-memory-color-number-exp
   └─ 기존 Q&A Runtime 그대로

INTERNAL
└─ sequential-memory-color-number-movement-v2
   ├─ 번호-색 연결 기억
   ├─ 랜덤 번호 질문
   ├─ 기억한 색 선택
   ├─ 해당 SPOMAT으로 이동
   └─ 교사가 정답 공개
```

Public 교체는 하지 않았다. 다음 단계는 `2E — sequential-memory-full-reveal-54`.

---

```text
CANDIDATE:
sequential-memory-color-number-movement-v2

PUBLIC 72:
PASS

OLD PUBLIC UNCHANGED:
PASS

MEMORY PHASE:
PASS

QUESTION PHASE:
PASS

MOVE RESPONSE:
PASS

ANSWER REVEAL:
PASS

5 QUESTION COMPLETION:
PASS

RED TARGET:
PASS

YELLOW TARGET:
PASS

GREEN TARGET:
PASS

BLUE TARGET:
PASS

INVALID TARGET:
PASS

RANDOM QA:
PASS

GRID2X2:
PASS

OTHER SEQUENTIAL REGRESSION:
PASS

FULL REVEAL UNCHANGED:
PASS

CMS:
PARTIAL

CLASSIFICATION:
REVIEW REQUIRED

FAMILY:
REVIEW REQUIRED

ACCESS:
PASS

CONSOLE:
PASS

TYPECHECK:
PASS

LINT:
PASS

BUILD:
PASS

STOP CONDITION:
NONE

FINAL:
PASS WITH WARN
```

---

## PUBLIC 72

**PASS**

`SPOMOVE_PUBLIC_CATALOG_FLAT_ORDER.length === 72`  
후보 ID는 Public order에 없다. Hub 비노출.

## OLD PUBLIC UNCHANGED

**PASS**

`sequential-memory-color-number-exp` engine freeze:

```ts
{ mode: 'spatial', level: 4 }
```

`spatialMemoryResponse` 없음. 카탈로그 표시명 `랜덤 기억 · 어려움 (퀴즈)` 유지.

브라우저 Public 질문 화면: `학생이 먼저 말하면 정답을 확인하세요`  
`기억한 색 패드로 이동` 문구 없음. `data-l4-response=voice`.

## MEMORY PHASE

**PASS**

`TOTAL = 10`, `generateLevel4Pattern()`, 배경 색 + 큰 숫자 + 색 이름, same-color flash, cue 속도 유지.  
Candidate 브라우저: 1~10 제시 후 `qa_ready`까지 정상.

## QUESTION PHASE

**PASS**

질문 본문 유지: `숫자 N은 무슨 색깔이었을까요?`  
정답 색/BLUE/파란 패드 문구는 질문 화면에 없음.

## MOVE RESPONSE

**PASS**

Candidate 전용 안내: `기억한 색 패드로 이동하세요`  
기존 Space / Enter / 화면 버튼 진행. 새 입력 시스템 없음. 센서 판정 없음.

Target은 제시 순서가 아니라 기억된 색 ID다.  
`resolveColorNumberMemoryMoveTarget({ num, color })` → `red | yellow | green | blue | null`

## ANSWER REVEAL

**PASS**

기존 `qa_question → 정답 공개 → qa_answer` 재사용.  
브라우저: 번호-색 연결(`N번 정답`, 색 이름, `data-l4-answer-color`) 확인.

## 5 QUESTION COMPLETION

**PASS**

Admin Candidate에서 Q1→공개→…→Q5→공개→`모두 마쳤어요!`까지 자연 종료 확인.

## TARGET / INVALID / RANDOM QA

**PASS** (자동 테스트)

- mapping `1→red`, `2→yellow`, `3→green`, `4→blue`
- 번호 자체는 target이 아님: `num: 1, color: blue` → `blue`
- missing / unknown / malformed / SPOMAT 4색 외 → `null` (fallback 없음)
- `QA_COUNT = 5`, Fisher–Yates. 항상 인덱스 0–4 고정이 아님.

## GRID2X2

**PASS** — 후보를 compass 목록에 넣지 않음.

## OTHER SEQUENTIAL / FULL REVEAL

**PASS**

Engine freeze:

| ID | engine |
|----|--------|
| `sequential-memory-3color-09` | `{ mode: 'spatial', level: 1 }` |
| `sequential-memory-5color-51` | `{ mode: 'spatial', level: 2 }` |
| `sequential-memory-10color-52` | `{ mode: 'spatial', level: 3 }` |
| `sequential-memory-custom-10color-exp` | spatial L7 4×4 oneshot |
| `sequential-memory-full-reveal-54` | `{ mode: 'spatial', level: 5 }` |

Full Reveal는 이번 단계에서 수정하지 않았다 (별도 P0 / 2E).

브라우저 대표: `sequential-memory-3color-09` 브리핑(`실행 시작`) 정상.

## CMS

**PARTIAL** (READ ONLY, 미수정)

Live 시드 `app/lib/spomove/spomoveSequentialMemoryGuides.ts` `m2-color-number`:

- 메커니즘: 번호-색 연합 기억 + 질문 + 교사 공개 → Runtime Public과 **부합**
- 응답 채널: 시드는 “색 또는 번호를 **말합니다**”, “패드만 쫓는 반응이 아니라”
- Candidate는 같은 연합 퀴즈를 **색 SPOMAT 이동**으로 응답

완전히 다른 게임은 아니므로 STOP C 아님. Public 전환 시 CMS 카피(말 vs 이동) 정리가 필요하다.

## CLASSIFICATION

**REVIEW REQUIRED**

`programGroup`은 이번 단계에서 `sequential-memory` 유지.  
실제 메커니즘은 sequence reproduction보다 **number-color associative memory + random retrieval**에 가깝다. Public 구조 정리 때 판단.

## FAMILY

**REVIEW REQUIRED**

기존 Public Family `sequential-memory`를 후보에 재사용했다.  
의미상 association-memory와 충돌 여지가 있어 기록만 한다. 신규 Family는 만들지 않았다.

## ACCESS

**PASS**

2A/2B와 동일: `internalCandidate` + `canLaunchInternalSpomoveCandidate`.

- 일반 구독자 URL `?preset=sequential-memory-color-number-movement-v2` → `지원하지 않는 SPOMOVE 활동입니다.`
- Admin → 실행 가능
- 기존 HOLD 전역 차단 없음

## CONSOLE

**PASS** — Candidate/Public 검증 중 pageerror / 필터된 console error 0.

## TYPECHECK / LINT / BUILD

```text
npx vitest run sequentialColorNumberMovementV2.2d.test.ts
  + 2A/2B + officialLibraryExpansion + guide source integrity (2D 관련)
  → PASS

npx tsc --noEmit --pretty false
  → exit 0

npx eslint <2D changed files> --max-warnings 0
  → exit 0

npm run build
  → Compiled successfully
```

## STOP CONDITION

**NONE**

- A: `Level4Item.color.id`가 SPOMAT 4색으로 안정적
- B: Public 기본 Q&A는 option 없을 때 기존 문구/흐름
- C: CMS는 연합 퀴즈로 동일 게임, 응답 채널만 다름 (PARTIAL)
- D/E: 4색 ID 매핑 가능, 위치/순서 fallback 없음

## WARN

1. CMS 시드가 구술 응답을 계약 → Candidate 이동과 PARTIAL
2. CLASSIFICATION / FAMILY review는 Public 교체 전에 확정
3. 결과 화면 색 집계를 성공률로 쓰지 않음 (센서 없음)

## 변경 파일

- `app/spokedu-master/spomove/officialSpomovePresets.ts` — 후보 + `spatialMemoryResponse` 타입 + CORE_COUNT 46
- `app/spokedu-master/spomove/movements/activityFamilies.ts`
- `app/spokedu-master/spomove/familyAudit/signatures.ts`
- `app/lib/spomove/spomoveGuideSemanticSnapshot.ts`
- `app/spokedu-master/spomove/session/page.tsx`
- `app/spokedu-master/spomove/session/EngineRouter.tsx`
- `app/admin/spomove/training/_player/components/MemoryGameLevel4.tsx`
- `app/admin/spomove/training/_player/lib/resolveColorNumberMemoryMoveTarget.ts` (신규)
- `app/spokedu-master/spomove/sequentialColorNumberMovementV2.2d.test.ts` (신규)
- `app/lib/spomove/generated/spomoveGuideSourceDigests.generated.ts` — `sequentialMemoryL4`, `engineRouter`만
- `docs/SPOMOVE_2D_COLOR_NUMBER_MEMORY_CANDIDATE_REPORT.md`

## PO DECISIONS

없음. Public 72 교체 없음.
