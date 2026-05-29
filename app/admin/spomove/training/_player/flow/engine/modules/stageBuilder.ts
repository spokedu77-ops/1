/**
 * Flow 2.0 — 스테이지 빌더
 *
 * 구조:
 *   Stage 1      : {jump} — 기본 달리기
 *   Stage 2..N   : {jump, 해당모듈만} — 기능 하나씩 단독 훈련
 *   BONUS Stage  : {jump, 전체 모듈} — 종합 (선택 모듈 2개 이상일 때만 추가)
 */

import { FLOW_MODULES } from './flowModules';
import type { FlowModuleKey } from './flowModules';

export interface FlowStageConfig {
  stageIndex: number;
  stageNum: number;
  label: string;
  durationSec: number;
  activeModules: Set<FlowModuleKey>;
  newModule: FlowModuleKey;
  isBonus: boolean;
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

/**
 * @param selectedModules 선택된 모듈 (순서 = 스테이지 도입 순서, base 제외)
 * @param durationSec     스테이지당 시간 (초)
 */
export function buildStages(
  selectedModules: FlowModuleKey[],
  durationSec = 25,
): FlowStageConfig[] {
  const stages: FlowStageConfig[] = [];
  const baseMod = FLOW_MODULES.jump;

  // Stage 1: 점프만
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

  // 각 모듈 단독 스테이지: jump + 해당 모듈만
  for (let i = 0; i < selectedModules.length; i++) {
    const key = selectedModules[i]!;
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

  // 보너스 스테이지: 전체 합산 (선택 모듈 2개 이상)
  if (selectedModules.length >= 2) {
    const bonusIdx = selectedModules.length + 1;
    stages.push({
      stageIndex: bonusIdx,
      stageNum: bonusIdx + 1,
      label: 'BONUS',
      durationSec: 60, // 보너스 스테이지는 항상 1분 고정
      activeModules: new Set<FlowModuleKey>(['jump', ...selectedModules]),
      newModule: selectedModules[selectedModules.length - 1]!,
      isBonus: true,
      color: '#fbbf24',
      colorBg: 'rgba(251,191,36,0.15)',
      colorBorder: 'rgba(251,191,36,0.6)',
      cueWord: '보너스!',
      shortInstruction: '지금까지 배운 모든 동작을 펼쳐보세요!',
    });
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
