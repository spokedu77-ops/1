'use client';

import { useEffect, useState } from 'react';
import { getSessionWithRefreshRecovery } from '@/app/lib/supabase/auth';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';

export type LandingSessionState =
  | { status: 'checking'; displayName: ''; institution: false }
  | { status: 'guest'; displayName: ''; institution: false }
  | { status: 'member'; displayName: string; institution: boolean };

type InstitutionStatus = {
  institution?: boolean;
  loginId?: string;
};

export function useLandingSession(): LandingSessionState {
  const [state, setState] = useState<LandingSessionState>({ status: 'checking', displayName: '', institution: false });

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const [session, institutionResponse] = await Promise.all([
          getSessionWithRefreshRecovery(supabase),
          fetch('/api/institution/status', { credentials: 'include', cache: 'no-store' }),
        ]);
        if (cancelled) return;
        if (!session?.user) {
          setState({ status: 'guest', displayName: '', institution: false });
          return;
        }

        const institution = institutionResponse.ok
          ? await institutionResponse.json() as InstitutionStatus
          : null;
        if (cancelled) return;
        const displayName = institution?.institution && institution.loginId
          ? institution.loginId
          : session.user.email ?? 'LAB 계정';
        setState({ status: 'member', displayName, institution: institution?.institution === true });
      } catch {
        if (!cancelled) setState({ status: 'guest', displayName: '', institution: false });
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
