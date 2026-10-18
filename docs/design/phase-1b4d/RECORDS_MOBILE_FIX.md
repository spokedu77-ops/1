# Records 모바일 수정 (B4D)

## Before (B4C 캡처)

- 출처: `phase-1b4c/captures/after-records-390.png` → `records-mobile-before-390.png`
- 2·3번째 카드 이미지가 얇은 띠로 보임

## 원인

1. `@media (max-width: 1023px)`의 `.tile:not(.tilePrimary) { aspect-ratio: 4/3 }`가 **카드 전체**(이미지+정보 패널)에 적용됨.
2. 모바일에서 `.tileMedia { flex: 1 1 auto; min-height: 0 }`가 남아 flex 축소로 미디어 높이 붕괴 가능.

## 수정 (Records 관련만)

- ≤1023: `.tile:not(.tilePrimary) { aspect-ratio }` **제거**
- ≤767: `.tileCard .tileMedia { flex: 0 0 auto; width: 100%; aspect-ratio: 4/3 }`, `.tileInfo { flex: 0 0 auto }`

## After 390px (`RECORDS_METRICS_AFTER.json`)

| 카드 | mediaW | mediaH | ratio | imgNatural |
|------|--------|--------|-------|------------|
| 0 | 348 | 261 | 0.75 | 2560 |
| 1 | 348 | 261 | 0.75 | 1263 |
| 2 | 348 | 261 | 0.75 | 807 |

높이/너비 ≥ 0.6 **PASS**. 4:3 ≈ 0.75.

## 1440px

1+2 갤러리 유지 (`galleryColCount: 2`, primary span).
