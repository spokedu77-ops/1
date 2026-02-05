# Play Operator / Runtime 고도화 — 작업 보고

## 1) 변경 파일 리스트 + 핵심 diff 요약 (Phase별)

### Phase 1 — 타이밍 정밀도

| 파일 | 변경 요약 |
|------|------------|
| `app/components/runtime/RuntimePlayer.tsx` | `snapToTick?: boolean` prop 추가 (default false). 재생 루프에서 `snapToTick`이 true면 `displayTMs = floor(rawTMs / TICK_MS) * TICK_MS`로 스냅하여 렌더/오디오에 전달. |
| `app/components/subscriber/PlayRuntimeWrapper.tsx` | `RuntimePlayer`에 `snapToTick` 전달. |
| `app/components/play-test/PlayTestContent.tsx` | `RuntimePlayer`에 `snapToTick` 전달. |

### Phase 2 — Operator 고도화

| 파일 | 변경 요약 |
|------|------------|
| `app/lib/engine/play/binaryPatterns.ts` | **신규**. PATTERN_STEADY(1010...), PATTERN_ACCENT(110110...), PATTERN_BREATH(100010...), getBinaryPatternForSet(blockIndex, setIndex). |
| `app/lib/engine/play/timeline.ts` | BINARY: 고정 `t%2` 대신 `getBinaryPatternFromPreset(blockIndex, setIndex)` 패턴 사용. PROGRESSIVE(wipe): rest = stepProgress*0.35, action = 0.35+stepProgress*0.65 (예고→보상). PROGRESSIVE(frames): `isActionPhase: t % 2 === 0` 추가. visualsByTick/audioByTick를 filter 대신 빈 배열 생성 후 push로 O(n) 생성. |
| `app/components/runtime/PlayRenderer.tsx` | DROP: `tick <= currentTick`만 쓰지 않고 `tick >= currentTick - DROP_WINDOW_TICKS`(8) 조건 추가해 최근 8 tick만 렌더. |

### Phase 3 — OperatorPreset 시스템

| 파일 | 변경 요약 |
|------|------------|
| `app/lib/engine/play/operatorPresets.ts` | **신규**. OPERATOR_PRESETS[{ id, binaryPatternIndex }], getOperatorPreset(blockIndex, setIndex), getBinaryPatternFromPreset. |
| `app/lib/engine/play/timeline.ts` | getBinaryPatternForSet 대신 getBinaryPatternFromPreset 사용 (프리셋 테이블 경유). |

### 성능

| 파일 | 변경 요약 |
|------|------------|
| `app/lib/engine/play/timeline.ts` | visualsByTick/audioByTick를 `Array.from({ length }, () => [])` 후 한 번씩 순회하며 push. O(n²) filter 제거. |

---

## 2) 동작 변화 (체감 포인트) 5줄 요약

1. **0.5초 리듬 고정**: Play 구간에서 `snapToTick`으로 표현 시간이 tick 경계(500ms)에 스냅되어, 토글/와이프/드롭이 정확히 0.5초 단위로 바뀐다.
2. **블록·세트마다 다른 BINARY 리듬**: 같은 10초라도 block/set 조합별로 steady / accent / breath 패턴이 돌아가며 적용되어 단조로움이 줄어든다.
3. **Wipe 예고→보상**: say_hi set2 등 PROGRESSIVE(wipe)에서 rest tick은 낮은 progress(예고), action tick은 높은 progress(보상)로 전환되어 몰입감이 강화된다.
4. **Frames 구간 SFX**: PROGRESSIVE(frames)로 내려가는 BINARY 이벤트에 isActionPhase를 넣어 SFX가 action tick에만 나가도록 정합했다.
5. **DROP 정리**: 최근 8 tick(4초)만 렌더해 DOM이 과도하게 쌓이지 않고 “떨어짐”이 깔끔하게 보인다.

---

## 3) 리스크 / 추가 개선 후보 (선택)

1. **리스크**: `snapToTick`이 true일 때 시각적으로는 tick 단위로만 움직이므로, 매우 짧은 구간(예: 1 tick)에서 재생 후 정지하면 마지막 프레임이 한 tick 길이만큼 유지되는 느낌이 있을 수 있음. 필요 시 “끝 도달 시 즉시 onEnd” 등 미세 조정 가능.
2. **추가 개선**: operatorPresets에 wipeCurve(soft/sharp), dropWindowTicks, sfxDensity(seed 기반 SFX 샘플링)를 넣고, timeline/buildTimeline에서 옵션으로 받아 적용하면 제품화 시 블록별 밀도·곡선을 더 세밀히 조정 가능.
3. **추가 개선**: PlayRenderer의 DROP_WINDOW_TICKS(8)를 rules 또는 operatorPresets에서 읽어오면, 프리셋별로 “최근 N초만 보기”를 다르게 줄 수 있음.

