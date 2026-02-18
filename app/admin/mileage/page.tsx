'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AdminMileagePage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/admin/users?tab=counting');
  }, [router]);
  return null;
}
