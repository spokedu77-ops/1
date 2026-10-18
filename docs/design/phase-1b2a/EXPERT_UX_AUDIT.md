# Phase 1-B2A — 전문 UX 감사

방법: 휴리스틱(Nielsen 10)·IA·콘텐츠 감사·Evidence-based UX writing·모바ile 위계·WCAG 2.2 AA(자동+수동)·Playwright(시안 HTML)·고객 과업(전문가 점검, **실사용자 테스트 아님**).

대상: Production 구현(`spokedu-method.tsx`, `field-records.tsx`) + B1 로컬 홈(참고).

---

## 1. 현재 Method — 문제

| ID | 문제 | 근거 |
|----|------|------|
| M1 | **Field→Content→System 연결 불명확** | 각 step 본문 1줄, 연결 동사 없음 (`spokedu-method.tsx` STEPS) |
| M2 | **내부 분류 노출** | 01/02/03 + 영문 Field/Content/System — SSOT는 고객 언어 우선 |
| M3 | **추상 중복** | 헤드 lead + Hero/Gateway와 “현장·프로그램·시스템” 의미 겹침 (`SPOKEDU_DESIGN_UX_AUDIT.md` 홈 63점과 정합) |
| M4 | **UI 스크린 4:3 축소** | Content/System 동일 프레임 — 390px 세로 3단 시 UI 글자 가독성 낮음 (Playwright 시안 current + 모바일 휴리스틱) |
| M5 | **Field 이미지 의미** | yangcheon PAPS 사진이 “직접 수업” 일반 증거로는 OK, 단 step 간 **인과**는 설명 없음 |

## 2. 현재 Field Records — 문제

| ID | 문제 | 근거 |
|----|------|------|
| R1 | **증거 밀도 낮음** | 타일 = 프로그램명+장소만; operationType·대상·운영 맥락 없음 (`field-records.tsx`) |
| R2 | **링크 불일치** | 동작만 `/records/...`, 나머지 2건 블로그 외부 (`home-web-assets.ts`) — 과업 4 난이도 상이 |
| R3 | **교육 효과 오해 여지** | “증명됩니다” + 사진만으로 효과 입증으로 읽힐 수 있음 — SSOT는 과정·운영 사실 구분 |
| R4 | **영문 eyebrow** | “Field Records” — 고객 IA상 “현장 사례”와 병치 필요 |
| R5 | **Primary/보조 위계** | 갤러리는 시각적으로 OK; **정보** 위계는 3건 동급 |

## 3. 고객 유형별 (현재 화면)

| 유형 | 찾을 수 있는가? | 갭 |
|------|-----------------|-----|
| A 기관 담당자 | 부분 | 정규운영·에듀테크 사례는 동작 타일; **안전·난이도·운영 조건**은 홈에서 없음 (catalog onsite에만) |
| B 학부모 | 부분 | 사진으로 “아이 참여”는 전달; **교육 목표·조정**은 records 상세/블로그 필요 |
| C 지도자 | 약함 | F·C·S 관계·LAB 연결은 Method 1줄 + System UI 축소본 수준 |

## 4. 휴리스틱 (요약)

- **시스템 상태 가시성:** 링크 목적(onsite vs blog) 불명확 — 심각도 중
- **실세계 일치:** SSOT 브랜드 문장과 Method lead 중복 — 중
- **미학·최소 디자인:** 브랜드 B1과 톤 일치 — 양호
- **인지 부하:** 3열 step + 영문 라벨 — 중~높음(모바일)

## 5. 모바일

- Method: tablet에서 step 2열 그리드(`home-web.module.css` ≤1023) — UI 썸네ail still small
- Records: 1열 갤러리 — 사진 OK, **캡션 텍스트만**으로는 과업 1~2 불충분

## 6. 신뢰·증거

- 동작 SPOMOVE: catalog onsite **VERIFIED** — 홈에 미노출
- donghaeng·maedong: **PARTIAL** (블로그 의존)

## 7. 요청 범위 밖 발견 (기록만)

- 홈 Hero와 Method 헤드 **의미 중복** (B1 완료 영역 — 수정 안 함)
- `/records` 목록 일부 카드 이미지 이슈 (`SPOKEDU_DESIGN_UX_AUDIT.md`) — B2A 범위外
- Phase 1-A HTML 부재 — 브랜드 spacing 픽셀 SSOT gap

## 8. 우선순위 (설계 권고)

1. **P0** — F·C·S 연결 문장 + step별 역할 1문장(verified catalog 인용)
2. **P0** — Records 타일에 operationType·meta 1줄 (catalog)
3. **P1** — UI step: 모바일 핵심 UI crop 또는 텍스트 분리
4. **P1** — 링크 정책(onsite vs blog) 시각적 구분
5. **P2** — 영문 eyebrow 보조, 한글 주제 선행
