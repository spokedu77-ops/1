# 웜업 챌린지(무빙 챌린지) 전체 분석 및 BGM·시각 타이밍 분석

## 1. 웜업 챌린지 전체 구조 (빠짐없이)

### 1.1 참여 파일·역할

| 구분 | 경로 | 역할 |
|------|------|------|
| 구독자 재생 | `app/iiwarmup/page.tsx` | 이번 주 프로그램 로드, 챌린지 BGM/오프셋/BPM 전달, FullSequencePlayer에서 챌린지 렌더 |
| 런타임 게임 | `app/components/runtime/SpokeduRhythmGame.tsx` | 비트 스케줄링, 시각(그리드·카운트다운·호루라기), BGM 시작/종료 호출 |
| BGM 재생 | `app/lib/admin/audio/challengeBGM.ts` | HTMLAudioElement로 BGM 재생, startOffsetMs/playbackRate/durationMs 처리 |
| BGM 설정 훅 | `app/lib/admin/hooks/useChallengeBGM.ts` | BGM 목록·선택·bgmStartOffsetMs·sourceBpm 저장/로드 (think_asset_packs) |
| 관리자 챌린지 | `app/admin/iiwarmup/challenge/page.tsx` | 주차별 BPM/그리드/프리셋 편집, BGM 선택·오프셋·원곡 BPM UI |
| 스케줄 API | `app/api/schedule/[weekKey]/route.ts` | 주차별 challengeBgmPath, challengeBgmStartOffsetMs, challengeBgmSourceBpm 반환 |
| 스케줄 훅 | `app/lib/admin/hooks/useSubscriberSchedule.ts` | 구독자용 스케줄 타입·getChallengePropsFromPhases |
| 스토리지 경로 | `app/lib/admin/assets/storagePaths.ts` | `challengeBgmPath()` → `audio/challenge/bgm/{fileName}` |

### 1.2 게임 상수·타임라인 (SpokeduRhythmGame)

- **MAX_LEVELS** = 4  
- **ROUNDS_PER_LEVEL** = 5  
- **BEATS_PER_PHASE** = 8 (듣기 8비트)  
- **BEATS_PER_ROUND** = 16 (듣기 8 + 액션 8)  
- **COUNTDOWN_BEATS** = 4 (4, 3, 2, 1)  
- **SCHEDULE_AHEAD_TIME** = 0.1초  
- **CHALLENGE_TRANSITION_MS** = 3000 (레벨 완료 후 쉬는 시간, BPM 180 기준 “음악 시간”)  
- **MIN_TRANSITION_MS** = 2000, **MAX_TRANSITION_MS** = 6000  

타임라인 순서:

1. **인트로**: 0.05 + 0.1 + COUNTDOWN_BEATS × (60/bpm)초 → 카운트다운 4비트  
2. **레벨 1~4**: 각 레벨당 5라운드 × 16비트  
3. **레벨 1→2, 2→3, 3→4 사이**: 전환 화면 `getTransitionDurationMs(bpm, bgmSourceBpm)` (쉬는 시간)  
4. 전환 후 매번 **단계별 카운트다운** 4비트 (startCountdown 다시 호출)  
5. **아웃트로**: 0.6초 후 종료  

총 재생 시간: `getTotalChallengeDurationSec(bpm, bgmSourceBpm)` (BGM durationMs 계산에 사용).

### 1.3 시각 요소 (한 번에)

- **카운트다운**: currentBeat -4~-1 → 큰 숫자 4, 3, 2, 1  
- **LISTEN 구간**: beat 0~7 → 8칸 그리드 중 해당 인덱스 강조(로즈 테두리)  
- **GO(액션) 구간**: beat 8~15 → 8칸 그리드 중 해당 인덱스 강조(초록 테두리), 비트 8에서 호루라기 강, 9~15에서 호루라기 약  
- **레벨 전환**: “LEVEL N COMPLETE!” → “NEXT LEVEL N+1” (`CHALLENGE_TRANSITION_MS` 또는 보정된 wall-clock)  
- **사이드 아이콘**: 메가폰/전구/번개/알림이 액션 비트에 맞춰 강조  
- **진행률 바**: totalBeatsPlayed / (4×5×8)  
- **BPM 슬라이더**: 80, 100, 120, 150, 160, 180 (lockBpm 시 고정)  
- **레벨/라운드/그리드**: 1~4단계, 8칸(텍스트 또는 이미지), 라운드마다 셔플  

### 1.4 오디오 (효과음·BGM)

- **효과음** (Web Audio API, AudioContext):  
  - 비트 -4~-1: playClick  
  - 비트 0~7: playGuideTone  
  - 비트 8~15: playWhistle(강/약)  
