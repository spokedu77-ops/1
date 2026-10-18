# Phase 2-B FINAL — SOURCE_OF_TRUTH

## 사용한 공개 SSOT

| 자료 | 경로 | 용도 |
|------|------|------|
| SPOMOVE 랜딩 데이터 | `app/spokedu/data/spomove-program-page.ts` | 3분류·SEE/DECIDE/MOVE·활동 예시 6종 |
| 카탈로그 페이지 SSOT | `app/spokedu/data/spomove-public-catalog-page.ts` | `/spomove/catalog` copy·CTA |
| 활동 이미지 | `app/spokedu/data/home-media.ts` / `images.ts` | `activities.items[].mediaKey` |

## 공개한 분류·대표 과제 (코드와 동일)

1. **단순 반응** — tags: 반응 인지, 시지각 반응  
2. **선택 반응** — tags: 사이먼 효과, 플랭커  
3. **복합 반응** — tags: 스트룹 과제, 순차 반응  
4. **SEE · DECIDE · MOVE** — `flow.steps`

## 활동 예시 카드 (6)

`spomoveProgramPage.activities.items`: 색상 반응, 방향 반응, 연상 반응, 순간 반응, 모션게이트, 액션 무브 — 제목·설명·이미지 키 그대로.

## 제외·미사용

- Notion `LEGACY` / 72개 전체 목록 — **미연동**
- `SPOMOVE_NOTION_CATALOG_URL` — **페이지에서 제거** (다른 코드 참조 없음)
- «전체 72개»·개별 preset ID — **미표기**
- 검증되지 않은 Notion Site 외부 링크 — **미렌더**
