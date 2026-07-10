/**
 * Flow 2.0 — 스테이지 빌더
 *
 * 구조:
 *   Stage 1      : {jump} — 기본 달리기 (장애물 모듈 선택 시)
 *   Stage 2..N   : {jump, 해당모듈만} — 기능 하나씩 단독 훈련
 *   colorGate    : 5단계 (jump→punch→kick→duck→reach) 색+포즈 관문
 *   BONUS Stage  : {jump, 전체 모듈} — 종합 (장애물 2개 이상일 때만)
 */

import { FLOW_MODULES } from './flowModules';
import type { FlowModuleKey } from './flowModules';
import {
  COLOR_GATE_ACTION_SEQUENCE,
  COLOR_GATE_POSE_INSTRUCTION,
  COLOR_GATE_POSE_LABEL,
} from './colorGateGuides';

export interface FlowStageConfig {
  stageIndex: number;
  stageNum: number;
  label: string;
  durationSec: number;
  activeModules: Set<FlowModuleKey>;
  newModule: FlowModuleKey;
  isBonus: boolean;
  isColorGate?: boolean;
  colorGateAction?: FlowModuleKey;
  colorGateStep?: number;
  colorGateTotal?: number;
  gateColorId?: import('./colorGateGuides').GateColorId;
  color: string;
  colorBg: string;
  colorBorder: string;
  cueWord: string;
  shortInstruction: string;
}

export interface FlowStagePreview {
  stageNum: number;
  label: string;
  modules: FlowModuleKey[];
  newModule: FlowModuleKey;
  isBonus: boolean;
  color: string;
}

const COLOR_GATE_DURATION_CAP = 22;

function buildColorGateStages(
  startIndex: number,
  startNum: number,
  durationSec: number,
): FlowStageConfig[] {
  const gateMod = FLOW_MODULES.colorGate;
  const dur = Math.min(durationSec, COLOR_GATE_DURATION_CAP);
  const total = COLOR_GATE_ACTION_SEQUENCE.length;

  return COLOR_GATE_ACTION_SEQUENCE.map((actionKey, j) => {
    const actionMod = FLOW_MODULES[actionKey];
    const isPoseOnly = COLOR_GATE_ACTION_SEQUENCE.length === 1;
    return {
      stageIndex: startIndex + j,
      stageNum: startNum + j,
      label: isPoseOnly ? 'GATE' : `GATE ${j + 1}`,
      durationSec: dur,
      activeModules: new Set<FlowModuleKey>(['jump', actionKey, 'colorGate']),
      newModule: actionKey,
      isBonus: false,
      isColorGate: true,
      colorGateAction: actionKey,
      colorGateStep: j + 1,
      colorGateTotal: total,
      color: actionMod.color,
      colorBg: gateMod.colorBg,
      colorBorder: gateMod.colorBorder,
      cueWord: isPoseOnly ? COLOR_GATE_POSE_LABEL : actionMod.cueWord,
      shortInstruction: isPoseOnly ? COLOR_GATE_POSE_INSTRUCTION : actionMod.shortInstruction,
    };
  });
}

export function buildStages(
  selectedModules: FlowModuleKey[],
  durationSec = 25,
): FlowStageConfig[] {
  const obstacleModules = selectedModules.filter((k) => k !== 'colorGate');
  const hasColorGate = selectedModules.includes('colorGate');

  if (obstacleModules.length === 0 && hasColorGate) {
    return buildColorGateStages(0, 1, durationSec);
  }

  const stages: FlowStageConfig[] = [];
  const baseMod = FLOW_MODULES.jump;

  stages.push({
    stageIndex: 0,
    stageNum: 1,
    label: 'STAGE 1',
    durationSec,
    activeModules: new Set<FlowModuleKey>(['jump']),
    newModule: 'jump',
    isBonus: false,
    color: baseMod.color,
    colorBg: baseMod.colorBg,
    colorBorder: baseMod.colorBorder,
    cueWord: baseMod.cueWord,
    shortInstruction: baseMod.shortInstruction,
  });

  for (let i = 0; i < obstacleModules.length; i++) {
    const key = obstacleModules[i]!;
    const mod = FLOW_MODULES[key];
    stages.push({
      stageIndex: i + 1,
      stageNum: i + 2,
      label: `STAGE ${i + 2}`,
      durationSec,
      activeModules: new Set<FlowModuleKey>(['jump', key]),
      newModule: key,
      isBonus: false,
      color: mod.color,
      colorBg: mod.colorBg,
      colorBorder: mod.colorBorder,
      cueWord: mod.cueWord,
      shortInstruction: mod.shortInstruction,
    });
  }

  if (obstacleModules.length >= 2) {
    const bonusIdx = obstacleModules.length + 1;
    stages.push({
      stageIndex: bonusIdx,
      stageNum: bonusIdx + 1,
      label: 'BONUS',
      durationSec: 60,
      activeModules: new Set<FlowModuleKey>(['jump', ...obstacleModules]),
      newModule: obstacleModules[obstacleModules.length - 1]!,
      isBonus: true,
      color: '#fbbf24',
      colorBg: 'rgba(251,191,36,0.15)',
      colorBorder: 'rgba(251,191,36,0.6)',
      cueWord: '보너스!',
      shortInstruction: '지금까지 배운 모든 동작을 펼쳐보세요!',
    });
  }

  if (hasColorGate) {
    const gateStartIdx = stages.length;
    const gateStartNum = stages.length + 1;
    stages.push(...buildColorGateStages(gateStartIdx, gateStartNum, durationSec));
  }

  return stages;
}

export function buildStagePreview(
  selectedModules: FlowModuleKey[],
): FlowStagePreview[] {
  const stages = buildStages(selectedModules, 0);
  return stages.map((s) => ({
    stageNum: s.stageNum,
    label: s.label,
    modules: [...s.activeModules],
    newModule: s.newModule,
    isBonus: s.isBonus,
    color: s.color,
  }));
}
