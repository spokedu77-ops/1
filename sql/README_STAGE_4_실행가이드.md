# Stage 4: 수업안 관리 시스템 - 실행 가이드

## 📋 개요

Stage 4는 선생님들의 수업안 작성 및 관리 시스템을 구축합니다.

## 🎯 주요 기능

### Teacher (선생님)
- 수업별 주차별 수업안 작성 (텍스트 기반)
- 드롭다운 형태로 수업 그룹화
- **자동 확장**: 10주차 작성 완료 → 11~20주차 자동 생성
- 수정/삭제 기능

### Admin (관리자)
- 전체 선생님 수업안 조회
- 선생님별/수업별 진행률 확인
- 작성된 주차만 열람 가능

### 중복 피드백 검수
- 같은 선생님의 최근 5개 수업과 비교
- 50% 이상 유사 시 경고 표시
- 복붙 방지 및 품질 향상

## 🚀 배포 순서

### 1단계: 데이터베이스 변경 (필수)

**파일**: `sql/stage_4_lesson_plans.sql`

#### Supabase Dashboard에서 실행:
1. Supabase 프로젝트 대시보드 접속
2. SQL Editor 메뉴 선택
3. `stage_4_lesson_plans.sql` 전체 내용 복사
4. 실행 (Run)

#### 주요 변경 사항:
- `lesson_plans` 테이블 생성
  - `teacher_id`: 선생님 ID (FK to auth.users)
  - `class_title`: 수업명 (예: "유아 체육 놀이")
  - `week_number`: 주차 (1, 2, 3, ...)
  - `content`: 수업안 내용 (TEXT)
- 인덱스 추가 (teacher_id, class_title)
- RLS 정책 설정 (선생님/관리자 권한)

### 2단계: 코드 배포

#### 변경/신규 파일들:

1. ✅ `app/teacher/lesson-plans/page.tsx` (신규)
   - 드롭다운 형태 수업안 관리
   - 주차별 작성 UI
   - 자동 확장 로직

2. ✅ `app/admin/teachers-classes/page.tsx` (대폭 개선)
   - 탭 추가 (피드백 검수 / 수업안 조회)
   - 중복 피드백 검수 기능
   - 피드백 UI 간소화 (편집 가능)

3. ✅ `app/components/Sidebar.tsx` (메뉴 추가)
   - Teacher: "내 수업안 관리" 메뉴

#### 배포:
```bash
# Vercel 배포 (자동)
git add .
git commit -m "Stage 4: 수업안 관리 시스템 + 중복 검수 완료"
git push origin main

# 또는 수동 배포
npm run build
npm run start
```

### 3단계: 검증 (필수)

#### 3-1. 데이터베이스 확인

```sql
-- 테이블 생성 확인
SELECT tablename 
FROM pg_tables 
WHERE tablename = 'lesson_plans';

-- Policy 확인
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'lesson_plans';

-- 인덱스 확인
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'lesson_plans';

-- 결과 예시:
-- tablename      | lesson_plans
-- policyname     | lesson_plans_teacher, lesson_plans_admin
-- indexname      | idx_lesson_plans_teacher, idx_lesson_plans_title
```

#### 3-2. 기능 테스트

**Teacher 페이지 (`/teacher/lesson-plans`)**:
- [ ] "새 수업 추가" 버튼 클릭 → 수업명 입력 → 저장
- [ ] 수업 드롭다운 펼치기/접기 (▼/▶)
- [ ] 주차 버튼 클릭 → 수업안 작성 모달 열림
- [ ] 수업안 내용 작성 후 저장
- [ ] 작성된 주차는 초록색(bg-emerald-500)으로 표시
- [ ] **자동 확장 테스트**: 10주차 작성 후 → 11~20주차 버튼 자동 생성
- [ ] 작성된 주차 클릭 → 수정 가능
- [ ] 삭제 버튼 → 확인 후 삭제

**Admin 페이지 (`/admin/teachers-classes`)**:

*피드백 검수 탭*:
- [ ] 날짜/강사 필터 작동
- [ ] 피드백 카드 클릭 → 모달 열림
- [ ] **중복 경고**: 유사도 50% 이상 시 노란색 경고 표시
- [ ] 센터 수업: 메모만 편집 가능
- [ ] 개인 수업: 5개 필드 모두 편집 가능
- [ ] 검수 승인 → status 'verified'로 변경

