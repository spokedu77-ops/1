# Admin Note — 라이트 메모장

`/admin/note`는 블록 동기화(op-log, 실시간, Notion급 문법)를 쓰지 않는다. 문서 단위 스냅샷 저장이다.

## 성공 조건

- 사용자가 쓴 글·체크는 Intent 없이 사라지거나 다른 문장으로 바뀌지 않는다.
- 블록 순서는 드래그·들여쓰기·Enter 삽입일 때만 바뀐다.
- “저장됨”은 스냅샷 PUT이 성공한 뒤에만.

코드 SSOT: `app/lib/note/noteLiteInvariants.ts`

## 저장

- 열기: `GET /api/admin/note/lite/documents/:id/snapshot`
- 저장: `PUT` 같은 URL, 허용 타입 블록 배열
- hydrate 전 PUT 금지
- 서버에 살아 있는 블록이 있는데 빈 배열이면 `EMPTY_SNAPSHOT_REJECTED` (409)
- 로드 표시 순서 = `parent_block_id` + `order_index`. 동점은 만남 순서. id로 재정렬 금지
- densify는 중복 `order_index`일 때만

## 표면

문단, 제목 1–3, 글머리/번호 목록, 체크리스트, Tab 들여쓰기, 같은 문서 드래그.

## 한계

같은 문서를 동시에 저장하면 나중에 온 스냅샷이 이긴다. 그건 앱이 혼자 글을 지우는 것과 다르다.
