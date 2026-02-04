# PLAY v1 VisualEvent 보강 + PlayRenderer 구현 보고서

## [1] 변경 파일 목록

| 구분 | 경로 | 변경 내용 |
|------|------|-----------|
| **수정** | app/lib/engine/play/types.ts | EXPLAIN(motionId,label), BINARY(src), REVEAL_WIPE(bgSrc,fgSrc,progress,phase,direction), DROP(bgSrc?,objSrc,phase,objIndex) |
| **수정** | app/lib/engine/play/timeline.ts | 이벤트 형태 변경, src 주입, REVEAL_WIPE emit, PROGRESSIVE(frames)→BINARY 폴백 |
| **수정** | app/lib/engine/play/compiler.ts | ResolvedSet에 bgSrc, fgSrc 전달 |
| **수정** | app/lib/engine/play/presets.ts | MOTION_LABELS 추가 |
| **생성** | app/lib/engine/play/mockAssetIndex.ts | play-test용 실사 URL (picsum.photos), AssetHub 교체 시 이 객체만 교체 |
| **수정** | app/lib/engine/play/index.ts | MOTION_LABELS, mockAssetIndex export |
| **수정** | app/components/runtime/PlayRenderer.tsx | 무상태 렌더: EXPLAIN(텍스트만), BINARY(풀스크린 img), REVEAL_WIPE(clip-path), DROP(animate-drop) |
| **수정** | app/components/runtime/PlayTestDebugOverlay.tsx | REVEAL_WIPE, 새 이벤트 형태 반영 |
| **수정** | app/components/play-test/PlayTestContent.tsx | mockAssetIndex 사용 |
| **수정** | app/globals.css | @keyframes play-drop 추가 |

---

## [2] 핵심 로직 Diff 요약

### ① VisualEvent 타입 (types.ts)
- **이전**: BinaryEvent(imageId, payload), ProgressiveEvent(style, frameIndex, phase, payload), DropEvent(objectIndex, payload)
- **변경**: BINARY(src, isActionPhase), REVEAL_WIPE(bgSrc, fgSrc, progress, phase, direction), DROP(bgSrc?, objSrc, phase, objIndex), EXPLAIN(motionId, label)

### ② timeline.buildTimeline (timeline.ts)
- **이전**: PROGRESSIVE(wipe) 이벤트에 payload만 포함
- **변경**: REVEAL_WIPE 이벤트 emit, progress=(step+(phase==='action'?1:0))/5, bgSrc/fgSrc 직접 주입. BINARY는 src 직접 주입. DROP은 objSrc, bgSrc 주입.
- **규칙 유지**: Pure (fetch/random/Date 없음)

### ③ PlayRenderer (PlayRenderer.tsx)
- **이전**: 스켈레톤 (tMs, visuals 텍스트만 표시)
- **변경**: currentTick=floor(tMs/TICK_MS), eventsAtTick=visuals.filter(v=>v.tick===currentTick). EXPLAIN: 텍스트/아이콘만(사진 금지). BINARY: <img src>. REVEAL_WIPE: clip-path inset((1-progress)*100% 0 0 0). DROP: tick<=currentTick인 이벤트 누적, key=tick로 애니메이션 리스타트.
- **state/useEffect 금지**: props만 사용, 파생 값은 매 렌더에서 계산

---

## [3] 체크 포인트 검증

| 항목 | 결과 | 근거 |
|------|------|------|
| EXPLAIN에 사진 없음 | PASS | PlayRenderer에서 EXPLAIN 분기 시 `<img>` 없음. `explain.label`, `explain.motionId` 텍스트만 |
| BINARY 0.5초마다 교대 | PASS | timeline: t%2===0→ON(src=onSrc), t%2===1→OFF(src=offSrc). TICK_MS=500 |
| REVEAL/DROP action 0.5s→rest 0.5s | PASS | phase=(t%2===0)?'action':'rest', (t%2===0)?'drop':'rest'. 연속 tick 교대 |
| PlayRenderer state/useEffect 없음 | PASS | useState, useRef, useEffect 전부 없음. tMs/visuals props로 currentTick·eventsAtTick 계산 |
| timeline fetch/random/time 없음 | PASS | buildTimeline 의존성: PLAY_RULES, types, presets(MOTION_LABELS). Date/Math.random/fetch 없음 |

---

## [4] mockAssetIndex

- **위치**: app/lib/engine/play/mockAssetIndex.ts
- **URL 소스**: picsum.photos (실사 이미지, 인증 불필요)
- **구성**: say_hi(walk, throw, clap, punch) motion별 off/on, bgSrc/fgSrc(REVEAL_WIPE), objects(DROP)
- **교체**: AssetHub 연동 시 mockAssetIndex 객체만 교체

---

## [5] 테스트 방법

1. `npm run dev` 실행
2. `/admin/iiwarmup/play-test` 접속
3. Play 클릭 → BINARY 0.5초 교대, REVEAL_WIPE progress 증가, DROP 낙하 애니메이션 확인
4. EXPLAIN 구간에서 사진 없이 라벨만 표시되는지 확인
