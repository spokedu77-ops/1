# SPOKEDU 네이버 PAPS Photo-first v13 — 전체 게시물 미리보기

## 무엇을 검증하는가

**v10, v11, v12의 실제 네이버 PASS 로그에 기반**해 **새 글쓰기 탭 하나**에 다음 순서로 배치합니다.

1. 대표 커버 `01-cover-paps.jpg` → 본문 **0~2** (소제목 2번)
2. 체력 측정 사진 `02-fitness-pair.jpg` → 본문 **3~7** (소제목 7번)
3. 움직임 활동 사진 `03-movement-pair.jpg` → 본문 **8~12** (소제목 12번)
4. 개별 점프 사진 `04-jump-single.jpg` → 본문 **13~18**

총 **사진 모듈 4개·본문 19개·소제목 3개(20px 이상 Bold)**, 모든 본문 왼쪽 정렬, 원문 정확 일치, 컴포넌트 순서, 이미지 로딩을 **각 8개 경계에서 검증**합니다. 사진이 실제로 올라갈 때마다 원고·서식이 변하거나 사진이 잘못 배치되면 즉시 오류로 종료하며 임시저장·발행 버튼을 누르지 않습니다.

기존 네이버 글/탭과 v6~v12 엔진을 **수정하지 않음**. 새 미리보기 탭은 종료하지 않습니다. **사진은 실제 네이버 서버로 전송될 수 있습니다.** 아동 사진의 공개 발행은 별도 승인 검토가 필요합니다.

최신 원고 표기는 **PAPS**이며 `POPS/팝스` 잔존 원고는 검증 실패 처리합니다. 원고 원본 SHA와 JSON 정합성도 재확인합니다.

## 구성

- `photo-sequential-preview.mjs`: 신규 v13 실행기. v12에서 실제 PASS였던 사진 버튼·Rich Paste 방식을 확장했습니다.
- `photo-sequential-core.mjs`: 순서/내용/서식/커서 앵커 안전 게이트 (순수 함수).
- `photo-sequential-core.test.mjs`: 24개 단위 테스트.
- `editorial-assets/*.jpg`: 실제 수업 사진을 기반으로 한 v10과 해시가 **동일한** 카드 4개. 재설치나 외부 다운로드 불필요.

필수 파일 `cdp-health.mjs`, `sequential-plan.mjs`, `naver-new-style-runner.mjs`, `naver-article-pipeline.mjs`와 npm 패키지(`@jjlabsio/md-to-naver-blog`, `playwright-core`)는 이미 v10~v12에서 설치/적용된 것을 재사용합니다.

## 실행 (PowerShell)

```powershell
$root = 'C:\Users\joker\Documents\GitHub\1'
$zip = "$env:USERPROFILE\Downloads\SPOKEDU_PAPS_PHOTO_FULL_V13.zip"
if (!(Test-Path -LiteralPath $zip)) { throw "다운로드한 ZIP 없음: $zip" }
Expand-Archive -LiteralPath $zip -DestinationPath $root -Force
Set-Location "$root\scripts\naver-blog-p0\rich-paste"
node --test .\photo-sequential-core.test.mjs
if ($LASTEXITCODE -ne 0) { throw '단위 검사 실패' }
node .\photo-sequential-preview.mjs --offline --article-id=9fad3d9e6f847f36
if ($LASTEXITCODE -ne 0) { throw 'FINAL 원고 또는 사진 해시 검사 실패' }
$env:NAVER_CDP_URL = 'http://127.0.0.1:9222'
node .\photo-sequential-preview.mjs --preview-full --article-id=9fad3d9e6f847f36
```

## 판정

성공: `PAPS_FULL_EDITORIAL_PREVIEW_PASS` 및 `imageCount:4`, `paragraphCount:19`, `headings:3`, `textMatch:true`.

실패: `PAPS_FULL_EDITORIAL_PREVIEW_ERROR`. 오류 시 다음 단계는 실행되지 않습니다. 원인을 진단할 때 전체 `reportPath`의 JSON `failedStage`, `code`, `stageVerifications`, `failureCanvas`를 확인하세요. Chrome 창을 재시작하거나 임시저장하지 않아도 됩니다.

**테스트 범위:** v13 JavaScript 구문검사, 24개 순수 단위 테스트, 별도 모의 FINAL 데이터에서 오프라인 4사진·19블록·SHA 검증 PASS. **v13을 실제 네이버에 실행한 결과는 아직 없으므로 실환경 PASS로 주장하지 않습니다.**
