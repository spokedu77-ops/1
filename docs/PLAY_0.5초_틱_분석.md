# Play 0.5초(500ms) 틱 정상 작동 여부 분석

## 1. 틱 정의 및 사용처

- **규칙**: `rules.ts` → `TICK_MS: 500`, BPM 120 기준 1 tick = 0.5초.
- **타임라인**: `timeline.ts`는 tick 인덱스만 생성. 실제 시간(ms)은 `RuntimePlayer`와 상위에서 `TICK_MS`로만 계산.
- **시각**: `PlayRenderer`는 `currentTick = floor(tMs / TICK_MS)`로 **해당 tick의 이벤트만** 렌더. 즉 0~499ms → tick 0, 500~999ms → tick 1, …
- **오디오**: `RuntimePlayer`의 effect에서 `tMs`가 바뀔 때 `lastProcessedTick+1 .. currentTick` 구간의 `audioByTick`을 한 번씩 디스패치. BGM_START(tick 0), BGM_STOP(tick totalTicks-1), SFX는 action tick에서만.

---

## 2. “정상 작동이 아니다”로 이어질 수 있는 지점

### 2.1 snapToTick + “프레임당 최대 1 tick” 보정

- **코드**: `RuntimePlayer`에서 `snapToTick`이면  
  `nextTick = min(expectedTick, currentTick + 1)`,  
  `displayTMs = nextTick * TICK_MS`.
- **의도**: 한 프레임에 tick이 2칸 이상 넘어가서 “앞은 빠르고 뒤는 느리다”는 체감을 막기 위함.
- **문제**: 탭이 백그라운드일 때 `requestAnimationFrame`이 묵히면, 복귀 후 `elapsed`가 크게 뛰어 `expectedTick`만 크게 증가. 그런데 `nextTick = currentTick + 1`로 제한되어 **한 프레임에 1 tick만** 진행.  
  → 복귀 후 수십~수백 프레임 동안 tick이 1씩만 올라가며 “빨리 감기”처럼 보일 수 있음.  
  → 사용자 입장에서는 “0.5초 간격이 아니라 잠깐 멈췄다가 휙휙 넘어간다”로 느껴질 수 있음.

### 2.2 tMsRef와 setState 비동기

- RAF 콜백 안에서 `currentTick = floor(tMsRef.current / TICK_MS)` 사용.
- `setTMs(displayTMs)`는 비동기이므로, 같은 프레임에서 `tMsRef.current`가 방금 넣은 값으로 갱신되지 않을 수 있음.
- 보통은 한 틱만 늦게 반영되는 수준이라 시각적으로는 크게 틀어지지 않지만, “가끔 한 박자 어긋난다”는 느낌의 원인일 수 있음.

### 2.3 DROP 연출: 0.5초 틱 vs 1초 애니메이션

- **틱**: DROP 이벤트는 **action tick**(0.5초 주기)마다 5레인 동시 스폰.
- **애니메이션**: `dropHoldFall`이 **1초** 고정 (`1s … forwards`).
- 따라서 “나타나는 타이밍”은 0.5초 리듬이 맞지만, “떨어지는 길이”는 0.5초가 아니라 1초.  
  → **비트(0.5초)와 낙하 길이가 맞지 않아** 리듬이 어색하게 느껴질 수 있음.  
  → 0.5초 틱에 맞추려면 낙하 구간을 0.5초(또는 tick 1구간)로 맞추는 편이 일관됨.

### 2.4 WIPE: 5단계 스냅과 tick 개수

- WIPE의 `progress`는 `0, 0.2, 0.4, 0.6, 0.8, 1.0`만 사용.
- SET 구간은 20 tick = 10초. 5단계면 대략 2초마다 한 단계씩 진행.
- 즉 **한 tick(0.5초)마다 화면이 바뀌는 게 아니라**, 여러 tick에 걸쳐 같은 `progress`가 유지됨.  
  → “0.5초마다 뭔가 바뀐다”는 체감이 WIPE에서는 약할 수 있음. (설계상 5단계 스냅이라면 정상이지만, “모든 화면이 0.5초 리듬”이라고 기대하면 어긋나 보일 수 있음.)

