# PLAY v1 엔진 레이어 완성 보고서

## [1] 변경 파일 리스트

| 경로 | 생성/수정 | 한 줄 요약 |
|------|----------|-----------|
| app/lib/constants/rules.ts | 생성 | PLAY 규칙 상수(BPM=120, TICK_MS=500, TICKS) |
| app/lib/constants/schemas.ts | 생성 | PlayDraftSchema, operator 3타입(BINARY/PROGRESSIVE/DROP) Zod 검증 |
| app/lib/engine/play/presets.ts | 생성 | 15 motionId, MOTION_OPERATOR_MAP, fillOperatorFromPreset |
| app/lib/engine/play/types.ts | 생성 | PlayTimeline, VisualEvent, AudioEvent, ResolvedPlayDraft |
| app/lib/engine/play/compiler.ts | 생성 | compile(): PlayDraft→ResolvedPlayDraft, 유일한 랜덤/풀 결정 |
| app/lib/engine/play/timeline.ts | 생성 | buildTimeline(): ResolvedPlayDraft→PlayTimeline pure 함수 |
| app/lib/engine/play/index.ts | 생성 | public API re-export |
| app/lib/engine/audio/supabaseAudio.ts | 생성 | getAudioPublicUrl, loadAudioBuffer (fetch+decodeAudioData) |
| app/components/runtime/RuntimePlayer.tsx | 생성 | state: tMs/playing/speed, tick edge audio dispatch |
| app/components/runtime/PlayRenderer.tsx | 생성 | 스켈레톤 (tMs, visuals 전달, 실제 렌더 추후) |
| app/play-test/page.tsx | 생성 | compile→buildTimeline→RuntimePlayer 파이프라인 최소 확인 |
| docs/PLAY_V1_엔진_보고서.md | 생성 | 본 보고서 |

---

## [2] 핵심 계약(Contract) 확인

### Play operator 3타입 정의 위치
- **파일**: `app/lib/constants/schemas.ts`
- **타입**: `BinaryOperator`, `ProgressiveOperator`, `DropOperator` (Zod discriminated union)
- `SetOperatorSchema = z.discriminatedUnion('type', [BinaryOperatorSchema, ProgressiveOperatorSchema, DropOperatorSchema])`

### PROGRESSIVE style wipe|frames 강제
- **스키마**: `ProgressiveOperatorSchema`에서 `style: z.enum(['wipe','frames'])`로 정의
- **타입**: `ProgressiveStyle = 'wipe' | 'frames'` (const assertion)
- PROGRESSIVE 선택 시 `style` 필수, BINARY/DROP는 `style` 없음

### compiler에서만 랜덤/풀, timeline은 pure
- **근거**: `compiler.ts` - `createSeededRandom(seed)`, `Math.floor(random() * pool.length)` 사용. `Date`, `Math.random` 직접 호출 없음.
- **근거**: `timeline.ts` - `buildTimeline(resolved)` 시그니처만 받음. 의존성: rules, types. `Date`, `Math`, `fetch` 없음.
- `compiler` → `ResolvedPlayDraft` (모든 imageId 확정) → `timeline` → `PlayTimeline`

---

## [3] Timeline 규칙 구현 요약

### block 구성
- **위치**: `app/lib/engine/play/timeline.ts` `buildTimeline()`
- **규칙**: explain 5ticks → set1 20ticks → set2 20ticks → transition 5ticks, blocks=5
- **총 tick**: 5 blocks × 50 ticks/block = 250 ticks

### BINARY: ABAB 규칙
- `emitSetEvents()` 내 `operator.type === 'BINARY'` 분기
- `t % 2 === 0` → off, `t % 2 === 1` → on (tick마다 교대)

### PROGRESSIVE(wipe)
- 5step × 2cycle = 20ticks. 4 ticks/step (2 action + 2 rest)
- `frameIndex = Math.floor(t/4)` 로 step 전달

### PROGRESSIVE(frames)
- 0~9 tick: build (frameIndex 1~10)
- 10~19 tick: hold (frameIndex 10)

### DROP
- 5 objects, 2 cycles. dropTicks = [0,1,2,10,11]
- cycle 0: 3개 drop, cycle 1: 2개 drop. 0.5 drop + 0.5 rest 구조

### audio 이벤트
- **위치**: `buildTimeline()` 마지막
- BGM_START: tick 0
- BGM_STOP: tick totalTicks-1
- SFX: action tick(visuals 중 BINARY/PROGRESSIVE/DROP)에만, 중복 tick 제거 후 디스패치

---

## [4] Supabase BGM 로더

- **버킷명**: `iiwarmup-files`
- **public URL 생성**: `getAudioPublicUrl(path)` → `supabase.storage.from('iiwarmup-files').getPublicUrl(path).data.publicUrl`
- **로드 함수**: `loadAudioBuffer(path)` - fetch(url) → arrayBuffer → `audioCtx.decodeAudioData(arrayBuffer)` → `AudioBuffer` 반환

---

## [5] RuntimePlayer 스켈레톤

- **state**: `tMs`, `playing`, `speed` (및 내부 `startMsRef`, `startTMsRef`, `tMsRef`)
- **tick edge audio dispatch**:
  - `lastProcessedTickRef`로 마지막 처리 tick 저장
  - `currentTick = Math.floor(tMs / TICK_MS)` 계산
  - `currentTick !== lastProcessedTickRef.current` 일 때만 `timeline.audio.filter(e => e.tick === currentTick)` 처리 후 `onAudioEvent` 호출
  - 같은 tick 재진입 시 스킵 → 중복 재생 방지

---

## [6] 로컬 테스트 방법

- **확인 페이지**: `app/play-test/page.tsx` (`/play-test`)
- **실행**: `npm run dev` 후 브라우저에서 `http://localhost:3000/play-test` 접속
- **확인 절차**:
  1. 페이지 로드 시 compile → buildTimeline → RuntimePlayer 렌더 확인
  2. Play 버튼 클릭 시 tMs 증가, 콘솔에 Audio 이벤트 로그 출력
  3. totalTicks(250), visuals 개수 표시 확인
