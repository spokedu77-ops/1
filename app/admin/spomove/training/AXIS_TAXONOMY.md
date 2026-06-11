# SPOMOVE Training 축(카테고리) 분류 — 변경 백업

> 적용 범위: `app/admin/spomove/training` (공유 상수 `constants.ts` 포함)  
> 변경일: 2026-06-10

## 1. 변경 요약

| 내부 코드 (`SpomoveAxis`) | 이전 표기 | 신규 표기 | 영문 |
|---------------------------|-----------|-----------|------|
| `response` | 반응 | **단순 반응** | Simple Reaction |
| `attention` | 주의 | **선택 반응** | Choice Reaction |
| `executive` | 실행 | **복합 반응** | Complex Reaction |

- **내부 enum·모드 ID·엔진 키는 그대로** (`response` / `attention` / `executive`, `reactTrain`, `basic` …).
- **UI·카탈로그·카드 배지에 보이는 한글/영문 축 이름만** 반응시간 과제 분류 용어로 정렬했다.

## 2. 왜 바꿨는가 (근거)

### 2.1 이전 프레임: 인지 기능 영역 (반응 · 주의 · 실행)

- **반응**: 시지각·운동 연결, “보고 바로 움직인다”
- **주의**: 선택주의, 방해 자극 억제
- **실행**: 실행기능(executive function) — 규칙 조절·작업기억

교육·마케팅 문맥에서는 직관적이나, **SPOMOVE 6개 프로그램이 실제로 측정·훈련하는 것은 모두 “반응”**이다.  
“주의”“실행”은 인지심리학의 상위 개념이라, **과제 난이도·구조(단순→선택→복합)**와 1:1로 읽히지 않는다.

### 2.2 신규 프레임: 반응시간 과제 분류 (단순 · 선택 · 복합)

운동인지·심리운동학에서 널리 쓰는 **반응시간(Reaction Time) 과제 유형**에 맞춘다.

| 유형 | 정의 (요지) | SPOMOVE 대응 |
|------|-------------|--------------|
| **단순 반응** | 하나의 자극 → 정해진 하나의 대응. 판별·선택 부담이 최소 | 시지각 반응, 반응 인지(방향·색·위치 즉시 대응) |
| **선택 반응** | 여러 가능 자극·위치 중 **올바른 목표를 고르는** 판별·선택 | 사이먼(위치 vs 색), 플랭커(가운데 vs 방해 원) |
| **복합 반응** | 억제·규칙 전환·작업기억 등 **여러 인지 연산이 겹친** 반응 | 스트룹(자동 읽기 억제), 순차 기억(인출 후 재현) |

참고 개념: Hick의 법칙(선택지 수↑ → RT↑), 단순/선택/판별 반응 과제(Sternberg, Luce), 실행기능 과제의 Stroop·n-back·순차 기억 계열.

### 2.3 프로그램별 배치 근거

| 축 | 프로그램 | 배치 이유 |
|----|----------|-----------|
| 단순 반응 | 시지각 반응 | 색 자극 등장 → 해당 색 패드. 자극–반응 매핑이 고정에 가깝다. |
| 단순 반응 | 반응 인지 | 화살표·색·분할 화면 등 **제시된 신호에 대한 즉시 대응**. Simon/Flanker처럼 “무시할 정보”가 핵심이 아니다. |
| 선택 반응 | 사이먼 효과 | **위치(자동 경향) vs 색(정답)** — 경쟁 자극 중 목표 차원 선택. |
| 선택 반응 | 플랭커 | **가운데 vs 양옆 방해 자극** — 목표만 골라 반응. 전형적 Flanker/선택 RT. |
| 복합 반응 | 스트룹 과제 | 의미·방향·배경 **규칙 충돌 + 억제**. 단순 색 선택을 넘어선다. |
| 복합 반응 | 순차 기억 | 인코딩·유지·**순서대로 재현** — 반응 전 기억 부하가 필수. |

## 3. UI 카피 변경 (이전 → 이후)

### 축 헤더·탭

| 항목 | 이전 | 이후 |
|------|------|------|
| response 탭 | 반응 | 단순 반응 |
| attention 탭 | 주의 | 선택 반응 |
| executive 탭 | 실행 | 복합 반응 |
| response salesCopy | 보고 바로 움직이는 반응력 | 보고 바로 움직이는 단순 반응력 |
| attention salesCopy | 필요한 정보에 집중하는 집중력 | 여러 대안 중 목표를 고르는 선택 반응력 |
| executive salesCopy | 기억하고 조절해 수행하는 실행력 | 규칙·기억을 겹쳐 수행하는 복합 반응력 |

### 히어로 문구 (`page.tsx`)

- 제목: `반응·주의·실행을…` → `단순·선택·복합 반응을 움직임으로 경험하는 SPOMOVE`
- 부제: `반응력, 집중력, 실행력` → `단순·선택·복합 반응력`

## 4. 코드 위치

| 파일 | 역할 |
|------|------|
| `app/lib/spomove/spomoveAxisMeta.ts` | `SPOMOVE_AXIS_META`, `SPOMOVE_AXIS_ORDER` (단일 출처) |
| `_player/constants.ts` | 위 모듈 re-export, 각 모드 `axisTitle` |
| `page.tsx` | 탭·`AXIS_GROUPS`·히어로 — `SPOMOVE_AXIS_META`에서 파생 |
| `AXIS_TAXONOMY.md` | 본 백업 문서 |

## 5. 구독자 UI (`spokedu-master`) — 2026-06-10 동기화

| 파일 | 변경 |
|------|------|
| `spokedu-master/spomove/officialSpomovePresets.ts` | `SPOMOVE_AXIS_META`에서 `axisTitle`·일부 `salesCopy` 파생 |
| `spokedu-master/spomove/SpomoveHubView.tsx` | 탭 라벨·히어로 문구 |
| `dashboard/DashboardView.tsx`, `spomove/session/page.tsx` | preset `axisTitle` 표시 — presets 수정으로 자동 반영 |

구독자·관리자 Training 모두 **`app/lib/spomove/spomoveAxisMeta.ts` 단일 출처**를 따른다.

## 6. 롤백 방법

1. `SPOMOVE_AXIS_META`의 `title` / `enTitle` / `salesCopy` / `desc` / `tabSub`를 이 문서 §3 표의 **이전** 값으로 되돌린다.
2. `page.tsx` 히어로 두 문장을 §3 히어로 표의 이전 값으로 되돌린다.
3. 각 모드 `axisTitle`을 `반응` / `주의` / `실행`으로 되돌린다.

내부 `SpomoveAxis` 코드값은 변경하지 않았으므로 저장 preset·URL 쿼리·엔진 라우팅은 롤백 시 영향 없다.
