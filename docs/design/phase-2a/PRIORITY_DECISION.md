# Phase 2-A — PRIORITY_DECISION

## 분류 요약

| ID | 문제 | 등급 |
|----|------|------|
| RC-1 Prod 카탈로그 목록 없음 | **P0** (기능·전환) |
| RC-2 Private 초기 0~3s thin shell | **P1** (신뢰·이탈) |
| RC-3 Contact «로딩» 문구 | **P2** (오해 소지; settled 후 정상) |
| RC-4 private#apply vs /contact | **P2** (정합성) |
| 문의 API E2E | **NOT_VERIFIED** (별도 승인) |
| B5 Hero 미배포 | **범위 외** (Phase 1) |

---

## 가장 먼저 다룰 1~3개

### 1. Production `SPOMOVE_NOTION_CATALOG_URL` 설정 (P0)

- **고객 영향:** 기관·지도자가 **프로그램 카탈로그를 볼 수 없음**.
- **예상 범위:** 호스팅 env + 재시작/재배포; **코드 변경 불필요** (현행 `catalog/page.tsx` 유지).
- **변경 위험:** URL 오설정, iframe CSP/X-Frame.
- **검증:** Prod J05 **PASS**, iframe, `catalog-production-*.png`에 목록 UI.

### 2. Private 첫 화면 meaningful content 지연 (P1)

- **고객 영향:** 1~3초 «빈 페이지» 인상; **10s 장애는 아님**.
- **예상 범위:** `private/page.tsx`, `private-landing.tsx`, Suspense fallback, 선택적 RSC.
- **변경 위험:** 마케팅 레이아웃·애니메이션 회귀.
- **검증:** 0s 캡처에 H1+lead; `PRIVATE_CONTENT_VISIBLE` @ 0s.

### 3. 문의 접수 E2E 검증 계획 (P1 ops / NOT_VERIFIED)

- **고객 영향:** 클라이언트는 정상; **서버 저장 미확인**.
- **예상 범위:** 스테이징 + `/api/consult` (또는 `inquiry-submit` 대상) 모의·승인된 테스트 데이터.
- **변경 위험:** 테스트 데이터 오염 — 격리 필수.
- **검증:** 승인된 1건 제출 → 200 + 내부 확인.

---

## 보류 (P2/P3)

- Contact 스크롤·유형 카드 discoverability
- J03 `/contact` 통일 여부 (product decision)
- Hero B5 배포 (Phase 1 사용자 승인 후)
