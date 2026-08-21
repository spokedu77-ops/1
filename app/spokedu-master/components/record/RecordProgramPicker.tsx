'use client';

import Link from 'next/link';
import { CalendarDays } from 'lucide-react';

/** @deprecated The standalone record creator was replaced by the Session calendar. */
export function RecordProgramPicker({ className }: { label?: string; studentId?: string; className?: string }) {
  return (
    <Link href="/spokedu-master/activity" className={className ?? 'spm-btn-primary inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-black focus-visible:outline-none'}>
      <CalendarDays size={16} />수업 캘린더 열기
    </Link>
  );
}
