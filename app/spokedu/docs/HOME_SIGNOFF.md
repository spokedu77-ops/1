# SPOKEDU Home — 최종 승인 체크리스트

실행일: 2026-07-24  
담당: 코드 보완 완료 → **운영자 시각·공유·성능 승인 남음**

## 1. 사진 (가장 큼)

`public/images/spokedu/PHOTO_REQUEST.md` 파일명 그대로 덮어쓰기.

최우선: `home/home-hero-movement.jpg` (풀블리드 Hero) + 기관/개인/SPOMOVE/사례 4컷.

- [x] Hero 슬롯 = `home-hero-movement.jpg` (코드·OG 정렬)
- [x] `.bak-src` 원본 백업 제거
- [ ] 운영자가 Hero·사례 컷 **실사 퀄리티** 최종 OK

## 2. 첫 화면 (풀블리드)

- [x] Hero가 edge-to-edge 사진 + SPOKEDU 브랜드 + H1 + CTA 2개만
- [x] 떠 있는 캡션 카드/배지 없음
- [ ] 헤더가 Hero 위에서 밝은 글자(스크롤 후 라이트 헤더) — 브라우저 확인
- [ ] 360 / 390 / 430 / desktop — 가로 스크롤 없음 — 캡처 승인

## 3. 공유·성능

- [x] OG 이미지 = Hero와 동일 슬롯, twitter images 포함
- [x] Hero LCP preload (`imageSizes=100vw`, type)
- [ ] 카카오/문자 OG 미리보기 (Home URL) — 배포 후 확인
- [ ] Lighthouse LCP Hero &lt; 2.5s (desktop, Fast 4G)

## 4. 100% 아님으로 남는 것

- 위 미체크(시각·Lighthouse·카카오 OG)만 남으면 운영 100%
- 서브랜딩(private/dispatch/curriculum)은 이번 범위 밖 — 홈 톤과 다소 다를 수 있음
