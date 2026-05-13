# DEV_NOTES

## 작업 날짜

- 2026-05-13 (세션 1): Phase 1 방향 확정, 데이터 기반 정리, 전체 화면 초기 구현
- 2026-05-13 (세션 2): 홈 화면 다듬기, 라이브러리 버그 수정, SPOMOVE/플랜 문구 개선

---

## 작업 기준

**반드시 `app/spokedu-master`만 수정한다.**
- `subscription-new`에 새로 구현하지 말 것.
- 기존 `spokedu-pro`를 직접 확장하지 말 것.
- 참고할 장점만 MASTER에 흡수한다.

---

## 수정한 파일

### 세션 1 (Phase 1 기반 정리)
- `app/spokedu-master/lib/data.ts`
- `app/spokedu-master/store/index.ts`
- `app/spokedu-master/shop/page.tsx`
- `app/spokedu-master/components/ui/BottomSheet.tsx`
- `app/spokedu-master/components/layout/AppShell.tsx`
- `app/spokedu-master/components/layout/StatusBar.tsx`
- `app/spokedu-master/components/layout/TabBar.tsx`
- `app/spokedu-master/components/operations/OperationsPanel.tsx`
- `app/spokedu-master/onboarding/page.tsx`
- `app/spokedu-master/dashboard/DashboardView.tsx`
- `app/spokedu-master/library/LibraryView.tsx`
- `app/spokedu-master/spomove/SpomoveHubView.tsx`
- `app/spokedu-master/spomove/session/page.tsx`
- `app/spokedu-master/report/page.tsx`
- `app/spokedu-master/profile/page.tsx`
- `app/spokedu-master/students/page.tsx`
- `app/spokedu-master/class-record/page.tsx`
- `app/spokedu-master/director/page.tsx`
- `app/spokedu-master/parent/[studentId]/page.tsx`

### 세션 2 (홈/라이브러리/플랜 개선)
- `app/spokedu-master/dashboard/DashboardView.tsx`
- `app/spokedu-master/lib/data.ts`
- `app/spokedu-master/library/LibraryView.tsx`
- `app/spokedu-master/profile/page.tsx`
- `app/spokedu-master/spomove/SpomoveHubView.tsx`

---

## 해결한 문제

### 제품 방향 (세션 1)
- 작업 기준을 `SPOKEDU MASTER`로 고정했다. `subscription-new`, `spokedu-pro`와의 혼선 해소.
- Phase 1은 `라이브러리 + SPOMOVE + 수업 설명 도구 + 최근 사용/즐겨찾기 + 안심형 플랜` 중심.
- 수업 기록, 원생/반, 카카오 발송, 학부모 웹뷰, 원장 대시보드는 Phase 2/3로 분류.
- 홈은 관리자 대시보드가 아니라 수업 시작점이어야 한다는 원칙 확정.

### 데이터 기반 (세션 1)
- `lib/data.ts` 프로그램/SPOMOVE 드릴/수업 상세 문구를 정상 한글로 재작성.
- `store/index.ts` 기본 프로필/수업/학생/알림 문구를 정상 한글로 정리.
- `persist` version을 8로 올리고 localStorage 깨진 데이터 감지 시 기본값으로 교체.

### 화면 구현 (세션 1)
- 교구 스토어(`shop/page.tsx`): 교구 구매 흐름으로 재구성. `교구 스토어 / 장바구니 / 주문 요청` 중심.
- 상단 상태바: `SPOKEDU PRO / 수업 준비와 SPOMOVE 실행 구독 플랫폼`으로 정리.
- 온보딩: 첫 문장 `수업 준비는 쉽게, 수업은 더 몰입감 있게`. 라이브러리/SPOMOVE/설명 도구 중심으로.
- 홈: Hero CTA 중복 줄임. `오늘 수업 루프` 섹션 추가(고르기→움직이기→설명하기).
- 라이브러리: 필터 정리, 즐겨찾기 레일, 빈 결과 복구 버튼, 선택 가이드 추가.
- SPOMOVE: Projector/Class Mode 실행 중 측정 카드/반응시간 배지 숨김, 얇은 진행선만 남김. 완료 문구 모드별 분리(`세션 완료 / 큰 화면 실행 완료 / 수업 실행 완료`).
- 수업 설명 도구: 단일 문구 복사 → 대상별 템플릿 세트(학부모용/기관용/학교기록용/홍보용).
- 내 정보/플랜: `플랜과 도입 방식`으로 표현 변경. 운영 확장 프리뷰 섹션 추가.
- Phase 2/3 화면(`class-record`, `students`, `director`, `parent`): 삭제 않고 과장 문구만 낮춤.
- 메인 탭: `홈 / 라이브러리 / SPOMOVE / 설명 / 내 정보` 고정.

