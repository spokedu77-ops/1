# B2_DESIGN_EXCEPTIONS

Stitch = design SSOT. Below: **conflicts when applying real SPOKEDU content** — no design change applied.

## DC-001 — Stitch placeholder brand vs SPOKEDU LIVE

- **Stitch structure:** 6 HTML; hero/nav copy SPOMOVE 에듀테크 톤
- **Problem:** Stage7 LIVE archive SPOKEDU 체육교육 카피와 Stitch 디자인 카피 불일치 → DIRECT_MAPPING 0
- **Preserve alternative:** Stitch layout/tokens 유지; slot별 SPOKEDU approved copy 치환
- **Impact:** 6 routes; all text nodes
- **User approval:** YES — DEC-PACK-03

## DC-002 — 허위/미검증 성과 수치 (watermark, % 향상)

- **Stitch structure:** font-watermark-number, badge metrics in HTML
- **Problem:** Stage7 G07/G08 — 과학·실적 단정 금지; Stitch UI는 %·향상 표시
- **Preserve alternative:** 동일 visual slot; verified metric only or neutral label
- **Impact:** home, education, spomove system pages
- **User approval:** YES — DEC-PACK-02 + DEC-PACK-05

## DC-003 — 문의/CTA vs LIVE forms

- **Stitch structure:** CTA links data-path=inquiry; limited form elements
- **Problem:** G01–G04 contact/consent; Stitch lacks full /contact form contract
- **Preserve alternative:** Preserve CTA regions; wire to existing contact types without layout drift
- **Impact:** /contact, header CTA all pages
- **User approval:** YES — DEC-PACK-06

## DC-004 — Global nav IA mismatch

- **Stitch structure:** Stitch nav labels (홈, 교육 프로그램, …)
- **Problem:** site.ts / SSOT header lists differ (FACT-NAV conflicts)
- **Preserve alternative:** Stitch header shell; approved label set from PO
- **Impact:** global chrome
- **User approval:** YES — DEC-PACK-01

## DC-005 — External placeholder images (Google CDN)

- **Stitch structure:** lh3.googleusercontent.com hero/showcase imgs
- **Problem:** Gate B rights; MEDIA matrix requires approved assets
- **Preserve alternative:** Same aspect frames; /public/images/spokedu/* only
- **Impact:** all 6 PNG + HTML imgs
- **User approval:** YES — DEC-PACK-05

## DC-006 — Record/card counts vs catalog SSOT

- **Stitch structure:** Multi-card grids in field_records / home
- **Problem:** FIELD_RECORD_CATALOG fixed slugs; Stitch may show more cards
- **Preserve alternative:** Grid structure locked; card count follows catalog partition
- **Impact:** /records, /
- **User approval:** YES — DEC-PACK-05


All fidelity rows: `design_lock_status=DESIGN_LOCKED`, `exception_status=DESIGN_EXCEPTION_PENDING_APPROVAL`.
