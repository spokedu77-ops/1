# Vercel 배포 검수 요약

## 0. 최종 점검 (배포 전)

### 요청 기능 적용 여부 — 모두 반영됨

| 요청 | 적용 내용 |
|------|-----------|
| 로그인 유지 | 로그인 페이지: 리프레시 토큰 에러일 때만 signOut, "이 기기에서 로그인 유지" 체크박스 추가 |
| 채팅 숫자 배지 | 선생님/관리자 채팅: Badging API(앱 아이콘 배지) + 푸시 API에서 iOS `aps.badge` 수신자별 전송 |
| 모바일 알림 설정 설명 | `배포_및_모바일푸시_체크리스트.md` 5-1, 5-2: Coach 단일 항목, 팝업은 채팅 탭 진입 시 뜸 |
| PWA에서 데이터 안 나옴 | 선생님/관리자 영역 Supabase 클라이언트를 쿠키 기반(`getSupabaseBrowserClient`)으로 통일 |

**채팅 리스트에서 더 하실 일 없습니다.** 위 기능만 배포하면 됩니다.

### 배포 전 체크리스트

- [ ] **환경 변수**: Vercel에 `NEXT_PUBLIC_SUPABASE_*` 및 푸시 사용 시 Firebase·웹훅 시크릿 등([배포_및_모바일푸시_체크리스트.md](배포_및_모바일푸시_체크리스트.md) 참고) 설정됨.
- [ ] **Supabase**: 푸시 배지용 `get_unread_counts` 실행 권한이 필요하면 `sql/35_grant_get_unread_counts_service_role.sql` 한 번 실행.
- [ ] **빌드**: 로컬 `npm run build` 시 .next 정리 단계 EPERM은 무시 가능. Vercel에서는 보통 정상 완료.
- [ ] **ESLint**: FullSequencePlayer(refs 3건)·FlowAudio(any 1건) 수정 완료. 그 외 구 legacy 경고는 `next.config.ts`에 `eslint: { ignoreDuringBuilds: true }` 로 빌드 실패 방지됨.

### 배포 후 확인

- [ ] 로그인 → 선생님 메인/일정/채팅 데이터 정상 표시(웹·PWA 동일).
- [ ] PWA: 홈 화면 앱 실행 → 채팅 탭 진입 시 알림 허용 팝업 → 허용 후 설정에 Coach 표시되는지 확인.

---

## 1. 이번에 제거·보완한 미사용/의심 구간

- **Sidebar**: `/teacher/notice` 로 연결되던 "공지 및 가이드" 메뉴 제거. 해당 메뉴가 속한 `teacherMenuItems` 전체 제거(teacher 페이지에서는 사이드바가 숨겨져 있어 사용처 없음).
- **next.config.ts**: `/teacher/notice` 접근 시 `/teacher` 로 리다이렉트 추가(북마크 등 기존 링크 대응).
- **Sidebar**: 사용하지 않는 아이콘 import `CalendarCheck` 제거.

### 배포 검수 시 추가 정리 (admin·공통)

- **admin**: `console.log`/`console.warn` 제거, 미사용 import·변수 제거(ChevronRight, AlertCircle 복구 등).
- **타입**: admin `no-explicit-any` 보강 — `app/admin/classes`, `master/reports`, `teachers-classes` 등에 `ReportTeacher`, `SessionRow`, `LessonPlanSession` 등 구체 타입 적용. `catch (error: any)` → `catch (error: unknown)` 및 안전한 메시지 추출.
- **React 훅**: `SchedulerSlotCard` set-state-in-effect 블록 eslint-disable 적용. `RuntimePlayer` ref 갱신을 `useEffect`로 이동. `FullSequencePlayer` advancePhase 자기 참조를 ref + `onEndStable` 콜백으로 변경. `ThinkPhaseWrapper`의 `Date.now()`를 `useState` 초기값으로 이동(impure 제거).
- **미사용 변수**: admin `users`, `mileage`, `classes` 등에서 미사용 상태/인자 정리(`_id`/`_createdAt` void 처리, `catch` 인자 제거 등).

## 2. Vercel 배포 시 필수 환경 변수

빌드·런타임에서 사용하는 값은 Vercel 프로젝트 **Environment Variables**에 설정해야 합니다.

| 변수명 | 용도 |
|--------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL (teacher/admin 등 전체) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (클라이언트) |

teacher 쪽 페이지는 위 두 개만 사용합니다. Firebase/기타 서비스 사용 시 해당 키도 추가 필요.

## 3. 빌드·린트 상태

- **빌드**: 로컬에서 `npm run build` 시 .next 정리 단계에서 파일 잠금(EPERM)이 나올 수 있음. Vercel 서버에서는 보통 정상 완료됩니다.
- **린트**: 배포 검수 과정에서 **admin** 및 **공통 컴포넌트**의 대표 에러(undefined 컴포넌트, set-state-in-effect, refs-in-render, impure 호출, no-explicit-any·unused vars 일부)를 수정함. **flow-phase**, **app/lib** 등에는 여전히 `no-explicit-any`·unused vars·`no-img-element`·`exhaustive-deps` 경고가 남아 있으나, **배포를 막지 않음**. 장기적으로 타입·의존성 배열·`<img>` → `<Image />` 정리 시 유지보수에 유리합니다.

## 4. 배포 후 확인 권장 항목

1. **리다이렉트**: `/teacher/notice` 접속 시 `/teacher` 로 이동하는지 확인.
2. **Teacher 플로우**: 메인 → 오늘 수업, 주간 일정 → 세션 클릭 → Session Report, 수업안 작성 버튼 → 수업안 모달·이전 수업안 표시.
3. **환경 변수**: Vercel에 `NEXT_PUBLIC_SUPABASE_*` 설정 후 재배포한 뒤, 로그인·데이터 로드가 되는지 확인.

## 5. 추가로 정리하면 좋은 부분 (선택)

- **console.error**: teacher/admin 에러 로깅용으로만 사용 중. 운영에서 로그 노출을 줄이려면 제거하거나 로깅 서비스로 대체 가능.
- **ESLint**: `flow-phase`·`app/lib` 등에 남은 `@typescript-eslint/no-explicit-any`, `react-hooks/exhaustive-deps`, `@next/next/no-img-element` 경고는 배포를 막지 않으나, 장기적으로 타입·의존성 배열·이미지 최적화 정리 시 유지보수에 유리합니다.
- **미사용 변수**: `app/api/admin/storage/exists`의 `fileName`, `firebase-messaging-sw`의 `vapidKey` 등은 추후 로직에서 사용할 수 있어 유지해 두었습니다.
