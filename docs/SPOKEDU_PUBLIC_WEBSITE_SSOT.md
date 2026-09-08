# SPOKEDU Public Website SSOT

STATUS: SSOT
SCOPE: SPOKEDU public website
APPLIES TO: Home / Education / Private / SPOMOVE / Subscription / Records / Record Detail / Contact / About / SPOMAT / Partners

Agent pointer: `.cursor/rules/spokedu-public-website.mdc`

페이지를 개별적으로 예쁘게 만드는 것이 아니라, SPOKEDU라는 하나의 브랜드와 하나의 사용자 여정을 만든다.

---

## 01. Brand truth

SPOKEDU는 직접 운영하는 체육교육을 기반으로, 실제 수업에서 사용하는 콘텐츠와 지도자용 수업 시스템을 만드는 체육교육 브랜드다.

Customer-facing definition:

> 현장에서 수업하고, 그 수업에 필요한 콘텐츠와 시스템을 만듭니다.

사용자가 사이트를 보고 최종적으로 기억해야 하는 것:

> SPOKEDU는 직접 체육수업을 운영하는 곳이고, 자체 콘텐츠 SPOMOVE와 지도자용 구독시스템까지 갖고 있다.

FAIL: 체육도 하고, SPOMOVE도 하고, SPOMAT도 팔고, 구독도 하고, 행사도 하는 이것저것 하는 회사.

---

## 02. Business hierarchy

```
SPOKEDU
├─ CORE BUSINESS 01  체육교육     → SPOKEDU가 직접 수업을 운영
├─ CORE BUSINESS 02  구독시스템   → 지도자가 콘텐츠와 수업도구를 직접 사용
├─ SIGNATURE CONTENT  SPOMOVE    → 체육교육과 구독시스템 양쪽에서 활용
└─ EXECUTION TOOL     SPOMAT     → SPOMOVE 실행 도구
```

체육교육 / 구독시스템 = 두 개의 핵심 구매축.
SPOMOVE = 제3의 사업축이 아니라 자체 콘텐츠/IP.
SPOMAT = 독립 핵심 사업이 아니라 실행 도구.

---

## 03. Public vs MASTER

PUBLIC owns: 이해 → 신뢰 → 비교 → 판단 → 선택.
MASTER owns: 로그인 → 가입 → 결제 → 권한 → 실제 콘텐츠 사용 → 수업 운영 → 기록 → 관리.

`/subscription` → MASTER.

Public에 `/subscription` → `/product` → `/purchase` funnel을 만들지 않는다.
Public은 판매를 설득하고, MASTER는 실제 거래와 실행을 담당한다.

---

## 04. Public user journey

```
                         HOME
                           │
             ┌─────────────┴─────────────┐
             │                           │
          체육교육                    구독시스템
             │                           │
             ↓                           ↓
       /education                  /subscription
             │                           │
             ↓                           ↓
기관수업 판단·상담                    MASTER
             │                    가입·결제·사용
             ↓
 /contact?type=dispatch
```

SPOMOVE: 기관수업에서 활용 → `/education`. 지도자가 활용 → `/subscription`.
RECORDS → record detail → 사례 맥락에 맞는 next action.
개인·소그룹: Home / Education secondary → `/private` → `/contact?type=private`.

---

## 05. Global navigation

PRIMARY HEADER: 체육교육 · 구독시스템 · SPOMOVE · 운영 사례 · `[상담하기]`

Header에 올리지 않는 것: About, SPOMAT, Partners, 개인·소그룹, 기타 협업 안내. Footer 또는 contextual link.

순서 의미: 핵심 사업 1 → 핵심 사업 2 → 고유 콘텐츠 → 증거.

---

## 06. Page job rule

Every page answers one primary question.

INPUT / QUESTION / EVIDENCE / OUTPUT / HANDOFF를 페이지 작업 전에 정의한다.
앞 페이지에서 이미 설명한 내용을 다음 페이지에서 다시 설명하지 않는다.

---

## 07. Page contracts

| Page | Question | Handoff / role |
|---|---|---|
| Home | SPOKEDU는 무엇을 하는 브랜드인가? | Brand orchestration. 체육수업 또는 구독시스템. |
| `/education` | 우리 기관에서 체육수업을 맡길 수 있는가? | Structure = legacy `/info/dispatch`. Visual = Home. Program lineup = one SSOT; card + detail modal is progressive disclosure (not a third product catalog). → `/contact?type=dispatch` |
| `/private` | 개인·소그룹에서는 어떤 방식으로 수업하는가? | Human / calm / personal → `/contact?type=private` |
| `/spomove` | SPOMOVE는 무엇이며 무엇이 다른가? | Content first. Then 기관 → `/education`, 지도자 → `/subscription` |
| `/subscription` | 지도자가 실제 수업에서 왜 이 시스템을 사용하는가? | Product UI. 찾기→준비→진행→기록. Handoff MASTER. No public purchase page. |
| `/records` | 실제 어디에서 무엇을 운영했는가? | Editorial evidence archive. |
| `/records/[slug]` | 이 프로젝트에서는 실제로 무엇을 했는가? | `/education` / `/subscription` / `/contact` by type |
| `/contact` | 하려던 행동을 최소 마찰로 완료하는가? | Keep `?type=` intent. |
| `/about` | 브랜드 신뢰 심화 | Header primary 아님 |
| `/spomat` | SPOMOVE execution tool | 독립 사업축 아님 |
| `/partners` | Secondary collaboration | Header primary 아님 |

