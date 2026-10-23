# SPOKEDU NAVER PAPS — 단일 최종 수정 패치

## 변경 범위

v13에서 네이버 실환경 성공한 사진 4장/원문 19문단의 순차 편집 방식과 v19의 제목 팝업 보호 로직을 합쳤습니다.
사진 삽입 직전 문장이 Chapter 소제목으로 끝나지 않도록 각 Chapter의 **첫 일반 설명 문단을 사진 위**에 배치합니다.

- 기존 구성: `사진1 → 0..2(소제목) → 사진2 → 3..7(소제목) → 사진3 → 8..12(소제목) → 사진4 → 13..18`
- 수정 구성: `사진1 → 0..3(소제목+일반문단) → 사진2 → 4..8(소제목+일반문단) → 사진3 → 9..13(소제목+일반문단) → 사진4 → 14..18`
- 원문, 문단 순서, 소제목 위치, 이미지 4장 원본 바이트 변경 없음.
- 사진 다음 새 빈 문단에 v13의 **클립보드 → 클릭 → 단일 붙여넣기**를 사용합니다.
- 네이버 툴바 서식 재설정을 없애고, 붙여넣기 HTML에서 일반 문단 16px·400을 지정합니다.
- 모든 일반 문단의 실제 글자 굵기·크기를 매 단계 검사합니다. 잘못되면 즉시 중단합니다.
- 기존 `http://127.0.0.1:9222` CDP 사용, 16초 대신 90초 접속 허용. 새 Chrome/재로그인 없음.
- 기존 탭 닫기·변경 없음. **저장/발행 금지**. 파일 업로드 시 사진은 네이버 서버로 업로드됩니다.

## 실행

ZIP을 저장소 루트 (`C:\Users\joker\Documents\GitHub\1`)에 풀고:

```powershell
Set-Location 'C:\Users\joker\Documents\GitHub\1\scripts\naver-blog-p0\rich-paste\paps-editorial-final'
node --test .\final-layout.test.mjs
node .\run.mjs --offline --article-id=9fad3d9e6f847f36
if ($LASTEXITCODE -ne 0) { throw '원고 검증 실패' }
$env:NAVER_CDP_URL='http://127.0.0.1:9222'
node .\run.mjs --preview-full --article-id=9fad3d9e6f847f36
```

`PAPS_FULL_EDITORIAL_PREVIEW_PASS`가 나오고 Chrome 화면의 일반 문단이 소제목보다 작고 보통 굵기면 성공입니다. 스크린샷 검수 없이 배포/발행 자동 진행 없음.

### 성공한 v13 안전 원칙

네이버가 만든 이미지 뒤 빈 문단만 사용. 이미 입력된 문단의 DOM 변경, 강제 Range 조작, Enter를 통한 텍스트 분할, 저장·발행 없음.
