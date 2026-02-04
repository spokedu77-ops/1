# Flow Phase 뉴버전 - 몰입 요소 명세

**기준**: `app/flow-phase/` (Next.js 이식본)  
**레거시**: `public/flow-phase/legacy_space_flow.html` (원본)  
**뉴버전**: dt 기반, Constants 연동, UFO/Duck, Admin 레벨 선택 등 추가

---

## 1. 카메라 동작 (updateCamera)

### 1.1 기본 위치
| 항목 | 수치 | 출처 |
|------|------|------|
| 기본 높이 | 130 | CAMERA_BASE_HEIGHT |
| 기본 Z | 600 | CAMERA_BASE_Z |
| 바닥 Y | 30 (다리 위) / 0 (공중) | groundY |
| 시선 좌표 | (cameraLagX, groundY + 45, -1500) | lookAt |

### 1.2 카메라 흔들림/움직임

#### A) X축 (좌우) - 레인 이동 Lag
- **공식**: `cameraLagX += (visualX - cameraLagX) * (1 - exp(-6.32 * dt))`
- **CAMERA_LAG_SPEED**: 6.32
- 점프 중: visualX는 targetX로 LERP
- 비점프: visualX = 현재 다리 X (즉시 스냅)

#### B) Y축 - 여러 오프셋 합산
```
targetCamY = 130 + groundY + playerJumpY + yOffset + landingImpactY + joltY + duckDipOffset
```
- **playerJumpY**: 점프 높이 (0~98)
- **yOffset**: 달리기 흔들림 (아래)
- **landingImpactY**: 착지 시 -2.4, 스프링 감쇠
- **joltY**: microJolt * 1.8
- **duckDipOffset**: UFO 통과 시 -70, 0.12*dt60으로 복귀

#### C) Z축 - 전방 위치
```
position.z = 600 + zOffset + landingImpactZ + joltZ
```
- **zOffset**: 점프 초반(0~0.2)에 -15 (잠깐 뒤로 당김)
- **landingImpactZ**: 착지 시 -7.5, 스프링 감쇠
- **joltZ**: microJolt * -4.2

#### D) 달리기 흔들림 (yOffset)
- **조건**: movementActive && !점프/패드/착지 && isOnBridge
- **주파수**: 15.7 + (LV2~4: levelNum * 5.5)
- **진폭**: 0.55 + (LV2~4: (levelNum-1) * 0.12)
- **공식**: `yOffset = sin(gameTime * freq) * amp`

#### E) 카메라 기울기 (rotation.z = cameraTiltZ)
- **레인 변경 중 점프**: jumpProgress < 0.15일 때 ±0.05
- **박스 펀치**: onCameraTilt(0.2 또는 -0.2) → cameraTiltZ에 누적
- **보간**: `cameraTiltZ += (targetTilt - cameraTiltZ) * (1 - exp(-10*dt))`
- **landingShake**: 현재 FlowEngine에서는 미사용 (항상 0)

#### F) Duck (rotation.x = duckPitchX)
- **UFO onUfoDuckStart**: duckDipOffset = -70, duckPitchX = 0.55
- **복귀**: 0.12*dt60, 0.15*dt60으로 0으로 감쇠

#### G) FOV (시야각)
| 레벨 | FOV |
|------|-----|
| LV1 | 58 |
| LV2, LV3 | 63 |
| LV4 | 66 |
| 기타 | 60 |

- **보간**: `currentFov += (targetFov - currentFov) * 0.06 * dt60`

### 1.3 MicroJolt (점프/펀치 시 순간 흔들림)
- **점프 시**: +0.65 (MICROJOLT_AMOUNT)
- **박스 펀치 시**: +1.2
- **감쇠**: `microJolt *= exp(-8.0 * dt)` (JOLT_DECAY)

### 1.4 착지 충격 (Spring-Damper)
- **초기값**: landingImpactY = -2.4, landingImpactZ = -7.5
- **타이머**: impactYTimer 0.05초, impactZTimer 0.04초
- **물리**: springK=150, damping=0.88, dt 기반 감쇠
- **landingStabilityTimer**: 0.12초 (이동 제한)

---

## 2. 점프 로직

### 2.1 트리거 조건
- movementActive
- 발판(패드)에서 relZ ≤ triggerRel (PAD_TRIGGER_RATIO 0.65)
- 해당 다리에서 아직 점프 안 함 (lastJumpBridgeId)

