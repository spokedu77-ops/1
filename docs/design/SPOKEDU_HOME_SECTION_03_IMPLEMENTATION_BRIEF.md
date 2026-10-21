# SPOKEDU Home Section 03 Implementation Brief

**Status:** `SECTION_03_PO_REVIEW_PENDING`  
**Scope:** Active public homepage Section 03 only

## Approved implementation principle

Section 03은 임시 운영진 사진으로 레이아웃을 먼저 구현하고 PO가 확정한 실제 사진으로 추후 교체한다. 이미지와 레이아웃을 분리하여 사진 교체 시 디자인 재작업이 발생하지 않도록 한다.

## Boundaries

- Keep the three-person editorial trust composition and representative hierarchy.
- Store Section 03 portrait paths and crop positions in its dedicated image configuration.
- Do not change other homepage sections, global behavior, authentication, persistence, or database code.
- Replace temporary portraits only after PO approval.
- Perform image and responsive QA locally at 390px, 1024px, and 1440px.
- Do not mark the section complete before PO visual approval.
