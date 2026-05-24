# 사진 넣으면 100% — 운영 체크리스트

**전제:** 아래 코드·QA가 이미 통과한 상태입니다. **실사 JPG/WebP만** `PHOTO_REQUEST.md` 파일명으로 덮어쓰면 됩니다.

## A. 사진 넣기 전 (개발·에이전트)

```bash
node scripts/verify-spokedu-image-slots.mjs
node scripts/spokedu-home-images-qa.mjs http://localhost:3000
node scripts/spokedu-landings-visual-qa.mjs http://localhost:3000
node scripts/spokedu-qa.mjs http://localhost:3000
```

| 스크립트 | pass 조건 |
|----------|-----------|
| `verify-spokedu-image-slots` | PHOTO_REQUEST 경로 전부 파일 존재 (스톡 OK) |
| `spokedu-home-images-qa` | Home 4 viewport, placeholder 0 |
| `spokedu-landings-visual-qa` | 퍼널 8페이지 overflow·이미지 0 |
| `spokedu-qa` | 20경로 HTTP·H1·CTA A등급 |

스크린샷: `.qa-spokedu/home-images/`, `.qa-spokedu/landings/`

## B. 사진 넣기 (운영자)

1. **1차 5장** (체감 최대): `home/home-hero-movement.jpg` + `records/` 4장  
2. **2차 3장**: private / dispatch / curriculum Hero·게이트용  
3. **3차 5장**: programs/*  
4. 가로 **1600px+**, 밝기·색감 **비슷하게** (한 번에 보정 권장)

## C. 사진 넣은 직후 (10분)

- [ ] 1. 위 4개 스크립트 **다시 pass**
- [ ] 2. `/spokedu` 새로고침 — Hero·현장 4카드 **스톡 냄새 없음**
- [ ] 3. About / Private / Programs Hero **실사로 바뀜**
- [ ] 4. **360·390** — 가로 스크롤 없음, H1 과도한 5줄 없음
- [ ] 5. **Desktop** — 섹션 왼쪽 시작선 일치
- [ ] 6. **카카오·문자** Home URL OG 미리보기
- [ ] 7. **Lighthouse** (desktop) Home LCP Hero **&lt; 2.5s**
- [ ] 8. 문의 `/spokedu/contact?type=private` 폼 정상
- [ ] 9. `records/dongjak`, `cases/hero` 등 **전용 실사**로 교체됐는지 (복사본이면 2차 촬영)
- [ ] 10. 배포 후 `node scripts/spokedu-post-deploy-check.mjs https://PRODUCTION_URL`

## D. 100% 정의

| 항목 | 사진만 | B+C 전부 |
|------|--------|----------|
| 신뢰·브랜드 체감 | ◎ | ◎ |
| 레이아웃·코드 | (이미 완료) | ◎ |
| OG·LCP·QA | △ | ◎ |

**코드 준비 상태:** 사진 드롭인만 하면 **B+C 완료 시 100%**로 간주.

참고: `HOME_SIGNOFF.md`, `LANDING_UNIFY.md`, `HOME_GLOBAL_100.md`
