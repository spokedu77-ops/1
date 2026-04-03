'use client';

import {
  computeTier,
  tierBadgeClass,
  tierLabelKo,
  totalLessonsFromCounts,
} from '@/app/lib/teacherTierSchedule';

type Props = {
  sessionCount?: number | null;
  logCount?: number | null;
  className?: string;
};

export function TeacherTierBadge({ sessionCount, logCount, className = '' }: Props) {
  const total = totalLessonsFromCounts(sessionCount, logCount);
  const tier = computeTier(total);
  return (
    <span
      className={`inline-flex items-center text-[9px] font-black px-2 py-0.5 rounded-full border shrink-0 ${tierBadgeClass(tier)} ${className}`}
    >
      {tierLabelKo(tier)}
    </span>
  );
}
