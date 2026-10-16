# Phase 1-B1 검토 전달

## 코드 적용

- **완료** — Hero + Service Gateway만 로컬 반영
- Commit / Push / Vercel 배포 **없음**

## V1.1 방향 일치

- 데스크톱 B: 영문 Display 우선(시각), 한글 H1 시맨틱, 좌우 스플릿
- 모바일 A: 한글 H1 우선, 이미지가 CTA 위
- Gateway: 3카드, accent bar, 번호 없음, 전체 카드 링크
- `docs/design/phase-1a/` 파일 부재 → 지시서 문구·색·크기를 구현 기준으로 사용

## 히어로 사진

- **임시 상태** — `HOME_HERO_IMAGE` (`/images/spokedu/home/field-editorial/home-hero-gym-motion.jpg`)
- V1.1 후보 3종 **공개 사용 승인 미확인**
- 승인 전 Production 배포 **불가**

## 주요 시각 차이 (이전 main 대비)

- Hero: 영문 H1 → 한글 H1 + 영문 보조, 본문·eyebrow 문구 V1.1 확정안
- Gateway: 「무엇을 찾고 계신가요?」 행 목록 → 「필요한 서비스로…」 + 3카드

## Phase 1-B1 잔여

1. 히어로 사진 승인·교체(별도 지시)
2. Phase 1-A HTML과의 픽셀 대조(자료 동기화 후)
3. 키보드 포커스 수동 QA
4. 사용자 화면 승인 후 Phase 1-B2

## 검토 패키지

- `IMPLEMENTATION_REPORT.md`
- `QA_RESULTS.md`
- `captures/*.png`
- `phase-1b1-source.diff`
- `SPOKEDU_Phase1B1_REVIEW.zip` (Downloads)
