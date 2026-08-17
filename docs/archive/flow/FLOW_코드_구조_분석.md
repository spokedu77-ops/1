# FLOW Phase 코드·구조 분석 (상세)

## 1. 디렉터리·파일 구성

```
app/
├── flow-phase/
│   ├── page.tsx                 # 라우트 페이지 (FlowPhaseContent + Suspense)
│   └── engine/
│       ├── FlowEngine.ts        # 메인 게임 엔진 (~1595줄)
│       ├── FlowAudio.ts         # BGM + SFX (Web Audio API)
│       ├── FlowUI.ts            # DOM 헬퍼 (getRefEl, setLevelTag, showInstruction)
│       ├── FlowTypes.ts         # FlowDomRefs 인터페이스
│       ├── core/
│       │   ├── coordContract.ts # 상수 SSOT (점프, 브리지, 타이밍, 문구 등)
│       │   ├── types.ts         # (미사용·레거시 가능성)
│       │   └── clock.ts         # (미사용·FlowEngine은 THREE.Clock 직접 사용)
│       ├── entities/
│       │   └── ObstacleManager.ts  # 박스, UFO, 파편 스폰/업데이트/디스포즈
│       ├── systems/
│       │   └── effects.ts       # (미사용·레거시 가능성)
│       └── README.md            # 엔진 구조 요약
└── components/subscriber/
    └── FlowFrame.tsx            # iframe 래퍼 + postMessage 수신 → onEnd
```

- **실제 사용**: FlowEngine, FlowAudio, FlowUI, FlowTypes, coordContract, ObstacleManager, page.tsx, FlowFrame.
- **미참조**: `core/types.ts`, `core/clock.ts`, `systems/effects.ts` — import 없음. 정리/삭제 후보.

---

## 2. 진입점·데이터 흐름

### 2.1 라우트·페이지

- **URL**: `/flow-phase?weekKey=...&admin=true|&autoStart=1|&showLevelSelector=1`
- **page.tsx**
  - `useSearchParams()`로 쿼리 읽음 → `isAdminMode`, `showLevelSelector`, `autoStart`.
  - `useFlowBGM()`, `useFlowPano()`로 BGM/파노 경로(선택값) 가져옴.
  - `FlowPhaseContent`: canvas + DOM ref들(`FlowDomRefs`) 생성 → `new FlowEngine(canvas, domRefs)` 한 번, `useEffect` 의존성은 `[]`(domRefs 제외).
  - `autoStart`이면 400ms 후 `engineRef.current.startGame(bgmPath, panoPath)` 호출.
  - resize 시 `engine.resize()`만 호출; 리사이즈 시 canvas 크기/비율만 바뀜.

### 2.2 구독자 쪽 (FullSequencePlayer)

- `renderFlow`로 `FlowFrame` 렌더 시 `weekKey`, `onEnd`, `autoStart`, `showLevelSelector` 전달.
- FlowFrame은 iframe `src="/flow-phase?weekKey=...&autoStart=1"` 등으로 열고, `message` 이벤트로 `flow-ended` 수신 시 `onEnd()` 호출 → 다음 단계(예: end)로 전환.

---

## 3. FlowEngine.ts 상세

### 3.1 상태 변수 (핵심만)

| 구분 | 변수 예 | 비고 |
|------|---------|------|
| 게임 상태 | `gameState`('waiting'\|'playing'\|'finished'), `isResting`, `movementActive` | 인트로/레벨/휴식/엔딩 분기 |
| 타이밍 | `gameTime`, `levelTime`, `currentLevelIndex` | 진행바·레벨 전환에 사용 |
| 레벨 구조 | `durations`, `displayLevels` (coordContract 참조) | DURATIONS, DISPLAY_LEVELS |
| 브리지 | `bridges[]`, `activeBridge`, `bridgeIdCounter`, `lastJumpBridgeId` | 최대 3개 유지, prune으로 제거 |
| 플레이어 위치·점프 | `visualX`, `targetX`, `playerJumpY`, `jumpProgress`, `isJumping`, `isOnBridge`, `isOnPad` | **입력 없음** — 패드 트리거 구간 진입 시 자동 점프 |
| 카메라·이펙트 | `cameraLagX`, `duckDipOffset`, `duckPitchX`, `duckBounceOffset`, `camYBase`, `camYBob`, `landingImpactY/Z` 등 | 러닝 밥, 착지 충격, duck 보간 |
| 타이머 | `countdownTimer`, `introCountdownTimer`, `restCountdownTimer`, `pendingTimeouts` | 인트로 15초, REST 카운트다운, 엔딩 15초 후 postMessage |
| 배경 | `panoStoragePath`, `panoMesh`, `stars` | 파노 셰이더 메시, 별 Points |
| 기타 | `spaceObjects` (현재 빈 배열), `speedLines`, `speedLinesNear` | 행성 제거 후 미사용; 스피드라인은 사용 중 |

