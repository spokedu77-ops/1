# RC-1 스크린샷 수동 캡처 가이드

자동 E2E(Playwright 등)는 프로젝트에 없으며, 로그인·환경 의존으로 여기서 PNG를 생성하지 않았습니다.
아래 파일명으로 **브라우저에서 직접** 저장한 뒤 이 폴더에 두면 RC-1 산출물이 완성됩니다.

| 파일명 | 캡처 대상 |
|--------|-----------|
| `pro-landing-desktop.png` | `/pro` 데스크톱 뷰포트(예: 1280px) |
| `pro-dashboard-desktop.png` | `/spokedu-pro` 로드맵(구독자) 데스크톱 |
| `library-desktop.png` | `/spokedu-pro` → 프로그램 라이브러리 |
| `program-drawer-desktop.png` | 프로그램 카드 → 드로어 열림 |
| `spomove-desktop.png` | SPOMOVE(스크린플레이) 라이브러리 또는 실행 전 화면 |
| `report-tools-desktop.png` | AI 리포트 또는 보조기능(tools) 탭 |
| `pro-dashboard-mobile.png` | `/spokedu-pro` 로드맵 모바일(예: iPhone 12) |
| `program-drawer-mobile.png` | 드로어 모바일 |

Chrome: `Ctrl+Shift+P` → “Capture full size screenshot” 또는 DevTools 디바이스 툴바로 뷰포트 맞춘 뒤 캡처.
