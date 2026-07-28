# SPOMOVE MASTER 저사양 모드 계획

> 기준: `app/spokedu-master/spomove` + embed `_player` (`app/admin/spomove/training/_player`).
> MASTER 세션 자체에는 저사양 토글이 없고, admin `_player`의 `kidsSafeMode` 등이 일부 프로그램에만 간접 적용된다.

## 현재 지원 현황

| 구분 | 프로그램 | 저사양 | 비고 |
|------|----------|--------|------|
| 2D 시그널 | 반응 인지, 사이먼(1~4 매직 아이 포함), 플랭커, 스트룹, 순차 기억 | ✅ 즉시 OK | Canvas/DOM 기반 |
| 2D 시지각 | 파도 피하기, 떨어지는 벽돌들(×2), 풍선, 두더지, 숫자 연산 기차, 흰 공, 골키퍼 | ✅ 즉시 OK | `kidsSafeMode`로 속도 완화 가능 |
| WebGL | DIVE 3종 (flow-lab) | ❌ 미지원 | Three.js 필수 |
| WebGL | 숫자 연산 기차 L3 일부 연출 | ⚠️ 부분 | tier 3 연출·문 애니메이션 — 2D 폴백 필요 |

## 우선순위 1 — WebGL 필수 프로그램 (차단 위험)

### DIVE · 기본 / 랜덤 / Color Gate

- **문제**: `flow-lab` 전체가 WebGL. GPU/메모리 부족 기기에서 세션 불가.
- **계획**:
  1. 세션 시작 전 `WebGLRenderer` probe (이미 flow-lab 테스트 패턴 참고).
  2. 실패 시 **2D 슬라이드쇼 폴백**: punch/kick/duck/reach/colorGate를 정적 PNG + 타이머 cue로 재현 (동작·색만 유지, 3D 연출 제거).
  3. `FlowGameClient`에 `renderMode: 'webgl' | '2d-fallback'` prop 추가.
  4. MASTER `EngineRouter` → embed `MemoryGameApp` autoLaunch에 `lowSpec?: boolean` 전달.

## 우선순위 2 — 연출만 무거운 프로그램

### 숫자 연산 기차 L3

- **문제**: WebGL/고해상도 연출 구간 존재 시 프레임 드랍.
- **계획**: tier 3에서 `lowSpec` 시 문·기차 애니메이션 단순화, 파티클 off, 고정 FPS cap.

### 흰 공 단계 3 (2패널)

- **문제**: 이중 패널 + 다수 공 — CPU 부담.
- **계획**: 저사양 시 공 개수 cap, 플래시 빈도 감소, motion blur off.

## 우선순위 3 — 공통 인프라

1. **`kidsSafeMode` → `lowSpecMode` 통합 검토**  
   admin `_player`와 MASTER embed가 동일 플래그 사용.

2. **세션 전 capability probe**  
   `navigator.deviceMemory`, WebGL tier, `prefers-reduced-motion` 조합.

3. **Hub/브리핑 표시**  
   WebGL 필수 프로그램 카드에 「고사양 필요 · 저사양 대체 예정」 뱃지.

4. **테스트**  
   `officialRuntimeContract.test.ts`에 `LOW_SPEC_PLAN.md` 존재 및 WebGL 프로그램 ID 목록 고정.

## WebGL 필수 공식 프리셋 ID (저사양 계획 대상)

- `dive-standard`, `dive-random`, `dive-color-gate-61`

## 2D 즉시 지원 (추가 작업 없음)

나머지 공식 프리셋(반응 인지·시지각 7종·사이먼 4종·플랭커·스트룹·순차 기억 등) — `kidsSafeMode` 속도 완화만으로 저사양 대응 가능.

## 구현 순서 제안

1. WebGL probe 유틸 (`_player/lib/webglCapability.ts`)
2. DIVE 2D 폴백 MVP (Color Gate 제외 punch/kick/duck/reach만)
3. MASTER Hub 저사양 뱃지 + 브리핑 문구
4. 숫자 연산 기차 L3 / 흰 공 단계 3 연출 경량화
