'use client';

import { useEffect, useMemo, useState } from 'react';
import AssetRecommendations from './AssetRecommendations';
import { toDisplayDirection, type SelectionDecision } from '@/app/lib/move-report/track/learningLoop';

type Props = {
  sessionId: string;
  childId: string;
};

type RecordSnapshot = {
  primary_skill: string | null;
  skill_level: number | null;
  selection_recommendation: SelectionDecision | null;
  selection_decision: SelectionDecision | null;
};

export default function LiveAssetRecommendations({ sessionId, childId }: Props) {
  const [record, setRecord] = useState<RecordSnapshot | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const load = async () => {
      try {
        const res = await fetch(`/api/move-report/track/sessions/${sessionId}/records/${childId}`, {
          credentials: 'include',
          cache: 'no-store',
        });
        if (res.ok) {
          const json = await res.json();
          if (!cancelled) {
            const next = json.data?.record;
            setRecord(next ? {
              primary_skill: next.primary_skill ?? null,
              skill_level: next.skill_level ?? null,
              selection_recommendation: next.selection_recommendation ?? null,
              selection_decision: next.selection_decision ?? null,
            } : null);
          }
        }
      } finally {
        if (!cancelled) timer = setTimeout(load, 1200);
      }
    };

    void load();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [sessionId, childId]);

  const direction = useMemo(
    () => toDisplayDirection(record?.selection_decision ?? record?.selection_recommendation ?? null),
    [record?.selection_decision, record?.selection_recommendation],
  );

  return (
    <AssetRecommendations
      skill={record?.primary_skill ?? null}
      level={record?.skill_level ?? null}
      direction={direction}
    />
  );
}
