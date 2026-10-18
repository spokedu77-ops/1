# CSS Network Report

검증 기준 서버: `http://127.0.0.1:3002/` (BUILD_ID `CRXHj0T0tTWJPlpW8Zhml`)  
대조: `3000`, `3001` (동일 HEAD 여부 미확인 — BUILD_ID 추출 `chunks`는 Next chunk URL 파싱 한계)

## 요약

| 포트 | CSS 200 | home-web chunk | computed `--navy` | Method `.steps` display | Records `.dark` bg |
|---|---|---|---|---|---|
| 3000 | 200 다수 | class명 존재 | **(empty)** | **block** | **transparent** |
| 3001 | 200 다수 | class명 존재 | **(empty)** / B2B DOM | **block** (1440 probe) | **transparent** |
| 3002 | 200 | `0ueec8v3cmake.css` 등 | **#0b1f46** | **grid** | **rgb(11, 31, 70)** |

HTTP 200만으로 성공 판정하지 않음 — 3000/3001이 대표 사례.

## 3002 — 대표 Stylesheet (1440px 수집)

| URL | Status | Content-Type | 실패 | 본문 |
|---|---|---|---|---|
| `/_next/static/chunks/0ueec8v3cmake.css` | 200 | text/css; charset=UTF-8 | no | `.home-web-module__LPsq6q__root{--navy:#0b1f46;...}` 포함 |
| `/_next/static/chunks/1lu5fkbbx2_-w.css` | 200 | text/css | no | `@layer` / `@import` (글로벌) |
| `/_next/static/chunks/0jqeqbqtwzkoq.css` | 200 | text/css | no | 타 모듈 (education-hub 등) |
| `cdn.jsdelivr.net/.../pretendardvariable...css` | 200 | text/css | no | 폰트 |
| `cdn.jsdelivr.net/.../SUIT.css` | 200 | text/css | no | 폰트 |

## 브라우저 오류 (3002, 1440/390)

- Console Error: **없음**
- Page Error: **없음**
- Request Failed (CSS): **없음**
- Hydration Error: **미관측**

## CSS Modules

- HTML class: `home-web-module__LPsq6q__steps`, `__gallery`, `__tileCard` 등 **존재**
- 3002: 위 class에 대응하는 규칙이 chunk에 포함되고 **computed style 일치**
- 3000/3001: class **존재하나** grid/navy 규칙 **미적용** → **로드된 CSS와 DOM 빌드 불일치** 또는 **구 빌드**

상세 raw: `COMPUTED_STYLE_REPORT.json` 내 `cssResponses` (probe/qa).
