# SPOKEDU 네이버 블로그 — 청담 다함께키움센터 새 원고

기존 `paps-editorial-final`에서 실환경 성공한 입력 로직을 복사하여 **별도 새 글**로 구성한 미발행 프리뷰 실행기입니다. 기존 운영본을 덮어쓰지 않습니다.

## 컨텐츠와 근거

- 제목: `[강남 청담] 다함께키움센터 놀이체육 수업｜협동 달리기부터 거울 술래잡기까지`
- 원문: `article/ARTICLE_FOR_NAVER.md` — 14문단, Chapter 소제목 3개
- 출처 및 사실근거: `article/SOURCE_FACTS.md`
- 출처 파일: 2026.03.05. 청담 다함께키움센터 활동일지 PDF. `https://drive.google.com/file/d/17jT0GCpk5kV0v3GxOnO-kc-m6AeDARMO/view`
- 원본 PDF의 **실제 활동 사진 3장**에서 만든 편집용 JPG. `editorial-assets/` 폴더.
- 사진 배치: `사진1 → 본문 0~5 → 사진2 → 본문 6~9 → 사진3 → 본문 10~13`
- 소제목 2, 6, 10번. **어느 사진 삽입 경계도 바로 앞 문단이 소제목이 아님.**
- 기존 프로젝트의 `naver-article-pipeline.mjs`, `naver-new-style-runner.mjs`, `playwright-core`, `@jjlabsio/md-to-naver-blog`를 그대로 사용하므로 npm 의존성이 설치된 기존 GitHub 프로젝트 안에서 실행합니다.

## 설치 및 오프라인 검증

```powershell
$root = "C:\Users\joker\Documents\GitHub\1"
$zip = "$env:USERPROFILE\Downloads\SPOKEDU_CHEONGDAM_NAVER_NEW_ARTICLE.zip"
if (!(Test-Path $zip)) { throw "ZIP 파일 없음" }
Expand-Archive -LiteralPath $zip -DestinationPath $root -Force
Set-Location "$root\scripts\naver-blog-p0\rich-paste\cheongdam-editorial"
node --test .\*.test.mjs
if ($LASTEXITCODE -ne 0) { throw "원고/사진 테스트 실패" }
node .\run.mjs --offline
if ($LASTEXITCODE -ne 0) { throw "오프라인 검증 실패" }
```

## 네이버 새 글 프리뷰 (승인 전 발행 금지)

**기존에 동작하는 9222 Chrome 로그인 환경 그대로** 사용합니다. 별도 포트/새 프로필/재로그인을 만들지 않습니다. 실행 전 CDP가 활성화되어 있어야 합니다.

```powershell
$env:NAVER_CDP_URL = "http://127.0.0.1:9222"
node .\run.mjs --preview-full
```

예상 성공 코드: `CHEONGDAM_FULL_EDITORIAL_PREVIEW_PASS`, `imageCount: 3`, `paragraphCount: 14`, `headings: 3`, `textMatch: true`.

**주의:** 실제 네이버 실환경 새 원고 실행은 이 패키지 제작 시점에 확인되지 않았습니다. 테스트는 17/17 통과했으며 동일 입력기의 모의 원고 오프라인 실행이 PASS입니다. 미저장 글이 있는 기존 탭을 수정·종료하지 않습니다. 각 사진은 네이버 서버로 전송되지만 임시저장·발행은 수행하지 않습니다. 아동 초상권 및 기관 홍보 동의를 확인한 후에만 발행을 별도로 승인해야 합니다.

## 금지 작업

- 기존 `paps-editorial-final` 덮어쓰기·수정 금지
- 사용자 승인 없는 임시저장·발행 금지
- 기존 Chrome 종료, 탭 삭제, 데이터 초기화 금지
- 테스트를 위한 반복 사진 업로드 지양
- 검증 실패를 성공으로 처리하거나 반응속도/교육성과 창작 금지


---
**편집 보완:** `EDITORIAL_COMPLETION.md` 확인. 기존 검증 사진 3장 유지, 원고 최종 마무리·기관 안내·문의·해시태그 추가. 로컬 LLM 원고는 사용하지 않았음.
