# SPOKEDU `/spokedu` 라이브 스모크 테스트

오픈 직전·배포 직후 **브라우저에서 직접** 확인하는 체크리스트입니다.  
코드 변경 없이, 실제 URL(Preview 또는 Production) 기준으로 진행합니다.

관련 문서: [spokedu-launch-checklist.md](./spokedu-launch-checklist.md) · 환경변수: [`.env.example`](../.env.example)

---

## 사전 준비

- [ ] 테스트 URL 확정 (로컬 `http://localhost:3000` / Vercel Preview / Production)
- [ ] 데스크톱 + 모바일(또는 DevTools 반응형) 각 1회 이상
- [ ] 브라우저 콘솔 열어 hydration·404·스크립트 오류 확인

---

## 1. 직접 확인할 주요 페이지

각 URL이 **200으로 열리고**, 헤더·푸터·본문이 깨지지 않는지 확인합니다.

| # | URL | 확인 | 비고 |
|---|-----|:----:|------|
| 1 | `/spokedu` | [ ] | 홈 — Hero, Visitor Gate, Field Records, Program System, Final CTA |
| 2 | `/spokedu/about` | [ ] | 브랜드 소개 |
| 3 | `/spokedu/private` | [ ] | 개인·소그룹 |
| 4 | `/spokedu/dispatch` | [ ] | 기관 파견 |
| 5 | `/spokedu/curriculum` | [ ] | 커리큘럼·콘텐츠 |
| 6 | `/spokedu/programs` | [ ] | 프로그램 카탈로그 |
| 7 | `/spokedu/records` | [ ] | 현장기록 허브 |
| 8 | `/spokedu/cases` | [ ] | 수업 사례 목록 |
| 9 | `/spokedu/monthly` | [ ] | 월간 스포키듀 |
| 10 | `/spokedu/insights` | [ ] | 교육 인사이트 |
| 11 | `/spokedu/contact` | [ ] | 문의 — 유형 선택 + 폼 |

**프로그램 상세 (Programs에서 진입)**

| URL | 확인 |
|-----|:----:|
| `/spokedu/programs/spomove` | [ ] |
| `/spokedu/programs/paps` | [ ] |
| `/spokedu/programs/oneday-event` | [ ] |
| `/spokedu/programs/camp` | [ ] |

**사례·월간 상세 (1개 이상 샘플)**

| URL | 확인 |
|-----|:----:|
| `/spokedu/cases/yangcheon-spomove` | [ ] |
| `/spokedu/monthly/2026-05` (또는 목록 첫 항목) | [ ] |

---

## 2. 사용자 흐름 체크

각 흐름을 **처음부터 끝까지** 따라가며, 링크·CTA가 끊기지 않고 Contact까지 자연스럽게 이어지는지 확인합니다.

### 2-1. Home → Private → Contact

- [ ] `/spokedu` — 「필요한 수업 방향 찾기」 또는 Visitor Gate 「학부모」 카드 → `/spokedu/private`
- [ ] Private 히어로·본문 CTA → `/spokedu/contact?type=private` (또는 동등한 문의 링크)
- [ ] Contact에서 **개인·소그룹 수업** 유형이 선택·폼이 표시됨

### 2-2. Home → Dispatch → Contact

- [ ] Home — Visitor Gate 「기관」 또는 hero 「기관 수업 제안」 → `/spokedu/dispatch`
- [ ] Dispatch CTA → `/spokedu/contact?type=dispatch` (제안서 링크는 `proposal=true` 포함 가능)
- [ ] Contact에서 **기관 파견** 유형·폼 표시

### 2-3. Home → Curriculum → Contact

- [ ] Home — Visitor Gate 「강사·파트너」 또는 hero 「커리큘럼 문의」 → `/spokedu/curriculum`
- [ ] Curriculum CTA → `/spokedu/contact?type=curriculum`
- [ ] Contact에서 **커리큘럼·콘텐츠** 유형·폼 표시

