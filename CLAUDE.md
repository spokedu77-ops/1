# CLAUDE.md — 프로젝트 규칙

## 절대 하지 말 것

- **커밋(git commit)과 푸시(git push)를 절대 하지 않는다.**
  - 코드 수정만 진행한다.
  - 명시적으로 요청받지 않는 한 git commit, git push 명령을 실행하지 않는다.

## 작업 기준

- 작업 대상은 `app/spokedu-master`만이다.
  - `subscription-new`나 `spokedu-pro`에 직접 구현하지 않는다.
  - 참고할 장점만 MASTER에 흡수한다.

## 검증 명령 (수정 후 반드시 실행)

```bash
npx tsc --noEmit --pretty false
npx eslint app/spokedu-master --max-warnings 0
rg "[\x{4E00}-\x{9FFF}\x{F900}-\x{FAFF}\x{FFFD}]" app/spokedu-master -n
```

## 개발 현황

- DEV_NOTES.md를 반드시 먼저 읽는다.
- 대화 기록이 없어도 DEV_NOTES.md와 코드 기준으로 이어받을 수 있다.
