# NAV_SEO_BASELINE — Gate A (현황만, 변경 없음)

**기록일:** 2026-10-19 · **SSOT:** `app/spokedu/data/site.ts` (`siteNav`, `siteHeaderCta`, `footerNavGroups`)

---

## Header · 모바일 메뉴

| 유형 | 라벨 | 대상 URL | 비고 |
|------|------|----------|------|
| group (button) | 체육수업 | — | dropdown |
| ↳ link | 기관·학교 수업 | `/education` | |
| ↳ link | 개인·소그룹 수업 | `/private` | |
| group (button) | 솔루션 | — | dropdown |
| ↳ link | SPOMOVE | `/spomove` | |
| ↳ link | SPOKEDU LAB | `/spokedu-lab` | |
| link | 현장 사례 | `/records` | |
| link | 소개 | `/about` | |
| CTA | 상담하기 | `/contact` | `siteHeaderCta` |

- **구현:** `app/spokedu/components/site-chrome.tsx` (`SiteHeader`).
- **Gate A:** 메뉴 항목·URL **미변경**. 최종 직접 링크형 IA·브레이크포인트 **확정하지 않음**.
- **관찰:** 데스크톱 dropdown + 모바일 패널; 좁은 폭에서 햄버거 전환. 후속 메뉴 개편 시 헤더 폭·그룹 수 재검토 필요.

## Footer (요약)

- 그룹: 체육수업, 솔루션, 회사 — `footerNavGroups` (Header보다 넓은 supporting links).
- 법적·연락처: `getPublicFooterLegalLine`, `brandContactLinks`.

## SEO · sitemap (미변경)

- **메타:** `app/spokedu/data/seo.ts`, 페이지별 `buildSpokeduMetadata`.
- **레이아웃 메타:** `spokedu-marketing-layout.tsx` (home default OG 등).
- **sitemap / robots:** `app/sitemap.ts`, `app/robots.ts` — Gate A **diff 없음**.
- **주요 인덱스 URL:** 11개 공개 경로 + records slug SSG (`ACTIVE_PAGE_MAP.md`).

## 후속 (Gate B+) 전제

- 상단 메뉴 직접 링크화·SEO 구조 개편은 **별도 승인** 후 진행.
- Gate A는 **반응형 정상 동작**만 확인; 메뉴 이름·개수 하드코딩 강화 없음.
