# I.I.Warm-up 데이터 흐름 수정 계획

## 현재 문제점

### 1. 템플릿 삭제 문제
- **TemplateLibrary**: `play_scenarios` 테이블에서 삭제
- **주간 스케줄 배정**: `warmup_programs_composite` 테이블 조회
- **결과**: 다른 테이블이므로 삭제해도 주간 스케줄 배정에는 영향 없음

### 2. 테마 관리 이미지 미적용
- **테마 관리**: `play_scenarios`에 이미지 URL 저장 (id: `week1_kitchen`)
- **빠른 생성**: `quickGenerate()` → `generateActions()` → `images: { off: '', on: '' }` (빈 이미지)
- **결과**: 테마 관리에서 저장한 이미지가 빠른 생성에 적용되지 않음

## 데이터 흐름 설명

```
1. 테마 관리 탭
   → play_scenarios 테이블에 이미지 URL 저장
   → id: "week1_kitchen"
   → scenario_json.actions[].images.off/on

2. Creator Studio 탭
   → 빠른 생성: quickGenerate() → 메모리에서만 생성 (DB 저장 안 함)
   → Save as Template: warmup_programs_composite 저장 (week_id = null)
   → TemplateLibrary: play_scenarios 조회

3. 주간 스케줄 배정 탭
   → warmup_programs_composite 테이블 조회
   → rotation_schedule 테이블에 주차별 배정
```

## 해결 방안

### 1. 빠른 생성 시 테마 관리 이미지 불러오기
**파일**: `app/lib/admin/logic/parametricEngine.ts`

- `generateActions()` 함수에 테마와 주차 정보 전달
- `play_scenarios` 테이블에서 해당 주차의 이미지 불러오기
- 불러온 이미지를 actions에 적용

### 2. 주간 스케줄 배정에서 프로그램 삭제 기능 추가
**파일**: `app/components/admin/iiwarmup/WeeklyScheduler.tsx`

- 프로그램 목록에 삭제 버튼 추가
- `warmup_programs_composite` 테이블에서 삭제
- 삭제 시 관련 `rotation_schedule`도 함께 삭제

### 3. 세 탭의 관계를 UI에 명확히 표시
**파일**: `app/admin/iiwarmup/page.tsx`

- 각 탭에 설명 추가
- 데이터 흐름 다이어그램 표시
