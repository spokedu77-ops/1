# SPOKEDU PAPS Editorial v15 — 본문 서식 누출 방지

### v14 실환경에서 발견된 결함

이미지 4장·본문 19문단·소제목 3개가 일치해도, 이미지 뒤 일반 문단에 직전 소제목의 **굵기/큰 글씨**가 전파될 수 있었습니다.

### 변경 범위 (v14 원본 미변경)

- 사진 뒤 **네이버가 만든 빈 텍스트 영역에만** 본문 서식 설정: `applyTextFormat('body')`, `applyBold(false)`, `applyFontSize(16)`.
- 붙여넣기 후 각 일반 문단의 실제 CSS 가중치(`fontWeights`)와 글꼴 크기(`fontSizes`) 검사.
- 본문이 굵거나 어느 텍스트 노드라도 18px 초과면 `BODY_BOLD_LEAK`/`BODY_FONT_SIZE_LEAK`로 **FAIL**.
- 사진 4장, 본문 19개, 제목, 텍스트, 소제목 24px Bold, 좌측 정렬, 이미지 순서 검사는 그대로 유지.
- 원고, 이미지, 기존 탭 및 v14 실행 파일을 변경하지 않음. `--preview-full`은 새 탭을 열고 사진을 서버에 업로드하지만 저장/발행하지 않음.

### 설치

압축을 프로젝트 최상단 `C:\Users\joker\Documents\GitHub\1`에 해제합니다.

### 테스트

```powershell
cd C:\Users\joker\Documents\GitHub\1\scripts\naver-blog-p0\rich-paste\paps-editorial-v15
node --test .\photo-sequential-core.test.mjs .\sequential-plan.test.mjs .\package-verification.test.mjs
node .\run.mjs --offline --article-id=9fad3d9e6f847f36
$env:NAVER_CDP_URL = 'http://127.0.0.1:9222'
node .\run.mjs --preview-full --article-id=9fad3d9e6f847f36
```

**주의:** 오프라인 통과는 실제 네이버 서식 정상 표시를 보증하지 않습니다. 실환경 실행에서 `PAPS_FULL_EDITORIAL_PREVIEW_PASS`를 다시 확인하고 화면을 검수해야 합니다. `BODY_STYLE_RESET_FAILED`, `BODY_BOLD_LEAK`, `BODY_FONT_SIZE_LEAK` 등이 나오면 멈추고 보고서를 확인하십시오.
