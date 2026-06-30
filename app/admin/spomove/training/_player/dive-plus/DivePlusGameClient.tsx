'use client';

import FlowGameClientPlus from '../flow-lab/FlowGameClient';
import { useSpomoveDiveEnvironments } from '@/app/lib/admin/hooks/useSpomoveDiveEnvironments';
import type { FlowStageConfig } from '../flow-lab/engine/modules/stageBuilder';
import type { FlowStats } from '../flow-lab/engine/FlowEngine';

const STATIC_PANORAMA = '/spomove/dive/environments/space/panorama.webp';

type Props = {
  stages: FlowStageConfig[];
  motionScale: number;
  bgmPath?: string;
  onComplete: (stats: FlowStats) => void;
  onExit: () => void;
  onEngineReady?: (api: { loadBgmLate: (path: string) => Promise<void> }) => void;
};

export default function DivePlusGameClient(props: Props) {
  const { data, loading, getPreviewUrl } = useSpomoveDiveEnvironments();
  const spaceEntry = data.themes.space ?? null;

  const panoramaHighUrl =
    spaceEntry?.hasHighRes === true
      ? (getPreviewUrl(spaceEntry.panoramaPath) ?? undefined)
      : undefined;

  const panoramaLowUrl = spaceEntry
    ? (getPreviewUrl(spaceEntry.panoramaLowPath) ?? STATIC_PANORAMA)
    : STATIC_PANORAMA;

  if (loading) {
    return (
      <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#020617' }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', border: '2px solid #6366f1', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <FlowGameClientPlus
      stages={props.stages}
      colorTheme="space"
      visualMode="enhanced"
      motionScale={props.motionScale}
      bgmPath={props.bgmPath}
      panoramaHighUrl={panoramaHighUrl}
      panoramaLowUrl={panoramaLowUrl}
      panoramaYawDeg={spaceEntry?.yawDeg ?? 0}
      onComplete={props.onComplete}
      onExit={props.onExit}
      onEngineReady={props.onEngineReady}
    />
  );
}