### 2-4. Home → Programs → Program Detail → Contact

- [ ] Home — Program System 카드 또는 「프로그램 전체 보기」 → `/spokedu/programs`
- [ ] 카탈로그에서 프로그램 선택 → 상세 (예: SPOMOVE → `/spokedu/programs/spomove`)
- [ ] 상세 하단 CTA → Contact (`type=private` 또는 `type=dispatch` — 프로그램에 맞는지 확인)
- [ ] Contact 폼 유형이 CTA 의도와 일치

### 2-5. Home → Records → Cases → Contact

- [ ] Home — Field Records 카드 또는 「현장기록 더 보기」 → `/spokedu/records` 또는 사례 상세
- [ ] Records → 「수업 사례」 → `/spokedu/cases`
- [ ] 사례 카드/상세 → Contact (`type=dispatch` 등)
- [ ] 문의까지 흐름이 끊기지 않음

### 2-6. (선택) Home → About → 주요 페이지

- [ ] `/spokedu/about` — 3역할 카드 → private / dispatch / curriculum 각 1회
- [ ] About final CTA → 해당 랜딩으로 연결 (contact 직링크 없음 — 랜딩 경유 후 문의)

---

## 3. Contact 쿼리 체크

아래 URL을 **직접 열었을 때** 해당 문의 유형이 자동 선택되고, prefill·폼 영역 스크롤이 기대대로인지 확인합니다.

| URL | 기대 동작 | 확인 |
|-----|-----------|:----:|
| `/spokedu/contact?type=private` | 개인·소그룹 폼 선택 | [ ] |
| `/spokedu/contact?type=dispatch` | 기관 파견 폼 선택 | [ ] |
| `/spokedu/contact?type=curriculum` | 커리큘럼·콘텐츠 폼 선택 | [ ] |
| `/spokedu/contact?type=private&classType=1to1` | 개인 폼 + 희망 수업 형태 「1:1 개인 체육수업」 | [ ] |
| `/spokedu/contact?type=private&classType=small-group` | 개인 폼 + 「2~4명 소그룹 수업」 | [ ] |
| `/spokedu/contact?type=dispatch&proposal=true` | 기관 폼 + 제안서 필요 「필요」, 기본 문의 문구 | [ ] |
| `/spokedu/contact?type=curriculum&intent=partnership` | 커리큘럼 폼 + 제휴·콘텐츠 필드 prefill | [ ] |

추가 확인:

- [ ] 유형 선택 후 「문의 접수하기」 버튼·`data-track-label` 동작 (네트워크/콘솔 오류 없음)
- [ ] 푸터·사이드바 전화/이메일 링크 클릭 가능 (`tel:` / `mailto:`)

---

## 4. 금지 문구 체크

화면(본문·버튼·푸터·폼·이미지 대체 텍스트)에 **아래 문자열이 보이면 실패**입니다.

- `TODO`
- `준비 중` / `준비중`
- `placeholder` (사용자에게 보이는 문구로)
- `example.com`
- `help@spokedu.com`
- `slot:` (UI 노출)
- `교체하세요`

확인 방법:

- [ ] 위 11개 주요 페이지를 눈으로 훑기
- [ ] (선택) 저장소 검색 — 개발용만 해당되는지 구분

```bash
rg -i "TODO|준비.?중|help@spokedu|example\\.com|교체하세요" app/spokedu --glob "*.{tsx,ts}"
```

허용: 실제 연락처 `spokedu77@gmail.com`, 컴포넌트명 `ImagePlaceholder`(화면 미노출).

---

## 5. 모바일 체크

뷰포트 **375px 전후**(iPhone SE/class) 또는 실기기에서 확인합니다.

### Home (`/spokedu`)

- [ ] 첫 화면(스크롤 전)에서 **H1**과 주 CTA 「필요한 수업 방향 찾기」가 보임
- [ ] Hero 이미지가 레이아웃을 깨지 않음 (가로 스크롤 없음)
- [ ] **Visitor Gate** 3카드가 세로 또는 그리드로 읽기 쉽게 배치됨
- [ ] Field Records 2×2 그리드 터치 가능
- [ ] Program System — SPOMOVE featured + compact 2×2 터치 가능

