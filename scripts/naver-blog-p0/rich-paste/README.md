# SPOKEDU 네이버 Rich Paste — FINAL 원고 미저장 미리보기

3블록 POC에서 작동한 `@jjlabsio/md-to-naver-blog` HTML 클립보드 기술을 **기존 FINAL 원고 검증기(`loadStyleBlockPlan`)**와 결합합니다.

## 실행

다음 디렉터리에서 실행합니다.

```powershell
Set-Location "C:\Users\joker\Documents\GitHub\1\scripts\naver-blog-p0\rich-paste"
npm install --ignore-scripts --no-audit
npm run check
$env:NAVER_CDP_URL = "http://127.0.0.1:9222"
npm run preview -- --article-id=9fad3d9e6f847f36
```

로그인된 CDP Chrome(`9222`)이 열려 있어야 합니다. 별도 신규 PostWriteForm 탭에 **제목 + 19문단을 한 번에 입력**하고, 본문 텍스트·소제목 Bold·왼쪽 정렬을 DOM에서 검사하며 스크린샷과 JSON을 `reports/naver-new/rich-paste/`에 저장합니다.

- 기존 임시글/FINAL 미저장 탭은 사용하거나 닫지 않습니다.
- 네이버 저장·발행 버튼은 사용하지 않습니다.
- 새 탭에 이미 내용이 있으면 입력을 중단합니다.
- 소제목의 시각적 굵기가 확인되더라도 정확한 글자·정렬이 확인되지 않으면 PASS 처리하지 않습니다.
- **실제 FINAL 원고 네이버 E2E 성공은 사용자의 인증된 브라우저에서 실행해야 검증됩니다.**

현재 글 구조는 승인된 시험 원고 기준 **19개 논리 블록/3개 소제목**에 고정했습니다. 다른 원고 지원·이미지·발행 자동화는 이번 변경의 범위가 아닙니다.
