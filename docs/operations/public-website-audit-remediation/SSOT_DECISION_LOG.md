# SSOT decision log

| 이전 규칙 | 수정 규칙 | 이유 |
|-----------|-----------|------|
| Header·여정: 「구독시스템」+ `/subscription` → MASTER | **SPOKEDU LAB** + `/spokedu-lab` 정본, `/subscription` 레거시 redirect | 실제 배포·next.config와 고객 브랜드 일치 |
| MASTER를 구독 축 설명에 병기 | MASTER = 내부 호환 코드명 only | 고객-facing MASTER 노출 감사 지적 |
| `/info/curriculum` 레거시 랜딩 유지 | **308** `/education?program=spomove#contact` (query 보존) | 상담 버튼 무기능·광고 URL 손실 |
| `/info/private` 가짜 카운터 랜딩 | `/private#apply` redirect | 허위 실적 노출 차단 |
| Gym leads → Google Script URL in browser | **`/api/info/gym/leads` → consultations**, Sheets server optional | CRM 단일 원천·키 노출 방지 |
| `brandProfile.mailOrderStatus: 신고 완료` (번호 없음) | **`mailOrderReportNumber: null` + FACT_REQUIRED** | 임의 신고번호 기입 금지 |
| 사업장 주소 단일 필드 | **7층 1호(사업자) vs 7층 2호(체육관 방문)** 분리 명시 | 등록증·현장 주소 역할 상이 |
| subscription-v17 HTML port on curriculum | **제거**; LAB = `CommercialLanding` | 정본 LAB와 중복·postimg 레거시 |
