# Legacy IIWarmup Flow — 참고 코드 기록

백업 태그: `backup-pre-dive-flow-consolidation-20260625-1200`
START_SHA: `6ad4cce88d0965411e403bf91867f4b9197ef9f5`

이 문서는 기존 IIWarmup Flow 코드에서 향후 flow-lab에 이식할 가치가 있는
시각·물리 코드를 기록한다. 실제 이식은 별도 작업에서 진행한다.

---

## 1. 파노라마 셰이더 (핵심 참고 대상)

### 위치

`app/program/iiwarmup/flow/engine/FlowEngine.ts` — `PANO_VERTEX`, `PANO_FRAGMENT` (약 116~152번째 줄)

### 기능

- 구면(SphereGeometry)에 equirectangular 파노라마 텍스처 적용
- 전방 180° 구간만 선명하게 표시: `edge = 1.0 - smoothstep(-0.12, 0.08, d.z)`
- 후방은 우주 검정으로 페이드
- 파노라마 Y 미러 선택 (`l2 > l1` 밝은 쪽 선택)
- 호흡 애니메이션: `breath = 1.0 + 0.025 * sin(uTime * 0.4)`
- 비네트: `vignette = 1.0 - 0.32 * uVignetteScale * (1.0 + d.z)`
- 인라인 grain 노이즈: GLSL `fract(sin(dot(...)))`
- 파노라마 회전: `uniform float uPanoRotation` 적용 (`PANO_ROTATION_DT60_CW` 수치)

### 관련 상수

`app/program/iiwarmup/flow/engine/core/coordContract.ts`:
- `PANO_ROTATION_DT60_CW`: 파노라마 시계 방향 회전 속도 (dt60 기준)
- `PANO_SPHERE_RADIUS`: 파노라마 구 반경

### 운영 DIVE(Flow 2.0)와 차이

운영 DIVE는 파노라마 셰이더 없음. 별(star particle)과 단색 우주 배경 사용.
IIWarmup 파노라마 셰이더는 운영 DIVE보다 배경 표현이 풍부함.

### 이식 가능성

셰이더 코드 자체는 독립 문자열 상수로 안전하게 분리 가능.
단, 런타임 연결 시 필요한 요소:
- `THREE.SphereGeometry`
- `THREE.ShaderMaterial` (uniforms: `map`, `uTime`, `uVignetteScale`, `uGrainScale`, `uPanoRotation`)
- `THREE.TextureLoader`로 파노라마 이미지 로드

FlowEngine 클래스 전체에 결합되어 있어 **그대로 복사 불가**.
셰이더 문자열과 uniform 타입만 `LegacyPanoramaShader.ts`로 분리하여 참고 가능.

### 복구 방법

```
git show backup-pre-dive-flow-consolidation-20260625-1200:app/program/iiwarmup/flow/engine/FlowEngine.ts
```

---

## 2. Effects 시스템

### 위치

`app/program/iiwarmup/flow/engine/systems/effects.ts`

### 기능

- `generateGrainDataURL()`: Canvas API로 240×240 grain 텍스처 생성 (Data URL)
- `pulseExposure()`: exposure-pulse DOM 요소 opacity 55ms 펄스
- `setVignetteOpacity()`: vignette DOM 요소 opacity 조절
- `flash()`: flash-overlay DOM 요소 70ms 반짝임

### 운영 DIVE(Flow 2.0)와 차이

운영 DIVE는 grain, vignette, flash를 별도 effects 시스템으로 분리하지 않음.
IIWarmup 방식은 React DOM 요소에 직접 style 업데이트하는 구조.

### 이식 가능성

DOM 구조(`grain`, `exposure-pulse`, `vignette`, `flash-overlay` ID)에 의존.
flow-lab이 동일한 DOM 구조를 갖출 때 이식 가능.
현재 flow-lab에는 해당 DOM이 없어 직접 적용 불가.

### 복구 방법

```
git show backup-pre-dive-flow-consolidation-20260625-1200:app/program/iiwarmup/flow/engine/systems/effects.ts
```

---

## 3. 상수 비교 (coordContract vs Flow 2.0 인라인)

### 위치

`app/program/iiwarmup/flow/engine/core/coordContract.ts`

### 주요 차이점 (IIWarmup → Flow 2.0)

