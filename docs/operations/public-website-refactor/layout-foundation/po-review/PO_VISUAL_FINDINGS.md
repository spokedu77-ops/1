# PO Visual Findings — Gate A (코드 변경 없음)

**기준:** Git `7f32fc3a18925fe0e463471a494b45072f3ca753` · Build `xb-4Y8423oNionSYSjzd0` · 기술 QA 154/154  
**PO 판단:** 이 문서는 **시각 검토 메모**이며 자동 PASS를 PO 승인으로 대체하지 않습니다.

---

## 1. 증빙 정합성 (ZIP 교정)

- 원본 `BEFORE_AFTER/BEFORE|AFTER/` 파일은 **수정·덮어쓰기하지 않음**.
- 이전 `_review_pkg/evidence-folds/`는 와일드카드 복사로 **phase 라벨 없이** PNG가 섞였을 수 있음 → **폐기**.
- `po-review/png/BEFORE|AFTER/*-{BEFORE|AFTER}.png`는 manifest SHA와 **1:1 검증** (`PO_SHA_VERIFICATION.json`).

---

## 2. 홈 Hero — PO 중점 (fold height 900px)

| 폭 | 레이아웃 (AFTER) | CTA primary Y (AFTER) | 첫 화면(900px) CTA |
|----|------------------|------------------------|---------------------|
| 1023 | 1열 copy→visual→actions | ~842px | **fold 밖** |
| 1024 | 1열 (Gate A) | ~859px | **fold 밖** |
| 1199 | 1열, visual ~709px tall | **~982px** | **fold 밖** |
| 1200 | 2열 copy+actions \| visual | ~404px | **fold 안** |

**관찰 (1199px AFTER):**

- H1·리드는 상단에 읽을 수 있으나, **Hero 이미지가 세로로 크게** 잡혀 스크롤 없이는 CTA가 보이지 않음.
- 1023→1024: BEFORE는 2열, AFTER는 1열 — **의도된 Gate A breakpoint** (메트릭·스크린샷 참조).
- 1199→1200: 1열 → 2열 전환으로 **CTA가 fold 안으로** 이동 — 데스크톱 “임계” 구간에서 **체감 UX 차이 큼**.

**미해결 / PO 결정 필요 (코드 미변경):**

| 이슈 | 영향 폭 | 수정 대안 (승인 시) | 범위 |
|------|---------|---------------------|------|
| 1열 Hero에서 CTA가 fold 아래 | 1024–1199 | visual max-height/aspect 조정, actions를 copy 직후로 reorder, sticky CTA | `home-web.module.css` Hero 구간만 |
| 1024에서 2열→1열 급전환 | 1024–1199 | breakpoint를 1200 단일로 유지하거나 1024–1199 전용 2열 규칙 | Hero grid MQ |
| 태블릿 CTA 노출 | 941–1199 | actions를 visual 위로 (모바일 열 순서) | Hero grid areas |

---

## 3. `/spomove/catalog` @ 1199px SHA 상이

- BEFORE / AFTER fold SHA **다름** (`58b5ad8c…` vs `1a179fa5…`).
- 홈 Hero CSS만 Gate A 범위 — **카탈로그 전용 CSS 변경은 없음**.
- **판단:** Hero CSS 직접 영향 가능성 낮음. 후보: **캡처 비결정성**(이미지 로딩·lazy·타임스탬프), 또는 **서로 다른 production build** 간 미세 레이아웃.
- **PO 조치:** `PO_VISUAL_REVIEW.html` 해당 행 **나란히 비교** — 픽sel/subpx 차이면 비결정성, 구조 차이면 별도 원인 추적.

---

## 4. 비홈 390 / 1440

- `/education`, `/records`, `/spokedu-lab`: Gate A Hero CSS **비직접** — BEFORE/AFTER SHA **동일** (홈 Hero 외 변경 없음).
- PO는 **회귀 없음** 확인용으로 side-by-side만 보면 됨.

---

## 5. PO 승인 체크리스트 (수동)

- [ ] 홈 1024·1199 AFTER — 제목/리드/이미지/CTA **스크롤 전** 노출 acceptable?
- [ ] 홈 1200 AFTER — 2열·CTA fold **acceptable**?
- [ ] catalog 1199 — SHA diff가 **허용 가능한 픽sel**인지?
- [ ] LAB·Records·Education — **브랜드/정렬** acceptable?

**Verdict placeholder:** `PO_VISUAL___` (APPROVED / CONDITIONAL / REJECTED) — PO 기입
