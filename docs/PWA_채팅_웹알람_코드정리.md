# PWA 채팅 웹 알람 – 코드 + 코드 외 전부 정리

채팅 푸시(알람/진동/배지)를 위해 **코드로 넣은 것**과 **코드 밖에서 했던 설정·배포·운영**을 한 문서에 모았습니다.  
추가로 정리할 항목이 있으면 이 문서에 섹션만 붙이면 됩니다.

---

# Part 1. 코드 (앱/DB 스키마)

## 1.1 전체 흐름

```
[선생님/관리자] 채팅 페이지 접속 → 알림 허용 → FCM 토큰 발급 → user_fcm_tokens 저장
                                    ↓
[누군가 채팅 전송] → chat_messages INSERT → Supabase Webhook → POST /api/push/send-chat
                                    ↓
send-chat: 수신자 조회 → user_fcm_tokens에서 FCM 토큰 조회 → Firebase Admin으로 푸시 발송
                                    ↓
[기기] Service Worker가 수신 → 알람/진동 표시, 배지 갱신, 클릭 시 채팅으로 이동
```

## 1.2 파일별 역할

| 구분 | 경로/파일 | 역할 |
|------|-----------|------|
| SW 스크립트 | **public/firebase-messaging-sw.js**(정적) + **public/firebase-messaging-config.js**(빌드 시 생성) + **scripts/generate-firebase-sw.js** | 2단 구조: SW 본체는 정적, config만 `self.__FIREBASE_CONFIG__`로 분리. 루트(/) 서빙·scope=/. 클릭 시 `data.url`(/teacher/chat)로 이동. |
| 푸시 발송 | **app/api/push/send-chat/route.ts** | `POST /api/push/send-chat`. Webhook에서 호출. 수신자 FCM 토큰 조회 후 Firebase Admin으로 발송(제목/내용/진동/배지). |
| 토큰 등록 | **app/lib/fcm.ts** | `registerFCMTokenIfNeeded(supabase, userId)` – `navigator.serviceWorker.register('/firebase-messaging-sw.js')` 후 FCM 토큰 발급·`user_fcm_tokens` 저장. 개발 환경에서는 실행 안 함. |
| 토큰 호출 위치 | **app/admin/chat/page.tsx**, **app/teacher/chat/page.tsx** | **알림 켜기** 버튼 클릭(유저 제스처) 시에만 `Notification.requestPermission()` 후 허용 시 `registerFCMTokenIfNeeded` 호출. 이미 허용된 경우 마운트 시 토큰만 등록. |
| DB 스키마 | **sql/34_user_fcm_tokens.sql** | `user_fcm_tokens` 테이블 (user_id, token UNIQUE, device_label 등). RLS 본인만. |
| 배지 RPC 권한 | **sql/35_grant_get_unread_counts_service_role.sql** | send-chat에서 `get_unread_counts` 호출 가능하도록 service_role에 EXECUTE 부여. |
| PWA | **public/manifest.json**, **app/layout.tsx** | 매니페스트 링크로 홈화면 추가·앱처럼 실행. (이름: Coach / Coach App) |

## 1.3 환경 변수 (코드에서 참조)

| 변수 | 용도 |
|------|------|
| NEXT_PUBLIC_FIREBASE_API_KEY, AUTH_DOMAIN, PROJECT_ID, STORAGE_BUCKET, MESSAGING_SENDER_ID, APP_ID | 클라이언트/SW용 Firebase 설정. |
| NEXT_PUBLIC_FIREBASE_VAPID_KEY | FCM 클라이언트 토큰 발급용 VAPID 키. |
| FIREBASE_SERVICE_ACCOUNT_JSON | 서버 푸시 발송용 Firebase Admin JSON 문자열. |
| SUPABASE_CHAT_PUSH_WEBHOOK_SECRET | send-chat Webhook 호출 시 검증용 시크릿. |
| SUPABASE_SERVICE_ROLE_KEY | send-chat에서 참가자/토큰 조회·get_unread_counts RPC 호출. |
| NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase 클라이언트 (로그인·채팅·토큰 등록 등). |

---

# Part 2. 코드 외에 했던 것들 (설정·배포·운영)

## 2.1 Firebase Console에서 한 작업

