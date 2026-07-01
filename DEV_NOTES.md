# DEV_NOTES — SPOKEDU MASTER

에이전트·후속 작업은 이 파일과 `CLAUDE.md`만 읽고 이어받는다. **완성도 %·날짜별 작업 로그는 쓰지 않는다** (부정확·중복이 많았음).

## 범위

| 영역 | 경로 |
|------|------|
| UI | `app/spokedu-master/` |
| API | `app/api/spokedu-master/` |
| Admin | `app/admin/spokedu-master/` |
| 결제·구독 DB | `supabase/migrations/2026063*_spokedu_master_*` |
| 진입 가드 | `proxy.ts` (`/spokedu-master/*`) |

`subscription-new`, `spokedu-pro`에 직접 구현하지 않는다. MASTER에만 흡수.

## 운영·콘텐츠 (코드 밖)

- 참고 영상·대표 이미지·HOT 8개 메타는 **운영이 직접** admin·DB·`overlay.video_url`에 넣는다.
- 코드는 **제목/regex로 YouTube 자동 주입하지 않음** (`verified-program-video.ts`, `FUNSTICK_VERIFIED_YOUTUBE_ID`).
- 편집 시 `verified-program-video.ts`의 `BLOCKED_YOUTUBE_IDS`·검증 ID만 갱신.

---

## 구독 상용화 현황

### ✅ 구현·연결됨

| 기능 | 위치 | 비고 |
|------|------|------|
| 로그인 필수 | `proxy.ts` | `/spokedu-master` 대부분, 공개: landing·payment·privacy·terms·parent |
| 구독 접근 검사 | `requireSpokeduMasterAccess()` | API 호출 시 서버에서 구독·어드민 여부 검증, fail closed |
| Toss 빌링키 발급 | `payment/billing/issue/route.ts` | OTP 로그인 후 requestBillingAuth → 서버에서 billing key 발급 |
| 첫 결제 처리 | `payment/billing/issue/route.ts` | 서버 가격 재검증 (lite 9,900 · premium 28,900), `apply_payment` RPC |
| Supabase Vault 빌링키 저장 | `spokeduMasterBillingKeyVault.ts`, `20260630123000_spokedu_master_billing_key_vault.sql` | 원문 billing key를 직접 저장하지 않음 |
| 자동 갱신 | `payment/billing/renew/route.ts`, `20260630124000_spokedu_master_billing_supabase_cron.sql` | pg_cron 매시간 → Vault에서 URL·secret 읽어 호출, cancel_at_period_end=false 대상만, billing_cycle_key 중복 방지 |
| Toss 웹훅 | `payment/webhook/route.ts` | PAYMENT_STATUS_CHANGED·CANCEL_STATUS_CHANGED 처리, transmission-id 기반 idempotency, Toss API 재검증 |
| 구독 해지 예약 | `payment/billing/cancel/route.ts` | cancel_at_period_end=true, 기간 종료일까지 사용 가능 |
| 구독 상태 API | `GET /api/spokedu-master/subscription` | `spokedu_master_subscriptions` |
| 클라이언트 플랜 동기화 | `store` `syncSubscription` | 로그인·포커스 시 |
| SPOMOVE 권한 잠금 | `SubscriptionGateWall`, `canUseSpomove` | lite → 구독 관리 CTA, 미구독 → 이용권 선택 CTA |
| 라이브러리·수업 도구·기록 권한 잠금 | `SubscriptionGateWall`, `canUseLibrary/ClassTools/Records` | 서버 access snapshot 기반 |
| programs API 서버 권한 | `programs/route.ts` | `requireSpokeduMasterAccess()` — 로그인만으로 curriculum 전체 반환하지 않음 |
| operational-data API 서버 권한 | `operational-data/route.ts` | `requireSpokeduMasterAccess()` |
| 구독·플랜 안내 | `subscription/page.tsx`, `profile` 플랜 시트 | Center/School은 문의 유도 |
| Admin | `admin/spokedu-master/programs` | HOT·표시순서·`sm_is_pro`·home-featured·video-gaps |
| 결제 포털 | `payment/portal/route.ts` | 410 + 이메일 고객센터 안내 (토스에는 Billing Portal 없음) |

### ❌ 운영·미완 항목

