# SPOMOVE 2A FINAL VERIFICATION

내부 후보 `stroop-arrow-direction-color-v2` 안전 보완.

가드: `internalCandidate: true`만 차단. `catalogStatus === 'hold'` 전역 차단 없음.
Admin 판별: 기존 MASTER `access snapshot.isAdmin`.
브라우저: localhost:3000, 1920×1080 / 1366×768.
구독자 URL은 `지원하지 않는 SPOMOVE 활동입니다.` Admin은 브리핑 후 실행.

명령:

```text
npx vitest run app/spokedu-master/spomove/stroopArrowDirectionColorV2.2a.test.ts app/spokedu-master/spomove/officialLibraryExpansion.test.ts
→ 2 files / 36 tests passed

npx tsc --noEmit --pretty false
→ exit 0

npx eslint <changed 2A-FIX files> --max-warnings 0
→ exit 0

npm run build
→ Compiled successfully
```

Cue 배지 1920: top 20px, height 54px, SVG와 겹치지 않음.
신호 샘플: 빨간 ↑ + 방향 Cue (congruent), 파란 ↑ + 방향 Cue (incongruent → red), 색 Cue 확인.
Timer: 3초 간격 신호 전환 확인. 20회 자연 종료 화면까지는 대기하지 않음.
01b / stroop-arrow-bg-47: 신규 Cue 없음. Console error 0. Next.js error overlay 없음.

---

COMMIT SHA:
2a073d0dc163f92eea624c138e6dab6900602757

FIX 01 INVALID TASK:
PASS

FIX 02 INVALID CUE:
PASS

INVALID TESTS:
PASS

LEFT TEST:
PASS

DOWN TEST:
PASS

CANDIDATE ACCESS GUARD:
PASS

PUBLIC 72:
PASS

OLD STROOP ID UNCHANGED:
PASS

RC 01B UNCHANGED:
PASS

STROOP WORD REGRESSION:
PASS

BROWSER LOAD:
PASS

DIRECTION CUE:
PASS

COLOR CUE:
PASS

CONGRUENT:
PASS

INCONGRUENT:
PASS

TIMER:
PASS

CONSOLE:
PASS

TYPECHECK:
PASS

LINT:
PASS

BUILD:
PASS

FINAL:
PASS
