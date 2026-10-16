# QA RESULTS

## Static

| Check | Result |
|-------|--------|
| TypeScript / Build (worktree) | **PASS** |
| ESLint | **NOT_RUN** (Hero CSS only) |

## Playwright / 서버

| Check | Result |
|-------|--------|
| Fresh `npm run start` (worktree, PORT 3015) | 페이지 **클라이언트 오류** (“앱을 불러오지 못했습니다”) |
| Hero locator @ `/spokedu/` | **FAIL** (timeout) |
| Before/After 캡처 (main 기준) | **NOT_VERIFIED** |
| 941 CTA `getBoundingClientRect` | **NOT_VERIFIED** |
| Keyboard Tab/Enter | **NOT_VERIFIED** |

**원인 후보:** worktree + 상위 lockfile로 `.next`/런타임 경로 혼선, 또는 3015에 구/오류 빌드 응답.

## 권장 수동 QA (사용자)

1. **GitHub Desktop**에서 `main`을 **기본 폴더 `GitHub/1`**에 checkout  
   - 필요 시 `payment-ux` worktree 제거 후 `main` 전환  
2. `toss-review`용 `home-hero.tsx` / CSS 변경 **되돌리기** (main DOM 유지)  
3. `tablet-hero-only.diff`만 `home-web.module.css`에 적용  
4. `npm run build` → `npm run start` → `/spokedu/` 에서 941px CTA 확인  

## 최종 상태 코드

**`IMPLEMENTATION_BLOCKED`** (Preflight·CSS 구현 OK, **독립 QA 미완**)

Commit / Push / Deploy: **0**
