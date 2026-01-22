# 10분 복합 웜업 프로그램 설정 가이드

## 개요

Play → Think → Flow 3단계를 한 번의 START로 연속 실행하는 10분 복합 웜업 프로그램 시스템입니다.

## 실행 순서

### 1단계: DB 스키마 생성

Supabase SQL Editor에서 다음 파일을 실행하세요:

```sql
-- 11_create_warmup_composite_schema.sql 실행
```

이 스크립트는 다음을 수행합니다:
- `play_scenarios` 테이블 생성
- `warmup_programs_composite` 테이블 생성
- RLS 정책 설정
- 샘플 데이터 삽입

### 2단계: 테스트

1. **localhost에서 개발 서버 실행**
   ```bash
   npm run dev
   ```

2. **테스트 URL 접속**
   ```
   http://localhost:3000/iiwarmup/program/2026-01-W1
   ```

3. **동작 확인**
   - ✅ Play Phase (2분): 5종 동작 테스트
   - ✅ Think Phase (2분): Placeholder
   - ✅ Flow Phase (5분): Placeholder
   - ✅ 자동 전환 확인
   - ✅ 진행바 동작 확인

## 시스템 구조

```
/iiwarmup                       # 사용자 메인 페이지
    ↓ "바로 실행" 클릭
/iiwarmup/program/[weekId]      # 복합 프로그램 페이지
    ↓ ProgramOrchestrator
    ├── Play Phase (2분)
    ├── Think Phase (2분)
    └── Flow Phase (5분)
```

## 복합 프로그램 추가 방법

### SQL로 직접 추가

```sql
INSERT INTO warmup_programs_composite (id, week_id, title, description, total_duration, phases)
VALUES (
  'program_2026_01_w2',
  '2026-01-W2',
  '새로운 웜업 프로그램',
  '설명...',
  540,
  '[
    {"type": "play", "scenario_id": "week2_scenario", "duration": 120},
    {"type": "think", "content_type": "placeholder", "duration": 120},
    {"type": "flow", "content_type": "placeholder", "duration": 300}
  ]'::jsonb
);
```

### 새 시나리오 추가

```sql
INSERT INTO play_scenarios (id, name, theme, duration, scenario_json)
VALUES (
  'week2_scenario',
  '2월 1주차 시나리오',
  'beach',
  120,
  '{
    "theme": "beach",
    "duration": 120,
    "actions": [...]
  }'::jsonb
);
```

## 트러블슈팅

### 문제: "이번주 웜업 준비중"만 표시됨

**원인**: 현재 주차에 해당하는 웜업 프로그램이 DB에 없습니다.

**해결**:
1. 먼저 DB 상태 확인:
```sql
-- CHECK_WARMUP_STATUS.sql 실행
```

2. 현재 주차 데이터 삽입:
```sql
-- INSERT_CURRENT_WEEK_WARMUP.sql 실행
```

### 문제: "지난 웜업 다시보기" 클릭 시 아무것도 안 나옴

**원인**: 해당 프로그램의 `content` 필드가 비어있거나 잘못되었습니다.

**해결**:
```sql
-- 특정 프로그램 확인
SELECT * FROM iiwarmup_programs WHERE title = 'MOS';

-- content가 비어있으면 수정
UPDATE iiwarmup_programs
SET content = '<div>샘플 콘텐츠</div>'
WHERE title = 'MOS';
```

### 문제: "복합 프로그램을 찾을 수 없습니다"

**원인**: DB에 해당 week_id의 복합 프로그램이 없습니다.

**해결**:
```sql
SELECT * FROM warmup_programs_composite WHERE week_id = '2026-01-W1';
```

데이터가 없으면 `11_create_warmup_composite_schema.sql`을 다시 실행하세요.

### 문제: "시나리오를 찾을 수 없습니다"

**원인**: DB에 해당 scenario_id가 없습니다.

**해결**:
```sql
SELECT * FROM play_scenarios WHERE id = 'week1_kitchen';
```

데이터가 없으면 `11_create_warmup_composite_schema.sql`을 다시 실행하세요.

### 문제: RLS 권한 오류

**원인**: 사용자가 admin이 아니거나 RLS 정책이 잘못 설정되었습니다.

**해결**:
```sql
-- is_admin() 함수 확인
SELECT is_admin();

-- 결과가 false면 사용자 role 확인
SELECT * FROM users WHERE id = auth.uid();
```

## 다음 단계

- [ ] Think Phase 구현
- [ ] Flow Phase 구현
- [ ] 관리 페이지에서 복합 프로그램 생성 UI 추가
- [ ] 가변 프레임 드랍 (90초 지점)
- [ ] 색상 동기화
- [ ] 사운드 레이어링
