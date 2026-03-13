# Priority 2 — 코드 품질 체크 결과

출처: `docs/앱_개선_필요_영역_및_방안.md`  
체크일: 코드베이스 검색 기준 (기능/어드민 동작·권한 영향 최소화 관점으로 현황만 정리)

---

## ① 빌드/배포 품질

| 항목 | 문서 내용 | 현재 상태 |
|------|-----------|-----------|
| `ignoreBuildErrors` | true면 TS 에러 있어도 빌드 통과 | **`next.config.ts`: `ignoreBuildErrors: false`** → 이미 꺼져 있음 |
| `ignoreDuringBuilds` | ESLint 무시 옵션 | **next.config.ts에 해당 옵션 없음** (기본 동작) |

**결론**: 문서에 적힌 “활성화되어 있다”와 달리, **현재 설정은 괜찮음**. 타입 에러 나면 빌드 실패하는 구조.

---

## ② Supabase 클라이언트 혼용

| 구분 | 문서 우려 | 현재 상태 |
|------|-----------|-----------|
| 앱(페이지·훅) | `getSupabaseClient()` vs `getSupabaseBrowserClient()` 혼용 | **실제 앱 코드는 전부 `getSupabaseBrowserClient()`만 사용** (teacher, admin, lib/admin 훅, 로그인 등). `getSupabaseClient()` 참조는 **docs 폴더 예시 코드 1곳**뿐 |
| API 라우트 | 서버 권한 필요한데 브라우저 클라이언트 사용 | **API 라우트에서는 `getSupabaseBrowserClient()` 사용처 없음**. 전부 `createServerSupabaseClient()` 또는 `getServiceSupabase()` 사용 |

**결론**: **혼용 이슈 거의 없음**. 클라이언트 = 브라우저 전용, API = 서버/서비스 롤로 구분되어 있음. PWA·세션 관점에서 추가로 손댈 부분은 없어 보임.

---

## ③ React Hook 패턴 (exhaustive-deps)

| 위치 | 용도 | 영향 |
|------|------|------|
| FlowPhaseClient.tsx (2곳) | 마운트 1회 초기화, domRefs 의도적 제외 | 주석으로 이유 명시됨. 동작 변경 없이 의존성만 넣으면 오히려 재초기화 등 부작용 가능 |
| admin/classes/page.tsx | mount + interval 전용 | 마운트/인터벌만 쓰는 패턴. 의존성 추가 시 불필요 리페치 가능 |
| useStudentStore.ts | (주석 없음) | 한 곳. 리팩터 시 영향 범위 확인 필요 |
| admin/curriculum/page.tsx | supabase 준비 시점, 탭 전환 | 3곳. “supabase ready / 탭 활성” 기준이라 의존성 넣으면 루프/과다 fetch 위험 |
| useThink150Playback.ts | currentMs가 effect 안에서 set됨 → deps 넣으면 루프 | 주석에 이유 있음. 여기서 제거 시 루프 가능 |

**결론**: **전부 “의도적 예외”에 가깝고**, 문서처럼 “무분별한 억제” 수준은 아님. **기능/동작 바꾸지 않고 exhaustive-deps만 맞추면 오히려 버그나 리렌더 증가 위험** 있음. 수정 시에는 “의존성 추가 → 리페치/루프 여부” 꼭 확인할 것.

---

## ④ 타입 안전성 (이중 캐스팅 등)

| 유형 | 예시 위치 | 비고 |
|------|-----------|------|
| `as unknown as Session[]` | admin/teachers-classes/page.tsx | Supabase join 결과 → Session[] 단일 1곳 |
| `as unknown as string[]` | DashboardCurationEditor (2곳) | ROW1_ROLES를 string[]로 쓰기 위한 캐스팅 |
| `(window as unknown as { webkitAudioContext... })` | FlowAudio, SpokeduRhythmGame, camera/sfx, memory-game 등 | Safari 호환용. 타입 생성으로 해소 어려움 |
| `(p as { bpm?: number }).bpm` 등 | useChallengePrograms, useTrainingTimer, notice 등 | DB/API 응답이 JSON/unknown인 경우. `supabase gen types` 쓰면 테이블 타입은 줄일 수 있음 |

