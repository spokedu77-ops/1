/**
 * Flow 2.0 — 스테이지 빌더
 * 선택한 모듈 배열 → 누적 스테이지 설정 배열 변환
 *
 * 예) selected = ['punch', 'duck', 'freeze']
 *   → Stage 1: {jump}
 *   → Stage 2: {jump, punch}
 *   → Stage 3: {jump, punch, duck}
 *   → Stage 4: {jump, punch, duck, freeze}
 */

import { FLOW_MODULES } from './flowModules';
import type { FlowModuleKey } from './flowModules';

export interface FlowStageConfig {
  stageIndex: number;   // 0-based
  stageNum: number;     // 1-based (화면 표시용)
  label: string;        // "STAGE 3"
  durationSec: number;
  /** 이 스테이지에서 활성화된 모듈 전체 */
  activeModules: Set<FlowModuleKey>;
  /** 이 스테이지에서 새로 추가된 모듈 (스테이지 인트로 강조용) */
  newModule: FlowModuleKey;
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
  color: string;
}

/**
 * @param selectedModules 선택된 모듈 (순서 = 스테이지 도입 순서, base 제외)
 * @param durationSec 스테이지당 시간 (초)
 */
export function buildStages(
  selectedModules: FlowModuleKey[],
  durationSec = 25,
): FlowStageConfig[] {
  const stages: FlowStageConfig[] = [];
  const baseMod = FLOW_MODULES.jump;

  // Stage 1: jump only (base)
  stages.push({
    stageIndex: 0,
    stageNum: 1,
    label: 'STAGE 1',
    durationSec,
    activeModules: new Set<FlowModuleKey>(['jump']),
    newModule: 'jump',
    color: baseMod.color,
    colorBg: baseMod.colorBg,
    colorBorder: baseMod.colorBorder,
    cueWord: baseMod.cueWord,
    shortInstruction: baseMod.shortInstruction,
  });

  // 누적 스테이지
  const cumulative = new Set<FlowModuleKey>(['jump']);
  for (let i = 0; i < selectedModules.length; i++) {
    const key = selectedModules[i];
    cumulative.add(key);
    const mod = FLOW_MODULES[key];
    stages.push({
      stageIndex: i + 1,
      stageNum: i + 2,
      label: `STAGE ${i + 2}`,
      durationSec,
      activeModules: new Set(cumulative),
      newModule: key,
      color: mod.color,
      colorBg: mod.colorBg,
      colorBorder: mod.colorBorder,
      cueWord: mod.cueWord,
      shortInstruction: mod.shortInstruction,
    });
  }

  return stages;
}

/** UI 프리뷰용 (렌더링에 필요한 정보만) */
export function buildStagePreview(
  selectedModules: FlowModuleKey[],
): FlowStagePreview[] {
  const stages = buildStages(selectedModules, 0);
  return stages.map((s) => ({
    stageNum: s.stageNum,
    label: s.label,
    modules: [...s.activeModules],
    newModule: s.newModule,
    color: s.color,
  }));
}
