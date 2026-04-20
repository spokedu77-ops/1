# 스포키듀 구독 — 운영 런북 (한 권)

**목적**: Go/No-Go 체크리스트·증적 표([`section-4-execution`](./spokedu-subscription-section-4-execution.md) §6)는 **서명·링크 저장소**로 두고, 여기서는 **실제로 무엇을 어떤 순서로 하면 끝나는지**만 모았습니다.  
상태 정의·원칙의 근본은 [`spokedu-subscription-state-playbook.md`](./spokedu-subscription-state-playbook.md)입니다.

---

## 0. 시작 전 (필수)

1. **환경**: 가능하면 **스테이징 DB**에서 먼저 같은 절차를 밟습니다. 운영 DB면 **백업·티켓 번호**를 확보합니다([`section-4-execution`](./spokedu-subscription-section-4-execution.md) §0).
2. **단위**: 작업은 항상 **하나의 `center_id`** 단위입니다. 대량 일괄 변경은 하지 않습니다([`state-playbook`](./spokedu-subscription-state-playbook.md) §2).
3. **역할**: 1인 실행 + 1인 검증(또는 실행 직후 본인이 `SELECT`로 재확인)을 권장합니다.
4. **로그**: 티켓·슬랙·노션 중 하나에 **변경 전/후 한 줄**이라도 남깁니다(§7 증적과 연결).

---

## 1. 수동 전환과 웹훅이 같이 있을 때 (혼동 방지)

| 경로 | 역할 |
|------|------|
| **Stripe 웹훅** | `customer.subscription.*`, `invoice.payment_failed`, `invoice.paid` 등이 오면 [`app/api/webhooks/stripe/route.ts`](../app/api/webhooks/stripe/route.ts)가 `spokedu_pro_subscriptions`를 갱신합니다. **실제 과금이 켜진 뒤**에는 Stripe 쪽 상태가 먼저 움직이고, DB는 이벤트로 따라갑니다. |
| **수동 SQL / 관리자 화면** | 체험만 쓰는 센터, CS 예외, **스테이징에서의 Go/No-Go 리허설**, 웹훅 지연·누락 시 임시 복구 등에 사용합니다. |
| **같은 릴리즈에서** | “앱에 보이는 값”의 **즉시 진실**은 여전히 `spokedu_pro_subscriptions` 한 행입니다. 웹훅이 살아 있으면, 수동으로 바꾼 뒤에도 **다음 Stripe 이벤트**가 다시 덮어쓸 수 있으므로, 운영·CS는 **Stripe 대시보드와 DB를 함께** 보는 습관이 필요합니다. |

환경 변수·Dashboard 이벤트 목록·Billing Portal 동작은 [`spokedu-subscription-stripe-env.md`](./spokedu-subscription-stripe-env.md)에 상세합니다.

---

## 2. 대상 행 읽기 (항상 먼저)

아래 SQL의 `'<UUID>'`를 **스테이징(또는 운영)에서 쓸 센터의 `center_id`**로 바꿉니다.

```sql
select center_id, plan, status, max_classes,
       trial_end, current_period_end, stripe_subscription_id, stripe_customer_id, updated_at
from spokedu_pro_subscriptions
where center_id = '<UUID>';
```

- `max_classes`는 스키마 마이그레이션(예: `20260314000000_spokedu_pro_classes.sql`) 기준입니다. Free는 `1`, Basic은 `3`, Pro는 `null`에 가깝게 유지하는 것이 [`planCatalog`](../app/lib/spokedu-pro/planCatalog.ts)와 맞습니다.

---

## 3. Go/No-Go용 상태 전환 실습 (스테이징 권장)

아래는 **리허설·검증**용 예시입니다. 운영에서 동일 SQL을 쓸 때는 티켓 승인 후에만 실행합니다.

### 3.1 `trialing` → `expired`

**의미**: 체험 종료 후 무료 플랜으로 떨어진 것과 동일하게 맞춤([`state-playbook`](./spokedu-subscription-state-playbook.md) §3).

```sql
update spokedu_pro_subscriptions
set status = 'expired',
    plan = 'free',
    max_classes = 1,
    updated_at = now()
where center_id = '<UUID>'
  and status = 'trialing';
```

**앱에서 확인** (`/spokedu-pro`):

- [`SettingsView`](../app/(pro)/spokedu-pro/views/SettingsView.tsx): 플랜 카드·배지가 Free/만료 흐름과 맞는지.
- 한도·기능 제한이 Free 정책과 맞는지(반 개수 등).

### 3.2 `active` → `past_due` (제한 UX 확인)

**의미**: 결제 지연으로 취급; 앱에서 일부 기능이 막히는지 확인합니다.

```sql
update spokedu_pro_subscriptions
set status = 'past_due',
    updated_at = now()
where center_id = '<UUID>'
  and status = 'active';
```

