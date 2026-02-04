# admin/iiwarmup UI 개선 계획

## 변경 사항

### 1. 탭 구조 변경
**파일**: `app/admin/iiwarmup/page.tsx`

- 현재: 테마 관리 / 주간 스케줄 배정 2개 탭 + 헤더에 Creator Studio 링크
- 변경: 테마 관리 / 주간 스케줄 배정 / Creator Studio 3개 탭
- Creator Studio 탭: GeneratorPage 컴포넌트를 직접 임베드 (리다이렉트 대신)

### 2. 테마 관리 모달화
**파일**: `app/admin/iiwarmup/page.tsx`

- 테마 관리 탭에서 주차별 카드 제거
- "주차 테마 관리" 버튼 클릭 시 모달 열림
- 모달에서 연도/월/주차 선택 후 이미지 URL 입력
- ThemeManager 컴포넌트를 모달 내부에서 사용

### 3. 스타일 정리
**파일**: `app/admin/iiwarmup/page.tsx`

- 그라데이션 제거: `bg-gradient-to-r from-indigo-400 to-cyan-400` 등
- 그림자 효과 제거: `shadow-[0_0_20px_rgba(...)]` 등
- Glassmorphism 효과 제거: `backdrop-blur-xl bg-slate-900/80` 등
- 깔끔한 탭 스타일 적용 (단순한 border-bottom)

### 4. Generator 내부 타겟 중복 제거
**파일**: `app/admin/iiwarmup/generator/page.tsx`, `app/admin/iiwarmup/generator/components/BasicSettingsTab.tsx`

- 헤더의 빠른 생성 타겟과 BasicSettingsTab의 타겟을 동기화
- BasicSettingsTab의 target state를 상위로 끌어올려 헤더와 공유
- 또는 헤더의 빠른 생성 타겟을 제거하고 BasicSettingsTab의 타겟만 사용

## 구현 세부사항

### 탭 구조
```typescript
const [tab, setTab] = useState<'theme' | 'scheduler' | 'creator'>('theme');
```

### 테마 관리 모달
- 모달 열림 상태: `const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);`
- 선택된 주차: `const [selectedWeekId, setSelectedWeekId] = useState<string>('');`
- 모달에서 연도/월/주차 선택 후 ThemeManager 렌더링

### Creator Studio 탭
- GeneratorPage 컴포넌트를 직접 import하여 렌더링
- GeneratorPage의 h-screen을 탭 컨텍스트에 맞게 조정 (min-h-screen 또는 고정 높이)

### 타겟 동기화
- BasicSettingsTab의 target state를 ParameterPanel로 전달
- ParameterPanel에서 target을 GeneratorPage로 전달
- GeneratorPage의 quickTarget을 BasicSettingsTab의 target과 동기화

## 파일 수정 목록

1. `app/admin/iiwarmup/page.tsx` - 메인 페이지 구조 변경
2. `app/admin/iiwarmup/generator/page.tsx` - 타겟 동기화
3. `app/admin/iiwarmup/generator/components/ParameterPanel.tsx` - target prop 전달
4. `app/admin/iiwarmup/generator/components/BasicSettingsTab.tsx` - target prop 받기
