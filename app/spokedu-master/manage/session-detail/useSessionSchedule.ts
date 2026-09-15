'use client';

import { useState } from 'react';
import type { MasterSessionDto } from '../../types/operational';

export function useSessionSchedule({
  initialSession,
}: {
  initialSession: MasterSessionDto | null;
}) {
  const [scheduleOpen, setScheduleOpen] = useState(!initialSession);
  return { scheduleOpen, setScheduleOpen };
}
