# Phase 1-B3B — Product Fact Check

## SPOMOVE (executable / public SSOT)

| Claim (home) | Evidence |
|--------------|----------|
| SEE · DECIDE · MOVE | `app/spokedu/data/spomove-program-page.ts` flow labels |
| 단순 / 선택 / 복합 반응 | Same file — `experience` / variation sections |
| 색·위치·방향 신호 | SPOMOVE 랜딩 copy (decide / stimulus rules) |
| 스포매트 또는 수업 공간 | SPOMAT product + class/session runtime paths in MASTER |
| 현장 사진 | Real dispatch class photo in `home-web-assets.ts` |

**Not claimed:** 모든 프로그램 동일 동작, 교육 효과 수치, ADAPT 단계, “영상 시청이 아님” 부정형.

## SPOKEDU LAB

| Claim (home) | Evidence |
|--------------|----------|
| 놀이체육 프로그램·수업 가이드 탐색 | Library UI image + `/spokedu-lab/library` |
| 수업반·일정 등 운영 도구 | `canUseClassTools`, manage/classes APIs (paid + limited free path) |
| 기능별 이용 범위는 요금제에 따라 다름 | `MASTER_PRODUCT_CATALOG`, subscription landing |

### Entitlements (read-only code)

Source: `app/spokedu-master/lib/productCatalog.ts`, `subscription.ts`

| Capability | Free (typical) | Lite (active) | Premium (active) |
|------------|--------------|---------------|------------------|
| Library (`canUseLibrary`) | false | true | true |
| Class tools (`canUseClassTools`) | **true** (non-expired free) | true | true |
| Attendance / Records | false | true | true |
| SPOMOVE in LAB (`canUseSpomove`) | false | false | true |

Home copy avoids “모든 기능 무료” and avoids naming Lite vs Premium record rules — **no PRODUCT_POLICY_CONFLICT file required**.  
Note: Free users may access **some** class tools per code; home text “활용할 수 있습니다” + 요금제 문장은 과장으로 보지 않음.

## Home copy ↔ policy

- Removed old LAB line implying universal attendance/records — **reduces** prior overclaim vs code.
- `144+` removed — **aligns** with missing public count SSOT.

## 144+ verification (§8)

| Step | Result |
|------|--------|
| Repo seed `PROGRAMS` in `data.ts` | ~9 sample rows — not production catalog |
| Published count via API/DB in agent session | **Not available** (no DB credentials / no aggregate endpoint invoked) |
| Decision | **§8-C** — remove number; use `놀이체육 프로그램 라이브러리` |

Do **not** substitute another number without operational proof.

## CTA paths

| CTA | Expected | Playwright (3004) |
|-----|----------|-------------------|
| SPOMOVE | `SPOKEDU_PATHS.spomove` | `/spomove` |
| LAB | `SPOKEDU_PATHS.subscription` | `/spokedu-lab` |
