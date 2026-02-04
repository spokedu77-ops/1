# Admin Chat 개선 작업 스펙 (Cursor용)

## 목표
현재 Supabase 기반 채팅의 날짜 표시 일관성, unread 성능, 읽음 처리 동시성, Realtime 구독 안정성, 기본 UX를 단기간에 개선한다. UI만 손대지 말고 데이터 모델/쿼리/권한(RLS)/성능을 동시에 정리한다.

---

## P0 (즉시) — 반드시 해야 하는 4개

### P0-1. 대화목록 날짜 표기 규칙 통일

#### 요구사항 (표기 규칙)
- **오늘**: `오후 3:30` (로컬 타임존 Asia/Seoul)
- **어제**: `어제`
- **이번 주**: `월요일`
- **그 외**: `YYYY.MM.DD`

#### 실행
1. `app/lib/utils.ts`에 `formatChatTimestamp(inputISO: string): string` 유틸 함수 추가
2. 대화목록(방 리스트) - `app/admin/chat/page.tsx` 481줄
3. 메시지 내부(버블 시간, 날짜 구분선) - `app/admin/chat/page.tsx` 561줄, 575줄
4. 모두 동일 함수 사용

#### 수용 기준
- 방 리스트/메시지 화면에서 같은 timestamp가 항상 같은 규칙으로 보임
- "오늘/어제/요일/날짜" 케이스가 깨지지 않음(자정 경계 포함)

#### 구현 파일
- `app/lib/utils.ts`: `formatChatTimestamp` 함수 추가
- `app/admin/chat/page.tsx`: 날짜 표시 로직 교체

---

### P0-2. unreadCounts 클라이언트 전체조회 제거 (서버 집계로 변경)

#### 문제
- 현재: 모든 메시지를 가져와 클라이언트에서 unread를 계산 → 메시지 많아지면 비용/지연/메모리 폭발
- `app/admin/chat/page.tsx` 51-68줄: `fetchUnreadCounts`가 모든 메시지 조회

#### 정답 모델
- `chat_participants` 테이블에 `last_read_at`(또는 `last_read_message_id`)를 저장하고 unread는 서버에서 계산

#### DB 변경

**1. 테이블 수정 (chat_participants에 컬럼 추가)**
```sql
-- chat_participants 테이블에 컬럼 추가
ALTER TABLE chat_participants 
ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE chat_participants
ADD COLUMN IF NOT EXISTS joined_at TIMESTAMPTZ DEFAULT NOW();

-- PK 확인 (이미 있을 수 있음)
-- ALTER TABLE chat_participants ADD PRIMARY KEY (room_id, user_id);
```

**2. 인덱스 추가**
```sql
-- 메시지 조회 성능
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_created 
ON chat_messages(room_id, created_at DESC);

-- 참여자 조회 성능
CREATE INDEX IF NOT EXISTS idx_chat_participants_user_room 
ON chat_participants(user_id, room_id);
```

**3. RPC 함수 생성**
```sql
CREATE OR REPLACE FUNCTION get_unread_counts(p_user_id UUID)
RETURNS TABLE(room_id UUID, unread_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cp.room_id,
    COUNT(cm.id)::BIGINT as unread_count
  FROM chat_participants cp
  LEFT JOIN chat_messages cm 
    ON cm.room_id = cp.room_id
    AND cm.created_at > COALESCE(cp.last_read_at, cp.joined_at)
    AND cm.sender_id != p_user_id
  WHERE cp.user_id = p_user_id
  GROUP BY cp.room_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### 프론트 변경
1. 기존 `fetchUnreadCounts` 로직 삭제 (`app/admin/chat/page.tsx` 51-68줄)
2. 페이지 로드 시 RPC 1회 호출로 `unreadCounts` 채움
3. Realtime로 새 메시지 수신 시 해당 room count +1 (현재 방 열려 있으면 0 유지)

#### 수용 기준
- unread 계산을 위해 "메시지 전체 조회"가 더 이상 발생하지 않음
- 방 100개/메시지 수만개여도 로딩이 느려지지 않음

#### 구현 파일
- `sql/22_chat_unread_optimization.sql`: DB 스키마 변경 및 RPC 함수
- `app/admin/chat/page.tsx`: `fetchUnreadCounts` 로직 교체

---

### P0-3. 읽음 처리(read_by 배열) 폐기 → participant row 1개 업데이트로 변경

#### 문제
- `read_by` 배열은 메시지마다 업데이트 → 동시성/비용/충돌/데이터 팽창
- `app/admin/chat/page.tsx` 208-228줄: `markAsRead`가 메시지 N개를 순회하며 업데이트

#### 실행
1. `chat_messages.read_by` 사용 중단(또는 유지하되 더 이상 업데이트하지 않음)
2. 사용자가 방을 열거나 스크롤로 최신 메시지 확인 시:
   - `chat_participants.last_read_at = NOW()` 업데이트(1회)
3. "읽음 처리"는 메시지 N개 업데이트가 아니라 participant 1개 업데이트로 끝

#### 수용 기준
- 방을 읽었을 때 DB write가 "1번"만 발생
- 그룹채팅에서도 읽음 처리가 느려지지 않음

#### 구현 파일
- `app/admin/chat/page.tsx`: `markAsRead` 함수 수정 (208-228줄)

---

### P0-4. rooms 목록 성능 개선: last_message_* denormalize

#### 문제
- 방 목록에서 마지막 메시지를 매번 join/서브쿼리로 가져오면 느려지고 N+1 위험
- `app/admin/chat/page.tsx` 71-104줄: `fetchRooms`가 중첩 조회

#### DB 변경

**1. chat_rooms에 컬럼 추가**
```sql
ALTER TABLE chat_rooms 
ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ;

