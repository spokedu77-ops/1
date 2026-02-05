# Teacher 앱 (선생님 대시보드)

## Supabase 클라이언트 규칙

- **모든 페이지**에서 Supabase 접근 시 **반드시 `getSupabaseBrowserClient()`** 사용.
- **`createClient(url, anonKey)` 사용 금지.**  
  쿠키에 저장된 로그인 세션을 읽지 못해 `getUser()`가 null이 되고, "로그인이 필요합니다" / 커리큘럼·교구목록 미표시 등 오류가 발생함.

```ts
// O
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
const [supabase] = useState(() => (typeof window !== 'undefined' ? getSupabaseBrowserClient() : null));

// X
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
```

신규 페이지 추가 시 위 규칙을 지킬 것.