---

## Phase 4 — PLAY 150s 몰입도 고도화 (POST Phase 1~3)

**수정 범위**: Whitelist만 사용 (timeline.ts, PlayRenderer.tsx, operatorPresets.ts, binaryPatterns.ts, 본 문서).

### 변경 파일 목록 (Whitelist 확인)

| 파일 | 변경 요약 |
|------|------------|
| `app/lib/engine/play/binaryPatterns.ts` | `normalizePattern(pattern, targetLength)` 추가. 짧으면 인덱스 반복, 길면 잘라서 길이 고정. deterministic 유지. |
| `app/lib/engine/play/operatorPresets.ts` | `getBinaryPatternFromPreset`에서 반환 전 `normalizePattern(raw, SET)` 호출. 패턴 길이 != SET일 때 런타임 에러 대신 안전 보정. |
| `app/lib/engine/play/timeline.ts` | BINARY: 패턴 접근 유지(isActionPhase=패턴 1인 tick만 true). Wipe: progress 계산 후 `Math.min(1, Math.max(0, raw))` clamp. |
| `app/components/runtime/PlayRenderer.tsx` | DROP: 윈도우(8 tick) 유지. (blockIndex, setIndex, objIndex) 중복 시 tick 최대인 것만 유지. 동일 tick당 최대 3개로 제한 후 렌더. |

### Phase 4 diff 요약 (각 파일 3줄)

- **binaryPatterns.ts**: `normalizePattern()`으로 패턴 길이를 targetLength에 맞춤. 짧으면 `[i % pattern.length]` 반복, 길면 순회로 targetLength만 채움. 에러 대신 보정으로 동작.
- **operatorPresets.ts**: `PLAY_RULES.TICKS.SET` 참조 추가. `getBinaryPatternFromPreset`이 `normalizePattern(raw, SET)`를 거쳐 항상 길이 SET 배열 반환.
- **timeline.ts**: Wipe 구간 progress에 0~1 clamp 적용. BINARY는 이미 isActionPhase=패턴값과 일치하므로 SFX 일관성 유지.
- **PlayRenderer.tsx**: DROP을 윈도우 필터 후 Map으로 (blockIndex, setIndex, objIndex) 키당 최신(tick 최대)만 남기고, tick별 최대 3개로 잘라서 렌더.

### 몰입 체감 변화 5줄

1. 패턴 길이가 달라도 크래시 없이 반복/자르기로 안정 재생된다.
2. Wipe progress가 0~1을 벗어나지 않아 clip-path가 깨지지 않고, 보상 구간이 명확하다.
3. DROP은 같은 objIndex가 여러 번 떠도 “최신 하나”만 보여 화면이 덜 어수선하다.
4. tick당 DROP 최대 3개로 제한되어 동일 tick에 여러 drop이 있어도 과도한 DOM이 쌓이지 않는다.
5. BINARY isActionPhase와 SFX가 패턴 1인 tick에만 맞춰져 리듬과 소리가 일치한다.

### 리스크 / 회귀 가능성 3개

1. **회귀**: `normalizePattern`으로 패턴을 반복할 때, 원래 20이 아닌 짧은 패턴을 쓰면 리듬이 반복 구간에서 동일하게 느껴질 수 있음. 현재 BINARY_PATTERNS는 모두 20이므로 영향 없음.
2. **리스크**: DROP “동일 tick 최대 3개” 제한으로, 같은 tick에 4개 이상 drop이 있으면 일부가 안 보일 수 있음. 기존 10초 set에서 drop은 짝수 tick마다 1개씩이므로 실제로는 1개/tick 수준이라 회귀 가능성 낮음.
3. **회귀**: Wipe clamp는 이미 0.35/0.65 조합이 0~1 안이라 동작 변화 없을 가능성이 크고, 향후 progress 공식 변경 시에만 의미 있음.

---

## PLAY-P4 — Impact & Game Feel (반응 착시 완성도)

