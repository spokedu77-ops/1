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
  const { data, getPreviewUrl } = useSpomoveDiveEnvironments();
  const spaceEntry = data.themes.space ?? null;

  const panoramaHighUrl =
    spaceEntry?.hasHighRes === true
      ? (getPreviewUrl(spaceEntry.panoramaPath) ?? undefined)
      : undefined;

  const panoramaLowUrl = spaceEntry
    ? (getPreviewUrl(spaceEntry.panoramaLowPath) ?? STATIC_PANORAMA)
    : STATIC_PANORAMA;

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
