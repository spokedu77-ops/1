'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LessonPlansRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/teacher/my-classes');
  }, [router]);
  return (
    <div className="py-20 text-center text-slate-400 text-sm font-bold">
      주간 일정 페이지로 이동 중...
    </div>
  );
}
