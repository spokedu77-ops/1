# MOVE 리포트 운영 데이터 요약

공개 MOVE 리포트에서 **운영에 쓰는 지표만** 남긴 기준입니다.

## 수집 이벤트 (`move_report_events`)

핵심 퍼널

- `move_report_started` — 테스트 시작
- `move_report_completed` — 테스트 완료
- `result_viewed` — 결과 화면
- `move_report_private_consult_clicked` — 개인수업 상담 CTA
- `move_report_private_apply_submitted` — Move Report 요약 포함 private 접수

공유

- `move_report_shared_page_viewed` / `…_start_clicked` / `…_link_copied`
- `shared_entry_completed` — 공유 유입 후 완료

기타 (유지)

- 결과 카드·링크 복사, educator beta, coach 링크 퍼널

제거된 레거시(더 이상 허용·발화하지 않음): `intro_started`, `survey_completed`, `lead_saved`, `share_clicked`, `shared_entry_opened`, native share / share_card / educator_cta 등 미발화 이름.

## Admin (`/admin/move-report`)

보는 것: 시작·완료·완료율·결과 조회 · 상담 CTA/접수 전환 · shared 재시작 · 일별 · 채널 · 유형 · educator 리드 · 제출 로그.

안 보는 것: 이중 방문/시작 카드, 가짜 shareRate, coach 내부 실험 메인 KPI, 이벤트 전체 초기화 UI, parent 전화 리드(LeadForm 미사용).

## 해석 주의

세션 ID는 사람 1명과 1:1이 아닐 수 있으므로 **비율·추이** 중심으로 봅니다.
