# CLAUDE 작업 규칙

## 절대 규칙

1. **`git push` 하지 말 것.**
   - 커밋은 자동 훅이 처리하거나 사용자가 직접 push한다.
   - `git push`, `git push -u origin`, force push 등 push 명령 일체 금지.

2. **작업 후 반드시 `DEV_NOTES.md`를 업데이트할 것.**
   - 수정한 파일, 해결한 문제, 남은 문제를 세션 단위로 기록한다.
   - 작업 완료 커밋 전에 DEV_NOTES.md 업데이트를 포함한다.

---

## 작업 기준

- `app/spokedu-master`만 수정한다.
- TypeScript 오류 없이 유지: `npx tsc --noEmit --pretty false` (TS5101 경고는 무시)
- 브랜치: `claude/review-and-continue-1YvIR`
