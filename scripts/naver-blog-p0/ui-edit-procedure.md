# 네이버 블로그 P0 — UI 편집 절차 (에이전트용)

비공개 `window.SE` / `componentListStore` 호출은 **금지**. Cursor Browser 공개 도구만 사용한다.

## 전제

- 로그인 세션: 기존 Cursor Browser 탭 유지
- URL: `PostUpdateForm.naver?blogId={blogId}&Redirect=Update&logNo={logNo}` (iframe 없이 top document인 경우가 많음)
- **발행·임의 저장 버튼 클릭 금지** (사용자 승인 전)

## 1. 진입

1. `browser_tabs` → 편집 탭 선택 또는 `browser_navigate` (PostUpdateForm URL)
2. 로딩: `browser_cdp` + `Runtime.evaluate`로 `.se-text-paragraph` 개수 > 100 또는 앵커 문장 존재할 때까지 짧은 폴링 (Input.* CDP 금지)
3. **스냅샷 A**: `dom-verify.mjs`의 `COLLECT_SNAPSHOT_FN`을 `Runtime.evaluate`로 실행 → JSON 저장(ledger)

## 2. 앵커 찾기

- `browser_snapshot` (PostUpdateForm은 a11y 트리에 문단 `name`이 노출되는 경우 많음)
- 또는 `Runtime.evaluate`로 `.se-text-paragraph` 텍스트 일치/포함 검색
- 앵커 문장이 있는 **텍스트 컴포넌트**를 확인; `insertPosition`에 따라 **바로 다음/이전 형제 컴포넌트**가 삽입 위치

## 3. 블록 삽입 (UI)

권장 순서 (마지막 문단 Enter가 막힐 때):

1. 삽입 위치 컴포넌트(또는 그 사이)에 포커스 — `browser_mouse_click_xy` / `browser_click` (스크린샷 후)
2. 왼쪽 **+ 삽입 마커** 또는 툴바 **텍스트/본문** (에디터 UI에 보이는 항목)
3. `browser_type` / `browser_press_key`로 문구 입력
4. 링크 문구 선택 → 툴바 **「링크 입력 열기」** (`browser_click` ref) → URL 입력 → 확인
5. **Ctrl+A, 블록 삭제, 드래그 재배치, 발행 금지**

삽입 실패 시: 해당 logNo만 중단, **페이지 reload로 서버 원본 복구 후** ledger에 failure 기록. 다른 게시물 탭 건드리지 않음.

## 4. 검증

1. **스냅샷 B**: 동일 `COLLECT_SNAPSHOT_FN`
2. Node: `node scripts/naver-blog-p0/run-verify.mjs --post {id}` (stdin에 스냅샷 JSON) 또는 에이전트가 `verifySnapshot` 로직을 적용
3. baseline과 fingerprint 비교 — baseline에 없는 **추가** fingerprint 라인만 edits로 허용; baseline 라인 **삭제 0**
4. `preserve.imageComponentCount`, `titleExact`, hashtags, 필수 링크 href 확인

## 5. 발행 (별도 승인)

- 사용자 명시 승인 후에만 `발행` 버튼
- 발행 후 공개 URL 재조회 + 동일 링크/이미지 수 spot-check
