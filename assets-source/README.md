# SPOKEDU local asset originals (not published)

Place high-res source files here for bake scripts.  
These files are **gitignored** — do not commit multi‑MB originals into `public/`.

## Hero (Home + /education shared)

Drop this exact filename:

```
assets-source/spokedu/home/KakaoTalk_Photo_2026-08-10-17-42-37_18_.jpeg
```

| Field | Value |
|---|---|
| Context | 서울위례초등학교 · 2026.08.10 배구형 스포츠 |
| Drive path | 수업 사진 및 영상 / 강동구청 여름방학 특강 / 위례초등학교 / 활동사진 / 2026.08.10 배구형 스포츠 / KakaoTalk_Photo_2026-08-10-17-42-37_18_.jpeg |
| Drive file ID | `1CvUlPEbLJLSz1t39ivmbt2UZYtzKveDO` |
| Expected size | ~5712×4284 · ~4.42MB JPEG |

Then run:

```bash
node scripts/fix-home-field-editorial-images.mjs
```

Output web derivative only:

`public/images/spokedu/home/field-editorial/home-hero-field.webp`
