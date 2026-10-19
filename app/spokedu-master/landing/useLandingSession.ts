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

let landingSessionRequest: Promise<LandingSessionState> | null = null;

function loadLandingSession() {
  if (landingSessionRequest) return landingSessionRequest;

  landingSessionRequest = (async (): Promise<LandingSessionState> => {
    try {
      const supabase = getSupabaseBrowserClient();
      const session = await getSessionWithRefreshRecovery(supabase);
      if (!session?.user) return { status: 'guest', displayName: '', institution: false };

      const institutionResponse = await fetch('/api/institution/status', {
        credentials: 'include',
        cache: 'no-store',
      });
      const institution = institutionResponse.ok
        ? await institutionResponse.json() as InstitutionStatus
        : null;
      const displayName = institution?.institution && institution.loginId
        ? institution.loginId
        : session.user.email ?? 'LAB 계정';
      return { status: 'member', displayName, institution: institution?.institution === true };
    } catch {
      return { status: 'guest', displayName: '', institution: false };
    }
  })();

  return landingSessionRequest;
}

export function useLandingSession(): LandingSessionState {
  const [state, setState] = useState<LandingSessionState>({ status: 'checking', displayName: '', institution: false });

  useEffect(() => {
    let cancelled = false;

    void loadLandingSession().then((nextState) => {
      if (!cancelled) setState(nextState);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
