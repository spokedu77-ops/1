# Think 150s 검증 보고서

## 검증 항목

### 1. 색상 연속 중복
- **목표**: 같은 색이 연속으로 나올 확률 ≤ 20%
- **구현**: `SeededRNG.pickAvoidingConsecutive()` — 80% 확률로 이전 색 제외 후 pick
- **Stage A/B**: `pickBalanced(COLORS, counts, lastColor)` — 균형 + 연속 방지
- **Stage C**: `pickAvoidingConsecutive()` / `pickExcluding()` 사용

### 2. 4색 균형 (red 포함)
- **목표**: red, green, yellow, blue가 일정 비율로 출현
- **구현**: `pickBalanced()` — 최소 등장 횟수 색 우선 선택
- **결과**: 디버그 오버레이에서 R/G/Y/B 개수 확인 가능

### 3. 1주차 Stage C
- **Set 1**: 세로 3분할 (grid-rows-3 grid-cols-1), 여백 없음
- **Set 2**: 가로 3분할 (grid-cols-3 grid-rows-1), 여백 없음
- **구분선**: 같은 색일 때 `border-white/25` (세련된 구분선)

### 4. 2주차 Stage C
- **Set 1**: 세로 2분할 (grid-rows-2 grid-cols-1)
- **Set 2**: 가로 2분할 (grid-cols-2 grid-rows-1)

### 5. 3주차 Stage C
- **Set 1**: 전체화면 1가지 색만 (slotCount=1, layout=fullscreen)
- **Set 2**: 서로 다른 두 색 세로 2분할 (slotCount=2, layout=vertical)
- **분리**: week3 엔진에서 `mode === 'setA'` → slotCount 1만, `mode === 'setB'` → slotCount 2만

### 6. 4주차 Stage C
- **색상 100%**: `images: ['']` — 이미지 미사용
- **Set 1 구조**: cue → cue → blank(2x)
- **Set 2 구조**: cue → cue → cue → blank(3x)

## 검증 함수

`verifyThink150Timeline(config)` 호출 시:
- total duration 150000ms
- 연속 동일색 비율 ≤ 20%
- 4색 균형 (red > 0)
- 4주차: set1/set2 구조, 색상만 사용

## 실행 방법

1. `/admin/iiwarmup/think` 접속
2. week 1~4, audience, seed 설정
3. 디버그 오버레이 토글 ON
4. 검증 보고서 확인
