# Phase 2-B FINAL — DEPLOYMENT_HANDOFF

## Release 승인 후

1. **Commit** (사용자 지시 시): `phase-2b-final-only.diff` 범위만  
2. **Push** → Vercel `spokedu` Production 빌드  
3. **`SPOMOVE_NOTION_CATALOG_URL` 불필요** — 설정 유지해도 catalog 페이지 **미사용**  
4. Production 확인:  
   - `https://spokedu.kr/spomove/catalog` — H1 «프로그램 구성», iframe **없음**  
   - `/spomove` CTA «프로그램 구성 보기»  
5. 롤백: 이전 `catalog/page.tsx` (iframe) revert — **비권장** (P0 env/CSP 이슈 재발)

## 로컬 QA 재실행

```powershell
npm run build
$env:CATALOG_QA_NO_ENV='1'; $env:CATALOG_QA_PORT='3020'
node docs/operations/phase-2b-final/run-catalog-qa.mjs
```
