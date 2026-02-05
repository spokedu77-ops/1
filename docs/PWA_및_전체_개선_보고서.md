# PWA 및 전체 개선 보고서

기능/동작에 영향 없이, 영향 범위가 작은 것부터 차례로 적용할 수 있도록 정리했습니다.

---

## 0. Vercel 배포 검수가 통과하는 이유

- **TypeScript**: [next.config.ts](next.config.ts)에 `typescript: { ignoreBuildErrors: true }` 가 있어서, TS 타입 에러가 나도 빌드가 실패하지 않습니다.
- **ESLint**: `npm run build` 에는 `eslint` 가 포함되어 있지 않습니다. Vercel은 `next build` 만 실행하므로, ESLint 경고/에러가 있어도 배포는 성공합니다.
- **결과**: 런타임 오류나 린트/타입 문제가 있어도 “빌드 성공”만 되면 배포는 됩니다. 따라서 **배포 통과 ≠ 동작/품질 검증** 이라고 보는 것이 맞습니다.

---

## 1. PWA / 세션 (동작 영향 큼 — 신중히)

### 1-1. 세션 불일치 (PWA에서 데이터 안 나오는 주원인)

- **원인**: 로그인은 쿠키 기반 `getSupabaseBrowserClient()` 를 쓰는데, 일부 코드는 localStorage 기반 `createClient()` / `getSupabaseClient()` 를 사용합니다. PWA는 브라우저와 저장소가 분리되어 있어, 쿠키만 있는 상태에서는 localStorage 클라이언트가 세션을 못 읽습니다.
- **영향 페이지/경로**:
  - [app/class/create/page.tsx](app/class/create/page.tsx) — 모듈 상단 `createClient(url, key)` 직접 사용.
  - [app/report/[id]/page.tsx](app/report/[id]/page.tsx) — 동일. (부모 링크 공유용이면 인증 정책에 따라 유지 검토.)
  - [app/lib/supabase/client.ts](app/lib/supabase/client.ts) 사용처 전반:
    - [app/admin/iiwarmup/scheduler/page.tsx](app/admin/iiwarmup/scheduler/page.tsx) — 모듈 최상단 `const supabase = getSupabaseClient();`
    - [app/lib/admin/*](app/lib/admin/) — hooks·logic·assets 대부분.
    - [app/api/admin/storage/exists/route.ts](app/api/admin/storage/exists/route.ts) — 서버에서 anon만 사용, RLS에 따라 실패 가능.

**적용 시 유의**: 클라이언트 쪽만 `getSupabaseBrowserClient()` 로 바꾸면 됩니다. API 라우트는 서버이므로 “쿠키 전달”이 아니라 service role 또는 인증 헤더 등 서버용 방식으로 따로 검토해야 합니다. **한 번에 넓은 범위를 바꾸지 말고, 페이지 단위(예: class/create → iiwarmup scheduler 순)로 바꾸고 각각 로그인·데이터 로드 확인 후 다음으로 진행**하는 것을 권장합니다.

---

## 2. ESLint — 동작에 직접 영향 줄 수 있는 항목

아래는 “에러”로 나오는 항목이며, 특히 **set-state-in-effect** 는 연쇄 렌더/버벅거림으로 이어질 수 있어 우선 수정하는 것이 좋습니다.

### 2-1. set-state-in-effect (연쇄 렌더 위험)

| 파일 | 위치 | 내용 |
|------|------|------|
| [app/admin/inventory/page.tsx](app/admin/inventory/page.tsx) | 87 | `useEffect` 안에서 `fetchCatalog()` / `fetchTeachers()` 호출 → 내부에서 setState |
| [app/page.tsx](app/page.tsx) | 17 | `useEffect` 안에서 `setIsMounted(true)` |
| [app/teacher/curriculum/page.tsx](app/teacher/curriculum/page.tsx) | 57 | `useEffect` 안에서 `fetchItems()` 호출 |
| [app/teacher/inventory/page.tsx](app/teacher/inventory/page.tsx) | 73 | `useEffect` 안에서 `fetchMyData()` 호출 |

**권장**: “마운트 시 1회 fetch” 패턴은 유지하되, ESLint 규칙이 “effect 안에서 동기적으로 setState를 유발하는 함수 호출”을 막는 경우, 해당 effect에만 `// eslint-disable-next-line react-hooks/set-state-in-effect -- mount-only data fetch` 를 달아서 **동작은 그대로 두고** 린트만 해소할 수 있습니다. (이미 [SchedulerSlotCard](app/components/admin/scheduler/SchedulerSlotCard.tsx) 에서 같은 방식 사용 중.)  
또는 fetch를 `setTimeout(..., 0)` / `queueMicrotask` 로 한 번 감싸서 “비동기 1틱 뒤”에 실행하게 하면 규칙을 만족시킬 수 있으나, **동작 변경이 되므로 먼저 린트 예외로 고정하고, 나중에 리팩터 시 제거**하는 편이 안전합니다.

### 2-2. 기타 에러 (기능은 유지 가능, 점진적 수정)

- **react/no-unescaped-entities**: [app/teacher/report/page.tsx](app/teacher/report/page.tsx) 202행 — `'` 를 `&apos;` 등으로 이스케이프. 텍스트만 바꾸면 되고 동작 영향 없음.
- **prefer-const**: [app/lib/admin/logic/layoutEngine.ts](app/lib/admin/logic/layoutEngine.ts) 94행 — `let start` → `const start`. 동작 동일.
- **@typescript-eslint/no-explicit-any**: 다수 파일. 타입만 구체화하면 되며, 한 번에 전부 말고 **페이지/훅 단위로** `any` → 구체 타입으로 바꾸면 됩니다. (teacher/chat, teacher/curriculum, teacher/my-classes, report/[id] 등)

---

## 3. 프로덕션/품질 — 영향 거의 없음

### 3-1. console.log

- [app/admin/inventory/page.tsx](app/admin/inventory/page.tsx), [app/admin/users/page.tsx](app/admin/users/page.tsx) 등에 `[inventory] fetchCatalog 시작`, `[users] fetchUsers 시작` 등 다수 존재.
- **권장**: 프로덕션에서만 제거하려면 `if (process.env.NODE_ENV === 'development') { console.log(...); }` 로 감싸거나, 해당 줄 삭제. 동작에는 영향 없음.

### 3-2. 미사용 변수/import

- ESLint `no-unused-vars` 경고 다수 (예: `vapidKey`, `fileName`, `myName`, `Youtube`, `LayoutDashboard`, `Info` 등).
- **권장**: 사용하지 않으면 제거하거나 `_` 접두이로 “의도적 미사용” 표시. 동작 영향 없음.

### 3-3. next.config

- 문서에는 `eslint: { ignoreDuringBuilds: true }` 로 빌드 실패 방지한다고 되어 있으나, **현재 [next.config.ts](next.config.ts) 에는 해당 옵션이 없습니다.** TypeScript 무시만으로도 빌드는 통과하므로, ESLint를 빌드에 포함시키지 않는 한 추가 설정은 필수는 아닙니다. 나중에 “빌드 시 린트도 통과해야 함”으로 바꿀 때 넣을 수 있습니다.

---

## 4. API / 서버

### 4-1. Storage exists API

- [app/api/admin/storage/exists/route.ts](app/api/admin/storage/exists/route.ts) — `getSupabaseClient()` 사용. 서버에서는 쿠키가 없어 anon만 적용됩니다. Storage RLS가 “인증 필요”이면 실패할 수 있으므로, 필요 시 service role 또는 인증된 세션을 서버에서만 사용하는 방식으로 나중에 정리.

### 4-2. 채팅 미읽음 RPC

- `get_unread_counts` 실행 권한이 Supabase에 있어야 합니다. [sql/35_grant_get_unread_counts_service_role.sql](sql/35_grant_get_unread_counts_service_role.sql), [sql/22_chat_unread_optimization.sql](sql/22_chat_unread_optimization.sql) 미실행 시 채팅 배지/미읽음 에러 가능. 배포 검수 체크리스트에 포함되어 있음.

---

## 5. 권장 실행 순서 (영향 적은 것 → 큰 것)

아래 순서는 “기능/동작을 바꾸지 않는 선에서 먼저” 적용하는 기준입니다.

| 단계 | 내용 | 위험도 | 비고 |
|------|------|--------|------|
| 1 | **문서/환경**: 이 보고서와 Vercel 검수 문서에 “배포 통과 = 품질 검증 아님” 명시, next.config에 eslint 옵션 필요 시 추가 | 없음 | 동작 무관 |
| 2 | **린트만 해소 (동작 유지)**: set-state-in-effect 4곳에 eslint-disable 주석 추가 (mount-only fetch 유지) | 낮음 | 동작 동일 |
| 3 | **작은 린트**: teacher/report 이스케이프, layoutEngine prefer-const, 미사용 변수/import 정리 (unused vars, unescaped entities) | 낮음 | 동작 동일 |
| 4 | **프로덕션 로그**: admin inventory/users 등 console.log 제거 또는 NODE_ENV 감싸기 | 낮음 | 동작 무관 |
| 5 | **세션 통일 (PWA)** | 중간 | 한 페이지씩 적용 후 로그인·데이터 확인 권장. 순서 예: class/create → report/[id] → admin iiwarmup/scheduler 및 lib/admin (범위 넓음, 단계 나눠서) |
| 6 | **API 라우트**: storage/exists 서버 인증 방식 검토 | 중간 | RLS 정책에 따라 필요 시 |
| 7 | **타입**: no-explicit-any 점진적 제거 (파일/훅 단위) | 낮음 | 타입만 변경, 런타임 동작 동일 목표 |
| 8 | **exhaustive-deps, no-img-element** | 낮음 | 적용 완료: exhaustive-deps는 의도적 생략에 eslint-disable 또는 deps 보강(weekKey). no-img-element는 admin/teacher/report 채팅·커리큘럼·리포트 img에 eslint-disable 적용. (next/image 전환은 추후 선택) |

---

## 6. 요약

- **Vercel이 통과하는 이유**: TypeScript·ESLint가 빌드를 막지 않도록 설정되어 있거나, 빌드 스크립트에 린트가 없기 때문입니다.
- **PWA “데이터 안 나옴”**: 쿠키 세션과 localStorage 클라이언트 혼용이 주원인입니다. admin/teacher 중 일부만 쿠키 클라이언트로 바꾼 상태라, **class/create, report, admin iiwarmup·client.ts 사용처**를 같은 쿠키 기반 클라이언트로 맞추면 해소됩니다. 한 번에 넓은 범위를 건드리지 말고, **한 페이지(또는 한 라우트)씩 바꾼 뒤 반드시 로그인·데이터 로드 확인**하는 방식이 안전합니다.
- **버벅거림/에러 가능성**: set-state-in-effect 로 인한 연쇄 렌더 가능성이 있고, ESLint 에러 4건이 해당합니다. 우선 **동작은 그대로 두고** 해당 effect에만 eslint-disable을 거는 방식으로 진행한 뒤, 나머지 개선(타입, 로그, 미사용 변수, 세션 통일)을 단계별로 적용하는 것을 권장합니다.