### 3.2 인트로·시작 시퀀스

- `startGame(bgmPath?, panoPath?)` 호출 시:
  1. `clearScheduledTimeouts`, `clearCountdown`
  2. `panoStoragePath` 저장, `audio.init()` → `loadBgmFromStoragePath`(있으면) → `startMusic()`
  3. HUD 표시, `init3D()` (씬, 카메라, 렌더러, 조명, createSpaceBackground, createSpeedLines, createTrackLanes, ObstacleManager 생성)
  4. `spawnBridge(true, 1, 0)` 한 번
  5. `gameState='playing'`, `movementActive=false`, `isResting=true`, `triggerStartSequence()`, `startLoop()`
- `triggerStartSequence()`:
  - 환영 문구 2초 후 카운트다운 15→1→START! (1초 간격), START 후 0.5초 뒤 `movementActive=true`, 인스트럭션 "JUMP!"
  - 별도로 `WELCOME_DURATION`(5초) 후 문구를 lv1Guide로 변경 (시각만, 타이밍은 카운트다운 기준).

### 3.3 게임 루프 (update)

- `dt = Math.min(rawDt, 0.1)`, `dt60 = dt * 60` (프레임 보정).
- `gameState !== 'playing'`이면 렌더만 하고 종료.
- `movementActive`일 때만 `gameTime`, `levelTime` 증가, 착지/임팩트/마이크로졸트 보간, 2D 스피드라인 스폰 확률(dt60 보정).
- `updateJump(dt)`: 점프 곡선·착지 시 `landingStabilityTimer`, `impactY/Z` 설정.
- 비트: `gameTime >= nextBeatTime`일 때 `onBeatTick(currentLevelNum)` → 플래시/펄스 값 증가.
- **레벨 전환**: `levelTime > currentDuration`이면
  - 다음이 REST(0) → `triggerRest()`
  - 다음이 END(-1) → `triggerEnding()`
  - 그 외 → `currentLevelIndex++`, HUD·인스트럭션 갱신, LV5일 때 `setGoldBudget(4)`.
- 브리지: `bridges.length < 3`이면 `spawnBridge(..., currentLevelNum, cameraLagX)`.
- 브리지 위치: `position.z += currentSpeed * 50 * dt60`, `pruneZ` 초과 시 제거.
- `activeBridge` 판정: `playerZ`가 다리+패드 구간 안에 있으면 보정, 패드 트리거 구간(`PAD_TRIGGER_RATIO`) 진입 시 `targetX = nextBridge.x`, `triggerJump()`.
- **입력**: 키/터치 없음. `targetX`는 점프 시 다음 다리 x로만 설정되고, `visualX`는 점프 중에는 targetX로 보간, 비점프 시에는 현재 다리 x에 고정.
- `obstacleManager.update(dt60, currentSpeed, currentLevelNum, playerZ, cameraLagX)`.
- 별·파노: `rotation.y` 소량 증가, 파노 셰이더 `uTime` 갱신.
- `updateCamera(dt, dt60, currentSpeed)`: visualX/cameraLagX 보간, duck 보간, 러닝 밥, FOV 등.
- 진행바: `gameTime / TOTAL_PLAY_SEC * 100` (레벨 1~5 구간만 합산).
- 마지막에 `renderer.render(scene, camera)`.

### 3.4 브리지 스폰 (spawnBridge)

