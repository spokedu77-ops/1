# SPOKEDU PAPS Editorial v19 — 제목 팝업 차단막 진단·안전 처리

## 확인된 원인

v18의 `--probe-title`은 정상 통과했지만 다음 `--probe-style`의 새 탭에서는 제목 영역 위에
`se-popup-dim se-popup-dim-white` 차단막이 나타나 Playwright가 제목을 클릭할 수 없었습니다.
이는 `BODY_BOLD_LEAK`와 별개이며 사진 업로드 전 TITLE 단계에서 중단된 오류입니다.

## v19 변경 사항

- `title-overlay-gate.mjs` 추가: 제목 클릭 지점과 `.se-popup-dim` 및 표시 중인 팝업을 읽기 전용으로 검사합니다.
- 차단막이 로딩 중 일시적으로 나타난 경우 해제까지 한정적으로 기다립니다(기본 6.5초).
- **유일한** `se-popup-alert-confirm`에 이전 글 복원·이어쓰기 문구와 `취소` 버튼이 모두 확인될 때만 취소합니다.
- 차단막이 해소되었는지 연속 2회 확인한 후 제목을 클릭합니다. 각 클릭 재시도 직전에도 같은 검사를 합니다.
- 알 수 없는 팝업은 **건드리지 않고** `TITLE_OVERLAY_BLOCKED`로 중단합니다. CSS 삭제, 클릭 관통, 무차별 Escape/닫기 없음.
- 기존 v18의 사진→본문 입력 순서, 본문 서식 누수 검사, PAPS 원고·이미지 SHA 및 저장/발행 금지는 그대로 유지합니다.
- 실패 결과 콘솔의 `titleOverlay`와 `reports/naver-new/rich-paste/paps-editorial-v19/`에 진단을 기록합니다.

## 설치·테스트·한 번의 실환경 검사

압축을 `C:\Users\joker\Documents\GitHub\1`에 풉니다. 이전 v6~v18 파일은 변경하지 않습니다.

```powershell
$root = 'C:\Users\joker\Documents\GitHub\1'
$zip = "$env:USERPROFILE\Downloads\SPOKEDU_PAPS_EDITORIAL_OVERLAY_GATE_V19.zip"
if (!(Test-Path $zip)) { throw "ZIP 없음: $zip" }
Expand-Archive -LiteralPath $zip -DestinationPath $root -Force
Set-Location "$root\scripts\naver-blog-p0\rich-paste\paps-editorial-v19"
node --test .\*.test.mjs
if ($LASTEXITCODE -ne 0) { throw '테스트 실패' }
node .\run.mjs --offline --article-id=9fad3d9e6f847f36
if ($LASTEXITCODE -ne 0) { throw '원고 검증 실패' }
$env:NAVER_CDP_URL='http://127.0.0.1:9222'
node .\run.mjs --probe-style --article-id=9fad3d9e6f847f36
```

`--probe-title`은 v18에서 이미 통과했으므로 생략합니다. `--probe-style`은 네이버 새 탭에서
사진 2개와 본문 8개까지 시험합니다. 사진은 네이버 서버에 업로드될 수 있지만 **저장·발행하지 않습니다**.

- `PAPS_BODY_STYLE_PROBE_PASS`: 제목 팝업 해제 + BODY_2 일반 문단 서식까지 실환경 통과
- `TITLE_OVERLAY_BLOCKED`: 팝업이 계속 남아있음. 콘솔의 `titleOverlay`에서 팝업 종류 확인
- `BODY_BOLD_LEAK`: 제목은 통과, 기존 Bold 문제는 별도 해결 필요
- 기타 오류: 보고서의 `failedStage`, `code`, `error`를 우선 확인

**한계:** v19 테스트 75개는 코드·모의 브라우저 상태 검사이며 실제 네이버 팝업의 해제 성공을 증명하지 않습니다.
기존 CDN·로그인 세션, Chrome/탭을 종료하거나 변경하지 않습니다.
