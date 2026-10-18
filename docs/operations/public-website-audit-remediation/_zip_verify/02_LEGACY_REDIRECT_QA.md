# 02 Legacy redirect QA

Implementation: server `permanentRedirect` (308) in `app/info/curriculum/page.tsx` and `app/info/private/page.tsx` using `legacy-info-redirects.ts` (reuses query merge rules aligned with `queryStringFromSearchParams`).

| Input | Expected destination |
|-------|----------------------|
| `/info/curriculum` | `/education?program=spomove#contact` |
| `/info/curriculum?utm_source=naver&program=paps` | `/education?utm_source=naver&program=paps#contact` |
| `/info/private?utm_medium=cpc` | `/private?utm_medium=cpc#apply` |
| duplicate keys / empty values | covered in `legacy-info-redirects.test.ts` |

**PASS (unit).** Full Playwright matrix not run this session; production verify after deploy with ad URLs.

Legacy client bundles under `app/info/curriculum/**` and `app/info/private/**` are no longer routed (dead code; safe to archive later).
