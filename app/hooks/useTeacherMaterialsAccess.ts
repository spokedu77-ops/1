'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'teacher_materials_access_cache_v1';

type AccessState = 'loading' | 'allowed' | 'denied' | 'no-session';

type CheckResponse = {
  allowed?: boolean;
  reason?: 'no-session' | 'inactive_teacher';
};

/** 종료 강사 자료 접근 차단 여부 (공지·커리큘럼·SPOMOVE) */
export function useTeacherMaterialsAccess(): AccessState {
  const [state, setState] = useState<AccessState>('loading');

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        // 이전 구현의 사용자 구분 없는 권한 캐시를 제거합니다. 로그인 계정이 바뀌면
        // admin/활동 강사/종료 강사 판정이 서로 유출될 수 있으므로 매 마운트마다 서버에서 확인합니다.
        sessionStorage.removeItem(STORAGE_KEY);
        const res = await fetch('/api/auth/check-teacher-materials', { credentials: 'include' });
        const json = (await res.json()) as CheckResponse;
        const allowed = json.allowed === true;
        if (!cancelled) {
          if (json.reason === 'no-session') setState('no-session');
          else setState(allowed ? 'allowed' : 'denied');
        }
      } catch {
        if (!cancelled) setState('denied');
      }
    };

    void check();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

/** 관리자가 강사 종료/복구 토글 후 캐시 무효화용 */
export function invalidateTeacherMaterialsAccessCache() {
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}
