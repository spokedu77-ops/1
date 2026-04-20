# §4 출시 직전 Go/No-Go — 실행 체크리스트

[`spokedu-subscription-commercialization-checklist.md`](./spokedu-subscription-commercialization-checklist.md) **§4 본문 4항목**을 닫기 위한 **현장 실행 순서**입니다.  
각 단계 완료 후 **서명·일자**를 아래 표에 적고, 상위 체크리스트 §4에 `[x]`를 표기합니다.

**역할 분리**: SQL로 무엇을 할지·Stripe와 수동이 어떻게 겹치는지·앱에서 무엇을 보면 되는지 등 **절차 본문**은 [`spokedu-subscription-ops-runbook.md`](./spokedu-subscription-ops-runbook.md)에 모아 두었습니다. **이 문서**는 체크박스·**서명란**·**§6 증적 표**에 집중합니다.

---

## 0) 선행

- [ ] [`spokedu-subscription-go-nogo-bundle.md`](./spokedu-subscription-go-nogo-bundle.md) 링크를 모두 열어 두었는가
- [ ] 스테이징 또는 운영 DB에서 작업할 경우 **백업·티켓 번호** 확보

---

## 1) 플레이북 절차 직접 실행

- [ ] [`spokedu-subscription-state-playbook.md`](./spokedu-subscription-state-playbook.md) §2 원칙(1인 실행·1인 검증·센터 단위) 확인
- [ ] §6 장애 대응 순서를 한 번 소리 내어 읽기

**서명** ______________ **일자** __________

---

## 2) 상태 전환 수동 테스트

대상 `center_id`를 정한 뒤, 아래를 **스테이징에서 먼저** 수행합니다. (SQL은 [`state-playbook`](./spokedu-subscription-state-playbook.md) §4와 동일 계열이며, `max_classes` 컬럼은 마이그레이션 `20260314000000_spokedu_pro_classes.sql` 기준입니다.)

### 2.1 `trialing` → `expired`

- [ ] 전: `select * from spokedu_pro_subscriptions where center_id = '<UUID>';`
- [ ] `trialing` → `expired` + `plan='free'` + `max_classes=1` 반영
- [ ] 앱 `/spokedu-pro` 설정·한도·배너가 기대와 일치하는지 확인

**서명** ______________ **일자** __________

### 2.2 `active` → `past_due` → `active`

- [ ] `active` → `past_due` 반영 후 앱에서 AI 리포트·반 생성 등 **제한** 확인
- [ ] `past_due` → `active` 복구 후 동일 기능 **해제** 확인

**서명** ______________ **일자** __________

---

## 3) 공지/문의 템플릿 운영 채널 배포

- [ ] [`spokedu-subscription-ops-templates.md`](./spokedu-subscription-ops-templates.md) §2 템플릿 A~E
- [ ] 슬랙용 복붙본: [`spokedu-subscription-ops-templates-slack.md`](./spokedu-subscription-ops-templates-slack.md)

**배포 채널 링크/스크린샷 증적** ________________________________

**서명** ______________ **일자** __________

---

## 4) 링크·문구·요금표 정합

로컬/CI에서:

```bash
npm run verify:spokedu-plan-copy
```

- [x] 위 스크립트가 **exit 0** (CI/로컬, `npm run verify:spokedu-plan-copy` — 최근 확인 반영 시 본 줄 날짜 갱신)
- [ ] 운영 정책(계약서·노션 요금표)과 [`planCatalog.ts`](../app/lib/spokedu-pro/planCatalog.ts) 수동 대조

**서명** ______________ **일자** __________

---

## 5) §4 본문 체크리스트에 반영

위 1~4가 모두 끝나면 [`commercialization-checklist`](./spokedu-subscription-commercialization-checklist.md) §4 네 줄을 `[x]`로 바꿉니다.

---

## 6) §4 본문 ↔ 증적 (운영 기입용)

