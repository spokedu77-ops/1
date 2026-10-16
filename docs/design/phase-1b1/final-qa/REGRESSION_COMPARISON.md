# 모바일 CTA 회귀 비교 (390×844)

computed style 기준. 로컬 Production build + Playwright (`run-final-qa.mjs`).

## 1. Phase 1-B1 이전 (Git `9309e5a6` 기준)

`@media (max-width: 767px)`:

```css
.actions {
  flex-direction: column;
  align-items: stretch;
}

.btn {
  width: 100%;
}
```

Hero도 `.actions`를 사용 → 모바일에서 세로·전폭 CTA.

## 2. Phase 1-B1 최초 구현 (회귀)

위 `.actions` / `.btn` 블록 제거, `.heroActions`만 가로 2열 유지.

| 영역 | actions flex-direction | .btn width (측정) |
|------|------------------------|-------------------|
| Hero | row (의도됨) | ~50% (flex 1) |
| SPOMOVE | **row** (회귀) | **auto** |
| LAB | **row** | **auto** |
| FinalCTA | **row** | **auto** |

증거: 최초 `run-qa-checks.mjs` 실행(구 build 서버) — `actionsFlexDirection: "row"`, `btnWidth: "auto"`.

## 3. 이번 보완 후 (CSS 복구)

`home-web.module.css`에 공통 규칙 복구 + `.heroActions` 예외 유지.

| 영역 | actions flex-direction | align-items | .btn width | href |
|------|------------------------|-------------|------------|------|
| Hero | **row** | stretch | 169px / 169px (flex 1 1 0) | `/education`, `/spokedu-lab` |
| SPOMOVE | **column** | stretch | **350px** (뷰포트−거터) | `/spomove` |
| LAB | **column** | stretch | **350px** | `/spokedu-lab` |
| FinalCTA | **column** | stretch | **350px** | `/contact` |

시각 증거:

- `final-qa/captures/spomove-mobile-390.png` — SPOMOVE CTA 전폭
- `final-qa/captures/lab-mobile-390.png` — LAB CTA 전폭
- `final-qa/captures/finalcta-mobile-390.png` — 문의하기 전폭
- `final-qa/captures/home-390.png` — Hero CTA 가로 2열

## Gateway 캡처

| 버전 | gateway-1440 | gateway-390 |
|------|--------------|-------------|
| B1 최초 | ~179px (제목만) | ~169px |
| 보완 후 | 섹션 전체 (~588px), 카드 3개 | 섹션 전체 (~900px), 카드 3개 |

방식: `section[aria-labelledby="home-gateway-heading"]` → `locator.screenshot()`.
