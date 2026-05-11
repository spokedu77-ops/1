'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useProfile } from './store';

export default function SpokeduMasterPage() {
  const router = useRouter();
  const profile = useProfile();

  useEffect(() => {
    router.replace(profile?.onboardingDone ? '/spokedu-master/dashboard' : '/spokedu-master/onboarding');
  }, [profile?.onboardingDone, router]);

  return null;
}
