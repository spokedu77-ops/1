'use client';

import FlowGameClientPlus from '../flow-lab/FlowGameClient';
import type { FlowStageConfig } from '../flow-lab/engine/modules/stageBuilder';
import type { FlowStats } from '../flow-lab/engine/FlowEngine';

type Props = {
  stages: FlowStageConfig[];
  motionScale: number;
  bgmPath?: string;
  panoramaHighUrl?: string;
  panoramaLowUrl?: string;
  panoramaYawDeg?: number;
  onComplete: (stats: FlowStats) => void;
  onExit: () => void;
  onEngineReady?: (api: { loadBgmLate: (path: string) => Promise<void> }) => void;
};

/** @deprecated flow-lab FlowGameClient 직접 사용 권장 */
export default function DivePlusGameClient(props: Props) {
  return (
    <FlowGameClientPlus
      stages={props.stages}
      motionScale={props.motionScale}
      bgmPath={props.bgmPath}
      panoramaHighUrl={props.panoramaHighUrl}
      panoramaLowUrl={props.panoramaLowUrl}
      panoramaYawDeg={props.panoramaYawDeg ?? 0}
      onComplete={props.onComplete}
      onExit={props.onExit}
      onEngineReady={props.onEngineReady}
    />
  );
}
