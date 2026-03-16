# 스포키듀 프로 — 대시보드 "매주 4개" 풀 및 갱신 주기

## 1. "매주 4개" 후보 풀

- **Row1(이번 주 수업 가이드)**  
  - 매주 4개 프로그램이 **어떤 풀**에서 오는지:  
    - **코드**: `app/lib/spokedu-pro/dashboardDefaults.ts`의 `PROGRAM_BANK`(테마·role 매핑) 및 테마 키(`THEME_KEYS`, `THEME_LABELS`).  
    - **실제 데이터**: 프로그램 카탈로그는 `/api/spokedu-pro/programs` 및 콘텐츠 블록 `program_details`와 연동될 수 있음.  
  - 즉, "매주 4개" 후보는 **놀이체육·프로그램 카탈로그 풀**(PROGRAM_BANK + catalog API)에서 선정된다.

## 2. 큐레이션 편집 정책

- **현재**: Admin/편집 모드에서 `dashboard_v4`의 `weekTheme.items`, `row2.items`를 편집할 수 있음.  
- **선정 방식**:  
  - **풀 제한**: 큐레이션 편집 시 후보는 위 풀(프로그램 카탈로그)에서만 선택하도록 제한하는 것이 권장됨. (현재 구현은 programId 기반으로 풀 내 존재 여부 검증은 선택 사항.)  
  - **자유 입력**: programId를 임의로 넣는 방식은 풀과 불일치할 수 있으므로, 운영 정책에 따라 풀 내 선택만 허용하도록 제한할 수 있음.

## 3. 갱신 주기

- **주차 기준**: "이번 주" = **캘린더 주(월요일 시작)**. `app/lib/spokedu-pro/weekUtils.ts`의 `getCurrentWeekLabel()`로 "Y년 M월 N주차" 계산.
- **갱신 시점**:  
  - 주가 바뀌면(월요일 00:00 기준) 대시보드 데이터가 바뀌는지 확인.  
  - 클라이언트: `useSpokeduProDashboard` 훅에서 `getCurrentWeekLabel()`을 의존성에 넣어, **주가 바뀌면 자동 refetch**하도록 구현됨.  
  - 서버: GET `/api/spokedu-pro/dashboard`는 요청 시점의 `weekLabel`을 응답에 포함하며, 큐레이션 본문은 `spokedu_pro_tenant_content.dashboard_v4`에 저장된 값을 그대로 반환. 주차별로 다른 큐레이션을 두려면 별도 키(예: 주차별 키) 또는 스케줄 정책이 필요함.

## 4. 요약

| 항목 | 내용 |
|------|------|
| 풀 | PROGRAM_BANK + catalog API(program_details, /api/spokedu-pro/programs) |
| 매주 4개 | 위 풀에서 선정, Row1에 4개 노출 |
| 큐레이션 편집 | 풀 내 programId 선택 권장(자유 입력 여부는 운영 정책) |
| 갱신 주기 | 주차 = 월요일 시작, 주가 바뀌면 클라이언트 refetch |