### 홈·라이브러리 개선 (세션 2)
- **Hero 섹션 제거**: ClassLoop과 완전히 동일한 3개 링크(라이브러리/SPOMOVE/설명)가 중복되어 콘텐츠 전에 내비게이션만 반복되는 구조였음. Hero 삭제 후 헤더에 tagline 통합.
- **시간대별 인사말**: 항상 `좋은 아침이에요`였던 것을 `좋은 아침이에요 / 오후도 힘내세요 / 오늘도 수고하셨어요`로 분리.
- **getTodayProgram() 추출**: `lib/data.ts`에 요일 기반 추천 함수 추가. 홈(TodayRecommendation)과 라이브러리(FeaturedRail)가 같은 날에 같은 프로그램을 추천하도록 일관성 확보.
- **라이브러리 FeaturedRail 버그**: 항상 `PROGRAMS[0]`만 노출되던 것을 요일 기반으로 교체.
- **var(--spm-br) 버그**: LibraryView ProgramListItem과 SpomoveHubView 최근 실행 카드에서 정의되지 않은 CSS 변수 사용 → `var(--spm-br2)`로 수정.
- **Lite 플랜 안내 문구**: 개발자 노트 투의 내부 언어 → `Lite 플랜은 현재 준비 중입니다. 관심 등록 후 출시되면 안내드립니다.`로 소비자용 문구로 교체.

### 검증 (세션 2 기준 최신)
- `npx tsc --noEmit --pretty false` 통과 (baseUrl deprecated 경고는 기존 tsconfig 문제, 우리 변경과 무관)
- `npm run lint:ci` 통과
- `rg "[\x{4E00}-\x{9FFF}\x{F900}-\x{FAFF}\x{FFFD}]" app/spokedu-master -n` 결과 없음
- `rg "[ㅏ-ㅣㄱ-ㅎ]{2,}" app/spokedu-master -n` 결과 없음

---

## 현재 화면 구조 (세션 2 기준)

### 메인 탭 5개 (Phase 1 핵심)
| 탭 | 라우트 | 파일 | 상태 |
|---|---|---|---|
| 홈 | `/dashboard` | `dashboard/DashboardView.tsx` | ✅ 완성 |
| 라이브러리 | `/library` | `library/LibraryView.tsx` | ✅ 완성 |
| SPOMOVE | `/spomove` | `spomove/SpomoveHubView.tsx` | ✅ 완성 |
| 설명 | `/report` | `report/page.tsx` | ✅ 완성 |
| 내 정보 | `/profile` | `profile/page.tsx` | ✅ 완성 |

### 세부 라우트
| 라우트 | 파일 | 상태 |
|---|---|---|
| `/library/[id]` | `library/[id]/page.tsx` | 수업안 상세 |
| `/spomove/session` | `spomove/session/page.tsx` | SPOMOVE 실행 화면 |
| `/shop` | `shop/page.tsx` | 교구 스토어 (견적 요청 수준) |
| `/onboarding` | `onboarding/page.tsx` | 최초 온보딩 |

### Phase 2/3 보존 라우트 (내 정보 > 운영 확장 프리뷰에서만 진입)
| 라우트 | 파일 | 비고 |
|---|---|---|
| `/class-record` | `class-record/page.tsx` | 수업 기록 프리뷰 |
| `/students` | `students/page.tsx` | 학생 이력 프리뷰 |
| `/director` | `director/page.tsx` | 센터 운영 프리뷰 |
| `/parent/[studentId]` | `parent/[studentId]/page.tsx` | 보호자 공유 화면 |

---

## 남은 문제

- **SPOMOVE 수업 설명 도구에 "전체 복사" 없음**
  - 현재는 블록별 복사만 가능. 선택한 대상(학부모용 등)의 문구 3개를 한 번에 복사하는 기능이 없다.

- **전체화면 UX**
  - SPOMOVE session 페이지에서 `F키`로 전체화면 전환이 되지만 사용자가 모른다.
  - Projector 모드로 진입할 때 안내가 충분하지 않다.

- **샘플 데이터는 실제 운영 데이터가 아님**
  - `lib/data.ts`의 프로그램 5개는 제품 방향을 보여주기 위한 샘플.
  - 실제 상용화 전에는 프로그램 품질, 태그, 연령, 공간, 준비물, 안전 문구, SPOMOVE 연결을 더 촘촘히 검수해야 한다.