| 항목 | 문제 | 권장 |
|------|------|------|
| **프로그램 `isPro` 거의 미사용** | DB `sm_is_pro` 미설정 시 라이브러리 잠금 안 걸림 (programs API는 보호되나 pro 여부가 DB에 없음) | admin에서 PRO 표시 과금 콘텐츠 지정 |
| **Center(팀) 플랜** | 직접 결제 UI 없음 (문의 유도만). 멀티시트·초대·RLS 없음 | landing·문의 카피만 유지, 직접 결제는 Phase 2 |
| **School 플랜** | 문의만, 코드 경로 없음 | 의도적이면 landing에만 노출 |

### 현재 운영 정책 (코드 기준)

**결제:**
- lite 월 9,900원 · premium 월 28,900원
- Toss requestBillingAuth → billing key 발급 → 첫 결제 → apply_payment RPC
- Supabase pg_cron 매시간 자동 갱신 (Vault 저장 billing key 사용)
- 기간 종료 해지 (`cancel_at_period_end=true`)

**권한:**
- 미구독: 홈·프로필·구독·결제·스토어 접근 가능
- lite: library·class-tools·records 기능 사용 가능
- premium: SPOMOVE 포함 전체 기능 사용 가능
- team/admin: 전체 기능 접근 (직접 결제·해지 CTA 없음)
- 유료 데이터 API: `requireSpokeduMasterAccess()` 서버 검증

### 출시 전 확인 필요

1. **PRO 콘텐츠 지정** — admin `sm_is_pro` + 라이브러리 잠금이 실제 과금 콘텐츠와 일치하는지 확인.
2. **Vault·Cron 운영 적용** — `spokedu_master_billing_renew_url`·`spokedu_master_billing_cron_secret` Vault 등록, migration 적용, 1회 갱신 통제 테스트.
3. **SPOMAT 스토어 URL** — `SPOMAT_PUBLIC_PURCHASE_URL`·`SPOMAT_PREMIUM_PURCHASE_URL` 실제 URL로 교체.
4. **통신판매업 신고번호** — 등록 완료 시 `businessInfo.ts`·landing footer 반영.
5. **E2E** — `npm run qa:spokedu-master`, CI 시크릿 있을 때 로그인 홈 스모크.

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
| `SUPABASE_SERVICE_ROLE_KEY` | 결제·admin·programs API |
| `TOSS_SECRET_KEY` | billing key 발급·결제 승인·웹훅 검증 (`test_` 또는 운영 key) |
| `NEXT_PUBLIC_TOSS_CLIENT_KEY` | 결제 위젯 클라이언트 |
| `CRON_SECRET` | billing renew cron Bearer auth |
| `SPM_ADMIN_EMAILS` | 관리자 우회 |
| `SPOMAT_PUBLIC_PURCHASE_URL` | SPOMAT 일반가 구매 redirect (기본: example.com) |
| `SPOMAT_PREMIUM_PURCHASE_URL` | SPOMAT 회원가 구매 redirect (기본: example.com) |
| `SPOKEDU_MASTER_QA_ID`, `SPOKEDU_MASTER_QA_PASSWORD` | 선택 E2E |

Supabase Vault 항목 (migration으로 등록, 코드에서 직접 읽지 않음):

| Vault 이름 | 용도 |
|------|------|
| `spokedu_master_billing_renew_url` | pg_cron이 호출할 renew endpoint URL |
| `spokedu_master_billing_cron_secret` | renew endpoint Bearer 인증값 |

## 로컬 QA

```bash
npm run qa:spokedu-master
```

수정 후 (사용자·CI): `CLAUDE.md`의 `tsc` / `eslint` / 모지바케 `rg` 스캔.

## 주요 파일

- 홈: `dashboard/DashboardView.tsx`
- 미디어: `lib/program-media.ts`, `lib/verified-program-video.ts`
- 구독 로직: `lib/subscription.ts`, `store/index.ts` (`useIsPro`, `syncSubscription`)
- 결제: `payment/page.tsx`, `api/spokedu-master/payment/billing/issue`, `api/spokedu-master/payment/billing/renew`
- 자동 갱신 migration: `supabase/migrations/20260630124000_spokedu_master_billing_supabase_cron.sql`
- Vault migration: `supabase/migrations/20260630123000_spokedu_master_billing_key_vault.sql`
