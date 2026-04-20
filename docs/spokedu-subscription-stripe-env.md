# Stripe 연동 — 환경 변수

앱에서 Stripe Checkout·웹훅을 쓰려면 다음을 설정합니다.

| 변수 | 용도 |
|------|------|
| `STRIPE_SECRET_KEY` | 서버 API·웹훅 검증 |
| `STRIPE_WEBHOOK_SECRET` | `POST /api/webhooks/stripe` 서명 검증 |
| `STRIPE_PRICE_ID_BASIC` | Basic 월 구독 Price ID |
| `STRIPE_PRICE_ID_PRO` | Pro 월 구독 Price ID |
| `NEXT_PUBLIC_APP_URL` | Checkout 성공/취소 리다이렉트 베이스 URL (없으면 `VERCEL_URL` 사용) |
| `STRIPE_WEBHOOK_OPS_ALERT_URL` | (선택) 웹훅 DB 오류·예외 시 JSON `POST` (Slack Incoming Webhook 등). 미설정이면 로그만. |

Stripe Dashboard에서 **Webhook** 엔드포인트: `https://<도메인>/api/webhooks/stripe`  
권장 이벤트: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, **`invoice.payment_failed`** (`stripe_subscription_id`로 `past_due` 반영), **`invoice.paid`** (구독 행 `center_id` 기준으로 Stripe 구독 상태·기간·플랜 동기화, `past_due`→`active` 등 복구에 사용).

---

## 과금 오픈 후 심화(일정 잡힌 뒤)

자동 결제·자동 갱신을 **실제로 켜기로 한 이후**에만 아래를 순서대로 점검한다.

1. **웹훅**: `invoice.paid`, `invoice.payment_failed`, `customer.subscription.*` 등을 Dashboard에 등록. 처리 코드: [`app/api/webhooks/stripe/route.ts`](../app/api/webhooks/stripe/route.ts)(`invoice.paid`는 구독 메타데이터 `center_id`로 동기화). 구독 상태의 **운영 기준 진실**은 Stripe이며, 앱 DB는 웹훅으로 맞춘다(정합 점검 SQL은 [`spokedu-subscription-prod-db-audit.md`](./spokedu-subscription-prod-db-audit.md) §5).
2. **멱등·보안**: [`20260419120000`](../supabase/migrations/20260419120000_spokedu_stripe_webhook_idempotency.sql) 테이블 + [`20260421090000`](../supabase/migrations/20260421090000_spokedu_stripe_webhook_hardening.sql)(RLS·TTL 함수 `spokedu_pro_purge_stripe_webhook_events`). 주 1회 정도 `select spokedu_pro_purge_stripe_webhook_events(90);` 권장.
3. **관측**: 라우트는 JSON 한 줄 로그(`service: stripe_webhook`)를 남긴다. 알림은 `STRIPE_WEBHOOK_OPS_ALERT_URL`로 선택 연동.
4. **Customer Billing Portal** (구현됨): Stripe Dashboard → **설정 → Billing → Customer portal**에서 포털을 활성화하고, 허용할 기능(결제 수단 업데이트, 구독 취소 등)을 선택한다. 앱은 `POST` [`/api/spokedu-pro/billing-portal`](../app/api/spokedu-pro/billing-portal/route.ts)로 세션 URL을 받은 뒤 리다이렉트한다. `return_url`은 `{NEXT_PUBLIC_APP_URL}/spokedu-pro?view=settings`(또는 `VERCEL_URL` 기준 동일)으로, 복귀 시 설정 탭이 열린다([`SpokeduProClient`](../app/(pro)/spokedu-pro/SpokeduProClient.tsx)). **선행**: 센터 소유 계정으로 한 번 이상 Checkout을 완료해 `stripe_customer_id`가 DB에 있어야 버튼이 노출된다.
5. **E2E**: Stripe CLI로 `stripe listen` → 로컬 웹훅 시나리오(구독 생성·갱신·취소·결제 실패) 스크립트화.

로컬에서 웹훅을 받을 때 예시:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

(앱 포트가 다르면 URL만 맞춤.)

마지막 업데이트: 2026-04-22
