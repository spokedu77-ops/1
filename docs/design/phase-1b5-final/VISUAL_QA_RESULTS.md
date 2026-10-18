# Phase 1-B5 — VISUAL_QA_RESULTS

**환경:** Production build `cAsP3YNDCoxDl0jtF308L`, port `3017`  
**증거:** `FINAL_QA_EVIDENCE.json`, `captures/*`

## 필수 자동 검사

| 검사 | 결과 |
|------|------|
| H1 1개 | PASS |
| 확정 카피 | PASS (`HERO_B5_COPY`) |
| 영문 Display / Eyebrow 없음 | PASS |
| Hero 이미지 1개·디코딩 | PASS |
| CTA href `/education`, `/spokedu-lab` | PASS |
| 가로 overflow (360–1440) | PASS |
| CSS contract missing 0 | PASS |
| Hero 16:9 (390/768/1440) | PASS |
| Hero 겹침 | PASS |
| HERO_CTA_941 | PASS |
| B4D Gateway / Records 390 / LAB | PASS |
| `home-qa-audit.mjs` (port 3017) | PASS |

## 실제 디자인 QA (10문항)

Codex는 최종 승인 권한 없음 — 사용자 검토용 PASS/FAIL 기록.

| # | 질문 | 판정 | 메모 |
|---|------|------|------|
| 1 | 모바일 첫 화면이 간결한가? | **PASS** | H1+1문장+16:9+CTA, 장식·영문 제거 |
| 2 | H1이 가장 먼저 읽히는가? | **PASS** | Navy 대형 H1, 본문·CTA보다 위·강함 |
| 3 | 설명문이 불필요하게 길지 않은가? | **PASS** | 지시문 1문장만 |
| 4 | 사진에서 아이와 선생님이 자연스럽게 보이는가? | **PASS** | 16:9 전체 프레임, 상호작용 명확 |
| 5 | 지도자가 잘리지 않는가? | **PASS** | 무릎·상체·얼굴 프레임 내 |
| 6 | 해상도가 실제 화면에서 충분한가? | **PASS** | 1024 원본, 최대 표시 ~708px; 과도한 픽셀화 없음 |
| 7 | CTA가 명확한가? | **PASS** | Primary 블루 + Secondary 텍스트 링크 |
| 8 | 버튼 아래 이상한 선이 없는가? | **PASS** | Hero 내부 border 없음; Gateway 구분선과 간격 분리 |
| 9 | 390·941·1440 브랜드 일관성 | **PASS** | 동일 카피·색·Pretendard·16:9 |
| 10 | Hero → Gateway 자연스러운 연결 | **PASS** | 하단 패딩으로 섹션 전환 |

**디자인 QA 요약:** 10/10 PASS (에이전트 화면 기준). **고객·전환율 검증은 수행하지 않음.**

## 캡처 체크리스트

| 파일 | 상태 |
|------|------|
| hero-390.png … hero-1440.png | ✓ |
| home-full-390/941/1440.png | ✓ |
| hero-before-after-390/1440.png | ✓ (B4B before + B5 after) |