- 첫 번째가 아니면 `lastBridge` 기준으로 `spawnZ` 계산 (gap 레벨별 상이).
- 레인 1~3 중 랜덤, 색상 빨/초/노.
- 메시: 상판, 출구 패드, 좌우 보, 가로 크로스 3개.
- `bridgeObj`: mesh, lane, bridgeId, x, padDepth, hasBox.
- **LV5**: `Math.random()` 40% 다리만, 30% 박스, 30% UFO.
- **그 외**: LV4+면 UFO 먼저 시도(`trySpawnUfo`), UFO 없고 LV3+면 `shouldSpawnBox`로 박스 시도.

### 3.5 파노라마

- `createSpaceBackground()`: 별 Points 생성 후, `panoStoragePath` 있으면 Supabase public URL로 fetch HEAD → TextureLoader.load.
- 텍스처: anisotropy 설정, SphereGeometry(4500, 64, 32), scale(-1,1,1), **ShaderMaterial** (PANO_VERTEX / PANO_FRAGMENT).
- 셰이더: 뷰 방향 d, d.z>0이면 검정(뒤쪽), 전방 180°만 equirect 샘플링, 비네팅·대비·필름 그레인·breath(uTime) 적용.
- 파노 메시는 `camera.add(panoMesh)`로 카메라 자식이라 항상 정면.

### 3.6 엔딩·자동 종료

- `triggerEnding()`: `gameState='finished'`, BGM 정지, 인트로 화면에 PHRASES.ending, **15초 후** `window.parent.postMessage({ type: 'flow-ended' }, '*')` (iframe일 때만).

### 3.7 dispose

- raf 취소, BGM 정지, obstacleManager.dispose(), panoMesh/별/스피드라인 near 메시·재질·지오메트리 dispose, renderer.dispose(), pendingTimeouts/카운트다운 클리어, clock=null.
- **speedLines** (3D 박스 그룹): dispose에서 명시적으로 제거하지 않음 — 씬에 남을 수 있음. 필요 시 traverse 후 dispose 추가 권장.

---

## 4. FlowAudio.ts

- **초기화**: AudioContext, masterGain(0.54), bgmGain(1.0), sfxGain(0.5), noiseBuffer(1초 백색소음).
- **BGM**: Storage 경로 → getFlowBgmUrl로 public URL → fetch → decodeAudioData. 없으면 150 BPM 킥/스네어/하이햇으로 내장 비트 재생(musicTimer 25ms 간격).
- **SFX**: sfxJump(오실레이터), sfxPunch(노이즈+로우패스), sfxWhoosh(노이즈+밴드패스), sfxCoin(트라이앵글).
- **정리**: startMusic 시 기존 bgmSource/musicTimer 정리 후 재생; stopMusic에서 타이머·소스 정지.

---

## 5. FlowUI.ts

- `getRefEl(ref)`: ref.current ?? null.
- `setLevelTag(domRefs, levelNum)`: levelTag 요소에 JUMP/FASTER/PUNCH/FOCUS/ALL + 색/배경 스타일.
- `showInstruction(domRefs, text, colorClass, ms)`: instruction 요소에 텍스트·클래스, ms 후 hidden. 기존 _t 타임아웃 클리어 후 재설정.

---

## 6. coordContract.ts (상수)

- **점프**: JUMP_DURATION, JUMP_HEIGHT (레벨 1~5).
- **브리지**: BRIDGE_LENGTH, BRIDGE_GAP, LANE_WIDTH, PAD_DEPTH, BRIDGE_PRUNE_Z_BY_LEVEL.
- **플레이어**: PLAYER_Z, GROUND_Y, PAD_TRIGGER_RATIO.
- **속도**: BASE_SPEED, SPEED_MULTIPLIERS, LV1_START_ACCEL_DURATION_SEC.
- **카메라**: CAMERA_BASE_*, FOV_*, HIGH_SPEED_SHAKE_*, LV1_RUN_*, RUNBOB_*.
- **랜딩/덕**: LANDING_IMPACT_*, DUCK_*.
- **배경**: FOG_*, STAR_*, SPEEDLINE_*, PLANET_*(미사용).
- **UFO/박스**: UFO_*, LV3_BOX_RATE, LV4_BOX_RATE, BOX_*.
- **비트**: BEAT_BPM, BEAT_STEP_SEC.
- **타이밍**: WELCOME_DURATION, LV1_GUIDE_DURATION, **DURATIONS**, **DISPLAY_LEVELS**, PHRASES, TOTAL_PLAY_SEC.
- **시각**: FLOOR_COLOR, LANE_LINE_COLOR.

