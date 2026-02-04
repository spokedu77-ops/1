# Generator 커스터마이징 가이드

시나리오 생성 로직을 더 구체적으로 수정하고 싶을 때 참고하세요.

## 📍 주요 수정 위치

### 1. 빠른 자동 생성 로직
**파일**: `app/lib/admin/logic/quickGenerator.ts`

타겟별 기본 설정을 변경하려면:
- `POPULAR_THEMES`: 타겟별 인기 테마 변경
- `STANDARD_DIFFICULTY`: 기본 난이도 변경 (현재: 2 = Medium)

```typescript
const POPULAR_THEMES = {
  junior: 'kitchen',  // 아동용 기본 테마
  senior: 'space',    // 시니어용 기본 테마
  mixed: 'kitchen'    // 혼합용 기본 테마
} as const;
```

### 2. 상세 시나리오 생성 로직
**파일**: `app/lib/admin/logic/generateScenarioJSON.ts`

난이도별 파라미터 매핑을 변경하려면:
**파일**: `app/lib/admin/constants/physics.ts`

- `DIFFICULTY_MAPPING`: 난이도별 frequency, speed, distortion 등
- `TARGET_FREQUENCIES`: 타겟별 기본 주파수
- `STATIC_DURATION_RATIOS`: 타겟별 정적 지속 시간 비율

### 3. 액션 생성 로직
**파일**: `app/lib/admin/logic/parametricEngine.ts`

타겟별 선호 액션을 변경하려면:
```typescript
const targetActions: Record<string, string[]> = {
  junior: ['POINT', 'TOUCH', 'CLAP', 'JUMP', 'WALK'],  // 아동용 액션
  senior: ['CHOP', 'PUNCH', 'SWIPE', 'EXPLODE', 'LEAN'], // 시니어용 액션
  mixed: [...ACTION_TYPES] // 전체 액션
};
```

난이도별 액션 개수:
```typescript
const count = config.difficulty === 1 ? 8 : config.difficulty === 2 ? 12 : 15;
// Easy: 8개, Medium: 12개, Hard: 15개
```

### 4. Think Phase 설정
**파일**: `app/lib/admin/constants/physics.ts`

`THINK_PHASE_CONFIG`에서 변경:
- `totalRounds`: 총 라운드 수
- `objectSpawnInterval`: 객체 생성 간격 (ms)
- `objectLifetime`: 객체 생존 시간 (ms)

### 5. Flow Phase 설정
**파일**: `app/lib/admin/logic/generateScenarioJSON.ts`

Flow Phase의 baseSpeed 계산:
```typescript
baseSpeed: 0.6 * speed,  // 0.6 배율 조정 가능
distortion: distortion,  // 왜곡 정도
boxRate: boxRate         // 박스 비율
```

### 6. UI에서 직접 수정 가능한 부분
**파일**: `app/admin/iiwarmup/generator/components/BasicSettingsTab.tsx`

- Target 선택: Junior/Senior/Mixed
- Difficulty: Easy(1) / Medium(2) / Hard(3)
- Theme: Kitchen/Jungle/Ocean/Space
- Static Duration Ratio: 슬라이더로 30%~70% 조정

## 🎯 예시: 더 쉬운 난이도 만들기

1. **physics.ts**에서 Easy 난이도 조정:
```typescript
export const DIFFICULTY_MAPPING = {
  1: {
    hz: 8,  // 8Hz로 낮춤 (기본 10Hz)
    speed: 0.7,  // 속도 낮춤
    distortion: 0.2,  // 왜곡 감소
    // ...
  },
  // ...
}
```

2. **parametricEngine.ts**에서 액션 개수 감소:
```typescript
const count = config.difficulty === 1 ? 6 : // 8 → 6으로 변경
```

## 🎯 예시: 타겟별 더 구체적인 차별화

1. **quickGenerator.ts**에서 타겟별 테마 확장:
```typescript
const POPULAR_THEMES = {
  junior: 'kitchen',  // 아동은 주방 테마
  senior: 'space',    // 시니어는 우주 테마
  mixed: 'jungle'     // 혼합은 정글 테마
} as const;
```

2. **parametricEngine.ts**에서 타겟별 액션 세분화:
```typescript
const targetActions = {
  junior: ['POINT', 'TOUCH', 'CLAP', 'JUMP'],  // 더 단순한 액션만
  senior: ['CHOP', 'PUNCH', 'SWIPE', 'EXPLODE', 'LEAN', 'DUCK'],  // 더 복잡한 액션
  mixed: [...ACTION_TYPES]
};
```

## 📝 참고 파일 목록

- `app/lib/admin/logic/quickGenerator.ts` - 빠른 자동 생성
- `app/lib/admin/logic/generateScenarioJSON.ts` - 상세 시나리오 생성
- `app/lib/admin/logic/parametricEngine.ts` - 액션 생성
- `app/lib/admin/constants/physics.ts` - 모든 상수 및 매핑
- `app/lib/admin/logic/generateEventTimeline.ts` - 이벤트 타임라인 생성
- `app/admin/iiwarmup/generator/components/BasicSettingsTab.tsx` - UI

## 💡 팁

- 난이도는 `DIFFICULTY_MAPPING`에서 한 번에 관리됩니다
- 타겟별 차이는 `TARGET_FREQUENCIES`, `STATIC_DURATION_RATIOS`에서 조정
- 액션 종류는 `app/components/admin/iiwarmup/constants.ts`의 `ACTION_TYPES` 참고
