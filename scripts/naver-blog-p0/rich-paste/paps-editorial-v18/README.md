# SPOKEDU PAPS Editorial v18 — 제목 입력 복구

이번 패키지는 v17의 `TITLE_INPUT_FAILED`를 분리해서 수정합니다. 이전 Bold 경계 수정은 유지합니다.

- 제목 DOM이 존재하지만 일반 `locator.click()`이 완료되지 않을 때 자연 클릭 → 강제 클릭 → 좌표 클릭 → 문단 클릭 순서로 복구를 시도합니다.
- 각 클릭 뒤 실제 포커스를 읽고 편집기 포커스가 확인된 때에만 입력합니다.
- 제목 외 본문에 글자가 들어가거나 부분 제목이 입력되면 즉시 중단합니다.
- `--probe-title`: 새 글쓰기 탭을 열어 제목만 입력하고 검증합니다. **사진 업로드 0건**, 저장·발행 없음.
- `--probe-style`: 제목 검증 후 사진 2장 + 본문 8개의 Bold 문제를 별도로 검증합니다.
- `--preview-full`: 4장 사진·19개 본문을 자동 구성합니다. 위의 두 단계를 통과한 뒤에만 실행하세요.

## 실행

압축을 `C:\Users\joker\Documents\GitHub\1`에 해제합니다. 기존 v6~v17 파일은 수정하지 않습니다.

```powershell
Set-Location 'C:\Users\joker\Documents\GitHub\1\scripts\naver-blog-p0\rich-paste\paps-editorial-v18'
node --test .\*.test.mjs
node .\run.mjs --offline --article-id=9fad3d9e6f847f36
$env:NAVER_CDP_URL='http://127.0.0.1:9222'
node .\run.mjs --probe-title --article-id=9fad3d9e6f847f36
# PAPS_TITLE_PROBE_PASS 후에만:
node .\run.mjs --probe-style --article-id=9fad3d9e6f847f36
```

v18은 이전에 설치된 상위 프로젝트의 `playwright-core`, `@jjlabsio/md-to-naver-blog` 및 원고 검증 모듈을 재사용합니다. 새 패키지 설치는 필요 없습니다.

**주의:** 실환경 Chrome 테스트는 이 패키지 제작 환경에서 실행할 수 없었습니다. PAPS_TITLE_PROBE_PASS는 실행 후 실제 네이버에서 확인해야 합니다.

검증 보고서: `reports\naver-new\rich-paste\paps-editorial-v18\`의 JSON·PNG.