**결론**:  
- **Supabase 쿼리**: `supabase gen types typescript`로 DB 타입 생성 후, 해당하는 select 결과 타입을 쓰면 `Session[]` 같은 수동 캐스팅 일부 제거 가능. **기존 동작/어드민 권한에는 영향 없음.**  
- **웹키트 오디오, 일부 JSON 응답**은 생성 타입으로 없애기 어렵고, 최소한의 캐스팅 유지가 현실적.

---

## ⑤ 서버 API의 Supabase 클라이언트

| 검색 결과 | 내용 |
|-----------|------|
| app/api/** | **getSupabaseBrowserClient() 사용하는 API 라우트 없음** |
| app/api/** | 인증/RLS 우회가 필요한 곳은 `getServiceSupabase()`, 사용자 세션 필요한 곳은 `createServerSupabaseClient()` 사용 |

**결론**: **API는 전부 서버용 클라이언트만 사용**. “RLS에 막혀 실패하는 케이스”는 이번 체크 범위에서는 발견되지 않음. (이미 admin 규칙대로 `requireAdmin` + `getServiceSupabase()` 쓰는 구조.)

---

## ⑥ 프로덕션 로그 (console.log / console.warn / console.error)

| 유형 | 건수(대략) | 위치 예시 |
|------|------------|-----------|
| console.error | 다수 | API route catch 블록, 페이지 fetch 실패, adminAuth 등 |
| console.warn | 소수 | BgmPlayer, loadThemeAssets, storage/exists, preload 실패 등 |

**특징**:  
- 대부분 **에러 처리/디버깅용**이고, **기능 분기나 권한 로직은 아님**.  
- 프로덕션에서 로그를 줄이려면 `if (process.env.NODE_ENV === 'development') { console.error(...) }` 같은 래핑으로 **점진 적용** 가능.  
- **한꺼번에 제거하면** 운영 중 장애 추적이 어려워질 수 있으므로, 우선 **새 코드부터 조건부 로그**로 두고, 기존은 필요 시 단계적으로 감싸는 방식을 권장.

---

## 요약 (기능/어드민 영향 최소화 관점)

| # | 항목 | 조치 제안 | 기능·권한 영향 |
|---|------|-----------|-----------------|
| ① | 빌드 옵션 | 유지 (이미 false/미설정) | 없음 |
| ② | Supabase 혼용 | 추가 조치 불필요 (이미 구분 사용) | 없음 |
| ③ | exhaustive-deps | 억제 제거 시 리페치/루프 검토 필수. 신규 코드만 deps 엄격 적용 권장 | 의존성 잘못 넣으면 리렌더·버그 가능 |
| ④ | 타입 | `supabase gen types` 도입 후 해당 쿼리만 생성 타입으로 교체 가능 | 타입만 바꾸면 동작/권한 영향 없음 |
| ⑤ | API 클라이언트 | 현재 구조 유지 | 없음 |
| ⑥ | console | 신규 코드는 NODE_ENV 조건 래핑, 기존은 단계적 적용 | 제거만 하면 디버깅 불리, 조건부로 두면 영향 없음 |

**전체**: 지금 구조만 보면 **기능·어드민 권한까지 건드리지 않고** ①·②·⑤는 이미 만족, ③·④·⑥은 “최소 변경·점진 적용”으로 가져가면 됨.

---

## 적용 완료 (영향 최소화)

- **⑥ 프로덕션 로그**: `app/lib/logging/devLogger.ts` 추가. `NODE_ENV === 'development'`일 때만 `console.error`/`console.warn` 호출. app·api 전역의 기존 `console.error`/`console.warn`을 `devLogger.error`/`devLogger.warn`으로 교체 완료. 기능·권한 로직 변경 없음.