| 항목 | IIWarmup | Flow 2.0 | 비고 |
|------|----------|----------|------|
| `BRIDGE_LENGTH` | 3500 | 4200 | Flow 2.0이 더 긴 브릿지 |
| `FOV_MIN` | 58 | 54 | Flow 2.0이 더 넓은 시야각 |
| `FOV_MAX` | 72 | 82 | Flow 2.0이 더 넓은 시야각 |
| `JUMP_DURATION` | 레벨별 dict | 배열 인덱스 | 구조 다름 |
| `CAMERA_FAR_BY_LEVEL` | 레벨별 dict | 없음 | IIWarmup이 레벨별 카메라 far 조절 |
| `FOG_FAR_BY_LEVEL` | 레벨별 dict | 없음 | IIWarmup이 레벨별 fog 거리 조절 |
| `PANO_ROTATION_DT60_CW` | 있음 | 없음 | 파노라마 전용 |
| `PANO_SPHERE_RADIUS` | 있음 | 없음 | 파노라마 전용 |
| `STAR_COUNT`, `STAR_SIZE` | 있음 | Flow 2.0 자체 구현 | 별 파티클 |
| `SPEEDLINE_COUNT` | 있음 | Flow 2.0 자체 구현 | 속도선 |
| `DUCK_*` 상수 | 있음 | Flow 2.0 자체 구현 | 오리기 동작 |

### 이식 가능성

IIWarmup의 레벨별 `CAMERA_FAR_BY_LEVEL`, `FOG_FAR_BY_LEVEL`은
flow-lab에 멀티레벨 지원 추가 시 참고 가능.

### 복구 방법

```
git show backup-pre-dive-flow-consolidation-20260625-1200:app/program/iiwarmup/flow/engine/core/coordContract.ts
```

---

## 4. AdaptiveQuality 차이

### IIWarmup 위치

`app/program/iiwarmup/flow/engine/systems/AdaptiveQuality.ts`

### Flow 2.0 위치

`app/admin/spomove/training/_player/flow/engine/AdaptiveQuality.ts`

### 차이점

IIWarmup은 `ADAPTIVE_FPS_THRESHOLD`, `ADAPTIVE_LOW_DURATION_SEC`, `ADAPTIVE_TIER_COOLDOWN_SEC`를
coordContract에서 import. Flow 2.0은 AdaptiveQuality 내부에 인라인.
기능적으로는 유사한 FPS 기반 품질 조절.

### 복구 방법

```
git show backup-pre-dive-flow-consolidation-20260625-1200:app/program/iiwarmup/flow/engine/systems/AdaptiveQuality.ts
```

---

## 5. 별·속도선 구현

### IIWarmup 위치

`app/program/iiwarmup/flow/engine/FlowEngine.ts` — `createStarField()`, `updateSpeedLines()` 메서드

### 관련 상수 (coordContract)

- `STAR_COUNT`, `STAR_SIZE`, `STAR_OPACITY`
- `SPEEDLINE_COUNT`, `SPEEDLINE_BASE_SPEED`, `SPEEDLINE_LEVEL_MULT`

### 운영 DIVE(Flow 2.0)와 차이

Flow 2.0도 별·속도선 자체 구현 있음. IIWarmup은 SPEEDLINE_LEVEL_MULT로 레벨별 속도선 속도 조절.
flow-lab에 레벨별 속도선 강도 조절 추가 시 참고 가능.

### 복구 방법

```
git show backup-pre-dive-flow-consolidation-20260625-1200:app/program/iiwarmup/flow/engine/FlowEngine.ts
```

---

## 6. 기존 파노라마 셰이더 분리 파일 (참고용, 런타임 미연결)

향후 flow-lab에서 파노라마 배경을 추가할 때 참고하도록
셰이더 문자열과 uniform 타입만 아래 파일로 보존함.

`app/admin/spomove/training/_player/flow-lab/visuals/LegacyPanoramaShader.ts`

이 파일은 현재 flow-lab 런타임에 연결되어 있지 않음.

---

## 7. 추가 삭제 후보

이번 작업에서 자동 삭제하지 않음. 별도 작업에서 정리.

| 경로 | 존재 여부 | 현재 참조 수 | 비고 |
|------|-----------|-------------|------|
| `public/flow-phase/index.html` | 있음 | 0 (빌드 경로 아님) | legacy_space_flow 서빙용 정적 HTML |
| `public/flow-phase/legacy_space_flow.html` | 있음 | 0 (빌드 경로 아님) | 원본 Three.js 버전 |
| `app/flow-phase/**` | 없음 | — | 이미 제거됨 |
| `app/components/subscriber/FlowFrame.tsx` | 없음 | — | 이미 제거됨 |
| `app/iiwarmup/program/phases/flow/**` | 없음 | — | 이미 제거됨 |

`public/flow-phase/`는 Next.js 빌드에 영향 없는 정적 파일.
삭제 전 실제 사용 여부 재확인 권장.

---

## 참조 복구 방법

모든 기존 IIWarmup Flow 코드는 백업 태그에서 확인 가능:

```bash
# 파일 목록 확인
git ls-tree -r backup-pre-dive-flow-consolidation-20260625-1200 -- app/program/iiwarmup/flow/

# 특정 파일 내용 확인
git show backup-pre-dive-flow-consolidation-20260625-1200:<경로>

# 전체 복구 (주의: 운영 파일 덮어쓰지 않도록 경로 지정)
git checkout backup-pre-dive-flow-consolidation-20260625-1200 -- app/program/iiwarmup/flow/
```