**범위**: Whitelist만 사용 — `timeline.ts`, `PlayRenderer.tsx`, 본 문서. (rules/presets/compiler/RuntimePlayer/types/operatorPresets/binaryPatterns/DB·API·AssetHub/새 UI·설정 변경 금지.)

### 변경 파일 (Whitelist 확인)

| 파일 | 변경 요약 |
|------|------------|
| `app/lib/engine/play/timeline.ts` | 사용하지 않던 상수 `PRE_CALCULATED_TOTAL_TICKS` 제거. WIPE clamp·기능 유지. |
| `app/components/runtime/PlayRenderer.tsx` | (1) BINARY/WIPE: action tick에서만 `<img>`에 미세 임팩트(scale≈1.02, contrast/brightness 약간) 적용. (2) SET 구간 내 setOffset 0..6/7..13/14..19에 따른 intensity 가중치(1.00/1.06/1.10)를 action tick에 곱해 리듬감 강화. (3) DROP `<img>`에 `animationTimingFunction: cubic-bezier(0.2, 0, 0.2, 1)` 적용(0.5s 유지). |
| `docs/PLAY_OPERATOR_RUNTIME_고도화_보고.md` | 본 PLAY-P4 섹션 추가. |

### 무엇이 어떻게 달라졌는지 (체감 5줄)

1. **액션 틱만 임팩트**: BINARY/WIPE에서 action phase인 틱에만 살짝 scale·명암·밝기가 올라가서 “쳤다”는 반응 착시가 강해진다.
2. **rest/explain/transition은 그대로**: 나머지 틱에는 scale·filter가 1로 유지되어, 예고·전환 구간은 기존처럼 잔잔하다.
3. **SET 안에서 강·중·약**: 같은 10초 SET도 앞(0..6)→중(7..13)→뒤(14..19)로 가면서 임팩트가 1.00→1.06→1.10로 미세하게 올라가 리듬이 균일하지 않게 느껴진다.
4. **DROP 물리감**: 떨어지는 이미지에 가속→감속 이징을 넣어, 단순 선형보다 자연스럽게 보인다.
5. **레이아웃 유지**: transform은 `transformOrigin: center`로 적용해 레이아웃 흔들림 없이 시각만 바뀐다.

### 리스크 3개

1. **과한 임팩트**: 일부 디바이스/해상도에서 scale 1.02×1.10 구간이 눈에 띌 수 있음. 필요 시 base 1.02나 구간 가중치(1.06/1.10)를 소수점으로 낮춰 조정 가능.
2. **intensity 구간 가정**: block=50 tick(EXPLAIN 5 + SET 20×2 + TRANSITION 5) 고정 가정. rules에서 TICKS 구조가 바뀌면 setOffset 구간(0..6/7..13/14..19)을 재검토해야 함.
3. **DROP 이징**: cubic-bezier(0.2, 0, 0.2, 1)로 통일했으므로, 다른 easing을 쓰던 기존 스타일이 있다면 덮어쓴다.

### 확인 체크리스트

- [ ] action tick에서만 impact가 적용되는가 (BINARY / WIPE)
- [ ] rest / explain / transition에서 impact가 0인가
- [ ] set 내부 강·중·약이 체감되는가 (과하지 않게)
- [ ] DROP이 더 “물리감” 있게 보이는가 (이징 적용)
- [ ] 변경 파일이 whitelist 밖으로 새지 않았는가

---

## PLAY-P5 — Stability & Variation Control

**범위**: Whitelist만 사용 — `PlayRenderer.tsx`, `operatorPresets.ts`, 본 문서. (rules/timeline/types/compiler/presets/RuntimePlayer/binaryPatterns 변경 금지, UI·설정·랜덤 금지.)

### 변경 파일 (Whitelist 확인)

| 파일 | 변경 요약 |
|------|------------|
| `app/components/runtime/PlayRenderer.tsx` | (1) getActionImpact 반환값 clamp: scale 1~1.07, contrast/brightness 1~1.06. (2) visuals 순회 2회→1회: 한 루프에서 eventsAtTick + dropInWindow 동시 수집. DROP 윈도우/최신/최대 3개 로직 유지. |
| `app/lib/engine/play/operatorPresets.ts` | OPERATOR_PRESETS 3→5개 확장(calm_steady, calm_breath, standard_accent, punchy_steady, punchy_accent). OperatorPreset에 impactBias optional 추가. getOperatorPreset을 (blockIndex*3 + (setIndex-1)*2) % len으로 변경해 결정론 유지·순환 다양화. |
| `docs/PLAY_OPERATOR_RUNTIME_고도화_보고.md` | PLAY-P5 섹션 추가. |

