# Phase 1-B4C — ROOT_CAUSE_REPORT

## 현상

- Gateway·Records 등 B1 JSX는 `gatewayCards` / `tileCard` 구조인데 CSS는 구 `gatewayRow` / `tileCaption` 위주로 남아 있음.
- CSS Modules는 **미정의 클래스를 런타임에 조용히 무시** → DOM은 있으나 카드·패널 스타일 붕괴.

## Git·병합 맥락

- 기준 커밋 `88013dfb`: B1 카드·타일·LAB 훅 CSS 포함.
- 이후 `main` (`c1a7ec52` 기준) CSS는 Hero·일부 공통만 갱신(B4B)되고 **Gateway/Records/Method/LAB 전용 규칙이 빠진 상태**로 JSX만 B1~B3B 구조 유지.

## 고객 영향

- 서비스 3카드: 테두리·3열 Grid·링크 구역 없음.
- Field Records: 이미지/정보 패널 분리 실패.
- Method UI 프레임·LAB 모바일 contain 등 미적용.

## 재발 방지

- `home-css-contract.mjs`: TSX `styles.*` ↔ CSS 소스 **누락 0** (exit 1).
- `home-visual-qa.mjs`: 카드 좌표·Records 배경·LAB object-fit·Hero CTA viewport 검사.
