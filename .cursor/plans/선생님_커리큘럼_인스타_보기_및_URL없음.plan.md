# 선생님 커리큘럼 인스타 보기 + URL 없음 처리

## 목표

1. **인스타그램 타입**일 때도 상세 모달에서 "인스타그램에서 보기" 버튼이 보이도록 admin과 동일한 분기로 수정.
2. **URL이 없는 항목**은 카드에서 재생 버튼을 숨기고, 모달에서는 "동영상 없음" 문구 표시.

---

## 1. 상세 모달: 인스타 보기 + URL 없음

**파일:** [app/teacher/curriculum/page.tsx](app/teacher/curriculum/page.tsx)

**위치:** 상세 모달 내부 `aspect-video` 블록 (442~458라인).

- **현재:** `type === 'youtube'`일 때만 상단 영역 렌더 → 인스타 타입이면 빈 칸.
- **수정:**
  - 유튜브이고 `getYouTubeId(selectedItem.url)` 있음 → iframe.
  - 그 외 **URL이 있으면** → 인스타 블록 + "인스타그램에서 보기" 링크 (`rel="noopener noreferrer"` 포함).
  - **URL이 없으면** → "동영상 없음" 문구만 표시 (재생/보기 버튼 없음).

조건 예시:

- `hasPlayableUrl(selectedItem)` = `!!(selectedItem.url?.trim())` 또는 유튜브 ID 추출 가능.
- 모달 상단 분기:  
  - YouTube ID 있음 → iframe  
  - URL 있음 (인스타 등) → 인스타 블록 + 링크  
  - URL 없음 → "동영상 없음" 텍스트

---

## 2. 카드 목록: URL 없으면 재생 버튼 숨김

**같은 파일:** [app/teacher/curriculum/page.tsx](app/teacher/curriculum/page.tsx)

- **개인 수업 카드** (287~308라인): `item`에 대해 `item.url`이 없거나 비어 있으면 재생 오버레이(Play 아이콘)를 렌더하지 않음.
- **센터 수업 카드** (393~416라인): 동일하게 `item.url` 없으면 재생 오버레이 숨김.

헬퍼 예: `hasPlayableUrl(item: { url?: string }) => Boolean(item?.url?.trim())`  
카드에서 재생 오버레이를 `{hasPlayableUrl(item) && ( ... Play ... )}` 로 감싸면 됨.

---

## 3. 적용 위치 요약

| 위치 | 내용 |
|------|------|
| 모달 상단 (442~458) | admin과 동일 분기 + URL 없을 때 "동영상 없음" |
| 개인 수업 카드 (304~308) | `hasPlayableUrl(item)`일 때만 Play 오버레이 |
| 센터 수업 카드 (412~416) | `hasPlayableUrl(item)`일 때만 Play 오버레이 |

(선택) admin 커리큘럼 페이지에서도 URL 없는 항목에 대해 동일하게 "동영상 없음" 또는 재생 버튼 숨김을 적용할지 여부는 필요 시 동일 패턴으로 확장 가능.
