# naver-blog-p0 — Cursor Browser 편집 자동화

네이버 **PostUpdateForm** 기존 글 수정을 데이터(`manifest.json`) + DOM 검증(`dom-verify.mjs`) + UI 절차(`ui-edit-procedure.md`)로 반복한다.

## 파일

| 파일 | 역할 |
|------|------|
| `manifest.json` | logNo, 앵커, 추가 블록·링크, preserve 규칙 |
| `baselines/*.json` | 수정 완료(미발행) fingerprint — 블록 손실 검출 |
| `dom-verify.mjs` | DOM-only 스냅샷·검증 (SE 내부 API 미사용) |
| `run-verify.mjs` | 스냅샷 JSON 대조 (로컬) |
| `ui-edit-procedure.md` | 에이전트 Browser 도구 UI 플로우 |
| `ledger.json` | 게시물별 누적 결과 |
| `agent-loop.md` | 검증·편집·발행 3단계 (탐색 반복 금지) |
| `emit-collect-fn.mjs` | CDP용 `COLLECT_SNAPSHOT_FN` 출력 |
| `merge-snapshot-paragraphs.mjs` | 스냅샷 + paragraphs JSON 병합 |
| `posts.template.json` | P0 추가 게시물 manifest 항목 템플릿 |
| `validate-p0-static.mjs` | source JSON ↔ manifest 정적 검증 |
| `source/SPOKEDU_P0_*.json` | 잔여 6건 편집 계획 (원격 SSOT) |
| `source/PAPS_공식근거_검토_20261009.md` | PAPS 3건 source-review 판단 근거 |
| `source/PAPS_법령별표4_실제대조_20261009.md` | 별표4 왕복오래달리기 130칸 대조 |
| `source/paps-byl4-crosscheck-summary.json` | 대조 결과 요약(130칸·390칸) |
| `source/PAPS_공식별표4_390칸_검증갱신_20261009.md` | 별표4 390칸 갱신 (2e4f9dec) |

## 에이전트 루프 (요약)

1. `node scripts/naver-blog-p0/emit-collect-fn.mjs` → `browser_cdp` / `Runtime.evaluate` (viewId = PostUpdateForm 탭)
2. 편집 필요 시 `ui-edit-procedure.md` (클릭·입력·링크 UI만)
3. 스냅샷 재수집 → `run-verify.mjs --post <id> <snapshot.json>` (`paragraphs` 필드 포함)
4. `ledger.json` 갱신
5. 발행은 사용자 승인 후만

상세: `agent-loop.md`

## P0 확장

`manifest.posts[]`에 게시물 1건씩 추가. 실패한 logNo는 reload로 원복 후 해당 항목만 `ledger`에 fail — 다른 글 탭/원본 건드리지 않음.
