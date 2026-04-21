# MOVE 리포트 바이럴·운영 데이터 요약

공개 MOVE 리포트 플로우에서 **전화·실명 등 PII 없이** 쌓이는 데이터와, 바이럴 성과를 볼 때 유용한 지표 방향을 정리합니다.

## 현재 수집되는 데이터

### `move_report_events` (퍼널 이벤트)

- **스키마**: `event_name`, `session_id`, `share_key`(공유 링크 진입 시), `meta`(jsonb), `created_at`
- **허용 이벤트** (`POST /api/move-report/events`):
  - `intro_started` — 인트로 진입
  - `survey_completed` — 설문 완료
  - `result_viewed` — 결과 화면 조회
  - `lead_saved` — (레거시/확장용) 리드 저장 이벤트명이 코드에 남아 있을 수 있음
  - `share_clicked` — 공유(복사/공유 UI) 클릭
  - `shared_entry_opened` — 공유 URL(`?d=` 등)으로 유입
  - `shared_entry_completed` — 공유 유입 후 플로우 완료
- **활용**: 단계별 전환율, 공유 맥락별(`share_key`) 행동, `meta`에 클라이언트가 넣은 부가 정보(정책 범위 내)
- **attribution**: 최초 진입 시 URL의 UTM·`ref`·`gclid`/`fbclid`와 `document.referrer` 호스트를 **탭 sessionStorage에 고정**한 뒤, 각 이벤트의 `meta.attribution`에 포함. 공유 링크 생성 시 동일 파라미터를 쿼리에 **재부착**해 유입 경로를 이어 갈 수 있음(`referrer_host`는 링크에는 미포함).

### `move_report_ip_limits` (IP별 완료 횟수)

- 무료 플로우 **완료 횟수**를 IP 단위로 집계·제한할 때 사용
- **활용**: 남용 방지, 지역/트래픽 스파이크 모니터링(원시 IP는 운영·보안 목적, 마케팹 세그먼트용으로는 제한적)

### `move_report_submissions` (익명 설문 스냅샷)

- **주요 컬럼**: `session_id`, `age_group`(preschool / elementary), `profile_key`, `profile_title`, `survey_responses`(12문항 축 문자 배열 JSON), `attribution`(jsonb, UTM·ref·referrer_host 등), `source`, `created_at`
- 서버에서 `compute`로 **프로필이 응답과 일치하는지 검증한 뒤** 저장
- **활용**: 연령대별 프로필 분포, 축(8축 응답) 패턴 집계, 시계열 트렌드

## 수집되지 않는 데이터 (공개 플로우 기준)

- **전화번호**, **실명**, **주소** 등 직접 PII
- **아이 이름**: 설문 UI 표시용으로만 쓰이며, 이 테이블에는 저장하지 않음(설계상 익명 스냅샷)

## 바이럴 성과 해석 포인트

1. **공유 클릭률**  
   `share_clicked` / `result_viewed`(또는 `survey_completed`) 등 분모를 팀 기준으로 고정해 추이를 비교합니다.

2. **공유 유입 → 재완료**  
   `shared_entry_opened` → `shared_entry_completed`(또는 `survey_completed`) 전환으로 **링크 품질**을 봅니다. `share_key`로 캠페인·메시지별 비교가 가능합니다.

3. **연령대·프로필 분포**  
   `move_report_submissions`의 `age_group`, `profile_key`로 **어떤 유형이 많이 나오는지**·기간별 변화를 봅니다. (바이럴로 유입된 세션은 `move_report_events`의 `shared_*`와 `session_id`를 조인해 교차 분석할 수 있음)

4. **주의**  
   세션·IP는 **사람 1명과 1:1이 아닐** 수 있으므로, 절대 도달 인원이 아니라 **행동 비율·분포** 중심으로 해석하는 것이 안전합니다.
