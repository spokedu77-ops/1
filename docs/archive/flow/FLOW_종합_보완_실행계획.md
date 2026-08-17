# Flow Phase 종합 보완 실행 계획

**기준**: [FLOW_LeadEngine_작업명세_비판분석.md](FLOW_LeadEngine_작업명세_비판분석.md) + 이전 종합 보완 계획  
**목표**: 정리·최적화·몰입 강화를 안전하게 단계 적용

---

## 전체 플레이 시간

- **DURATIONS**: LV1(45) + LV2(45) + REST1(30) + LV3(55) + REST2(30) + LV4(55) + END(20) = **280초 ≈ 4분 40초** (인트로+가이드 포함 시 총 약 5분)
- 실제 플레이: 45+45+55+55 = **200초 ≈ 3분 20초**
- LV4 전 별도 쉬는 시간(30초) + DUCK 안내
- 문구는 `PHRASES`에서 수정. `coordContract.ts`의 `DURATIONS`로 조정

---

## Phase 1: 안전 최적화 (우선 실행)

| # | 작업 | 파일 | 내용 |
|---|------|------|------|
| 1.1 | dt Cap | FlowEngine.ts | update(dt) 최상단 `dt = Math.min(rawDt, 0.1)` |
| 1.2 | Pixel Ratio | FlowEngine.ts | `setPixelRatio(Math.min(window.devicePixelRatio, 2))` |
| 1.3 | Geometry 축소 | FlowEngine.ts, ObstacleManager.ts | Box 세그먼트 1, Cylinder 8~12 |
| 1.4 | coordContract 보완 | coordContract.ts | FOV_MIN/MAX, LOW_POLY 옵션 (선택) |

---

## Phase 2: 미사용 코드 정리

| # | 작업 | 대상 | 조치 |
|---|------|------|------|
| 2.1 | import 사용처 확인 | BridgeManager, WorldEnvironment, motion, CameraRig, background, audio, AudioSystem, hudBridge, uiEvents | grep 후 미참조 파일 삭제 또는 주석 처리 |
| 2.2 | 매직넘버 이전 | FlowEngine, ObstacleManager | coordContract에 추가 후 import |
| 2.3 | components 정리 | BootOverlay, DevPanel, HUD, LensLayer | page.tsx에서 사용 여부 확인 후 미사용 제거 |

---

## Phase 3: 몰입 튜닝

| # | 작업 | 내용 |
|---|------|------|
| 3.1 | Dynamic FOV | currentSpeed 비례, 58~72 범위, coordContract 상수화 |
| 3.2 | 고속 Shake | sin 합성으로 x/y 미세 진동, 상수화 |
| 3.3 | Duck 미세 조정 | duckDipOffset -70 유지 또는 -80, LERP 곡선 정리 |
| 3.4 | 착지 스프링 | 기존 landingImpact 유지, 값만 coordContract에서 조정 |

---

## Phase 4: BGM·피드백·상용 옵션 (이전 계획 유지)

- FlowAudio에 mp3 BGM 로드
- 피드백 문구·호흡 시간
- 볼륨/음소거 UI
- WebGL/오디오 실패 안내

---

## 주의사항

- **coordContract를 SSOT로 유지**. FlowEngine 내부 CONFIG 객체 생성하지 않음.
- **engine/ 전체 삭제 금지**. 미사용 모듈만 선택 제거.
- **자동 트리거·우주 테마** 변경하지 않음.