- **BGM** (HTMLAudioElement, challengeBGM.ts):  
  - `startChallengeBGM(bgmPath, bgmStartOffsetMs, durationMs, playbackRate)`  
  - loop=true, durationMs 후 stop  
  - playbackRate = 화면 BPM / 원곡 BPM (sourceBpm)  

### 1.5 데이터 흐름

- **관리자**: Challenge 스튜디오에서 BGM 업로드·선택, bgmStartOffsetMs·sourceBpm 입력 → think_asset_packs + 주차 프로그램(phases) 저장  
- **API**: `/api/schedule/[weekKey]` → challengeBgmPath, challengeBgmStartOffsetMs, challengeBgmSourceBpm, challengePhases  
- **구독자**: useSubscriberSchedule → scheduleData → SpokeduRhythmGame에 bgmPath, bgmStartOffsetMs, bgmSourceBpm + challengeProps(initialBpm, initialLevelData 등) 전달  

---

## 2. BGM과 시각자료 타이밍이 안 맞는 이유

### 2.1 시각 타임라인은 “언제”부터인가

- 시각(비트)의 **마스터 클록**은 **AudioContext.currentTime**이다.  
- 재생 시작 시:  
  1. `startCountdown()` 호출  
  2. `nextNoteTimeRef.current = audioContextRef.current.currentTime + 0.1`  
  3. `currentBeatIndexRef.current = -4` (카운트다운 4)  
  4. **50ms** 뒤 setTimeout 콜백에서 다시 `nextNoteTimeRef.current = audioContext.currentTime + 0.1` 하고 `scheduler()` 실행  
- 따라서 **첫 비트(카운트다운 4)** 가 울리는 시점은  
  **T_visual_start = (재생 버튼 클릭 시점으로부터 대략 50ms 후의 AudioContext 시간) + 0.1초**  
- **첫 “콘텐츠 비트”(beat 0, LISTEN 첫 칸)** 는  
  **T_visual_start + 4 × (60/bpm)**  
  예: BPM 120이면 T_visual_start + 2초.

### 2.2 BGM은 “언제” 시작하는가

- `startChallengeBGM(bgmPath, bgmStartOffsetMs, totalSec*1000, playbackRate)` 는 **재생 버튼을 누른 직후** 호출되고, **await 하지 않는다**.  
- BGM 실제 재생 시작 시점은:  
  1. Audio 로드 (캐시 있으면 거의 즉시, 없으면 네트워크 지연)  
  2. `loadedmetadata` 후 `startPlay()` → `audio.currentTime = startOffsetMs/1000`, `audio.play()`  
- 따라서 **BGM의 “첫 소리”(파일 상 startOffsetMs 지점)** 가 나오는 시점은  
  **T_bgm_first = (재생 클릭) + (로딩 지연) + (play() 지연)**  
  로딩이 0에 가깝다면 재생 클릭 직후 0~수십 ms 안에 시작.

### 2.3 불일치의 핵심: “시작 기준”이 다름

- **시각**: “첫 콘텐츠 비트(beat 0)” = 재생 클릭 + 약 50ms + 0.1초 + **4비트(카운트다운)** = 재생 클릭 + 약 0.15초 + 4×(60/bpm).  
  - BPM 120 예: 재생 클릭 + **약 2.15초**.  
- **BGM**: “첫 비트(오프셋 적용 직후)” = 재생 클릭 + 로딩 시간(**수십~수백 ms**)  
- 즉, **BGM은 카운트다운을 기다리지 않고** 가능한 한 빨리 재생되고,  
  **시각의 “첫 비트”는 카운트다운 4비트 뒤**에 나온다.  
- 그 결과, BGM 첫 비트가 시각 beat 0보다 **수 초 앞서** 나오는 구조다. (BPM에 따라 2초 전후.)

### 2.4 추가로 작용하는 요인

1. **시각 쪽 지연**  
   - 비트 표시는 `scheduleNote()` 안에서 **setTimeout(delayMs)** 로 한다.  
   - `delayMs = (예정 시간 - AudioContext.currentTime)×1000 - pullMs` (4단계 4·5라운드만 pullMs=80).  
   - setTimeout은 메인 스레드 부하에 따라 수 ms~수십 ms 밀릴 수 있어, **시각이 약간 뒤로 밀리는** 경향이 있다. (이미 4단계에 80ms 당기는 보정이 있음.)

2. **BGM 재생 매체**  
   - BGM은 **HTMLAudioElement** 한 개로 재생된다.  
   - 반면 비트 스케줄은 **AudioContext** 기준으로 짜여 있다.  
   - 두 시계가 다르고, HTML5 오디오는 샘플 단위 정밀도가 없어 **장시간 재생 시 수십~100ms 단위 드리프트** 가능성이 있다.

