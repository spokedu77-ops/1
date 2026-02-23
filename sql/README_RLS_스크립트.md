# RLS 수정 스크립트

RLS 수정은 **테이블/도메인별 전용 스크립트**만 사용합니다. 통합 스크립트는 사용하지 않습니다.

| 대상 | 스크립트 |
|------|----------|
| lesson_plans | `FIX_RLS_LESSON_PLANS_ONLY.sql` |
| chat (chat_rooms, chat_messages, chat_participants) | `FIX_RLS_CHAT_ONLY.sql` |
| warmup_programs_composite | `FIX_RLS_WARMUP_COMPOSITE_ONLY.sql` |
| sessions | `FIX_RLS_SESSIONS_ONLY.sql` |
| todos | `FIX_RLS_TODOS_ONLY.sql` |

추가 테이블이 필요하면 해당 전용 스크립트를 새로 만듭니다.
