'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { SpokeduRhythmGame } from '@/app/components/runtime/SpokeduRhythmGame';
import { useChallengeBGM } from '@/app/lib/admin/hooks/useChallengeBGM';
import { useChallengeEmbedTemplate } from '@/app/lib/spomove/useChallengeEmbedTemplate';
import {
  getSpomoveChallengeEmbed,
  mergeSpomoveChallengeLevelData,
  resolveChallengeProgramBpm,
} from '@/app/lib/spomove/challengeEmbedStorage';
import {
  buildEmbeddedChallengeLevelData,
  collectEmbeddedImageUrls,
  preloadImages,
} from './challengeEmbeddedPreset';
import { buildLevelDataFromChallengeTemplate, normalizeChallengeTemplateId } from './challengeTemplateDefaults';

function notifyParentComplete() {
  try {
    if (typeof window !== 'undefined' && window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'challenge-ended' }, window.location.origin);
    }
  } catch {
    /* ignore */
  }
}

function ChallengeProgramInner() {
  const searchParams = useSearchParams();
  const autoStart =
    searchParams.get('autoStart') === '1' || searchParams.get('autoStart') === 'true';

  const templateId = useMemo(() => {
    const fromUrl = searchParams.get('template');
    if (fromUrl) return normalizeChallengeTemplateId(fromUrl);
    return normalizeChallengeTemplateId(getSpomoveChallengeEmbed()?.templateId);
  }, [searchParams]);

  const { template, loaded: tplLoaded } = useChallengeEmbedTemplate(templateId);
  const { selected: bgmPath, sourceBpm, bgmStartOffsetMs, loading: bgmLoading } = useChallengeBGM();

  const codePreset = useMemo(() => buildEmbeddedChallengeLevelData(), []);
  const studioLevelData = useMemo(
    () => buildLevelDataFromChallengeTemplate(template, codePreset),
    [template, codePreset]
  );

  const levelData = useMemo(
    () => mergeSpomoveChallengeLevelData(studioLevelData),
    [studioLevelData]
  );

  const effectiveBpm = useMemo(() => {
    const storedBpm = getSpomoveChallengeEmbed()?.bpm;
    const manualLocal =
      typeof storedBpm === 'number' && Number.isFinite(storedBpm) && storedBpm > 0;
    if (manualLocal) return resolveChallengeProgramBpm(storedBpm, sourceBpm);
    if (typeof sourceBpm === 'number' && sourceBpm > 0) {
      return resolveChallengeProgramBpm(undefined, sourceBpm);
    }
    return resolveChallengeProgramBpm(template.bpm, undefined);
  }, [sourceBpm, template.bpm]);

  const [assetsReady, setAssetsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const urls = collectEmbeddedImageUrls(levelData);
    if (urls.length === 0) {
      setAssetsReady(true);
      return () => {
        cancelled = true;
      };
    }
    void preloadImages(urls).then(() => {
      if (!cancelled) setAssetsReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [levelData]);

  const onEnd = useCallback(() => {
    notifyParentComplete();
  }, []);

  const ready = !bgmLoading && tplLoaded && assetsReady;

  return (
    <main
      className="min-h-screen bg-neutral-950 text-neutral-100"
      style={{ fontFamily: "'Pretendard','Apple SD Gothic Neo','Noto Sans KR',sans-serif" }}
    >
      {!ready ? (
        <div className="flex min-h-screen items-center justify-center text-sm text-neutral-500">
          챌린지 준비 중…
        </div>
      ) : (
        <div className="mx-auto flex min-h-screen max-w-4xl flex-col px-2 py-4">
          <SpokeduRhythmGame
            allowEdit={false}
            soundOn
            lockBpm
            bgmPath={bgmPath || undefined}
            bgmSourceBpm={sourceBpm ?? undefined}
            bgmStartOffsetMs={bgmStartOffsetMs}
            initialBpm={effectiveBpm}
            initialLevel={1}
            initialLevelData={levelData}
            autoStart={autoStart}
            onEnd={onEnd}
          />
        </div>
      )}
    </main>
  );
}

export default function ChallengeProgramClient() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-neutral-950 text-neutral-500">
          로딩 중…
        </div>
      }
    >
      <ChallengeProgramInner />
    </Suspense>
  );
}