**앱에서 확인**:

- [`SpokeduProClient`](../app/(pro)/spokedu-pro/SpokeduProClient.tsx): 상단 **결제 지연** 배너 노출.
- [`SettingsView`](../app/(pro)/spokedu-pro/views/SettingsView.tsx): 안내·결제 관련 CTA.
- AI 리포트·반 생성 등 **유료 기능 제한**이 켜졌는지(제품 정책에 맞게 샘플 1~2개만 확인).

### 3.3 `past_due` → `active` (복구)

**수동 복구(리허설)**:

```sql
update spokedu_pro_subscriptions
set status = 'active',
    updated_at = now()
where center_id = '<UUID>'
  and status = 'past_due';
```

**Stripe 연동 시**: 고객이 카드를 고치거나 인보이스가 정상 결제되면 `invoice.paid` 웹훅이 오며, 코드가 구독을 다시 조회해 `status`·`current_period_end` 등을 맞춥니다. 그래도 화면이 이상하면 위 `SELECT`로 DB 한 행을 먼저 봅니다.

**앱에서 확인**: 배너 해제, 동일 기능이 다시 허용되는지.

---

## 4. Stripe 쪽 점검 (과금 켠 뒤)

1. Dashboard → Webhooks → 엔드포인트 `…/api/webhooks/stripe`에 최소한 다음이 포함되는지:  
   `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`, **`invoice.paid`** ([`stripe-env`](./spokedu-subscription-stripe-env.md)).
2. **Billing Portal**: 포털 활성화 + 앱의 `POST /api/spokedu-pro/billing-portal`로 진입. 복귀 URL에 `?view=settings`가 붙으면 설정 탭으로 돌아옵니다.
3. 멱등·로그: [`20260419120000`](../supabase/migrations/20260419120000_spokedu_stripe_webhook_idempotency.sql), [`20260421090000`](../supabase/migrations/20260421090000_spokedu_stripe_webhook_hardening.sql) — 운영 주기 점검은 [`prod-db-audit`](./spokedu-subscription-prod-db-audit.md)와 함께 보면 됩니다.

---

## 5. 공지·문의 (배포 증적)

- 본문 템플릿: [`spokedu-subscription-ops-templates.md`](./spokedu-subscription-ops-templates.md) §2  
- 슬랙용 짧은 버전: [`spokedu-subscription-ops-templates-slack.md`](./spokedu-subscription-ops-templates-slack.md)  
배포가 끝나면 **채널 링크 또는 스크린샷 파일명**을 §6 표에 적습니다.

---

## 6. 관리자 UI (선택 경로)

`/admin/spokedu-pro/subscriptions`에서 플랜·상태·기간을 바꿀 수 있으면, **SQL과 동일하게** 변경 전후 스크린샷·티켓을 남깁니다. DB 직접 수정과 **섞어 쓰지 말고** 한 센터당 한 경로로 통일하는 것이 추적에 유리합니다.

---

## 7. §6 증적 표에 무엇을 적을지 (가이드)

[`section-4-execution`](./spokedu-subscription-section-4-execution.md) §6 본표 4행은 **§4 본문 `[x]` 직전**에 채웁니다. 각 행에 넣을 수 있는 것 예시:

| §4 본문 한 줄 | 증적에 적기 좋은 것 |
|---------------|---------------------|
| 플레이북 직접 실행 | 플레이북 §6 “소리 내어 읽기”를 했다는 **슬랙 스레드 URL** 또는 티켓 코멘트 링크 |
| 수동 전환 테스트 완료 | 스테이징 `center_id` + 위 §3 실행한 **SQL 실행 화면** 또는 `SELECT` 결과 캡처 파일명 |
| 템플릿 운영 채널 배포 | `#고객지원` 등 **채널 permalink** 또는 노션 페이지 |
| 링크·문구·요금표 100% 일치 | 노션 요금표·계약 PDF 버전 + `npm run verify:spokedu-plan-copy` 로그(날짜) + “대조 완료” 한 줄이 든 티켓 |

§6.1 “개발·CI 선행” 표는 **운영 본표와 별개**입니다. CI만으로 §4 네 줄을 `[x]`로 바꾸지 않습니다([`section-4-execution`](./spokedu-subscription-section-4-execution.md) §6.2·[`commercialization-checklist`](./spokedu-subscription-commercialization-checklist.md) §4 안내와 동일 취지).

---

## 8. 한 번에 열 링크 (번들)

전체 순서·매핑 표: [`spokedu-subscription-go-nogo-bundle.md`](./spokedu-subscription-go-nogo-bundle.md)  
서명란·§6 표: [`spokedu-subscription-section-4-execution.md`](./spokedu-subscription-section-4-execution.md)

---

마지막 업데이트: 2026-04-22
