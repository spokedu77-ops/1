# Flow Phase - 수치 조정 가이드

**파일**: `app/flow-phase/engine/core/coordContract.ts`

- **즉시 테스트**: `/flow-phase?admin=true`에서 레벨 슬라이더로 LV3/LV4 점프 후 확인
- **문구 수정**: `PHRASES` 객체 (welcome, restBreathe, lv3Intro, lv4Intro, ending)

## UFO 위치

- **다리 중앙**: `ObstacleManager.trySpawnUfo`에서 `group.position.set(0, UFO_HEIGHT, 0)` (z=0 = 다리 중간)

## UFO 타이밍

| 상수 | 현재값 | 설명 | 조정 가이드 |
|------|--------|------|-------------|
| `UFO_DUCK_START_Z` | 250 | DUCK 트리거 시점. UFO world Z가 이 값 이상이 되면 숙이기 시작 | **더 일찍**: 150~200. **더 늦게**: 300~350. 반드시 `UFO_PASS_Z`보다 작아야 함 |
| `UFO_PASS_Z` | 500 | UFO 통과 판정. 이 Z를 넘으면 whoosh 효과음 재생 | **일찍 통과 인식**: 450. **늦게**: 550. `UFO_DUCK_START_Z`보다 커야 함 |

**좌표계**: 플레이어 z≈400. UFO가 다리와 함께 z 증가 방향으로 이동.  
- z < 400: UFO가 플레이어 쪽으로 접근 중  
- z > 400: UFO가 플레이어를 지나감  

→ `UFO_DUCK_START_Z`를 **250**처럼 400보다 작게 두면, UFO가 다가오는 중에 숙이기 시작.

## Duck 카메라 연출

| 상수 | 현재값 | 설명 |
|------|--------|------|
| `DUCK_DIP_TARGET` | -80 | 카메라 Y 오프셋 (숙였을 때) |
| `DUCK_PITCH_TARGET` | 0.55 | 카메라 rotation.x (내려다보는 각도) |
| `DUCK_RECOVER_RATE_POS` | 0.12 | Y 복귀 속도 |
| `DUCK_RECOVER_RATE_ROT` | 0.15 | rotation 복귀 속도 |

---

## 다음 단계 (Phase 4)

1. **FlowAudio에 mp3 BGM 로드**  
2. **피드백 문구·호흡 시간 강화**  
3. **볼륨/음소거 UI**  
4. **WebGL/오디오 실패 시 안내**
