# 스포키듀 구독 — 출시 직전 Go/No-Go 실행 번들

`docs/spokedu-subscription-commercialization-checklist.md` **§4**의 사람 실행 항목을 한 번에 열 수 있도록 링크와 순서를 모았습니다.  
(실제 전환 테스트는 **스테이징 또는 운영 DB**에서 수행하고, 고객 데이터가 있는 환경에서는 반드시 백업 후 진행합니다.)

**먼저 읽기**: 절차·SQL·Stripe·증적 작성 예시는 [`spokedu-subscription-ops-runbook.md`](./spokedu-subscription-ops-runbook.md)에 모아 두었습니다. 아래 순서는 **서명·표에 링크를 남길 때**의 권장 순서입니다.

---

## 1) 실행 순서 (권장)

0. **운영 런북(본문)**: [`spokedu-subscription-ops-runbook.md`](./spokedu-subscription-ops-runbook.md)
1. **§4 현장 체크리스트(서명란 포함)**: [`spokedu-subscription-section-4-execution.md`](./spokedu-subscription-section-4-execution.md)
2. **플레이북 숙지**: [`spokedu-subscription-state-playbook.md`](./spokedu-subscription-state-playbook.md)
3. **리허설 시나리오**: [`spokedu-subscription-launch-rehearsal.md`](./spokedu-subscription-launch-rehearsal.md)
4. **DB 점검 SQL**: [`spokedu-subscription-prod-db-audit.md`](./spokedu-subscription-prod-db-audit.md)
5. **고객/운영 문구**: [`spokedu-subscription-ops-templates.md`](./spokedu-subscription-ops-templates.md) §1~§2
6. **관리자 UI**: `/admin/spokedu-pro/subscriptions` 에서 상태·플랜·기간 수정 후 이력 확인
7. **(선택) Stripe 카드 결제**: [`spokedu-subscription-stripe-env.md`](./spokedu-subscription-stripe-env.md) — `GET/POST /api/spokedu-pro/checkout`, `POST /api/webhooks/stripe`
8. **(선택) Pro UX 1.3 점검**: [`spokedu-subscription-roadmap-1-3-qa-log.md`](./spokedu-subscription-roadmap-1-3-qa-log.md) — Error Boundary·재시도·로딩 수동 확인 칸
9. **(선택) 퍼널 이벤트 이름표**: [`spokedu-subscription-funnel-events.md`](./spokedu-subscription-funnel-events.md)

---

## 2) §4 체크리스트와 매핑

| §4 항목 | 이 번들에서의 근거 |
|--------|---------------------|
| 플레이북 직접 실행 | [`ops-runbook`](./spokedu-subscription-ops-runbook.md) §0~1 + 위 순서 + [`state-playbook`](./spokedu-subscription-state-playbook.md) |
| `trialing → expired` 등 수동 전환 테스트 | [`ops-runbook`](./spokedu-subscription-ops-runbook.md) §3 + 플레이북 §4 + 관리자 구독 화면 |
| 공지/문의 템플릿 배포 | [`ops-templates`](./spokedu-subscription-ops-templates.md) — 슬랙/이메일 채널에 붙여넣기 |
| 링크·문구·요금표 일치 | 앱 `/spokedu-pro` 설정 ↔ `planCatalog.ts` ↔ `npm run verify:spokedu-plan-copy` (런북 §7 증적 예시) |

---

## 3) 완료 표기

§4의 네 항목은 **운영 담당자 서명/일자**가 있을 때 체크리스트에 `[x]`로 표기하는 것을 권장합니다.

마지막 업데이트: 2026-04-22
