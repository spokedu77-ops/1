# Phase 1-B2B — Root Cause Report (Rendering QA)

## A. 관찰된 증상

제출된 `docs/design/phase-1b2b/captures/` (1차 B2B QA)에서:

1. Method 1440/390: 3열·프레임 없이 세로로 길게 쌓임, 이미지가 뷰포트 너비로 과대 표시.
2. Records: 네이비 배경·`tileCard`/`tileInfo` 패널 없이 HTML 기본 스타일에 가까움.
3. 글꼴·여백·토큰이 홈 디자인 시스텔과 불일치.
4. 섹션 스크린샷 중앙에 글로벌 헤더가 끼어 보이는 경우( Method 1440 ) — 섹션 bounding box가 비정상적으로 길 때 고정 헤더가 겹쳐 보임.

동일 소스·동일 HEAD에서 **fresh production build + 검증된 포트**로 재측정 시 위 증상은 재현되지 않음.

## B. 재현 환경

| 항목 | 값 |
|---|---|
| 저장소 | `spokedu77-ops/1` (로컬 `origin`) |
| 브랜치 | `main` |
| HEAD | `a050b1e6aa32fc3d5af07941c1d33145be1bc1ae` |
| Node | v24.15.0 |
| 로컬 BUILD_ID | `CRXHj0T0tTWJPlpW8Zhml` |
| 검증 서버 (PASS) | `http://127.0.0.1:3002/` — `npm run start`, PORT=3002, **현재 `.next` 빌드** |
| 대조 서버 (FAIL) | `http://127.0.0.1:3000/`, `http://127.0.0.1:3001/` — 기존 `next start` (PID 19784, 13992), **종료하지 않음** |
| 진단 명령 | `node docs/design/phase-1b2b/rendering-qa/run-rendering-diagnose.mjs` |
| PASS 캡처 | `node docs/design/phase-1b2b/rendering-qa/run-captures-only.mjs` |

서비스 파일 SHA-256 (진단 시점): `COMPUTED_STYLE_REPORT.json` → `meta.fileHashes`

## C. 원인 후보 및 검증

| 후보 | 검증 | 결과 |
|---|---|---|
| CSS HTTP 404/500 | Playwright `response` 이벤트, 3002에서 `/_next/static/chunks/*.css` 다수 **200**, `text/css` | **기각** (정상 서버) |
| CSS 200이지만 규칙 없음 | 3002에서 `0ueec8v3cmake.css` 본문에 `.home-web-module__LPsq6q__root{--navy:#0b1f46;...}` 확인 | **기각** (규칙 존재) |
| CSS Modules class만 있고 규칙 미적용 | **3000/3001**: DOM에 `home-web-module__LPsq6q__*` class 있으나 `.steps` **display:block**, `--navy` **빈 문자열**, `.dark` 배경 **transparent** | **부분 입증** (구/불일치 빌드 서버) |
| computed style 정상인데 캡처만 비정상 | 3002 + `waitUntil:'load'` + computed assert 후 캡처 → `rendering-qa/captures/*` 육안 **PASS** | **1차 B2B 캡처는 환경/절차 문제와 일치** |
| 이전 서버만 비정상 | 3000/3001 vs 3002 computed style **동일 HEAD 대비 상이** | **입증** |
| 레이아웃 CSS 자체 결함 | 3002에서 Method 1440 `gridTemplateColumns: 408px 408px 408px`, Records `backgroundColor: rgb(11, 31, 70)` | **기각** (코드 결함 아님) |
| 1차 QA `domcontentloaded`만 사용 | 구 `run-captures.mjs`는 `load`/computed 검증 없음 | **절차 리스크** (3002에서도 load+assert로 해소) |

## D. 확정 원인

**확정:** 1차 B2B Playwright QA가 **현재 B2B production 빌드와 일치하지 않는 `next start` 인스턴스(3000/3001)** 에서 수집되었거나, **CSS 적용 완료를 computed style으로 확인하지 않은 채** 캡처되었다. 그 결과 DOM에는 CSS Modules class가 있으나 **모듈 규칙이 계산되지 않은 상태**가 캡처에 반영되었다.

**근거:**

- `COMPUTED_STYLE_REPORT.json` — `probePorts.3000` / `3001`: Method grid·Records 배경·CSS 변수 미적용.
- 동 파일 — `qa.1440` / `qa.390` (3002): Method 3열/1열 grid, Records navy, `tileCard` flex, 변수 `#0b1f46` 적용.
- `run-captures-only.mjs` styleChecks 전 뷰포트 **ok: true** 후 캡처 육안 정상.

**서비스 CSS/TSX 결함으로 확정하지 않음.**

## E. 처리 내용

| 구분 | 내용 |
|---|---|
| QA 환경 (A) | `rendering-qa/run-rendering-diagnose.mjs`, `run-captures-only.mjs` 추가 — BUILD_ID·computed style assert·`load`·fonts·이미지 decode |
| 서비스 코드 (B) | **수정 없음** (승인 대기 불필요) |
| 1차 B2B 산출물 | `docs/design/phase-1b2b/captures/` **미수정** (불량 캡처 보존) |
| PASS 캡처 | `docs/design/phase-1b2b/rendering-qa/captures/` |

**권장 운영:** 시각 QA 전 `npm run build` → **해당 빌드와 동일 `.next`를 쓰는** `next start` 포트 확인 → Method grid `display:grid`·Records `background-color: rgb(11, 31, 70)` assert 후 캡처. 3000/3001 등 **기존 프로세스는 사용자 확인 전 종료하지 않음.**