### diff 요약 (각 파일 3줄)

- **PlayRenderer.tsx**: IMPACT_CLAMP 상수와 clamp()로 scale/contrast/brightness 상한·하한 적용. for (v of visuals) 한 번만 돌며 v.tick===currentTick이면 eventsAtTick에, DROP이고 윈도우 안이면 dropInWindow에 push. byKey/byTick 등 DROP 후처리 로직은 그대로.
- **operatorPresets.ts**: ImpactBias 타입 및 preset.impactBias 추가. OPERATOR_PRESETS 5개(id + binaryPatternIndex 0~2 + impactBias). getOperatorPreset 인덱스 공식 변경으로 블록/세트별 프리셋 분포 다양화.
- **본 문서**: PLAY-P5 변경 목록·체감·리스크·체크리스트 기록.

### 체감 변화 5줄 (덜 피곤하고 안정적)

1. **과자극 상한**: scale/contrast/brightness가 1.07·1.06을 넘지 않아 장시간 시청 시 시각 피로 리스크가 줄어든다.
2. **action tick만 임팩트 유지**: P4와 동일하게 rest/explain/transition에서는 impact=1로, 반응 착시는 액션 틱에만 적용된다.
3. **블록별 패턴 다양성**: 프리셋 5개·선택 공식 변경으로 블록/세트 조합마다 calm~punchy 분포가 달라져 단조로움이 줄어든다(impactBias는 P5에서 렌더 미적용).
4. **렌더 부하 감소**: visuals를 한 번만 순회해 eventsAtTick과 drop 후보를 같이 채우므로 filter 반복이 사라진다.
5. **DROP 동작 동일**: 윈도우 8 tick, (block,set,obj) 최신 유지, tick당 최대 3개 제한은 그대로라 회귀 없다.

### 리스크 3개

1. **clamp 경계**: 상한(1.07/1.06)을 더 낮추면 "임팩트가 없다"고 느낄 수 있고, 올리면 과자극 우려가 다시 생길 수 있음. 필요 시 상수만 조정.
2. **프리셋 인덱스 공식**: (blockIndex*3 + (setIndex-1)*2) % 5는 블록 진행에 따라 같은 프리셋이 연속될 수 있음. 다른 식으로 바꿀 경우 deterministic만 유지하면 됨.
3. **단일 순회 가정**: visuals가 매우 클 때 한 번 순회도 비용이 있으나, 기존 2회 filter보다 항상 낫고, 향후 visualsByTick 전달 시 추가 최적화 가능.

### 확인 체크리스트

- [ ] action tick 외 impact=1인가
- [ ] impact 상한(scale 1.07 / contrast·brightness 1.06) 준수
- [ ] presets 5개로 확장됐는가 (결정론 유지)
- [ ] visuals 순회가 1회로 줄었는가 (events+drop 동시 수집)
- [ ] DROP window/최신/최대 3개 로직 회귀 없음
- [ ] whitelist 외 파일 변경 없음

---

## PLAY-P6 — Audio Layer Completion (BGM+SFX+Mix+No-Miss)

**범위**: Whitelist만 사용 — `PlayRuntimeWrapper.tsx`, `think150Audio.ts`, `RuntimePlayer.tsx`, 본 문서. (rules/timeline/types/presets/compiler/PlayRenderer 변경 금지, DB·API·새 UI·랜덤 금지.)

### 변경 파일 (Whitelist 확인)

| 파일 | 변경 요약 |
|------|------------|
| `app/lib/admin/engines/think150/think150Audio.ts` | GainNode(bgmGain 0.6, sfxGain 0.9) 도입. startBGM: fade-in 0.4s, durationMs 시 예정 fade-out 0.4s 후 stop. stopBGM: fade-out 0.25s 후 stop. playSFX(path) 추가(캐시·sfxGain·중첩 허용). duckBGM(amountDb, attackMs, releaseMs) 추가. stopAllSFX() 추가. Think150(tick/recall)는 ctx.destination 직결 유지. |
| `app/components/subscriber/PlayRuntimeWrapper.tsx` | onAudioEvent에 SFX 분기 추가(ev.path 시 playSFX 호출). cleanup에서 stopBGM() + stopAllSFX() 호출. |
| `app/components/runtime/RuntimePlayer.tsx` | 오디오 디스패치: currentTick > lastProcessedTick이면 last+1..currentTick까지 루프하며 이벤트 전부 디스패치(catch-up). audioByTick[t] 우선 사용, 없으면 timeline.audio.filter fallback. 탭 비활성/복귀 시 tick 점프해도 누락 방지. |
| `docs/PLAY_OPERATOR_RUNTIME_고도화_보고.md` | PLAY-P6 섹션 추가. |

