# SPOKEDU Home — 최종 승인 체크리스트

코드·QA 자동화까지 완료 후, **운영자 눈으로만** 확인하는 항목입니다.

## 1. 사진 (가장 큼)

`public/images/spokedu/PHOTO_REQUEST.md` 파일명 그대로 덮어쓰기.

우선 5장: Hero + 현장 4 (`records/yangcheon` … `playz`).

## 2. 자동 QA

```bash
node scripts/spokedu-home-images-qa.mjs http://localhost:3000
```

- `pass: true`
- 스크린샷: `.qa-spokedu/home-images/home-{360,390,430,desktop}.png`

## 3. 수동 4 viewport (각 30초)

| 뷰포트 | 확인 |
|--------|------|
| 360 | 가로 스크롤 없음, H1 2줄, 운영 증거 칩 2열 |
| 390 | 게이트 카드 3열 전 화면 스크롤 자연스러움 |
| 430 | Hero·현장 대표 사진 잘림 없음 |
| desktop | 섹션 좌측 시작선 일치, 현장 대표 카드가 가장 큼 |

## 4. 공유·성능

- [ ] 카카오/문자 OG 미리보기 (Home URL)
- [ ] Lighthouse LCP Hero &lt; 2.5s (desktop, Fast 4G)

## 5. 100% 아님으로 남는 것 (스톡 유지 시)

- Pexels 스톡 = “우리 현장” 체감 한계
- 동일 장면 복사 슬롯 (`images.ts` `placeholder-copy` 참고)

**코드 준비:** ~96% — 실사 드롭인 + `PHOTO_DROPIN_100.md` B·C 완료 시 **100%**.
