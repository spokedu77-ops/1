# 06 — 보안·개인정보

## 서버 (정적·E2E)

- 필수 필드: E06 PASS (400)
- 이메일 형식: E07 PASS (dispatch)
- type/lead_mode/envelope: 잘못된 CTA 조합 서버 400 (RC-1 수정 전 재현됨)
- 공개 lead API: Service Role 서버 전용; `requireAdmin` on consult admin routes (E14)
- SQL/HTML: Supabase parameterized insert; content는 텍스트 저장 (관리자 UI escape는 React 기본)

## 데이터 접근

- 비관리자 consult API: 401 PASS
- 타인 문의 조회 공개 API 없음 (id 기반 public read 없음)

## 고객 UX·초안

- 실패 시 localStorage draft (`inquiry-draft.ts`) — 동일 브라우저 프로필 한정
- 실패 문구에 임시 보관 **명시** (contact-page-data)
- 성공 시 draft 삭제 (inquiry-submit.test)

## 개인정보 안내

- Contact UI: 처리방침/개인정보 힌트 존재 (Playwright `hasPrivacyHint`)
- 보유 기간 등 법무 문구: **배포 전 정책 SSOT 확인** (임의 문구 추가 없음)

## E20

- E2E 로그/증거: 합성 `@spokedu.test` 전화·이름만 사용
- 터미널 PII 덤프: **NOT_VERIFIED** (수동 로그 감사 미실행)
