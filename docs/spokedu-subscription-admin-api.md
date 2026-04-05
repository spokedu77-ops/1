# 스포키듀 구독 Admin API 가이드

구독 상태를 운영자가 수동으로 조회/변경하고, 변경 이력을 모니터링하기 위한 API입니다.

---

## 1) 인증

- 모든 엔드포인트는 관리자 인증이 필요합니다.
- 서버에서 `requireAdmin()` + `getServiceSupabase()` 패턴을 사용합니다.

---

## 2) 구독 목록 조회

`GET /api/admin/spokedu-pro/subscriptions`

### Query
- `status`: `trialing | active | past_due | canceled | expired`
- `q`: center_id 부분 검색
- `limit`: 기본 100, 최대 300

### Response
- `centerId`, `centerName`, `ownerId`
- `plan`, `status`
- `trialEnd`, `currentPeriodEnd`
- `stripeCustomerId`, `stripeSubscriptionId`
- `updatedAt`

---

## 3) 구독 상태 변경

`PATCH /api/admin/spokedu-pro/subscriptions/{centerId}`

### Body
```json
{
  "status": "past_due",
  "plan": "basic",
  "reason": "결제 확인 지연",
  "trialEnd": "2026-04-20T00:00:00.000Z",
  "currentPeriodEnd": "2026-05-01T00:00:00.000Z",
  "maxClasses": 3
}
```

### 규칙
- `reason` 필수
- `status`는 허용 상태만 가능
- `status=expired`이고 `plan` 미지정 시 자동으로 `plan=free`, `max_classes=1` 적용
- 변경 성공 시 `admin_productivity_events`에 `SUBSCRIPTION_STATUS_UPDATED` 로그를 남김

---

## 4) 상태 변경 로그 조회

`GET /api/admin/spokedu-pro/subscription-events?limit=100`

- `admin_productivity_events`에서 `SUBSCRIPTION_STATUS_UPDATED` 이벤트만 최신순 반환

---

마지막 업데이트: 2026-04-03
