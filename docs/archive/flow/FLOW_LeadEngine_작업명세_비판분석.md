# Lead Engine Developer 작업명세 - 비판 분석

**원문**: Cleanup, Optimize, and Enhance Immersion  
**목적**: 작업 명세를 검토하고, 수용/수정/거부 사항을 명확히 하여 종합 보완 계획에 반영

---

## 1. Cleanup — 비판 및 수정안

### 1.1 "Delete Unused" 명세의 문제

**원문**:  
> page.tsx와 layout.tsx를 제외한 engine/, _components/, core/, systems/ 등 모든 하위 폴더와 파일은 사용하지 않으므로 참조를 제거하고 삭제하라

**비판**:
- `app/flow-phase`에는 `layout.tsx`가 없음.
- `_components/` 폴더는 존재하지 않음. 실제 폴더는 `components/`.
- **engine/ 전체를 삭제하면 앱이 동작하지 않음.** page.tsx는 FlowEngine, ObstacleManager, FlowAudio, FlowUI, coordContract를 import함.
- 의도는 "engine/ **내부의 미사용 모듈**"을 정리하는 것으로 보임.

**수정된 명세**:
- **유지 필수**: FlowEngine.ts, ObstacleManager.ts, FlowAudio.ts, FlowUI.ts, FlowTypes.ts, coordContract.ts
- **미사용 후보 제거**: BridgeManager.ts, WorldEnvironment.ts, motion.ts, MotionEngine.ts, CameraRig.ts, background.ts, audio.ts, AudioSystem.ts, hudBridge.ts, uiEvents.ts, content/*, state/gameState.ts, systems/renderer.ts, themeRuntime.ts 등
- **제거 전 반드시**: grep으로 import 여부 확인. FlowEngine이 참조하지 않는 것만 삭제.

### 1.2 Centralize Constants — coordContract와의 충돌

**원문**:  
> FlowEngine 클래스 내부에 흩어진 매직 넘버들을 클래스 상단 `private readonly CONFIG` 객체로 모아라

**비판**:
- 이미 `coordContract.ts`가 SSOT로 존재하고, FlowEngine이 여기서 상수를 import함.
- CONFIG를 FlowEngine 내부에 두면:
  - ObstacleManager는 coordContract를 따로 import하므로 **이중 관리** 발생
  - coordContract 정리 노력이 무효화됨
- "매직넘버"가 남아 있다면 → coordContract에 추가하고 FlowEngine에서 import하는 쪽이 일관됨

**수정된 명세**:
- **CONFIG 객체 생성하지 말 것**. coordContract를 SSOT로 유지.
- FlowEngine/ObstacleManager 내부에 남은 매직넘버는 coordContract로 이전.

---

## 2. Optimization — 수용 및 보완

### 2.1 Pixel Ratio 제한 — 수용

```ts
this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
```

- 모바일/고해상도에서 성능 개선에 유효. **수용**.

### 2.2 Geometry 세그먼트 축소 — 부분 수용 + 주의

**원문**: boxGeometry, cylinderGeometry 세그먼트를 1~8로 줄여라

**주의**:
- BoxGeometry(width, height, depth, wSeg, hSeg, dSeg): 1,1,1이면 박스 1개 — 문제 없음.
- CylinderGeometry(radiusTop, radiusBottom, height, radialSeg, heightSeg): radialSeg=1이면 삼각형. **최소 3~4** 필요.
- UFO(원반): radialSeg 8~12 정도면 저사양에 적당. 1은 비추천.

**수정된 명세**:
- Box: 세그먼트 1 (또는 미지정)
- Cylinder/Sphere: radialSeg 8~12, heightSeg 1~4
- coordContract에 `LOW_POLY_SEGMENTS` 등 옵션으로 관리 가능

### 2.3 dt Cap — 수용

```ts
const dt = Math.min(rawDt, 0.1);
```

- 물리 폭주 방지에 필수. **수용**. (이미 뉴버전에 적용 여부 확인 필요)

---

## 3. Immersion Tuning — 수용 시 주의사항

### 3.1 Dynamic FOV (60~85) — 범위 조정 권장

**원문**:  
> currentSpeed에 비례해 camera.fov가 60(정지) ~ 85(최고속도) 사이를 오가도록 LERP

**비판**:
- 현재 설계: 레벨별 FOV (LV1:58, LV2/3:63, LV4:66)
- 85 FOV는 매우 넓어 **멀미** 위험 가능
- 속도 비례 FOV는 몰입감을 높이지만, 70~72 정도로 상한을 두는 것이 안전

**수정된 명세**:
- FOV 범위: 58(저속) ~ 72(최고속) 권장. 85는 옵션으로 두거나 테스트 후 결정.
- coordContract에 `FOV_MIN`, `FOV_MAX` 추가.

### 3.2 Camera Shake — 수용 + 구현 방식

**착지 스프링**:  
- 이미 `landingImpactY/Z`가 스프링-댐퍼로 구현됨. 강도/곡선만 조정.

**고속 Perlin 느낌 진동**:
- Perlin 라이브러리 없이: `sin(t*a)*sin(t*b)*amp` 형태의 합성으로 유사 효과 구현.
- coordContract에 `HIGH_SPEED_SHAKE_AMP`, `HIGH_SPEED_SHAKE_FREQ` 추가.

**Duck LERP**:
- 현재: duckDipOffset=-70, duckPitchX=0.55
- 원문 "y: 90까지": 카메라 base 130 → 90이면 offset -40. **현재 -70이 더 강한 duck**.
- 사용자 피드백상 "더 아래로 내려갔다 오는 느낌"을 원했으므로, -70 유지 또는 -80~-90으로 더 강화하는 쪽이 적합.
- "y: 90"을 글자 그대로 적용하면 오히려 덜 숙이는 것이 됨.

**수정된 명세**:
- Duck: duckDipOffset -70 유지 또는 -80으로 소폭 강화. "y: 90"은 적용하지 않음.

### 3.3 Rules — 수용

- 자동 트리거 유지: 수용.
- 우주 공간 느낌·색감 유지: 수용.

---

## 4. 종합 보완 계획에 반영할 체크리스트

| 항목 | 원문 | 비판 결과 | 반영 내용 |
|------|------|-----------|-----------|
| 미사용 삭제 | engine/ 등 전체 | 잘못된 범위 | engine/ **내부** 미사용 모듈만 제거, import 정리 |
| Constants | CONFIG 객체 | coordContract와 중복 | coordContract 유지, 매직넘버 이전 |
| Pixel Ratio | ≤2 | 수용 | renderer.setPixelRatio(Math.min(..., 2)) |
| Geometry | 1~8 | Cylinder 1은 부적합 | Box 1, Cylinder 8~12 |
| dt Cap | 0.1 | 수용 | update 최상단 dt = Math.min(rawDt, 0.1) |
| Dynamic FOV | 60~85 | 85 과함 | 58~72 권장, coordContract화 |
| 고속 Shake | Perlin 느낌 | 수용 | sin 합성으로 구현, 상수화 |
| Duck y:90 | 적용 | 현재가 더 강함 | -70 유지 또는 -80으로 소폭 강화 |

---

## 5. 실행 순서 제안

1. **Phase 1 (안전)**: dt cap, pixel ratio, geometry 세그먼트 조정
2. **Phase 2 (정리)**: 미사용 모듈 import 제거 및 파일 삭제
3. **Phase 3 (몰입)**: Dynamic FOV, 고속 shake, Duck 미세 조정

이 순서로 진행하면 기존 동작을 해치지 않으면서 단계적으로 품질을 올릴 수 있다.
