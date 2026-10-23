# SPOKEDU PAPS Editorial v17 — 사진 뒤 Bold 상속 경계 수정

## 기존 실환경 로그에 근거한 변경

- v13: 사진 4개 + 19문단 입력 성공. 단, 본문 Bold 검사가 없었음.
- v15/v16: `SEGMENT_2_PASTE`에서 `BODY_BOLD_LEAK` (`font-weight:700`, block 3).
- v16은 일반 본문 HTML에 `font-weight:400`과 `16px`를 명시했지만 동일 오류 발생. HTML CSS만으로 해결되지 않음.
- v16의 `pasteSegmentAfterLastPhoto`는 서식 초기화 후 `para.click()`을 재실행해 네이버의 기존 heading 서식을 재활성화할 여지가 있었음.

## 수정 내용

- **클립보드 쓰기를 서식 초기화보다 먼저 실행.**
- **사진 뒤의 네이버 소유 빈 문단에만** 일반 본문 유형을 지정하고 다시 포커스한 뒤 크기 16px → Bold OFF 순서로 설정.
- **Bold OFF 뒤에는 기존 문단 클릭·커서 이동 없음.** 설정값을 읽기 전용 검사하고 즉시 Ctrl+V.
- 직전 Bold 툴바 상태가 활성화돼 있으면 사진 업로드나 본문 붙여넣기 추가 없이 `BODY_ANCHOR_BOLD_STILL_ACTIVE` 오류로 중단.
- 기존 실제 글자 단위 `BODY_BOLD_LEAK` / `BODY_FONT_SIZE_LEAK` 검증 유지. 텍스트·사진·소제목·정렬 검증 완화 없음.
- 기존 v16 폴더·운영 코드·실제 원고·로그·브라우저 기존 탭은 수정하지 않음.

## 실행 — PowerShell

```powershell
$root = 'C:\Users\joker\Documents\GitHub\1'
$zip = "$env:USERPROFILE\Downloads\SPOKEDU_PAPS_EDITORIAL_FOCUS_FIX_V17.zip"
if (!(Test-Path $zip)) { throw 'ZIP 파일 없음' }
Expand-Archive -LiteralPath $zip -DestinationPath $root -Force
Set-Location "$root\scripts\naver-blog-p0\rich-paste\paps-editorial-v17"
node --test .\photo-sequential-core.test.mjs .\sequential-plan.test.mjs .\package-verification.test.mjs .\editorial-html.test.mjs .\paste-focus-guard.test.mjs
if ($LASTEXITCODE -ne 0) { throw '테스트 실패' }
node .\run.mjs --offline --article-id=9fad3d9e6f847f36
if ($LASTEXITCODE -ne 0) { throw '원고 검증 실패' }
$env:NAVER_CDP_URL = 'http://127.0.0.1:9222'
node .\run.mjs --probe-style --article-id=9fad3d9e6f847f36
```

## 판정

- 성공 기대: `PAPS_BODY_STYLE_PROBE_PASS`, 이미지 2개, 본문 8개.
- 실패: `BODY_ANCHOR_BOLD_STILL_ACTIVE`, `BODY_BOLD_LEAK` 등 코드와 JSON 보고서를 확인. **같은 명령 무한 재시도 금지**.
- `--probe-style` 성공 확인 후에만 `--preview-full` 실행.
- `--probe-style`은 **네이버에 사진 2장을 실제 업로드**할 수 있으며 글 저장·발행은 하지 않음.
- 사용자 브라우저 실환경 PASS는 실행 로그 전까지 미확정.
