# SPOKEDU 랜딩 페이지

가이드 문서에 따른 폴더 구조입니다.

## 구조

- **index.html** — 진입점. CSS/JS 링크와 본문을 조립
- **data/config.js** — ✅ 운영자가 수정하는 유일한 파일 (CONFIG, SLIDES_DATA, SLOTS, REPORT_METRICS)
- **css/** — variables, base, layout, components, sections, responsive
- **js/** — utils, kakao, observers, slider, schedule, report, form, init (로드 순서 유지)
- **sections/** — HTML 조각 (참고/SSI·빌드 툴 include용)

## 로컬 확인

`index.html`을 브라우저에서 직접 열거나, 로컬 서버로 제공하면 됩니다.

```bash
# 예: Python
cd spokedu && python -m http.server 8080
# http://localhost:8080
```

## 운영자 수정

- **색상/간격**: `css/variables.css`의 `:root` 만 수정
- **센터 정보·전화·카카오·리드 엔드포인트**: `data/config.js`의 `CONFIG`
- **슬라이더 이미지**: `data/config.js`의 `SLIDES_DATA[n].src`
- **시간표**: `data/config.js`의 `SLOTS`
- **성장 리포트 지표**: `data/config.js`의 `REPORT_METRICS`

자세한 내용은 프로젝트 루트의 **SPOKEDU 랜딩 페이지 — 파일 구조 가이드**를 참고하세요.
