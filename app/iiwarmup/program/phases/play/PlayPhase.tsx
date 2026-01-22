'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { NewPlayPhase } from './NewPlayPhase';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface PlayPhaseProps {
  scenarioId: string;
}

export function PlayPhase({ scenarioId }: PlayPhaseProps) {
  return <NewPlayPhase scenarioId={scenarioId} />;
}
