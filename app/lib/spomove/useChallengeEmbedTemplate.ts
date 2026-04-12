'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  type ChallengeTemplate,
  getChallengeTemplateById,
  normalizeChallengeTemplateId,
} from '@/app/program/iiwarmup/challenge/challengeTemplateDefaults';
import { getAllOverrides, type TemplateOverrideEntry } from '@/app/lib/admin/assets/templateOverrideStore';

/**
 * Challenge 스튜디오와 동일한 IndexedDB 오버레이를 읽어, 임베드용 템플릿을 만듭니다.
 */
export function useChallengeEmbedTemplate(templateIdRaw: string | null | undefined) {
  const templateId = normalizeChallengeTemplateId(templateIdRaw ?? undefined);
  const [overrides, setOverrides] = useState<Record<string, TemplateOverrideEntry>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getAllOverrides()
      .then((data) => {
        if (!cancelled) setOverrides(data);
      })
      .catch(() => {
        if (!cancelled) setOverrides({});
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const template: ChallengeTemplate = useMemo(() => {
    const base = getChallengeTemplateById(templateId);
    const o = overrides[templateId];
    if (!o) return base;
    return { ...base, ...o };
  }, [templateId, overrides]);

  return { template, templateId, loaded };
}
