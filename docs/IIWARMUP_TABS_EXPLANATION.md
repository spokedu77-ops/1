# I.I.Warm-up 세 탭 설명서

## 현재 문제점

### 1. 테이블이 서로 다름
- **테마 관리**: `play_scenarios` 테이블 사용
- **Creator Studio**: `warmup_programs_composite` 테이블에 저장
- **주간 스케줄 배정**: `warmup_programs_composite` 테이블 조회

→ TemplateLibrary에서 `play_scenarios`를 삭제해도 주간 스케줄 배정에는 영향 없음 (다른 테이블)

### 2. 빠른 생성이 테마 관리 이미지를 사용하지 않음
- **테마 관리**: `play_scenarios`에 이미지 URL 저장 (id: `week1_kitchen`)
- **빠른 생성**: `quickGenerate()` → `generateActions()` → `images: { off: '', on: '' }` (빈 이미지)
- **결과**: 테마 관리에서 저장한 이미지가 빠른 생성에 적용되지 않음

## 데이터 흐름

```
테마 관리 탭
  ↓
play_scenarios 테이블 저장
  id: "week1_kitchen"
  scenario_json.actions[].images.off/on

Creator Studio 탭
  ├─ 빠른 생성: quickGenerate() → 메모리에서만 생성 (DB 저장 안 함)
  ├─ Save as Template: warmup_programs_composite 저장 (week_id = null)
  └─ TemplateLibrary: play_scenarios 조회

주간 스케줄 배정 탭
  ↓
warmup_programs_composite 테이블 조회
  ↓
rotation_schedule 테이블에 주차별 배정
```

## 해결 방안

1. 빠른 생성 시 테마 관리 이미지 불러오기
2. 주간 스케줄 배정에서 프로그램 삭제 기능 추가
3. 세 탭의 관계를 명확히 표시