1. **Firebase 프로젝트** 생성 또는 선택 (https://console.firebase.google.com).
2. **웹 앱 추가**  
   프로젝트 설정 → 일반 → 내 앱 → 웹 앱 추가(또는 기존 웹 앱).  
   → `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId` 6개 복사.
3. **웹 푸시 키(VAPID)**  
   프로젝트 설정 → Cloud Messaging → 웹 푸시 인증서 → 키 페어 생성 후 키 복사.  
   → `NEXT_PUBLIC_FIREBASE_VAPID_KEY` 에 넣음.
4. **서비스 계정 키(JSON)**  
   프로젝트 설정 → 서비스 계정 → 새 비공개 키 생성 → JSON 다운로드.  
   → 내용 전체를 한 줄로 정리해 `FIREBASE_SERVICE_ACCOUNT_JSON` 에 넣음. (Git/문서에는 넣지 않음.)

## 2.2 로컬 환경 변수 (.env.local)

- 프로젝트 루트 `.env.local` 에 위 Firebase 값 + Supabase URL/Anon Key + 아래 추가.
- `SUPABASE_CHAT_PUSH_WEBHOOK_SECRET`: 아무 비밀 문자열 (나중에 Supabase Webhook Authorization에 **동일 값** 사용).
- `FIREBASE_SERVICE_ACCOUNT_JSON`: JSON 전체 한 줄 (따옴표 이스케이프 주의).
- `.env*` 는 `.gitignore`에 있어 Git에 올라가지 않음.

## 2.3 Vercel 환경 변수

- Vercel 프로젝트 → Settings → Environment Variables.
- 로컬 `.env.local`과 동일한 변수들을 **Production(및 필요 시 Preview)** 에 등록.
- 비밀은 여기만 두고, 코드에는 넣지 않음.

## 2.4 Supabase에서 한 작업

1. **SQL 실행**
   - **sql/34_user_fcm_tokens.sql**  
     Supabase Dashboard → SQL Editor → 내용 붙여넣기 → Run.  
     → `user_fcm_tokens` 테이블 생성.
   - **sql/35_grant_get_unread_counts_service_role.sql**  
     동일하게 SQL Editor에서 실행.  
     → send-chat에서 `get_unread_counts` RPC 호출 가능.

2. **Webhook 생성**
   - Supabase Dashboard → Database → Webhooks → Create a new hook.
   - **Name**: 예) `chat-message-push`.
   - **Table**: `chat_messages`.
   - **Events**: **Insert** 만 체크.
   - **URL**: `https://(배포도메인)/api/push/send-chat` (예: `https://xxx.vercel.app/api/push/send-chat`).
   - **HTTP Headers**:  
     Key `Authorization`, Value `Bearer (SUPABASE_CHAT_PUSH_WEBHOOK_SECRET과 동일한 값)`.
   - Create로 저장.
   - 배포 도메인 바뀌면 Webhook URL만 해당 도메인으로 수정.

## 2.5 패키지 설치

- 터미널에서 `npm install` (firebase, firebase-admin 등 package.json에 있음).

## 2.6 배포 절차

1. 로컬에서 `npm run build` 성공 확인.
2. Vercel 환경 변수 모두 입력 후 저장.
3. `git add` → `git commit` → `git push` (`.env.local`은 커밋되지 않음).
4. Vercel이 연결된 브랜치 push 시 자동 빌드·배포.
5. 배포 후 Supabase Webhook URL이 실제 배포 URL과 일치하는지 확인.

## 2.7 PWA/세션 관련으로 했던 앱 쪽 수정

- **PWA에서 데이터 안 나옴** 대응: 선생님/관리자 영역 Supabase 클라이언트를 **쿠키 기반** `getSupabaseBrowserClient` 로 통일.  
  → 로그인 시 쿠키에 저장된 세션을 PWA(홈화면 앱)에서도 동일하게 읽음.

## 2.8 알림 설정 (사용자/운영 측)

- **알림 허용**: 홈화면에 추가한 **Coach 앱** 실행 → **채팅** 탭 진입 → **「알림 켜기」 버튼**을 눌러야 권한 요청(유저 제스처). iOS는 버튼 클릭 같은 제스처 안에서 요청해야 정상 동작.
- **설정에서 알림 켜는 위치**: Safari/Chrome이 아니라, **설정 > 알림** 목록에 **Coach** 또는 **Coach App** (manifest 이름)으로 **단일 앱**으로 나타남. 여기서 알림 허용·소리·진동·배너 등 설정.
- iOS 16.4 이상: 홈화면에 추가한 PWA는 `display: "standalone"` 이면 별도 앱으로 알림 목록에 표시됨.

## 2.9 로컬 개발 시 참고

- **Turbopack 패닉**: `npm run dev` 중지 후 `.next` 삭제, 다시 `npm run dev`. 재발 시 `next dev --webpack` 로 임시 전환 가능.
- **FCM**: `app/lib/fcm.ts` 에서 개발 환경(`NODE_ENV === 'development'`)이면 토큰 등록 건너뜀.

## 2.10 배포 후 확인 체크리스트

- [ ] 로그인 → 선생님 메인/일정/채팅 데이터 정상 표시 (웹·PWA 동일).
- [ ] PWA: 홈화면 앱 실행 → 채팅 탭 진입 → 알림 허용 팝업 → 허용 후 설정에 Coach 표시.
- [ ] 다른 계정으로 해당 방에 메시지 전송 → 앱 종료 상태에서도 푸시/진동/배지 오는지 확인.
- [ ] Supabase Webhook URL이 `https://(실제배포도메인)/api/push/send-chat` 과 일치하는지 확인.

---

# Part 3. 요약 체크리스트 (코드 + 코드 외)

| 구분 | 항목 |
|------|------|
| 코드 | SW 라우트, send-chat 라우트, fcm.ts, 채팅 페이지 2곳에서 토큰 등록, manifest·layout |
| DB | 34_user_fcm_tokens.sql 실행, 35_grant_get_unread_counts_service_role.sql 실행 |
| Firebase | 웹 앱 6개 값, VAPID 키, 서비스 계정 JSON 복사 |
| env | .env.local 및 Vercel 환경 변수에 Firebase·웹훅 시크릿·Supabase 등 등록 |
| Supabase | Webhook 생성 (chat_messages INSERT → /api/push/send-chat, Authorization 헤더) |
| 배포 | git push, Vercel 자동 배포, Webhook URL이 배포 도메인과 일치 |
| 앱 동작 | PWA 세션 쿠키 통일, 알림 팝업은 채팅 탭 진입 시, 설정에서는 Coach 단일 항목으로 알림 허용 |

위까지가 “PWA 채팅 웹 알람”을 위해 **코드로 넣은 것 + 코드 밖에서 했던 작업** 전부입니다.  
추가로 정리할 게 있으면 이 문서에 섹션만 붙이면 됩니다.
