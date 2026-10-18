# Phase 2-B FINAL — FINAL_ARCHITECTURE

## iframe 폐기 이유

1. Production `SPOMOVE_NOTION_CATALOG_URL` 부재  
2. CSP `frame-src` Notion 미허용  
3. `app.notion.com` X-Frame-Options / CSP로 임베드 빈 화면  
4. Notion 공개 URL·LEGACY 혼재 — 운영 의존성 과다  

## 최종 구조

```
app/(spokedu-public)/spomove/catalog/page.tsx  → re-export
app/spokedu/programs/spomove/catalog/page.tsx  → metadata + <SpomovePublicCatalog />
app/spokedu/data/spomove-public-catalog-page.ts → copy/CTA SSOT (spomove-program-page 파생)
app/spokedu/components/spomove-public-catalog.tsx → Server UI (카드·CTA)
```

- **Server Component**, 페이지 전용 Tailwind (공통 `home-web.module.css` **미변경**)
- Header/Footer: 기존 public layout 유지 (`site-container`)

## CTA 정합

`spomove-program-page` / `spomove-catalog-tabs`의 «전체 프로그램 보기» → **«프로그램 구성 보기»**