ALTER TABLE chat_rooms
ADD COLUMN IF NOT EXISTS last_message_content TEXT;

ALTER TABLE chat_rooms
ADD COLUMN IF NOT EXISTS last_message_sender_id UUID;
```

**2. 트리거 생성 (메시지 insert 시 자동 갱신)**
```sql
CREATE OR REPLACE FUNCTION update_room_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_rooms
  SET 
    last_message_at = NEW.created_at,
    last_message_content = NEW.content,
    last_message_sender_id = NEW.sender_id
  WHERE id = NEW.room_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_room_last_message
AFTER INSERT ON chat_messages
FOR EACH ROW
EXECUTE FUNCTION update_room_last_message();
```

**3. 기존 데이터 마이그레이션**
```sql
-- 기존 방들의 마지막 메시지 정보 채우기
UPDATE chat_rooms cr
SET 
  last_message_at = sub.last_at,
  last_message_content = sub.last_content,
  last_message_sender_id = sub.last_sender
FROM (
  SELECT 
    room_id,
    MAX(created_at) as last_at,
    (array_agg(content ORDER BY created_at DESC))[1] as last_content,
    (array_agg(sender_id ORDER BY created_at DESC))[1] as last_sender
  FROM chat_messages
  GROUP BY room_id
) sub
WHERE cr.id = sub.room_id;
```

#### 프론트 변경
- 방 목록은 `chat_rooms`만 조회하면 됨 (join 최소화)
- `app/admin/chat/page.tsx` 71-104줄: `fetchRooms` 단순화

#### 수용 기준
- 방 목록 조회 쿼리가 1회로 끝나며, 메시지 수가 많아도 일정 시간 내 응답

#### 구현 파일
- `sql/22_chat_unread_optimization.sql`: DB 스키마 변경 및 트리거
- `app/admin/chat/page.tsx`: `fetchRooms` 로직 단순화

---

## P1 (중요) — UX/안정성

### P1-1. 메시지 페이징

#### 요구사항
- 초기 로드: 최근 50개
- 위로 스크롤 시 과거 50개씩 추가 로드
- API: `select ... order by created_at desc limit 50`, prepend 시 reverse 처리

#### 수용 기준
- 메시지 1만개 방에서도 렌더/스크롤이 버벅이지 않음

#### 구현 파일
- `app/admin/chat/page.tsx`: 메시지 로딩 로직 수정 (199줄)

---

### P1-2. 입력 UX (Shift+Enter)

#### 요구사항
- Enter: 전송
- Shift+Enter: 줄바꿈

#### 구현 파일
- `app/admin/chat/page.tsx`: `handleKeyPress` 함수 수정 (401-406줄)

---

### P1-3. 에러 처리

#### 요구사항
- `alert` → toast로 변경
- 네트워크/Realtime 끊김 상태 배지: 연결됨 / 재연결중 / 오프라인
- 전송 실패 메시지: "재전송" 버튼(클라이언트 임시 id로 중복 방지)

#### 구현 파일
- Toast 컴포넌트 생성 또는 기존 라이브러리 사용
- `app/admin/chat/page.tsx`: 에러 처리 로직 개선

---

## P2 (장기) — 확장 기능

### P2-1. 가상 스크롤 (메시지 많을 때)
### P2-2. 오프라인 지원 (큐잉)
### P2-3. 메시지 수정/삭제 (권한/로그 포함)

---

## 보안 고려사항

- 선생님 앱/웹: RLS 참여자 제한
- 운영진 기능:
  - "전체 방 검색/감사/삭제/파일 접근" 같은 고위험 기능은 서버(service_role)
  - "일반 조회/모니터링" 정도만 클라이언트 `is_admin` 예외 허용
- 기존 보안과 충돌하면 이건 패스

---

## 주요 파일 목록

### 프론트엔드
- `app/admin/chat/page.tsx`: 메인 채팅 페이지 (691줄)
- `app/lib/utils.ts`: 유틸리티 함수 (날짜 포맷팅 추가)

### 백엔드 (SQL)
- `sql/22_chat_unread_optimization.sql`: P0-2, P0-4 DB 변경사항
  - `chat_participants` 컬럼 추가
  - 인덱스 추가
  - RPC 함수 `get_unread_counts`
  - `chat_rooms` denormalize 컬럼 추가
  - 트리거 `update_room_last_message`
  - 기존 데이터 마이그레이션

---

## 실행 순서

1. **P0-1**: 날짜 표기 규칙 통일 (프론트만)
2. **P0-2, P0-4**: DB 스키마 변경 및 마이그레이션 (SQL 실행)
3. **P0-3**: 읽음 처리 로직 변경 (프론트)
4. **P0-2, P0-4**: 프론트 로직 변경 (unreadCounts, fetchRooms)
5. **P1**: UX 개선 (페이징, Shift+Enter, 에러 처리)

---

## 타입 정의 (추가 권장)

```typescript
// app/types/chat.ts
export interface ChatRoom {
  id: string;
  custom_name: string;
  created_at: string;
  last_message_at?: string;
  last_message_content?: string;
  last_message_sender_id?: string;
  participant_count?: number;
}

export interface ChatMessage {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  file_url?: string;
  file_type?: string;
  created_at: string;
  read_by?: string[]; // 레거시, 더 이상 업데이트 안 함
}

export interface ChatParticipant {
  room_id: string;
  user_id: string;
  last_read_at?: string;
  joined_at?: string;
}
```
