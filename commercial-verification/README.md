# commercial-verification/

MASTER 상용 QA·릴리스 스크립트의 **로컬 출력 디렉터리**입니다.

| 파일 | 설명 |
|------|------|
| `billing-cron-vault.sql` | `npm run qa:spokedu-master:configure-billing-cron` 참고용 SQL |
| `*.json` | QA 실행 시 생성 (gitignore, CI artifact) |

생성: `npm run qa:spokedu-master:verification-report`, `npm run qa:spokedu-master:release-automated`