3. **startOffsetMs 해석**  
   - `startOffsetMs`는 “파일에서 몇 ms부터 재생할지”만 제어한다.  
   - “시각 beat 0과 맞출 목적으로 BGM을 몇 ms 늦춰 시작”하는 값이 **아니다**.  
   - 그래서 오프셋만으로는 “카운트다운 후 첫 비트”와 BGM 첫 비트를 맞출 수 없다.

4. **레벨 전환·단계별 카운트다운**  
   - 레벨 완료 후 `getTransitionDurationMs()` 만큼 대기한 뒤 `startCountdown()`을 다시 호출한다.  
   - 이때 `nextNoteTimeRef`만 다시 잡고, BGM은 계속 재생 중이다.  
   - BGM은 한 번 시작하면 끝까지 (durationMs까지) 흐르므로, **중간에 “시각만 리셋”** 되는 구조라, 전환 구간에서도 시각과 BGM이 어긋나기 쉽다.

5. **playbackRate**  
   - playbackRate = 화면 BPM / 원곡 BPM 으로 맞추면, **길이**는 맞출 수 있지만 **시작 시점**이 위와 같이 어긋나 있으면, 처음부터 비트가 어긋난 상태로 재생된다.

---

## 3. 요약: 왜 타이밍이 안 맞는가

- **시각**: 재생 클릭 → (50ms + 0.1초) 후 스케줄 시작 → **4비트 카운트다운** → 그 다음이 beat 0.  
- **BGM**: 재생 클릭 직후(로딩만 끝나면) **바로** startOffsetMs부터 재생.  
- 즉, **BGM은 “카운트다운 4비트”만큼 기다리지 않고 시작**해서,  
  시각의 “첫 비트(beat 0)”보다 **약 2초(120 BPM 기준) 앞서** 첫 비트가 나온다.  
- 여기에 setTimeout 지연, HTMLAudioElement vs AudioContext 차이, 전환 구간 처리까지 겹치면, 사용자 체감상 “BGM과 시각이 전반적으로 어긋난다”가 된다.

---

## 4. 해결 방향 (코드 수정)

- **가장 직접적인 수정**: BGM을 **시각의 “첫 비트(beat 0)”와 같은 시점**에 시작하도록 **딜레이**를 넣는다.  
  - 카운트다운 길이 = `50ms + 0.1s + 4 × (60/bpm)` (초 단위).  
  - 이 시간(ms)만큼 **startChallengeBGM 호출을 setTimeout으로 지연**한 뒤 재생하면,  
    BGM의 “첫 비트”(startOffsetMs)와 화면의 beat 0을 맞출 수 있다.  
- 구현 시 주의:  
  - 사용자가 50ms 안에 pause 하면, pending setTimeout을 clear해야 한다.  
  - 지연 시간은 **현재 BPM과 (사용 시) bgmSourceBpm**으로 계산해야 하므로, SpokeduRhythmGame에서 `getTotalChallengeDurationSec`와 같은 방식으로 “카운트다운 길이(초)”를 계산해 ms로 넘겨주는 게 좋다.

---

## 5. 노래를 다시 만들 경우 (콘텐츠 측)

- **지금 구조를 유지**한다면:  
  - 곡의 **첫 강한 비트**를 “시각 beat 0”과 맞추려면,  
    현재 코드에서는 **BGM 시작을 카운트다운 길이만큼 지연**하는 수정이 필요하다.  
  - 그 후에는 **startOffsetMs**를 “파일에서 첫 강한 비트가 나오는 ms”로 두면,  
    그 비트와 화면 beat 0이 일치하게 만들 수 있다.  
- **노래를 새로 만든다면** 권장:  
  1. **인트로**: 카운트다운 4비트(4, 3, 2, 1)에 맞는 **4박**을 넣거나, 최소한 **4박 공백/약한 신호**를 두어,  
     “BGM 시작 = 시각 카운트다운 시작”으로 맞춰도 자연스럽게 들리게 한다.  
  2. **첫 강한 비트**: 파일 상에서 **정확히 4박 뒤**(카운트다운 4비트와 동일한 길이 뒤)에 첫 강한 비트가 오도록 작곡/편집.  
  3. **BPM**: 한 곡을 여러 BPM에 쓰려면, 원곡 BPM(sourceBpm)을 정확히 알고,  
     관리자에서 **sourceBpm**을 설정해 두면 playbackRate로 화면 BPM에 맞출 수 있다.  
  4. **길이**: 챌린지 전체 재생 시간(`getTotalChallengeDurationSec`)과 같거나 약간 길게 두면,  
     durationMs로 끊을 때 끝까지 맞춰서 끊길 수 있다.

