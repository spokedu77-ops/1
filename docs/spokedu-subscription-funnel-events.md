# 스포키듀 Pro — 퍼널 이벤트 (정의만, 로깅 후속)

분석 툴(예: PostHog, GA4, 자체 로그)을 붙일 때 **동일 이름**으로 되도록 정의합니다.  
구현은 각 이벤트별로 서버/클라이언트에 한 줄씩 추가하는 방식으로 진행합니다.

**연동**: 클라이언트 헬퍼 [`spokeduProAnalytics.ts`](../app/(pro)/spokedu-pro/utils/spokeduProAnalytics.ts) — `SpokeduProClient`(로그인·뷰·드로어), `AssistantToolsView`, `AIReportView`, `SettingsView`(Checkout·Billing Portal)에서 호출. 프로덕션에서는 PostHog(`window.posthog`) 및 선택적 `NEXT_PUBLIC_SPOKEDU_ANALYTICS_INGEST_URL`로 전송.

| 이벤트 이름 | 발생 시점 | 비고 |
|-------------|-------------|------|
| `spokedu_pro_login_success` | 스포키듀 Pro 라우트 진입 후 컨텍스트 로드 성공 | 이미 세션 있으면 생략 가능 |
| `spokedu_pro_dashboard_view` | 로드맵(대시보드) 뷰 활성화 | `viewId === 'roadmap'` |
| `spokedu_pro_week_card_open` | 대시보드·라이브러리에서 프로그램 드로어로 상세 진입 | `programId`, `source`(dashboard_drawer / library_* ) |
| `spokedu_pro_checkout_start` | 설정에서 Stripe Checkout 버튼 클릭 직전 | `plan`: basic \| pro |
| `spokedu_pro_billing_portal_open` | 설정에서 Stripe Billing Portal(결제 관리) 열기 직전 | — |
| `spokedu_pro_assistant_open` | 수업 보조 탭 활성화 | `viewId === 'tools'` |
| `spokedu_pro_assistant_picker_run` | 술래 정하기 뽑기 완료 | 출석 인원 수 메타 |
| `spokedu_pro_report_generate` | AI 리포트 생성 API 성공 | 플랜·한도 메타 |
| `spokedu_pro_settings_view` | 설정 뷰 활성화 | 업그레이드 노출 여부 |

마지막 업데이트: 2026-04-22
