# DEV_NOTES — SPOKEDU MASTER

에이전트·후속 작업은 이 파일과 `CLAUDE.md`만 읽고 이어받는다. **완성도 %·날짜별 작업 로그는 쓰지 않는다** (부정확·중복이 많았음).

## 범위

| 영역 | 경로 |
|------|------|
| UI | `app/spokedu-master/` |
| API | `app/api/spokedu-master/` |
| Admin | `app/admin/spokedu-master/` |
| 결제·구독 DB | `sql/71_spokedu_master_subscriptions.sql`, `spokedu_master_subscriptions` |
| 진입 가드 | `proxy.ts` (`/spokedu-master/*`) |

`subscription-new`, `spokedu-pro`에 직접 구현하지 않는다. MASTER에만 흡수.

## 운영·콘텐츠 (코드 밖)

- 참고 영상·대표 이미지·HOT 8개 메타는 **운영이 직접** admin·DB·`overlay.video_url`에 넣는다.
- 코드는 **제목/regex로 YouTube 자동 주입하지 않음** (`verified-program-video.ts`, `FUNSTICK_VERIFIED_YOUTUBE_ID`).
- 편집 시 `verified-program-video.ts`의 `BLOCKED_YOUTUBE_IDS`·검증 ID만 갱신.

---

## 구독 상용화 점검 (2026-05-29)

### ✅ 구현·연결됨

| 기능 | 위치 | 비고 |
|------|------|------|
| 로그인 필수 | `proxy.ts` | `/spokedu-master` 대부분, 공개: landing·payment·privacy·terms·parent |
| 14일 체험 | `proxy.ts` `isInTrial`, `subscription/route.ts` | `user.created_at` + 14일 |
| 체험 만료 → 결제 유도 | `proxy.ts` | 활성 구독 없으면 `/spokedu-master/payment` 리다이렉트 |
| 토스 결제 (Pro/Center) | `payment/page.tsx`, `payment/confirm`, `create-checkout` | `TOSS_SECRET_KEY`, 주문 `spm-{plan}-{ts}` |
| 구독 상태 API | `GET /api/spokedu-master/subscription` | `spokedu_master_subscriptions` |
| 결제 후 DB 반영 | `payment/confirm` | 30일 `period_end` upsert |
| 클라이언트 플랜 동기화 | `store` `syncSubscription` | 로그인·포커스 시 |
| 체험 배너 | `TrialCountdownBanner` | 만료 7일 전부터 |
| 체험 만료 UI (일부) | `TrialGateWall` | library·spomove·class-tools 페이지 래핑 |
| SPOMOVE PRO 잠금 | `SpomoveHubView`, `spomove/session` | `drill.isPro` + `useIsPro` |
| 라이브러리 PRO 잠금 (UI) | `LibraryView`, `LibraryDetailView` | `program.isPro` + `useIsPro` |
| 수업 기록 생성 제한 | `canCreateClassRecord` | 체험 만료 시 신규 기록 불가 |
| 구독·플랜 안내 | `subscription/page.tsx`, `profile` 플랜 시트 | Center/School은 문의 유도 |
| 프로그램 API | `programs/route.ts` | curriculum + `spokedu_master_program_meta`, `overlay.video_url`만 참고 영상 |
| Admin | `admin/spokedu-master/programs` | HOT·표시순서·`sm_is_pro`·home-featured·video-gaps |

### ❌ 미완·상용 리스크 (우선 처리)