- **플랜 결제 연동 없음**
  - PlanSheet에서 플랜 선택 시 store만 업데이트하고 실제 결제/인증 없음.
  - Phase 1에서는 관심 등록/상담 문의 흐름이 맞다.

- **교구 스토어는 견적 요청 UI 수준**
  - 실제 주문, 결제, 배송, 재고 로직 없음.

- **반응형 QA 미완**
  - 모바일/태블릿/데스크탑에서 텍스트 줄바꿈, 버튼 크기, 카드 밀도 확인 필요.
  - 사용자가 직접 확인 예정.

- **Phase 2/3 화면 방향 미확정**
  - `class-record`, `students`, `director`, `parent`는 현재 코드에 보존되어 있고 내 정보 > 운영 확장 프리뷰에서만 진입 가능.
  - 제품 정책이 확정되면 `숨김 / 실험실 / Phase 2 배지 / 삭제` 중 하나로 정리해야 한다.

---

## 다음 작업 순서

> 1~3번은 완료. 4번부터 이어간다.

4. **SPOMOVE 전체화면/큰 화면 UX 강화** ← **다음 작업**
   - Projector 모드 진입 시 전체화면 안내 토스트 또는 힌트 배너 추가.
   - 수업 설명 도구의 "SPOMOVE 실행" 버튼이 `projector` 모드로 연결되게 확인.
   - 실행 화면(session/page.tsx) idle 상태에서 단축키 힌트(`F 전체화면` 등)가 이미 있으므로 hub 쪽에도 안내 문구 보강.

5. **수업 설명 도구 "전체 복사" 추가** ← **다음 작업**
   - 대상별 템플릿 3개를 한 번에 합쳐서 클립보드에 복사하는 버튼 추가.
   - 마지막 선택한 수업/대상을 localStorage에 기억해 재방문 시 이어서 사용할 수 있게.

6. **플랜/온보딩 흐름 검토**
   - Trial 만료 후 흐름이 자연스러운지 확인 (현재 0일 이하로 내려가면 어떻게 되는지 점검).
   - 온보딩 완료 후 홈으로 가는 흐름이 끊기지 않는지 확인.

7. **최종 반응형 QA** (사용자가 직접 확인)
   - 모바일, 태블릿, 데스크탑에서 텍스트 줄바꿈, 버튼 크기, 카드 밀도, 하단 탭/사이드바 동작.

---

## 주의할 점

- **반드시 `app/spokedu-master`를 기준으로 작업한다.**
  - `subscription-new`에 새로 구현하지 말 것.
  - 기존 `spokedu-pro`를 직접 확장하지 말 것.

- **Phase 1 제품 정체성을 흐리지 않는다.**
  - 핵심은 넷플릭스식 `아동청소년 체육 프로그램 라이브러리 기반 구독 서비스`.
  - SPOMOVE는 독립 차별화 엔진. 라이브러리 안의 작은 카테고리가 아님.
  - 기록/리포트/부모/센터 기능은 장기 락인 요소지만, 지금 전면에 과하게 올리면 제품 신뢰를 깎는다.

- **`store`라는 단어를 조심한다.**
  - 화면에서 `store`는 교구 판매/장바구니 의미.
  - Zustand 상태 저장소(`store/index.ts`)와 헷갈리게 만들지 않는다.

- **한글 깨짐을 다시 만들지 않는다.**
  - 파일 인코딩과 복붙 문자열을 조심한다.
  - 수정 후 반드시 아래 검색을 돌린다:
  ```
  rg "[\x{4E00}-\x{9FFF}\x{F900}-\x{FAFF}\x{FFFD}]" app/spokedu-master -n
  rg "[ㅏ-ㅣㄱ-ㅎ]{2,}" app/spokedu-master -n
  ```

- **검증 명령 (Linux 환경)**
  ```
  npx tsc --noEmit --pretty false
  npm run lint:ci
  ```
  - Windows 환경이면 `npx.cmd` 사용.
  - `baseUrl deprecated` 경고는 기존 tsconfig 문제로 무시해도 된다.

- **사용자가 만든 변경을 되돌리지 말 것.**
  - 불필요한 대규모 리팩토링보다 MASTER 상용화 흐름에 직접 필요한 수정부터 한다.

- **문서를 정답처럼 그대로 구현하지 않는다.**
  - 사용자는 공동대표/제품 파트너 관점의 판단을 원한다.
  - 제품 성공에 필요한 장점만 골라 반영하고, 과한 기능은 뒤로 미룬다.
