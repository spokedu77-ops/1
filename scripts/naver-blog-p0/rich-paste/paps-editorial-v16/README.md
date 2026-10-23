# SPOKEDU PAPS Editorial v16 — 본문 Bold 상속 차단

## 실환경 근거
- v13: 사진 4개, 19문단, 3소제목 텍스트 PASS. 하지만 일반 본문 굵기 미검증.
- v15: 사진 2개 다음 구간의 첫 일반 본문이 `font-weight:700`으로 감지되어 `BODY_BOLD_LEAK` 중단. 보고서에서 두번째 사진 뒤 임의 본문 클릭 문제가 아닌, 서식 초기화 이후 Rich HTML paste 스타일 상속 가능성 확인.

## 수정
- **기존 사진 삽입·커서·문단 경로를 수정하지 않음.**
- `convert()`가 생성하는 보통 문단 `<p>...</p>`를 사용하지 않고 일반 본문에 16px·font-weight 400을 p와 span에 명시한다. 제목 h2는 기존 1.5em Bold 의미를 유지한다.
- 생성한 HTML에 소제목 외 Bold 태그가 포함됐거나 본문 스타일이 빠지면 업로드 전 중단한다.
- 기존 화면 검증 `BODY_BOLD_LEAK` 및 `BODY_FONT_SIZE_LEAK`를 유지한다. HTML 스타일이 Naver에 의해 제거되면 **성공으로 위장하지 않는다.**
- `--probe-style`은 두번째 사진 직후의 5문단(총 8문단)까지 검사하고 종료한다. 이후 `--preview-full`로 전체 검증.

## 실행 (Windows PowerShell)

```powershell
$root = 'C:\Users\joker\Documents\GitHub\1'
$zip = "$env:USERPROFILE\Downloads\SPOKEDU_PAPS_EDITORIAL_STYLE_FIX_V16.zip"
if (!(Test-Path $zip)) { throw 'ZIP 파일 없음' }
Expand-Archive -LiteralPath $zip -DestinationPath $root -Force
Set-Location "$root\scripts\naver-blog-p0\rich-paste\paps-editorial-v16"
node --test .\photo-sequential-core.test.mjs .\sequential-plan.test.mjs .\package-verification.test.mjs .\editorial-html.test.mjs
if ($LASTEXITCODE -ne 0) { throw '테스트 실패' }
node .\run.mjs --offline --article-id=9fad3d9e6f847f36
if ($LASTEXITCODE -ne 0) { throw '오프라인 실패' }
$env:NAVER_CDP_URL = 'http://127.0.0.1:9222'
node .\run.mjs --probe-style --article-id=9fad3d9e6f847f36
```

`PAPS_BODY_STYLE_PROBE_PASS`가 나오면 전체 버전 명령:

```powershell
node .\run.mjs --preview-full --article-id=9fad3d9e6f847f36
```

**주의:** 사진들은 실제 Naver 서버에 업로드되지만 저장·발행은 하지 않습니다. 기존 탭, v13/v15, 원고 및 구버전 실행기 변경 없음.

## 성공 기준
`BODY_2` 완료 시 모든 일반 본문에 `font-weight<600` 및 `font-size<=18px`인 텍스트 잎 노드가 있어야 합니다. 이 조건이 맞지 않으면 오류 코드와 상세 스냅샷을 JSON에 남기고 중단합니다. 현재 실환경 PASS는 확인 전입니다.
