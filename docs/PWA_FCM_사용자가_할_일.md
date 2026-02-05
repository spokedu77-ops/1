# PWA + FCM 푸시 알림 — 사용자가 할 일

코드는 모두 반영되어 있습니다. 아래만 하시면 **앱이 꺼져 있어도** 채팅 알림(진동 포함)이 동작합니다.

---

## 1. Firebase 프로젝트에서 값 3가지 가져오기

1. **Firebase Console** 접속: https://console.firebase.google.com  
2. 프로젝트 선택(또는 새로 생성).

3. **웹 앱 설정**  
   - 프로젝트 설정(톱니) → **일반** → **내 앱**에서 웹 앱 추가(또는 기존 웹 앱).  
   - 나오는 `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId` 를 복사.  
   - **실제 값은 Git/문서에 넣지 말고**, 아래처럼 `.env.local` 등에만 넣을 것.

   예시 형식(값은 Firebase 콘솔에서 복사한 것으로 채움):
   ```
   apiKey: "여기_API키",
   authDomain: "프로젝트ID.firebaseapp.com",
   projectId: "프로젝트ID",
   storageBucket: "프로젝트ID.firebasestorage.app",
   messagingSenderId: "숫자",
   appId: "1:숫자:web:..."
   ```

4. **웹 푸시 키(VAPID)**  
   - 프로젝트 설정 → **Cloud Messaging** 탭.  
   - **웹 푸시 인증서**에서 **키 페어 생성** 후 생성된 키를 복사.  
   - **실제 VAPID 키는 Git/문서에 넣지 말고** `.env.local` 의 `NEXT_PUBLIC_FIREBASE_VAPID_KEY` 에만 넣을 것.

5. **서비스 계정 키(JSON)**  
   - 프로젝트 설정 → **서비스 계정** 탭.  
   - **새 비공개 키 생성** → JSON 파일 다운로드.  
   - JSON 파일 내용 **전체**를 한 줄로 붙여넣을 수 있게 준비(줄바꿈 제거해도 됨).
   - **주의:** 서비스 계정 JSON(비밀키 포함)은 Git에 올리지 말고, `.env.local` 또는 Vercel 환경변수에만 넣을 것.

---

## 2. .env.local 에 넣기

프로젝트 루트의 `.env.local` 파일을 열고, 아래 변수들을 채웁니다.  
(이미 있는 Supabase 변수는 그대로 두고, Firebase/웹훅만 추가하면 됩니다.)

```
# 아래는 Firebase에서 복사한 값으로 채우세요.
NEXT_PUBLIC_FIREBASE_API_KEY=여기에_복사
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=프로젝트ID.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=프로젝트ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=프로젝트ID.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=숫자
NEXT_PUBLIC_FIREBASE_APP_ID=1:숫자:web:...
NEXT_PUBLIC_FIREBASE_VAPID_KEY=BN...긴문자열...

# 서비스 계정 JSON 전체를 한 줄로 (따옴표 이스케이프 주의)
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}

# 웹훅 비밀번호 (아무 문자열, 나중에 Supabase에 똑같이 입력)
SUPABASE_CHAT_PUSH_WEBHOOK_SECRET=아무비밀문자열
```

`.env.example` 파일에도 변수 이름과 설명이 있으니 참고하세요.

---

## 3. Supabase에서 SQL 1번 실행

1. **Supabase Dashboard** → **SQL Editor**.  
2. 프로젝트에 있는 **`sql/34_user_fcm_tokens.sql`** 파일 내용을 복사해서 붙여넣기.  
3. **Run** 한 번 실행.

---

## 4. Supabase Webhook 1번 설정

1. **Supabase Dashboard** → **Database** → **Webhooks**.  
2. **Create a new hook** 클릭.  
3. 다음처럼 설정:
   - **Name**: `chat-message-push` (아무 이름 가능)
   - **Table**: `chat_messages`
   - **Events**: **Insert** 만 체크
   - **URL**: 배포된 주소 + `/api/push/send-chat`  
     예: `https://본인도메인.com/api/push/send-chat`  
     (로컬 테스트 시에는 ngrok 등으로 공개 URL 만든 뒤 그 URL 사용)
   - **HTTP Headers**:  
     - Key: `Authorization`  
     - Value: `Bearer 아무비밀문자열`  
     (2번에서 정한 `SUPABASE_CHAT_PUSH_WEBHOOK_SECRET` 과 **완전히 동일**하게)

4. **Create** 로 저장.

---

## 5. 패키지 설치

터미널에서 한 번 실행:

```bash
npm install
```

(`firebase`, `firebase-admin` 이 이미 package.json 에 들어가 있음.)

---

## 6. 동작 확인

1. 앱을 **HTTPS** 로 실행(로컬은 `npm run dev`, 배포는 Vercel 등).  
2. **선생님** 또는 **관리자** 로그인 후 **채팅** 페이지 접속.  
3. 알림 권한 허용 시, 해당 브라우저/기기에 FCM 토큰이 자동 등록됨.  
4. 다른 사용자가 그 방에 메시지를 보내면, **앱을 닫아도** 푸시 알림(및 진동)이 오는지 확인.

---

## 요약 체크리스트

- [ ] Firebase에서 웹 앱 설정 6개 + VAPID 키 + 서비스 계정 JSON 복사
- [ ] `.env.local` 에 위 변수 모두 입력
- [ ] `sql/34_user_fcm_tokens.sql` Supabase SQL Editor 에서 실행
- [ ] Supabase Webhook 생성 (chat_messages INSERT → `/api/push/send-chat`, Authorization 헤더 설정)
- [ ] `npm install` 실행
- [ ] HTTPS 환경에서 채팅 접속 → 알림 허용 → 다른 사람이 메시지 보내서 푸시 확인

이렇게 하시면 코드 수정 없이 PWA+FCM 푸시까지 모두 연결됩니다.