---

## 08. SSOT rule

One concept = one authority.

- 기관 체육교육 canonical = `/education`. Legacy URLs redirect here.
- 가격 = authoritative Product Contract only.
- SPOMOVE definition = one public definition contract.
- CTA destination = shared route contract.
- Record = record schema.
- 문의 = Contact intent contract.

같은 정보를 페이지마다 따로 작성해 조금씩 다르게 만들지 않는다.

---

## 09. Evidence before claim

COPY는 evidence를 해석한다. COPY가 evidence를 대신하지 않는다.

체육교육: 실제 아이 + 지도자 + 기관 현장.
SPOMOVE: 실제 화면 + 실제 움직임.
구독시스템: 실제 제품 UI.
운영 사례: 실제 기관 + 대상 + 운영 형태.

---

## 10. Visual master contract

Art direction: FIELD-BUILT EDITORIAL.

같아야 하는 것: content rail, type family, hierarchy philosophy, navy / athletic blue / paper, CTA grammar, photo treatment, rule weight, spacing, interaction timing, focus.

달라야 하는 것: 페이지 목적에 맞는 composition.

Home = manifesto. Education = institutional sales. Private = human. SPOMOVE = signature content. Subscription = product. Records = documentary archive.

---

## 11. Typography

**Display:** keep-all, line-break strict, text-wrap balance.
**Body:** keep-all, line-break strict, text-wrap pretty.

단어 중간 절단 금지. 공간 부족 시 column / gap / font / breakpoint를 조정한다. 읽어야 하는 body는 footnote처럼 작거나 연하면 안 된다.

---

## 12. CTA

PRIMARY: 실제 high-intent만 (상담 / 신청 / 시작 / 가입).
EDITORIAL: label만 underline, arrow underline 없음, gap 3px. Hover arrow +2px. Home부터 모든 public page 동일.

---

## 13. Interaction

Polish: hover, focus, open/close, image response, CTA response, restrained reveal.

Do not: decorative carousel, parallax, scroll-jacking, 3D tilt, glass, cursor effects, floating decorative UI, animation spectacle.

FAST ≈ 160–180ms. STANDARD ≈ 220–280ms. REVEAL ≈ 350–420ms.
Hover = fine pointer only. `prefers-reduced-motion` 필수.

---

## 14. Content density

Home보다 child page 정보가 많아도 된다. 교육 페이지의 실무 디테일을 “깔끔하게” 삭제하지 않는다. 모든 정보를 동일 visual weight로 보여주지도 않는다.

PRIMARY STORY / SUPPORTING INFORMATION / PROOF / ACTION.

---

## 15. Legacy preservation

“새 디자인이 더 좋아 보인다”는 변경 근거가 아니다.

특히 `/education`: STRUCTURE / CONTENT DENSITY / SALES LOGIC = legacy `/info/dispatch`. TONE / TYPE / COLOR / CTA / INTERACTION = current Home. 명확한 이유 없는 구조 변경 금지.

---

## 16. Claim / trust

사용 금지: 검증되지 않은 기관 수, 수업 횟수, 재계약률, 만족도, 강사 수, 보장되지 않는 운영 속도.

효과성 causal claim (신체기능 향상, 집중력 향상, 두뇌 자극, 발달 개선, 치료 효과)은 검증 없이 사용하지 않는다.

대신: 실제 운영, 참여 모습, 수업 방식, 난이도 조정, 현장 대응, 기관 피드백.

---

## 17. Decision rule

1. PUBLIC CONTRACT와 충돌하는가? YES → 수정.
2. 현재 page job을 더 잘 수행하게 하는가? NO → 하지 않는다.
3. 실제 evidence를 더 강하게 만드는가? YES → 우선 검토.
4. 단순히 더 현대적으로 보여서인가? YES → 기본적으로 거절.
5. Home과 연결되지만 페이지 고유 역할도 유지되는가? NO → 수정.

---

## 18. QA

CODE PASS ≠ VISUAL PASS.

필수 viewport: 1440 / 1280 / 1024 / 768 / 430 / 390 / 360. Korean wrapping은 실제 브라우저 zoom 포함.

Check: word break, orphan, overflow, CTA wrap, image crop, density, hierarchy, evidence, page-to-page continuity. Parent vs current side-by-side.

---

## 19. Final art-direction test

로고를 가려도 “현장에서 직접 체육수업을 운영하고, 자체 움직임 콘텐츠와 지도자용 수업 시스템까지 만드는 체육교육 브랜드”로 이해되면 SPOKEDU. 아니면 CONTRACT FAILURE.

---

## 20. Implementation governance

Public 수정 중 MASTER 변경 금지. Unrelated working tree 보호.

임의 reset / restore / revert / branch / commit / push 금지.

페이지 하나씩: READ → CONTRACT CHECK → IMPLEMENT → RENDER → VISUAL QA → PO REVIEW → LOCK → NEXT PAGE.
