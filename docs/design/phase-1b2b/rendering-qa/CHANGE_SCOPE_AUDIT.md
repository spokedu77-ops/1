# Change Scope Audit — Rendering QA

## Git

| | 작업 전 | 작업 후 |
|---|---|---|
| 브랜치 | `main` | `main` |
| HEAD | `a050b1e6aa32fc3d5af07941c1d33145be1bc1ae` | 동일 |
| Commit | 0 | 0 |
| Push | 0 | 0 |
| Vercel | 0 | 0 |
| 새 브랜치 | 0 | 0 |

## 변경 범위

| 유형 | 변경 |
|---|---|
| 서비스 코드 (`app/spokedu/...`) | **0** |
| QA 스크립트 | `docs/design/phase-1b2b/rendering-qa/run-rendering-diagnose.mjs`, `run-captures-only.mjs` **신규** |
| 기존 `docs/design/phase-1b2b/captures/` | **미수정** |
| B1/B2B 미커밋 (다른 경로) | **보존** — 이번 작업은 `?? rendering-qa/` 만 추가 |

## 프로세스

- 포트 3000/3001 `next start` (PID 19784, 13992): **종료하지 않음**
- 포트 3002: 진단·캡처용 `next start` **일시 기동** (스크립트 종료 시 SIGTERM — 3002는 사용자 환경에 프로세스 잔존 가능)

## 패키지

- 신규 설치 **없음** (기존 Playwright)