---

## 7. ObstacleManager

- **역할**: 박스 스폰/부수기(파편·코인), UFO 스폰/덕 판정/통과.
- **박스**: shouldSpawnBox(레벨별 확률), attachBoxToBridge(보상 여부), destroyBox(콜백: flash, tilt, shake, punch, coin, instruction). LV3은 골드 버짓·첫 보상 보장.
- **UFO**: trySpawnUfo(레벨≥4, UFO_SPAWN_RATE). 다리 mesh 자식으로 추가, update에서 worldPos.z로 DUCK 시작/통과 판정, 3000 초과 시 제거.
- **업데이트**: 박스 z 회전·파괴/클린업, 파편/코인 물리·life, UFO duckStarted/passed.
- **dispose**: boxes/shards/ufos 순회하며 mesh 제거·geometry/material dispose.

---

## 8. FlowFrame.tsx

- `weekKey`, `onEnd`, `autoStart`, `showLevelSelector` → URL 쿼리로 iframe src 생성.
- `useEffect`: message 이벤트에서 `e.data?.type === 'flow-ended'`면 `onEnd()`.
- onEnd 있으면 하단에 "Flow 종료" 버튼 노출 (수동 종료용).

---

## 9. 사소한 점·주의사항

- **domRefs 의존성**: FlowPhaseContent의 useEffect([])에서 engine 생성 시 domRefs를 넣지만 의존성 배열에 없음. ref 객체는 안정적이라 실사용상 문제 없으나, eslint 주석으로만 처리됨.
- **getCurrentLevelNum()**: REST(0) 또는 END(-1) 구간에서도 호출되며, 그때는 0 또는 -1 반환. `lv` 계산 시 `currentLevelNum <= 5`로 1~5만 쓰므로, 0/-1이면 fallback 1 사용.
- **인트로 카운트다운**: 15초는 하드코딩(코드 1184). WELCOME_DURATION(5초)은 문구 전환용이라 실제 시작 시점과 불일치할 수 있음.
- **speedLines (3D)**: dispose에서 제거/dispose 없음. speedLinesNear만 제거함.
- **postMessage 보안**: `'*'`로 발송해 모든 origin에 전달. 같은 오리진에서만 iframe 쓰면 실질적 위험 낮지만, 필요 시 targetOrigin 제한 고려.
- **FlowBgmPanel/useFlowBGM·useFlowPano**: Admin Asset Hub에서만 사용. flow-phase 페이지는 이 훅으로 선택된 경로만 받아서 startGame에 넘김.
- **coordContract PLANET_***: 행성 제거 후 미사용. 정리 시 삭제 가능.
- **beatStepSec**: FlowEngine 내부 `(60/150)/2`와 FlowAudio 내부 `(60/150)/2` 동일. coordContract의 BEAT_BPM(150)과 일치하지만 엔진은 상수 직접 계산.

---

## 10. 요약

- **진입**: `/flow-phase` 페이지에서 FlowEngine 1회 생성, startGame으로 BGM/파노 경로·인트로·루프 시작.
- **플레이**: 입력 없이 패드 트리거 구간 진입 시 자동 점프·레인 전환, 레벨별 다리/박스/UFO(및 LV5 비율) 스폰, ObstacleManager가 박스/UFO/파편 처리.
- **종료**: triggerEnding → 15초 후 postMessage('flow-ended') → FlowFrame이 onEnd 호출.
- **상수**: 전부 coordContract에 두고, 엔진은 여기만 보면 됨.
- **미사용**: core/types, core/clock, systems/effects, spaceObjects(빈 배열), PLANET_* 상수, speedLines dispose 미처리 등은 정리·보강 후보.

이 문서는 FLOW 코드와 구조를 구체적으로 분석한 자문용 요약이다.
