# SPOKEDU MASTER 홈용 16:9 수업 썸네일

## 규격
- 비율 **16:9** (권장 1920×1080 또는 1280×720)
- 포맷 **JPEG** 또는 **WebP**, 파일명 `hero.jpeg` / `hero.webp`
- 현장 수업·아이 움직임이 한눈에 보이는 컷 (텍스트 오버레이 최소)

## 경로 (프로그램 slug당 1폴더)
```
public/images/spokedu-master/programs/{slug}/hero.jpeg
```
예: `funstick-fencing` → `/images/spokedu-master/programs/funstick-fencing/hero.jpeg`

## data.ts 연결
`app/spokedu-master/lib/data.ts` 해당 프로그램에:
- `thumbnailUrl`
- `lessonDetail.heroImageUrl`

## 점검
```bash
node scripts/spokedu-master-home-visual-audit.mjs
```
