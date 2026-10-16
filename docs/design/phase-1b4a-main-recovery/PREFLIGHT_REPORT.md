# PREFLIGHT — B4A Main Recovery

**상태:** Preflight **통과** (main worktree 기준) · Playwright QA **미완** (별도 보고)

## 1-1. Git

| 항목 | 값 |
|------|-----|
| 저장소 | `spokedu77-ops/1` |
| **로컬 기본 경로** (`GitHub/1`) | 브랜치 **`toss-review`** — `main` checkout **불가** (`main`이 worktree 점유) |
| **main 작업 경로** | `C:\Users\joker\Documents\GitHub\1\.codex-worktrees\payment-ux` |
| main HEAD | `76a71fd0094a47f0f1106ff3c6a79c5415bf5e6b` |
| main worktree 상태 (Hero CSS) | `M home-web.module.css` only · **`home-hero.tsx` 무수정** |

사용자 요청에 따라 **main worktree에서 작업** (자동 `git checkout main`은 기본 경로에서 실패 → worktree 사용).

## 1-2. B1·B2B·B3B (main worktree)

| 영역 | 확인 |
|------|------|
| Hero DOM | ✅ `heroText` → `heroCopy` + `heroActions`, `heroH1`, `heroEnglish` |
| Gateway | ✅ 3-card (`gatewayCards`) |
| Method / Records | ✅ B2B 구조 존재 |
| SPOMOVE / LAB | ✅ B3B 카피·`labLibraryStat` |

## 1-3. CSS 충돌

- 시작 SHA (main): `6298f815…` (Hero 블록)
- **충돌 없음** — Hero 태블릿 블록만 추가

## 1-4. B4A 중복

- main HEAD에 768–1023 **2열 + heroText flex** 없음 → **구현 필요** (완료)

## 작업 시작

**가능** — main worktree, CSS-only.