[`commercialization-checklist`](./spokedu-subscription-commercialization-checklist.md) §4 본문 각 줄을 `[x]`로 바꾸기 **직전**에, 아래 표에 **증적 링크·티켓·일자**를 채웁니다.

**표를 어떻게 채울지**: 행마다 넣을 수 있는 증적의 종류(슬랙 permalink, SQL 캡처 파일명 등)는 [`spokedu-subscription-ops-runbook.md`](./spokedu-subscription-ops-runbook.md) §7을 참고합니다.

| §4 본문 한 줄 | 증적(스크린샷·슬랙 스레드·티켓 URL 등) | 확인 일자 |
|---------------|----------------------------------------|------------|
| 운영 담당자 1명 이상이 플레이북 절차를 직접 실행해 봄 | | |
| `trialing → expired` 등 수동 전환 테스트 완료 | | |
| 공지/문의 템플릿 운영 채널에 배포 | | |
| 링크/문구/요금표가 실제 정책과 100% 일치 | | |

### 6.1) 개발·CI 선행 증적 (§4 본문 `[x]`와 별개)

운영이 §6 위 표를 채우기 전에도, 개발 측에서 남겨 둘 수 있는 **선행 증적**입니다. 상위 [`commercialization-checklist`](./spokedu-subscription-commercialization-checklist.md) §4.3과 동일 계열입니다.

| 항목 | 증적 | 일자 |
|------|------|------|
| `npm run verify:spokedu-plan-copy` exit 0 | CI 또는 로컬 로그 | 2026-04-19 |
| 결제 지연(`past_due`) 재시도 UX | 앱: [`SpokeduProClient`](../app/(pro)/spokedu-pro/SpokeduProClient.tsx) 상단 배너 + [`SettingsView`](../app/(pro)/spokedu-pro/views/SettingsView.tsx) 안내·앵커 스크롤 | 2026-04-19 |
| Stripe 웹훅 멱등 저장소 | [`20260419120000`](../supabase/migrations/20260419120000_spokedu_stripe_webhook_idempotency.sql) + [`20260421090000`](../supabase/migrations/20260421090000_spokedu_stripe_webhook_hardening.sql) + [`route.ts`](../app/api/webhooks/stripe/route.ts) | 2026-04-19 |
| Billing Portal·결제 UX | [`billing-portal`](../app/api/spokedu-pro/billing-portal/route.ts)(`return_url` `?view=settings`) + [`SettingsView`](../app/(pro)/spokedu-pro/views/SettingsView.tsx) + [`SpokeduProClient`](../app/(pro)/spokedu-pro/SpokeduProClient.tsx) | 2026-04-22 |
| `invoice.paid` → DB 동기화 | [`route.ts`](../app/api/webhooks/stripe/route.ts) `invoice.paid` + [`stripe-env`](./spokedu-subscription-stripe-env.md) 권장 이벤트 | 2026-04-22 |

### 6.2) 운영 담당 확인 (자동으로 `[x]` 금지)

위 **§6 본표 4행**이 증적·일자로 채워지기 전에는 [`commercialization-checklist`](./spokedu-subscription-commercialization-checklist.md) **§4 본문 네 줄을 `[x]`로 바꾸지 않습니다.** 개발·CI 선행(§6.1)만으로 Go/No-Go를 대체할 수 없습니다.

---

## (참고) 릴리즈 빌드 전 자동 검증

로컬 또는 CI에서 아래를 실행해 두면 §4 절차 4단계(스크립트 exit 0)를 선행할 수 있습니다.

```bash
npm run verify:spokedu-plan-copy
```

**최근 자동 검증**: exit 0 (로컬, 2026-04-19).

> §4 **본문 네 줄**은 여전히 **운영 담당의 현장 실행·서명**이 끝난 뒤에만 `[x]`로 바꿉니다. 위 스크립트는 문구·가격 단일 소스 정합용이며 Go/No-Go 전부를 대체하지 않습니다.

마지막 업데이트: 2026-04-22