*수업안 조회 탭*:
- [ ] 선생님 선택 필터 작동
- [ ] 선생님별/수업별 그룹화 표시
- [ ] 진행률 표시 (예: 8/10 작성)
- [ ] 작성된 주차만 클릭 가능 (초록색)
- [ ] 미작성 주차는 비활성화 (회색)
- [ ] 클릭 시 수업안 내용 보기 모달

## 📊 데이터 구조

### lesson_plans 테이블

```sql
CREATE TABLE lesson_plans (
  id UUID PRIMARY KEY,
  teacher_id UUID NOT NULL,      -- 선생님 ID
  class_title TEXT NOT NULL,     -- "유아 체육 놀이"
  week_number INTEGER NOT NULL,  -- 1, 2, 3, ...
  content TEXT,                  -- 수업안 내용
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  UNIQUE(teacher_id, class_title, week_number)
);
```

### 샘플 데이터 확인

```sql
-- 전체 수업안 개수
SELECT COUNT(*) as total_lesson_plans FROM lesson_plans;

-- 선생님별 수업안 통계
SELECT 
  u.name as teacher_name,
  COUNT(DISTINCT lp.class_title) as class_count,
  COUNT(*) as total_weeks,
  COUNT(CASE WHEN lp.content IS NOT NULL AND lp.content != '' THEN 1 END) as completed_weeks
FROM lesson_plans lp
JOIN users u ON lp.teacher_id = u.id
GROUP BY u.name
ORDER BY completed_weeks DESC;

-- 수업별 진행률
SELECT 
  class_title,
  MAX(week_number) as max_week,
  COUNT(*) as total_entries,
  COUNT(CASE WHEN content IS NOT NULL AND content != '' THEN 1 END) as completed
FROM lesson_plans
GROUP BY class_title
ORDER BY class_title;
```

## 🔄 자동 확장 로직

### 원리
```typescript
// 표시할 주차 계산
const displayUpTo = Math.ceil((maxWeek + 1) / 10) * 10;

// 예시:
// maxWeek = 0  → displayUpTo = 10
// maxWeek = 9  → displayUpTo = 10
// maxWeek = 10 → displayUpTo = 20
// maxWeek = 19 → displayUpTo = 20
// maxWeek = 20 → displayUpTo = 30
```

### 동작 방식
1. 초기: 1~10주차 버튼 표시
2. 10주차 작성 완료
3. 다음 접속 시: 1~20주차 버튼 자동 표시
4. 20주차 작성 완료
5. 다음 접속 시: 1~30주차 버튼 자동 표시
6. **무한 확장 가능**

## ⚠️ 주의사항

### 1. 데이터베이스 백업
```bash
# 실행 전 반드시 백업!
pg_dump -h your-host -U postgres -d postgres > backup_before_stage4.sql
```

### 2. 롤백 방법
문제 발생 시:
```sql
-- 테이블 삭제
DROP TABLE IF EXISTS lesson_plans CASCADE;
```

### 3. 권한 확인
- Teacher: 본인 수업안만 조회/수정/삭제
- Admin: 모든 수업안 조회만 (수정/삭제 불가)

## 📈 기대 효과

| 항목 | 개선 전 | 개선 후 | 효과 |
|------|---------|---------|------|
| **수업안 관리** | 네이버 카페 (분산) | 통합 시스템 | **+100%** |
| **작성 편의성** | 게시글 작성 | 간단 텍스트 입력 | **+70%** |
| **진행률 확인** | 수동 확인 | 자동 계산 | **+100%** |
| **관리자 업무** | 카페 방문 확인 | 대시보드 확인 | **-80%** |

## 🎉 완료 확인

모든 체크리스트를 완료하면 Stage 4 배포 완료!

- [ ] DB 스키마 변경
- [ ] 코드 배포
- [ ] 기능 테스트 (Teacher - 수업안)
- [ ] 기능 테스트 (Admin - 수업안 조회)
- [ ] 기능 테스트 (Admin - 중복 검수)
- [ ] 실제 사용자 피드백 수집

## 🔜 향후 개선 사항

### 단기 (Stage 5)
- 수업안 템플릿 제공
- 수업안 공유 기능
- 주차별 첨부파일 지원

### 중기
- AI 기반 수업안 추천
- 수업안 복사/재사용 기능
- 연간 수업안 통계 리포트

---

**문의사항**: Stage 4 관련 이슈는 팀에 공유해주세요!