| 항목 | 문제 | 권장 |
|------|------|------|
| **서버 콘텐츠 잠금 없음** | `programs` GET이 로그인만 되면 전체 curriculum 반환. UI 잠금만으로는 API 우회 가능 | 구독·체험 상태 검사 후 필드 마스킹 또는 403 |
| **프로그램 `isPro` 거의 미사용** | 정적 `data.ts`는 전부 `isPro: false`. DB `sm_is_pro` 미설정 시 라이브러리 잠금 안 걸림 | admin에서 PRO 표시 과금 콘텐츠 지정 + API 반영 확인 |
| **Center(팀) 플랜** | UI·카피에 「강사 3명」 있으나 **멀티시트·초대·RLS 없음** | 결제 전 카피 정리 또는 2단계 스키마 |
| **Lite 플랜** | 프로필·문구만, **결제 불가** | 출시 전 UI에서 제거 또는 checkout 추가 |
| **자동 갱신** | `confirm`이 30일 1회 기간만 저장. **정기결제·웹훅 없음** | 토스 빌링키/구독 API 또는 수동 갱신 운영 명시 |
| **웹훅** | `payment/webhook` 스텁 | 결제 실패·취소·환불 동기화 |
| **결제 포털** | `payment/portal` → 410, 이메일 안내 | 취소·카드변경 플로우 문서화 |
| **리포트** | `TrialGateWall` 없음. 탭 일부만 `isPro`/`trialExpired` | library와 동일 만료 정책 적용 |
| **홈(대시보드)** | `TrialGateWall` 없음 (proxy는 만료 시 payment로 보냄) | 만료 사용자가 payment 외 경로 필요 시 공개 경로 검토 |
| **체험 시계 불일치 가능** | store 기본 `trialEndsAt` vs 서버 `created_at` | 만료 판단은 **항상 서버·proxy 기준**으로 통일 |
| **School 플랜** | 문의만, 코드 경로 없음 | 의도적이면 landing에만 노출 |

### 상용화 우선 작업 순서

1. **서버 entitlements** — `programs`·`drills` API에 체험/구독 검증 (최소: 만료 시 lessonDetail 일부 제거).
2. **PRO 콘텐츠 지정** — admin `sm_is_pro` + 라이브러리 잠금이 실제 과금 콘텐츠와 일치하는지 확인.
3. **결제·구독 운영** — 갱신 방식(수동 30일 vs 정기), 취소·환불 안내 페이지와 `subscription` 경로를 proxy 공개 목록에 넣을지 결정.
4. **Center 플랜** — 멀티 강사 없으면 결제 페이지·플랜 카드에서 「3명 포함」 문구 제거 또는 Phase 2 명시.
5. **E2E** — `npm run qa:spokedu-master`, CI 시크릿 있을 때 로그인 홈 스모크 (`scripts/spokedu-master-home-logged-qa.mjs`).

---

## 코드 규칙 (요약)

- Admin API: `requireAdmin` + `getServiceSupabase` (`app/lib/server/adminAuth.ts`).
- RLS 정책: `auth.uid()` → `(SELECT auth.uid())` (`.cursor/rules`).
- 수업·세션 CRUD(`classes`/`sessions`) 핵심 로직은 **명시 요청 없이 수정 금지**.
- git commit/push는 사용자 요청 시에만.

## 환경 변수

| 변수 | 용도 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 클라이언트·proxy |
| `SUPABASE_SERVICE_ROLE_KEY` | 결제 confirm, admin, programs |
| `TOSS_SECRET_KEY` | 결제 승인 |
| `TOSS_CLIENT_KEY` (또는 페이지에 쓰는 키) | 결제 위젯 |
| `SPM_ADMIN_EMAILS` | 구독·proxy 관리자 우회 |
| `SPOKEDU_MASTER_QA_ID`, `SPOKEDU_MASTER_QA_PASSWORD` | 선택 E2E |

## 로컬 QA

```bash
npm run qa:spokedu-master
```

수정 후 (사용자·CI): `CLAUDE.md`의 `tsc` / `eslint` / 모지바케 `rg` 스캔.

## 주요 파일

- 홈: `dashboard/DashboardView.tsx`
- 미디어: `lib/program-media.ts`, `lib/verified-program-video.ts`
- 구독 로직: `lib/subscription.ts`, `store/index.ts` (`useIsPro`, `syncSubscription`)
- 결제: `payment/page.tsx`, `api/.../payment/*`