### 2.5 BGM 종료 시점과 마지막 tick

- `totalMs = (totalTicks - 1) * TICK_MS`로 BGM 재생 길이 전달.
- `BGM_STOP`은 tick `totalTicks - 1`에 디스패치 → 즉, **마지막 tick에 들어가는 순간** (tMs = (totalTicks-1)*500) stop.
- 따라서 BGM 종료와 “마지막 tick 표시 시작”은 같은 시점.  
  → 마지막 0.5초 구간만 재생되고 곧바로 끝나므로, “끝이 갑자기 끊긴다”고 느낄 수는 있으나, 0.5초 틱 정의와는 일치함.

### 2.6 구독자(PlayRuntimeWrapper)와 Studio

- 둘 다 `totalMs = (totalTicks - 1) * PLAY_RULES.TICK_MS` 사용.
- `RuntimePlayer`에 `snapToTick` 전달 → 동일한 “1 tick/frame” 제한 적용.
- 따라서 **같은 타임라인이면** 0.5초 틱 기준 재생 로직은 동일. 다만 Studio는 사용자가 Play를 누르기 전에는 오디오가 나가지 않고, 구독자는 `autoPlay`로 바로 재생된다는 차이만 있음.

---

## 3. 요약 표

| 구분 | 0.5초 틱과의 관계 | 정상 여부 | 비고 |
|------|-------------------|-----------|------|
| 시각 전환(tick→화면) | tMs를 500ms 단위로 스냅해 해당 tick만 표시 | 정상 | PlayRenderer는 tick 경계와 일치 |
| 오디오 디스패치 | tick 경계에서만 이벤트 발생 | 정상 | BGM_START/STOP, SFX 모두 tick 기준 |
| BGM 재생 길이 | totalMs = (totalTicks-1)*500 | 정상 | 마지막 tick 시점에 stop |
| snapToTick + 1 tick/frame | 프레임당 최대 1 tick만 진행 | 백그라운드 복귀 시 이상 | 복귀 후 “빨리 감기”처럼 보일 수 있음 |
| DROP 낙하 시간 | 이벤트는 0.5초 주기, 애니는 1초 | 불일치 가능 | 0.5초 리듬과 낙하 길이 불일치 |
| WIPE 진행 | 5단계 스냅, 0.5초마다 변경 아님 | 설계대로이나 리듬감 약함 | “모든 화면이 0.5초” 기대와 다를 수 있음 |

---

## 4. 결론

- **틱 정의(0.5초)와 타임라인/오디오/시각 매핑**은 코드 상 일관되게 잡혀 있음.  
  즉 “한 tick = 0.5초”로 동작하도록 되어 있고, 화면 전환과 BGM/SFX도 그 틱에 맞춰 동작함.
- 다만 **체감상 “정상이 아니다”**라고 느낄 수 있는 부분은 다음 정도로 보는 것이 타당함.
  1. **탭 백그라운드 복귀 시**: 1 tick/frame 제한 때문에 잠시 “빨리 감기”처럼 보일 수 있음.
  2. **DROP**: 스폰은 0.5초 주기인데 낙하는 1초로 고정되어 있어, 비트와 연출이 어긋나 보일 수 있음.
  3. **WIPE**: 5단계 스냅이라 0.5초마다 뭔가 바뀌는 느낌이 약함.
  4. **tMsRef 갱신 타이밍**: setState 비동기로 인해 가끔 한 박자 어긋난 것처럼 느껴질 여지 있음.

**정리**: “0.5초 틱으로 모든 화면이 정상 작동하는가?”에 대해, **엔진/데이터 상으로는 0.5초 틱에 맞춰 동작하도록 되어 있으나**, 위와 같은 이유로 **체감상은 정상이 아니라고 느낄 수 있는 여지가 있다**고 보는 것이 맞음.
