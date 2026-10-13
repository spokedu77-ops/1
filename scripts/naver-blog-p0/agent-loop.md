# 에이전트 자동화 루프 (반복 클릭 탐색 금지)

매 게시물마다 **동일 3단계**만 수행한다. 편집이 이미 완료된 글은 1→3만 실행.

## A. 검증만 (가족운동회 현재 상태)

1. `browser_tabs` → PostUpdateForm 탭 `viewId` 기록 (예: `209317`)
2. `browser_cdp` / `Runtime.evaluate` — `dom-verify.mjs`의 `COLLECT_SNAPSHOT_FN` (파일에서 문자열 복사, **SE API 금지**)
3. JSON을 `baselines/{logNo}-live-snapshot.json`에 저장 (선택)
4. `node scripts/naver-blog-p0/run-verify.mjs --post <post-id> <snapshot.json>`
5. `pass: true` → `ledger.json` 갱신. `pass: false` → **자동 수정 금지**, issues 보고

## B. 편집 (manifest에 edits 있고 검증 실패 시)

1. 스냅샷 A 저장 (rollback 비교용 fingerprint만 node baseline과 대조)
2. `ui-edit-procedure.md` — Browser **click/type** 만
3. 스냅샷 B → `run-verify.mjs`
4. 실패 시 해당 탭 **reload** → 스냅샷 C로 baseline 복구 여부 확인 → ledger fail

## C. 발행 (사용자 명시 승인 후)

1. `발행` 클릭
2. 공개 URL 조회 → 이미지 수·핵심 링크 spot-check
3. ledger `published: true`

## P0 잔여 6건

`manifest.json` → `posts[]`에 항목 추가:

- `id`, `logNo`, `baselineFile` (편집 완료 후 캡처)
- `edits[]`: `anchorText`, `insertPosition`, `blocks`
- `preserve`: `titleExact`, `imageComponentCount`, `hashtags`, `mustKeepTextSnippets`

게시물 간 **독립 탭/독립 ledger entry**. 한 건 실패해도 다른 logNo reload/편집하지 않음.