이렇게 하면 “BGM과 시각자료 타이밍이 안 맞는 현상”은  
- **코드**: BGM 시작을 카운트다운 길이만큼 지연 + startOffsetMs를 “첫 비트”에 맞춤  
- **콘텐츠**: 인트로 4박 + 그 다음 첫 비트 정렬  
두 가지를 같이 적용했을 때 크게 개선된다.

---

## 6. 4라운드 변경 + 21.05초 타임라인에 맞춘 BPM 역산

### 6.1 변경 사항 요약

- **현재**: 4단계 × **5라운드** × 16비트/라운드 = 320비트(레벨 구간)  
- **변경 후**: 4단계 × **4라운드** × 16비트/라운드 = **256비트**(레벨 구간)  
- **빨강→초록 기준**: 1라운드 = LISTEN 8비트(빨강) + GO 8비트(초록) → 16비트.  
  - 16라운드 전체면 **빨강 8×16 = 128번, 초록 8×16 = 128번** → 합쳐서 **256번** 틱.  
  - “빨강→초록”을 **한 번**으로 세면 라운드당 1번이므로 **16번**; “빨강·초록 각각”이면 **32번**이 아니라 128+128이므로, **32번**은 예를 들어 “라운드당 2번(빨강→초록→빨강→초록 같은 구간)” 등 다른 기준일 수 있음.  
  - 여기서는 **틱 = 1비트**로 두고, **총 콘텐츠 비트 수 = 256비트**(레벨 구간)로 계산.

### 6.2 총 재생 시간 공식 (4라운드 적용 시)

코드에서 `ROUNDS_PER_LEVEL = 4`로 바꾼 뒤의 공식:

- `beatSec = 60 / bpm`
- `countdownSec = 0.05 + 0.1 + 4×beatSec = 0.15 + 240/bpm`
- `levelBeats = 4 × 4 × 16 = 256`
- `transitionSec = getTransitionDurationMs(bpm, bgmSourceBpm) / 1000` (기본 3초, playbackRate 보정 시 변동)

**총 시간(초):**

```
totalSec = countdownSec + levelBeats×beatSec + 3×transitionSec + 3×countdownSec + 0.6
         = 4×countdownSec + 256×beatSec + 3×transitionSec + 0.6
         = 4×(0.15 + 240/bpm) + 256×(60/bpm) + 3×transitionSec + 0.6
         = 0.6 + 960/bpm + 15360/bpm + 3×transitionSec + 0.6
         = 1.2 + 16320/bpm + 3×transitionSec
```

### 6.3 21.05초 = 1단계(4라운드), 4단계는 ×4

**전제**: 노래 타임라인에서 **21초 05 = 1단계(4라운드)** 구간 길이. **4단계**이므로 레벨 구간 전체는 **21.05 × 4 = 84.2초**.

- **1단계(4라운드)** = 4 × 16비트 = **64비트**  
- 64비트를 21.05초에 넣으면:  
  `64 × (60/bpm) = 21.05`  
  → **bpm = 64×60/21.05 = 3840/21.05 ≈ 182.42**

**정리: 21.05초가 1단계(4라운드)일 때 → BPM ≈ 182 (또는 180으로 맞추면 됨).**

- 4단계 전체 레벨 구간 = 21.05 × 4 = **84.2초** (레벨 비트만).
- 카운트다운·전환·아웃트로를 더하면 전체 챌린지 시간은 84.2초보다 길어짐.

### 6.4 다른 가정(전체 21.05초 등)일 때 BPM

참고용으로만:

| 가정 | 식 | BPM (대략) |
|------|----|------------|
| **21.05초 = 1단계(4라운드)** | 64×(60/bpm)=21.05 | **≈ 182** |
| 전환 3초×3 포함, 전체 21.05초 | 1.2+16320/bpm+9=21.05 | ≈ 1504 |
| 레벨 256비트만 21.05초 | 256×(60/bpm)=21.05 | ≈ 729 |

실제 사용: **21.05초를 1단계(4라운드) 길이로 만들었으면 BPM ≈ 180(또는 182)** 로 설정하면 된다.

### 6.5 틱(비트) 수 요약 (4단계 × 4라운드)

- **1단계(4라운드)** = 4×16 = **64비트** → 21.05초일 때 BPM ≈ 182.
- **4단계 전체 레벨 구간** = 4 × 64 = **256비트** = 4 × 21.05초 = **84.2초**.
- **카운트다운**: 처음 4비트 + 레벨 사이 3회×4비트 = **16비트**.
- **빨강→초록**: 1라운드 = 빨강 8 + 초록 8 → 16라운드면 빨강 128번, 초록 128번 (합 256번 틱).
