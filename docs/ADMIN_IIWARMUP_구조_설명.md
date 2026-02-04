# Admin I.I.Warm-up 구조 완전 정리

## 전체 데이터 흐름도

```
┌─────────────────────────────────────────────────────────────┐
│  관리자: /admin/iiwarmup                                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  [웜업 관리 탭]                                               │
│  └─> iiwarmup_programs 테이블                                │
│      (구식, 단일 HTML/URL 프로그램)                          │
│      ❌ 현재 시스템과 연결 안 됨                              │
│                                                               │
│  [테마 관리 탭]                                               │
│  └─> play_scenarios 테이블                                   │
│      (Play Phase의 15개 액션 이미지)                         │
│      ✅ Play Phase에서 사용됨                                │
│                                                               │
│  [영상 관리 탭]                                               │
│  └─> sports_videos 테이블                                    │
│      (놀이체육 영상)                                          │
│      ❓ 현재 어디서도 사용 안 됨 (보관용?)                    │
│                                                               │
│  [Weekly Scheduler 탭]                                       │
│  └─> rotation_schedule 테이블                                │
│      ├─ program_id: warmup_programs_composite 참조          │
│      ├─ expert_note: 전문가 코멘트                           │
│      └─ is_published: 발행 여부                              │
│      ✅ 구독자 페이지와 연결됨                                │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ (is_published = true인 것만)
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  구독자: /iiwarmup                                           │
│                                                               │
│  현재 주차 계산 (예: 2026-01-W4)                             │
│  └─> rotation_schedule 조회                                  │
│      └─> warmup_programs_composite 조인                      │
│          └─> phases 실행                                     │
│              ├─ Play Phase (play_scenarios 참조)            │
│              ├─ Think Phase                                  │
│              └─ Flow Phase                                  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## 각 탭의 역할과 데이터 저장 위치

### 1. 웜업 관리 탭
- **저장 위치**: `iiwarmup_programs` 테이블
- **용도**: 구식 단일 HTML/URL 프로그램 (주차별)
- **현재 상태**: ❌ **현재 시스템과 연결 안 됨**
- **이유**: 새로운 3단계 시스템(`warmup_programs_composite`)과는 별개

### 2. 테마 관리 탭
- **저장 위치**: `play_scenarios` 테이블
- **용도**: Play Phase의 15개 액션 이미지 (OFF/ON)
- **현재 상태**: ✅ **Play Phase에서 사용됨**
- **연결**: `warmup_programs_composite.phases[0].scenario_id`로 참조

### 3. 영상 관리 탭
- **저장 위치**: `sports_videos` 테이블
- **용도**: 놀이체육 영상 보관
- **현재 상태**: ❓ **현재 어디서도 사용 안 됨** (보관용으로 추정)

### 4. Weekly Scheduler 탭 ⭐ **핵심**
- **저장 위치**: `rotation_schedule` 테이블
- **용도**: 주차별 프로그램 배정 및 발행
- **현재 상태**: ✅ **구독자 페이지와 연결됨**

#### Weekly Scheduler의 역할
1. **주차 선택**: 향후 8주 중 선택
2. **프로그램 배정**: `warmup_programs_composite`에서 프로그램 선택
3. **전문가 노트 입력**: `expert_note` 필드
4. **발행 여부 결정**: `is_published` 토글
   - `true`: 구독자 페이지에 표시됨
   - `false`: 구독자 페이지에 표시 안 됨 (Draft)

## 왜 구독자 페이지에 아무것도 안 나오는가?

### 문제 1: `warmup_programs_composite` 생성 UI 없음
- **현재 상황**: SQL로만 생성 가능
- **영향**: Weekly Scheduler에서 선택할 프로그램이 없거나 부족
- **해결**: 관리자 UI에서 3단계 프로그램 생성 기능 필요

### 문제 2: `rotation_schedule`에 데이터 없음
- **현재 상황**: 
  - 프로그램이 있어도 `rotation_schedule`에 배정 안 됨
  - 또는 배정되어도 `is_published = false` (Draft 상태)
- **영향**: 구독자 페이지는 `is_published = true`인 것만 조회
- **해결**: Weekly Scheduler에서 프로그램 배정 후 "Published"로 토글

### 문제 3: 주차 불일치
- **현재 상황**: 
  - 구독자 페이지는 현재 주차(예: 2026-01-W4)를 계산
  - `rotation_schedule`에 해당 주차 데이터가 없으면 표시 안 됨
- **해결**: Weekly Scheduler에서 현재 주차에 프로그램 배정

## "주방 저거 2개"는 어디서 생성된 것인가?

Weekly Scheduler의 "Assign Program" 드롭다운에 보이는 프로그램들은:
- **출처**: `warmup_programs_composite` 테이블
- **생성 방법**: 
  1. SQL 스크립트로 직접 삽입 (`sql/11_create_warmup_composite_schema.sql`)
  2. 또는 Supabase SQL Editor에서 직접 INSERT

**예시**:
```sql
INSERT INTO warmup_programs_composite (id, week_id, title, description, total_duration, phases)
VALUES (
  'program_2026_01_w1',
  '2026-01-W1',
  '신나는 주방 웜업',
  'Play, Think, Flow 3단계로 구성된 10분 웜업 프로그램',
  540,
  '[
    {"type": "play", "scenario_id": "week1_kitchen", "duration": 120},
    {"type": "think", "content_type": "placeholder", "duration": 120},
    {"type": "flow", "content_type": "placeholder", "duration": 300}
  ]'::jsonb
);
```

## 올바른 사용 흐름

### Step 1: Play Phase 이미지 준비 (테마 관리 탭)
1. `/admin/iiwarmup` → "테마 관리" 탭
2. 주차 선택 (예: 1주차)
3. 15개 액션의 OFF/ON 이미지 URL 입력
4. 저장 → `play_scenarios` 테이블에 저장

### Step 2: 3단계 프로그램 생성 ⚠️ **현재 UI 없음**
- **현재**: SQL로만 가능
- **필요**: 관리자 UI에서 생성 기능 추가 필요
- **저장**: `warmup_programs_composite` 테이블

### Step 3: 주간 스케줄 배정 (Weekly Scheduler 탭)
1. `/admin/iiwarmup` → "Weekly Scheduler" 탭
2. 주차 선택 (예: 2026-01-W4)
3. "Assign Program"에서 Step 2에서 만든 프로그램 선택
4. "Expert Instruction Notes" 입력
5. "Published" 토글 ON
6. "Save Schedule" 클릭
7. → `rotation_schedule` 테이블에 저장

### Step 4: 구독자 페이지 확인
1. `/iiwarmup` 접속
2. 현재 주차(2026-01-W4) 계산
3. `rotation_schedule`에서 `is_published = true`인 프로그램 조회
4. 표시됨! ✅

## 현재 문제점 요약

1. ❌ **3단계 프로그램 생성 UI 없음**
   - `warmup_programs_composite`를 만들 수 있는 관리자 인터페이스 필요
   - 현재는 SQL로만 가능

2. ❌ **Weekly Scheduler에 프로그램이 없음**
   - `warmup_programs_composite` 테이블에 데이터가 없거나
   - `rotation_schedule`에 배정이 안 되었거나
   - `is_published = false` 상태

3. ❌ **주차 불일치**
   - 구독자 페이지는 현재 주차를 계산
   - `rotation_schedule`에 해당 주차 데이터가 없으면 표시 안 됨

## 해결 방법

### 즉시 해결 (SQL 실행)
1. `sql/15_setup_complete_warmup_system.sql` 실행
2. Supabase SQL Editor에서 샘플 프로그램 확인:
   ```sql
   SELECT * FROM warmup_programs_composite;
   ```
3. Weekly Scheduler에서 프로그램 배정 및 발행

### 근본 해결 (UI 추가 필요)
- `/admin/iiwarmup`에 "3단계 프로그램 생성" 탭 추가
- Play/Think/Flow 단계별 설정 UI
- `warmup_programs_composite` 테이블에 저장
