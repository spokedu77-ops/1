# Creator Studio 명확화 및 수정 계획

## Creator Studio가 만드는 것

### 1. 무엇을 만드나?
**GeneratedScenario 객체** - 10분 웜업 프로그램의 3단계 설정

```typescript
{
  play: {
    content_type: 'engine',
    frequency: 12,  // 주파수
    actions: [...],  // 동작 목록 (POINT, PUNCH 등)
    transitionInterval: 1.0
  },
  think: {
    content_type: 'engine',
    totalRounds: 10,
    roundDuration: 12000,
    congruentRatio: 0.5
  },
  flow: {
    content_type: 'engine',
    baseSpeed: 0.6,
    distortion: 0.3
  },
  eventTimeline: [...]
}
```

### 2. 어떻게 사용되나?

```
Creator Studio에서 생성
  ↓
Save as Template 클릭
  ↓
warmup_programs_composite 테이블에 저장 (week_id = null, 템플릿)
  ↓
주간 스케줄 배정 탭에서 템플릿 선택
  ↓
rotation_schedule 테이블에 주차별 배정
  ↓
구독자 페이지(/iiwarmup)에서 실행
  ↓
/iiwarmup/program/[weekId]에서 ProgramOrchestrator가 실행
```

## 현재 문제점

### 1. TemplateLibrary와 주간 스케줄 배정의 불일치
- TemplateLibrary: `play_scenarios` 테이블 조회/삭제
- 주간 스케줄 배정: `warmup_programs_composite` 테이블 조회
- 결과: TemplateLibrary에서 삭제해도 주간 스케줄 배정에는 영향 없음

### 2. 테마 관리 이미지 미적용
- 테마 관리: `play_scenarios`에 이미지 저장 (id: `week1_kitchen`)
- 빠른 생성: `generateActions()` → `images: { off: '', on: '' }` (빈 이미지)
- 결과: 테마 관리 이미지가 빠른 생성에 적용 안 됨

## 해결 방안

### 1. Creator Studio UI에 명확한 설명 추가
**파일**: `app/admin/iiwarmup/generator/page.tsx`

- 헤더에 "10분 웜업 프로그램 생성기" 설명 추가
- 생성된 시나리오 미리보기 표시
- 저장 시 어떤 테이블에 저장되는지 표시

### 2. 주간 스케줄 배정에서 프로그램 삭제 기능
**파일**: `app/components/admin/iiwarmup/WeeklyScheduler.tsx`

- 프로그램 목록에 삭제 버튼 추가
- `warmup_programs_composite` 삭제
- 관련 `rotation_schedule`도 함께 삭제

### 3. 빠른 생성 시 테마 관리 이미지 불러오기
**파일**: `app/lib/admin/logic/parametricEngine.ts`, `app/lib/admin/logic/quickGenerator.ts`

- `generateActions()`에 테마 정보 전달
- `play_scenarios`에서 해당 주차 이미지 불러오기
- 불러온 이미지를 actions에 적용

### 4. 세 탭의 관계를 UI에 명확히 표시
**파일**: `app/admin/iiwarmup/page.tsx`

- 각 탭 상단에 설명 카드 추가
- 데이터 흐름 다이어그램 표시
