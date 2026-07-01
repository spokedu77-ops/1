# CLAUDE.md — 프로젝트 규칙

## 절대 하지 말 것

- **커밋(git commit)과 푸시(git push)를 절대 하지 않는다.**
  - 코드 수정만 진행한다.
  - 명시적으로 요청받지 않는 한 git commit, git push 명령을 실행하지 않는다.

## 작업 기준

- 작업 기준은 `SPOKEDU MASTER`다.
- 주 화면 작업 대상은 `app/spokedu-master`다.
- MASTER 작동을 위해 필요한 경우에만 관련 API와 원천 플레이어를 함께 수정한다.
  - 예: `app/api/spokedu-master/*`
  - 예: `/admin/spomove/training`에서 가져오는 embed/player 보정
- `subscription-new`나 `spokedu-pro`에 직접 구현하지 않는다.
- 참고할 장점만 MASTER에 흡수한다.

## 검증 명령 (수정 후 반드시 실행)

```bash
npx tsc --noEmit --pretty false
npx eslint app/spokedu-master --max-warnings 0
rg "\x{FFFD}|怨|諛|吏|媛|蹂|鍮|湲|醫|嫄|珥|獄|筌|揶|癰|疫|椰" app/spokedu-master app/api/spokedu-master -n
```

## 개발 현황

- 작업 기준은 `app/spokedu-master`, `app/api/spokedu-master`, `app/admin/spokedu-master` 코드다.
- 대화 기록이 없어도 위 경로와 `supabase/migrations/*spokedu_master*`를 기준으로 이어받는다.