### Contact (`/spokedu/contact`)

- [ ] 유형 선택 카드 3개 탭·스크롤 편함
- [ ] 입력 필드·select가 화면 밖으로 잘리지 않음
- [ ] 「문의 접수하기」 sticky 영역이 입력을 가리지 않음 (또는 acceptable)

### 공통

- [ ] 주요 버튼·카드 링크 **터치 영역** 충분 (대략 44px 이상)
- [ ] 이미지가 과도하게 크거나 작지 않음 (깨진 이미지 아이콘 없음 — fallback gradient 허용)
- [ ] 헤더 「문의하기」·모바일 nav 스크롤 가능

---

## 6. 환경변수 (요약)

상세: [spokedu-launch-checklist.md §2](./spokedu-launch-checklist.md#2-next_public_site_url-설정) · [`.env.example`](../.env.example)

| 변수 | 필수 여부 | 설명 |
|------|-----------|------|
| `NEXT_PUBLIC_SITE_URL` | 도메인 연결 **후** Production 필수 | OG·canonical·sitemap 절대 URL 기준 |

**동작 우선순위** (`app/spokedu/lib/site-url.ts`):

1. `NEXT_PUBLIC_SITE_URL` (설정 시)
2. `VERCEL_URL` → `https://${VERCEL_URL}` (Preview/Production 배포)
3. 없으면 `http://localhost:3000`

**주의**

- 도메인 연결 **전**: 비워도 Preview는 `VERCEL_URL` 기준으로 동작
- 도메인 연결 **후**: 실제 서비스 URL로 설정하고 Redeploy
- **아직 `spokedu.com`을 쓰지 않는다면** `NEXT_PUBLIC_SITE_URL`에 `spokedu.com`을 넣지 말 것

```env
NEXT_PUBLIC_SITE_URL=https://실제도메인
```

(끝 슬래시 없이)

---

## 7. sitemap / robots (요약)

| 항목 | 상태 |
|------|------|
| `/spokedu` 크롤 | **차단 없음** (`allow: /`) |
| 차단 경로 | `/admin/`, `/api/`, `/login`, `/teacher/` |
| sitemap 생성 | `app/sitemap.ts` — **현재 host** (`getSpokeduSiteUrl`) 기준 URL 목록 |
| robots | `app/robots.ts` — 동일 host로 `sitemap.xml`·`host` 지정 |
| `public/robots.txt` | 정적 규칙만; sitemap URL은 **앱 `robots.ts`가 authoritative** |

오픈 후 수동 확인:

- [ ] `https://{실제도메인}/robots.txt` — disallow·sitemap URL 호스트 일치
- [ ] `https://{실제도메인}/sitemap.xml` — `/spokedu` 및 주요 하위 URL 포함
- [ ] 도메인 연결·`NEXT_PUBLIC_SITE_URL` 변경 후 **sitemap URL 재확인** (네이버·구글 재제출)

---

## 8. 공유·SEO 빠른 확인 (선택)

- [ ] 홈 링크 카카오톡 공유 — 제목·설명·이미지 미리보기
- [ ] `<title>` / meta description이 페이지별로 다름 (탭 제목 확인)
- [ ] Production 배포 후 OG 디버거로 캐시 갱신

---

## 결과 기록

| 항목 | 날짜 | 테스터 | Pass / Fail | 메모 |
|------|------|--------|-------------|------|
| 주요 11페이지 | | | | |
| 사용자 흐름 5종 | | | | |
| Contact 쿼리 7종 | | | | |
| 금지 문구 | | | | |
| 모바일 | | | | |
| sitemap/robots | | | | |

**Fail 시**: URL·스크린샷·콘솔 오류를 이슈에 남기고, 링크/쿼리만 최소 수정 후 재테스트.
