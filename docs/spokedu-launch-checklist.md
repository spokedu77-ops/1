# SPOKEDU `/spokedu` 오픈 전 체크리스트

실제 도메인(`spokedu.com` 등) 연결 전·후에 확인할 항목입니다. 코드 기본값은 **spokedu.com을 쓰지 않습니다** (`app/spokedu/lib/site-url.ts`).

---

## 1. 도메인 연결 전 (Preview / Staging)

- [ ] Preview URL에서 `/spokedu` 홈·하위 페이지가 정상 렌더되는지 확인
- [ ] 콘솔에 hydration / nested `<a>` 경고 없음
- [ ] `metadataBase`가 Preview 호스트 기준인지 확인 (아래 OG 절차)
- [ ] 문의 폼 제출이 동작하는지 확인 (Supabase/이메일 연동 환경)
- [ ] `brandChannels` 빈 `href` 채널이 UI에 노출되지 않는지 확인 (`isChannelLive`)
- [ ] placeholder 이메일·example URL·`help@spokedu.com` 문구가 화면에 없는지 검색

```bash
rg -i "TODO|placeholder|준비중|help@spokedu|example\\.com" app/spokedu
```

---

## 2. `NEXT_PUBLIC_SITE_URL` 설정

필수 환경변수(도메인 연결 후 Production): **`NEXT_PUBLIC_SITE_URL`**

| 환경 | 설정 | 동작 |
|------|------|------|
| Preview / Staging | **비워도 됨** | `VERCEL_URL` → `https://${VERCEL_URL}` 자동 |
| Local | `.env.local` 권장 | 비우면 `http://localhost:3000` |
| Production (도메인 연결 후) | **실제 서비스 URL** | OG·canonical·sitemap 절대 URL |

우선순위 (`app/spokedu/lib/site-url.ts` → `getSpokeduSiteUrl`):

1. `NEXT_PUBLIC_SITE_URL`
2. `VERCEL_URL` → `https://${VERCEL_URL}`
3. 없으면 `http://localhost:3000`

**주의**

- 코드 기본값으로 `spokedu.com`을 **쓰지 않습니다**.
- **아직 `spokedu.com` 도메인을 쓰지 않는다면** `NEXT_PUBLIC_SITE_URL`에 `spokedu.com`을 넣지 마세요.
- 도메인 연결 전 Preview는 env 없이도 동작합니다. 연결 후에만 실제 도메인을 설정하고 Redeploy하세요.

```env
# .env.local 또는 Vercel Production
NEXT_PUBLIC_SITE_URL=https://실제도메인
```

(프로토콜 포함, 끝 슬래시 없이)

라이브 확인: [spokedu-live-smoke-test.md](./spokedu-live-smoke-test.md)

---

## 3. Vercel Production 환경변수

- [ ] `NEXT_PUBLIC_SITE_URL` — 실제 서비스 URL (슬래시 없이)
- [ ] `NEXT_PUBLIC_GA_MEASUREMENT_ID` — 사용 시
- [ ] Supabase / 문의 API 관련 키 (프로젝트 루트 규칙 참고)
- [ ] Production 배포 후 **Redeploy**로 env 반영

---

## 4. OG 이미지

- [ ] `metadataBase` + `openGraph.images` 절대 URL이 실제 호스트와 일치
- [ ] 홈: `/images/spokedu/home/home-hero-movement.jpg` (1200×800 권장)
- [ ] 페이지별 OG: `app/spokedu/data/seo.ts` `OG_BY_PAGE` 참고
- [ ] 프로그램·사례 상세: slug별 이미지 로드 확인

파일 위치: `public/images/spokedu/{category}/`

---

## 5. 카카오톡 / 문자 공유 미리보기

- [ ] Production URL로 [카카오 OG 디버거](https://developers.kakao.com/tool/debug/og) 캐시 갱신
- [ ] 제목·설명이 `seo.ts` 문구와 일치하는지 확인
- [ ] 이미지 1:1.91 비율 권장(미리보기 잘림 여부)
- [ ] iOS/Android 각 1회 공유 테스트

---

## 6. 네이버 서치어드바이저

- [ ] 사이트 등록 (도메인 확정 후)
- [ ] 소유 확인 (HTML 메타 / 파일)
- [ ] `sitemap.xml` 제출 (앱 루트 sitemap에 `/spokedu` 포함 여부 확인)
- [ ] 대표 URL: `/spokedu` 또는 루트 리다이렉트 정책 결정

---

## 7. 구글 서치콘솔

- [ ] 속성 추가 (URL prefix 또는 도메인)
- [ ] sitemap 제출
- [ ] `/spokedu` 주요 URL 색인 요청 (홈, programs, contact 등)
- [ ] `robots.txt`에서 크롤 허용 확인

---

## 8. 실제 스포키듀 사진으로 교체할 이미지

`app/spokedu/data/images.ts` → `spokeduPageImageMap` 기준.  
경로: `public/images/spokedu/{category}/{file}`

| 페이지 | 섹션 | 파일(예) |
|--------|------|-----------|
| Home | Hero | `home/home-hero-movement.jpg` |
| Home | LAB / Dispatch | `home-lab-energy.jpg`, `home-dispatch-scene.jpg` |
| Private | 1:1, 소그룹, 교구 | `private/*.jpg` |
| Dispatch | 기관, 키움, 원데이 | `dispatch/*.jpg` |
| Curriculum | 수업안, 교구, 강사교육, 자료 | `curriculum/*.jpg` |
| Programs | SPOMOVE, PAPS, 놀이체육, 원데이, 캠프, 커리큘럼 | `programs/*.jpg` |
| Records | LAB, 양천, 동작, 다사랑, PLAYZ, 서대문 | `records/*.jpg` |
| Cases | hero, representative | `cases/*.jpg` |
| Monthly | hero, representative | `monthly/*.jpg` |

교체 후: alt 문구(`images.ts`)가 실제 장면과 맞는지, 용량(웹 최적화) 확인.

---

## 9. 오픈 전 숨김·비노출 확인

- [ ] `isPending: true` 소셜 채널 링크 미노출
- [ ] `example.com` URL 필터 (`brand.ts` `isExternalChannelHrefReady`)
- [ ] 월간/사례 상세 `ImagePlaceholder` — 실사 없으면 gradient만 (깨진 img 없음)
- [ ] admin·내부 경로가 퍼블릭 nav에 없음
- [ ] DEV 전용 문구·테스트 CTA 없음

---

## 10. 홈·전환 최종 스모크 (수동)

- [ ] Hero CTA: 「필요한 수업 방향 찾기」→ Visitor Gate
- [ ] Visitor Gate 3축: 학부모 / 기관 / 강사·파트너
- [ ] Field Records 4카드 + 「현장기록 더 보기」
- [ ] Program System: SPOMOVE featured + 4 compact + 「프로그램 전체 보기」 1개
- [ ] Final CTA 3분기 + 문의 링크

---

## 참고 파일

- SEO 메타: `app/spokedu/data/seo.ts`
- Site URL: `app/spokedu/lib/site-url.ts`
- Layout metadata: `app/spokedu/layout.tsx`
- 홈 데이터: `app/spokedu/data/home-page.ts`