### 2.2 점프 파라미터 (레벨별)
| 레벨 | duration(초) | height |
|------|--------------|--------|
| 1 | 0.72 | 98 |
| 2 | 0.70 | 98 |
| 3 | 0.64 | 98 |
| 4 | 0.62 | 98 |

### 2.3 점프 커브 (2단 Easing)
- **구간 1** (progress 0~0.6): `t = progress/0.6`, `curve = 1 - (1-t)²` (ease-out)
- **구간 2** (progress 0.6~1.0): `t = (progress-0.6)/0.4`, `curve = 1 - t³` (ease-in)
- **playerJumpY** = curve * height (0~98)

### 2.4 점프 Z 오프셋 (카메라)
- progress 0~0.1: zOffset 선형 0 → -15
- progress 0.1~0.2: zOffset 선형 -15 → 0
- (점프 시작 시 잠깐 뒤로 당겼다가 복귀)

---

## 3. 속도 / 이동

### 3.1 브리지 이동
- **currentSpeed** = baseSpeed(0.6) * levelSpeedFactor + gameTime * 0.0001
- **levelSpeedFactor**: LV1=0.8, LV2/3=1.0, LV4=1.25
- **브리지 Z 이동량** = currentSpeed * 50 * dt60 (단위/프레임)

### 3.2 3D 스피드라인
- **개수**: 250
- **이동**: (260 + levelNum * 38) * dt60
- **루프**: z > 2500 → -12000
- **투명도**: LV1=0.1, LV2=0.16, LV3=0.18, LV4=0.24 + beatPulse * 0.15

### 3.3 2D 스피드라인 (DOM)
- **생성 확률**: movementActive 중 0.1 (기본), LV4에서 0.18
- 4코너 중 랜덤, opacity 0.22~0.4, duration 260~400ms

---

## 4. 비트 / 펄스

### 4.1 Beat
- **BPM**: 150
- **beatStepSec**: (60/150)/2 = 0.2초
- **onBeatTick**: flashPulseValue += (0.03~0.08), beatPulseValue += 0.4

### 4.2 펄스 감쇠
- beatPulseValue *= 0.92^dt60
- flashPulseValue *= 0.88^dt60

### 4.3 플래시 오버레이
- opacity = flashPulseValue (박스 파괴 시 +0.75)

---

## 5. 배경 / 비주얼

### 5.1 별
- **개수**: 45000
- **회전**: movementActive 시 0.0002 * dt60

### 5.2 행성 (지구, 블랙홀)
- **이동**: movementActive 시 position.z += speed * dt60
- 지구 speed 0.15, 블랙홀 0.08
- z > 15000 → -25000 루프

### 5.3 바닥
- **색**: 0x3b82f6 (FLOOR_COLOR)
- **레인 구분선**: 0x3b82f6, opacity 0.4

---

## 6. 장애물 (ObstacleManager)

### 6.1 박스
- LV3 스폰 확률 0.4, LV4 0.2
- **파괴 시**: onFlash, onCameraTilt(±0.2), onPunch, onShowInstruction("PUNCH!")
- 18~33개 파편, LV3 보상 시 코인 14~20개

### 6.2 UFO
- LV4 이상, 스폰 확률 0.55
- **UFO_DUCK_START_Z**: 800 (이 지점에서 onUfoDuckStart → DUCK!)
- **UFO_PASS_Z**: 550 (통과 시 onUfoPassed → whoosh)
- **UFO_SPEED_MULT**: 1.2
- **UFO_HEIGHT**: 180 (y 위치)
- **duckDipOffset**: -70, duckPitchX: 0.55

### 6.3 박스/UFO 겹침 방지
- UFO 스폰 시 해당 다리에는 박스 미스폰

---

## 7. 레거시와 뉴버전 차이

| 항목 | 레거시 | 뉴버전 |
|------|--------|--------|
| 시간 | setInterval 16ms, 1/60 고정 | THREE.Clock, dt, dt60 |
| 착지 | 단순 감쇠 | Spring-Damper (K=150, d=0.88) |
| 카메라 X | 0.1 LERP | exp(-6.32*dt) LERP |
| UFO/Duck | 없음 | 있음 |
| 바닥색 | 0x050818 | 0x3b82f6 |
| 다리 길이 | 2900 | 3500 |
| Admin 레벨 선택 | 없음 | 있음 |
| moveEnabled | - | intro/rest/ending 시 배경 정지 |

---

## 8. 수치 출처 (coordContract.ts)

모든 수치는 `app/flow-phase/engine/core/coordContract.ts` 에 정의되어 있으며, 변경 시 해당 파일만 수정하면 됨.
