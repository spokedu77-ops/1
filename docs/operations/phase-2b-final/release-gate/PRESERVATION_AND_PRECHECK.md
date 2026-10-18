# 브랜치·미커밋 작업 보존

## Git

- 현재 브랜치: `spokedu-security-audit-20261018` (이름이 `main`은 아님)
- Release Gate 중 **브랜치 자동 전환 없음**
- **Commit / Push / Deploy: 0건**

## Release Gate 변경 범위 (이번 보완)

| 파일 | 내용 |
|------|------|
| `app/spokedu/data/spomove-public-catalog-page.ts` | 고객용 `levelsIntro` / `activityIntro` (공통 `spomove-program-page.ts` 원문 미수정) |
| `app/spokedu/components/spomove-public-catalog.tsx` | 위 카피 렌더, 내부/자기해설성 문구 제거 |
| `app/spokedu/data/site-ia.test.ts` | 카탈로그 route / data / landing CTA / 컴포넌트·iframe 계약 분리 검증 |
| `docs/operations/phase-2b-final/run-catalog-qa.mjs` | Journey A strict, route smoke 분리, fullPage 캡처·이미지 로드 |

## 미커밋 작업 보존

- B5 Hero (`home-hero.tsx`, `home-web.module.css`, `home-web-assets.ts`) 및 홈 Phase 1B4/1B5 문서·캡처, admin/camera 삭제 등 **기존 `git status` 대량 변경은 Release Gate에서 수정하지 않음**
- 카탈로그 iframe 제거·자체 UI 구현(Phase 2-B FINAL)은 유지

## Precheck 메모

명세상 브랜치명이 `main`이 아니면 자동 전환하지 않는다. 이번 게이트는 **현재 브랜치에서** 범위 내 파일만 수정·검증을 완료했다. `main` 이름 브랜치에서의 재실행은 사용자 merge/체크아웃 후 선택 사항이다.