### diff 요약 (파일당 3줄)

- **think150Audio.ts**: bgmGain/sfxGain 생성·연결, BGM은 gain 경유·fade-in 0.4s·duration 기반 예정 fade-out/stop. stopBGM은 0.25s fade-out 후 stop. playSFX는 url 캐시·sfxGain·duckBGM(-6,30,120) 호출. duckBGM은 setValueAtTime+linearRampToValueAtTime으로 볼륨 감소 후 복구.
- **PlayRuntimeWrapper.tsx**: playSFX, stopAllSFX import. onAudioEvent에서 kind==='SFX' && ev.path일 때 playSFX(ev.path). useEffect cleanup에 stopAllSFX() 추가.
- **RuntimePlayer.tsx**: currentTick > last 시 prev+1..currentTick 구간 루프로 events 디스패치. timeline.audioByTick[t] 우선, 없으면 audio.filter(e => e.tick === t). seek back 시 currentTick만 디스패치 후 last 갱신.

### 체감 변화 5줄 (fade/ducking, SFX 살아남)

1. **BGM fade**: 시작 시 0.4초 fade-in, 종료 시 0.4초(또는 수동 stop 시 0.25초) fade-out으로 끊김이 줄어든다.
2. **SFX 재생**: Play 타임라인의 SFX 이벤트가 실제로 재생되며, action tick과 소리가 맞는다.
3. **Ducking**: SFX 재생 시 BGM이 -6dB·30ms attack·120ms release로 잠깐 내려갔다가 복귀해 SFX가 잘 들린다.
4. **duration stop**: totalMs 기반으로 Play 끝 시점에 BGM이 예정대로 fade-out 후 정지한다.
5. **No-miss**: 탭 비활성 후 복귀 등으로 tick이 점프해도 중간 tick 오디오 이벤트가 catch-up으로 전부 디스패치되어 SFX/BGM_STOP 누락이 없다.

### 리스크 3개

1. **타이머 기반 BGM stop**: startBGM의 durationMs는 setTimeout 기반이라, 탭 비활성으로 타이머가 지연될 수 있음. 복귀 후 catch-up으로 BGM_STOP 이벤트는 디스패치되므로 stopBGM()은 호출되나, 이미 예정된 자동 stop과 중복될 수 있음. 정책상 “이벤트 기반 stop 우선”으로 두면 무방.
2. **Think150 회귀**: tick/recall은 여전히 ctx.destination 직결이며, ensurePlayGainNodes는 startBGM/playSFX/duckBGM 경로에서만 호출되므로 Think150 코드 경로는 변경 없음. initThink150Audio 등은 그대로다.
3. **캐시 무한 증가**: sfxBufferCache에 url별 버퍼가 쌓임. 같은 세션 내 동일 path만 재생하면 제한적이지만, 장시간 사용 시 캐시 상한(예: 최대 20개)을 두는 후속 개선을 고려할 수 있음.

### 확인 체크리스트

- [ ] Play에서 SFX가 실제로 들리는가
- [ ] SFX 순간에 BGM이 잠깐 내려갔다가 복귀하는가 (ducking)
- [ ] BGM이 시작/종료 시 부드럽게 fade 되는가
- [ ] Play 종료 시 BGM이 정확히 멈추는가 (duration stop)
- [ ] 탭 비활성/복귀 후에도 오디오 이벤트가 누락되지 않는가 (catch-up dispatch)
- [ ] Think150 기존 사운드가 회귀하지 않는가
- [ ] whitelist 외 파일 변경이 없는가

**참고**: 새로고침 후 BGM/영상이 안 나오는 현상은 에셋 로딩(usePlayAssetPack, buildPlayAssetIndex, packStatus) 경로를 별도 점검해야 하며, P6 오디오 레이어 변경 범위 밖이다.
