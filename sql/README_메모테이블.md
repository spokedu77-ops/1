# Memos 테이블 설정 가이드

## 문제 상황
대시보드에서 메모 저장 시 다음 에러 발생:
```
Could not find the 'assignee' column of 'memos' in the schema cache
```

## 해결 방법

### 1. Supabase SQL Editor에서 실행
1. Supabase 대시보드 접속
2. SQL Editor 메뉴로 이동
3. `sql/06_create_memos_table.sql` 파일 내용 복사
4. 붙여넣기 후 실행

### 2. 테이블 구조 확인
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'memos';
```

### 3. 기존 데이터 확인
```sql
SELECT * FROM memos;
```

## 테이블 스키마

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| id | UUID | Primary Key |
| assignee | TEXT | 담당자 (Common, 최지훈, 김윤기, 김구민) |
| content | TEXT | 메모 내용 |
| created_at | TIMESTAMPTZ | 생성 시간 |
| updated_at | TIMESTAMPTZ | 수정 시간 |

## 주의사항
- `assignee` 컬럼은 UNIQUE 제약조건이 있어 중복 불가
- RLS가 활성화되어 있으므로 인증된 사용자만 접근 가능
