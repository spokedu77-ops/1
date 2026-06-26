/**
 * flow-lab 동작 동일성 검증 — 운영 flow/ vs flow-lab/
 *
 * 이 파일은 리팩터링 1단계 전용이다.
 * 운영 코드와 flow-lab 복제본의 순수 함수가 동일한 입력에서
 * 동일한 출력을 내는지 확인한다.
 *
 * 환경: vitest (node, jsdom 없음)
 * 신규 라이브러리 없음. 기존 vitest 재사용.
 */

import { describe, test, expect } from 'vitest';
import * as THREE from 'three';
import { FlowCamera } from './engine/FlowCamera';
import type { FlowCameraUpdateInput } from './engine/FlowCamera';
import {
  BridgeRenderer,
  LANE_WIDTH,
  BRIDGE_LENGTH,
  PAD_DEPTH,
} from './engine/renderers/BridgeRenderer';

// ── 운영 flow 순수 함수 ────────────────────────────────────────────────────────
import {
  buildStages as prodBuildStages,
  buildStagePreview as prodBuildStagePreview,
} from '../flow/engine/modules/stageBuilder';
import { FLOW_MODULES as PROD_FLOW_MODULES } from '../flow/engine/modules/flowModules';
import { generateObstacleSchedule as prodGenerateObstacleSchedule } from '../flow/engine/modules/flowObstacleSchedule';
import type { FlowModuleKey as ProdFlowModuleKey } from '../flow/engine/modules/flowModules';

// ── flow-lab 복제본 순수 함수 ─────────────────────────────────────────────────
import {
  buildStages as labBuildStages,
  buildStagePreview as labBuildStagePreview,
} from './engine/modules/stageBuilder';
import { FLOW_MODULES as LAB_FLOW_MODULES } from './engine/modules/flowModules';
import { generateObstacleSchedule as labGenerateObstacleSchedule } from './engine/modules/flowObstacleSchedule';
import type { FlowModuleKey as LabFlowModuleKey } from './engine/modules/flowModules';

// ── 공통 헬퍼 ─────────────────────────────────────────────────────────────────

type AnyModuleKey = ProdFlowModuleKey & LabFlowModuleKey;

function makeActiveModules(...keys: AnyModuleKey[]): Set<AnyModuleKey> {
  return new Set<AnyModuleKey>(['jump', ...keys]);
}

// FlowStageConfig는 Set<FlowModuleKey>을 포함하므로 직렬화해서 비교한다.
function serializeStages(stages: ReturnType<typeof prodBuildStages>) {
  return stages.map((s) => ({
    ...s,
    activeModules: [...s.activeModules].sort(),
  }));
}

// ── 1. FLOW_MODULES 상수 일치 ─────────────────────────────────────────────────

describe('FLOW_MODULES 상수 동일성', () => {
  test('운영·lab 키 집합 일치', () => {
    const prodKeys = Object.keys(PROD_FLOW_MODULES).sort();
    const labKeys  = Object.keys(LAB_FLOW_MODULES).sort();
    expect(labKeys).toEqual(prodKeys);
  });

  test('각 모듈 속성 동일', () => {
    for (const key of Object.keys(PROD_FLOW_MODULES) as ProdFlowModuleKey[]) {
      expect(LAB_FLOW_MODULES[key as LabFlowModuleKey]).toEqual(
        PROD_FLOW_MODULES[key],
      );
    }
  });
});

// ── 2. buildStages 동일성 ─────────────────────────────────────────────────────

const STAGE_CASES: [string, AnyModuleKey[], number][] = [
  ['기본 (모듈 없음)', [],              25],
  ['punch 단일',       ['punch'],       25],
  ['duck 단일',        ['duck'],        25],
  ['reach 단일',       ['reach'],       25],
  ['faster 단일',      ['faster'],      25],
  ['punch+duck',       ['punch', 'duck'], 25],
  ['duck+reach',       ['duck', 'reach'], 30],
  ['punch+duck+reach', ['punch', 'duck', 'reach'], 20],
  ['전체 모듈',        ['faster', 'punch', 'duck', 'reach'], 15],
  ['15초',             ['punch'],       15],
  ['60초',             ['punch', 'duck'], 60],
];

describe('buildStages 동일성', () => {
  for (const [label, mods, dur] of STAGE_CASES) {
    test(`${label} — 스테이지 수·순서·속성 일치`, () => {
      const prod = serializeStages(prodBuildStages(mods, dur));
      const lab  = serializeStages(labBuildStages(mods, dur));
      expect(lab).toEqual(prod);
    });
  }

  test('모듈 없음 — 스테이지 1개 (jump 전용)', () => {
    const stages = labBuildStages([], 25);
    expect(stages).toHaveLength(1);
    expect(stages[0]!.newModule).toBe('jump');
    expect(stages[0]!.isBonus).toBe(false);
  });

  test('punch 단일 — 스테이지 2개 (jump + punch), 보너스 없음', () => {
    const stages = labBuildStages(['punch'], 25);
    expect(stages).toHaveLength(2);
    expect(stages[1]!.newModule).toBe('punch');
    expect(stages.every((s) => !s.isBonus)).toBe(true);
  });

  test('punch+duck — 스테이지 4개 (jump + punch + duck + 보너스)', () => {
    const stages = labBuildStages(['punch', 'duck'], 25);
    expect(stages).toHaveLength(4);
    expect(stages[3]!.isBonus).toBe(true);
  });

  test('보너스 스테이지는 항상 60초', () => {
    const stages = labBuildStages(['punch', 'duck'], 25);
    const bonus = stages.find((s) => s.isBonus);
    expect(bonus?.durationSec).toBe(60);
  });

  test('비보너스 스테이지는 지정 durationSec 사용', () => {
    const stages = labBuildStages(['punch', 'duck'], 30);
    const nonBonus = stages.filter((s) => !s.isBonus);
    expect(nonBonus.every((s) => s.durationSec === 30)).toBe(true);
  });
});

// ── 3. buildStagePreview 동일성 ───────────────────────────────────────────────

describe('buildStagePreview 동일성', () => {
  for (const [label, mods] of STAGE_CASES) {
    test(`${label} — 미리보기 일치`, () => {
      const prod = prodBuildStagePreview(mods);
      const lab  = labBuildStagePreview(mods);
      const serialize = (p: typeof prod) =>
        p.map((s) => ({ ...s, modules: [...s.modules].sort() }));
      expect(serialize(lab)).toEqual(serialize(prod));
    });
  }
});

// ── 4. generateObstacleSchedule 동일성 ───────────────────────────────────────
// 랜덤 요소가 있어 결정적(deterministic) 비교 대신
// "운영본과 lab이 동일한 분포 규칙을 따르는지" 속성으로 검증한다.

// REACH_CAP_SESSION = 6. sessionReachPlaced=6 → 예산 완전 소진.
const OBS_CASES: [string, AnyModuleKey[], number, boolean, number][] = [
  ['jump 전용',           [],                     25,  false, 0],
  ['punch',              ['punch'],               25,  false, 0],
  ['duck',               ['duck'],                25,  false, 0],
  ['reach (잔여 있음)',  ['reach'],               25,  false, 0],
  ['reach (예산 소진)',  ['reach'],               25,  false, 6],
  ['보너스 전체 모듈',   ['punch', 'duck', 'reach'], 60, true, 0],
];

function scheduleStats(schedule: (string | null)[]) {
  const counts: Record<string, number> = { box: 0, ufo: 0, reach: 0, null: 0 };
  for (const s of schedule) {
    const k = s ?? 'null';
    counts[k] = (counts[k] ?? 0) + 1;
  }
  return counts;
}

describe('generateObstacleSchedule 속성 동일성', () => {
  for (const [label, mods, dur, isBonus, sessionReach] of OBS_CASES) {
    test(`${label} — 인접 동일 타입 없음`, () => {
      const opts = {
        durationSec: dur,
        speedMult: 1.0,
        sessionReachPlaced: sessionReach,
        isBonus,
        activeModules: makeActiveModules(...mods),
      };
      const labSched  = labGenerateObstacleSchedule(opts);
      const prodSched = prodGenerateObstacleSchedule(opts);

      // 인접 중복 없음 (둘 다 동일한 규칙)
      for (const sched of [labSched, prodSched]) {
        for (let i = 1; i < sched.length; i++) {
          if (sched[i - 1] !== null && sched[i] !== null) {
            expect(sched[i]).not.toBe(sched[i - 1]);
          }
        }
      }
    });

    test(`${label} — lab 스케줄 타입 구조가 운영본 타입 구조와 동일`, () => {
      const opts = {
        durationSec: dur,
        speedMult: 1.0,
        sessionReachPlaced: sessionReach,
        isBonus,
        activeModules: makeActiveModules(...mods),
      };

      const TRIALS = 30;
      const labHasBox: boolean[]   = [];
      const prodHasBox: boolean[]  = [];
      const labHasUfo: boolean[]   = [];
      const prodHasUfo: boolean[]  = [];
      const labHasReach: boolean[] = [];
      const prodHasReach: boolean[]= [];

      for (let t = 0; t < TRIALS; t++) {
        const ls = scheduleStats(labGenerateObstacleSchedule(opts));
        const ps = scheduleStats(prodGenerateObstacleSchedule(opts));
        labHasBox.push(ls['box']! > 0);
        prodHasBox.push(ps['box']! > 0);
        labHasUfo.push(ls['ufo']! > 0);
        prodHasUfo.push(ps['ufo']! > 0);
        labHasReach.push(ls['reach']! > 0);
        prodHasReach.push(ps['reach']! > 0);
      }

      // box: punch 모듈 있을 때만 등장 — lab·prod 동일
      const labBoxRate  = labHasBox.filter(Boolean).length;
      const prodBoxRate = prodHasBox.filter(Boolean).length;
      if (mods.includes('punch' as AnyModuleKey) || isBonus) {
        expect(labBoxRate).toBeGreaterThan(0);
        expect(prodBoxRate).toBeGreaterThan(0);
      } else {
        expect(labBoxRate).toBe(0);
        expect(prodBoxRate).toBe(0);
      }

      // ufo: duck 모듈 있을 때만 등장
      const labUfoRate  = labHasUfo.filter(Boolean).length;
      const prodUfoRate = prodHasUfo.filter(Boolean).length;
      if (mods.includes('duck' as AnyModuleKey) || isBonus) {
        expect(labUfoRate).toBeGreaterThan(0);
        expect(prodUfoRate).toBeGreaterThan(0);
      } else {
        expect(labUfoRate).toBe(0);
        expect(prodUfoRate).toBe(0);
      }

      // reach: sessionReachPlaced < 2 일 때 등장 가능 (비보너스)
      const labReachRate  = labHasReach.filter(Boolean).length;
      const prodReachRate = prodHasReach.filter(Boolean).length;
      if (
        (mods.includes('reach' as AnyModuleKey) || isBonus) &&
        (isBonus || sessionReach < 2)
      ) {
        expect(labReachRate).toBeGreaterThan(0);
        expect(prodReachRate).toBeGreaterThan(0);
      }
      // REACH_CAP_SESSION=6 → sessionReachPlaced=6 이면 예산 0 → reach 0회
      if (!isBonus && sessionReach >= 6) {
        expect(labReachRate).toBe(0);
        expect(prodReachRate).toBe(0);
      }
    });
  }
});

// ── 5. FlowCamera 단위 테스트 ────────────────────────────────────────────────

const GROUND_Y_TEST = 30;

function makeCamera(): { cam: THREE.PerspectiveCamera; fc: FlowCamera } {
  const cam = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 12000);
  const fc  = new FlowCamera(cam, GROUND_Y_TEST);
  return { cam, fc };
}

function makeInput(overrides: Partial<FlowCameraUpdateInput> = {}): FlowCameraUpdateInput {
  return {
    dtM: 1 / 60, dt60M: 1, dtWall: 1 / 60,
    speed: 0, phase: 'playing', gameTime: 0,
    isJumping: false, jumpProgress: 0, playerJumpY: 0,
    isOnBridge: false, isOnPad: false, isChangingLane: false,
    targetX: 0, activeBridgeX: 0, groundY: GROUND_Y_TEST,
    ...overrides,
  };
}

describe('FlowCamera', () => {
  test('reset() — 초기 위치와 FOV 확인', () => {
    const { cam } = makeCamera();
    expect(cam.position.y).toBeCloseTo(130 + GROUND_Y_TEST, 1); // CAMERA_BASE_HEIGHT + GROUND_Y
    expect(cam.position.z).toBeCloseTo(600, 1);                 // CAMERA_BASE_Z
    expect(cam.fov).toBe(60);
  });

  test('resize() — aspect 업데이트', () => {
    const { cam, fc } = makeCamera();
    fc.resize(1280, 720);
    expect(cam.aspect).toBeCloseTo(1280 / 720, 5);
  });

  test('정적 업데이트 — speed=0, 브릿지 없음: 카메라 위치 안정', () => {
    const { cam, fc } = makeCamera();
    const inp = makeInput({ isOnBridge: false, activeBridgeX: null });
    fc.update(inp);
    fc.update(inp);
    expect(cam.position.x).toBeCloseTo(0, 3);
    expect(cam.position.z).toBeCloseTo(600, 1);
  });

  test('X 추적 — 브릿지 레인 변경 시 카메라가 따라감', () => {
    const { cam, fc } = makeCamera();
    const inp = makeInput({ activeBridgeX: 80, isOnBridge: true });
    for (let i = 0; i < 120; i++) fc.update(inp);
    expect(cam.position.x).toBeGreaterThan(60);
  });

  test('playerJumpY — 점프 중 카메라 Y 증가', () => {
    const { cam, fc } = makeCamera();
    const baseInp = makeInput({ isOnBridge: true, activeBridgeX: 0 });
    fc.update(baseInp);
    const baseY = cam.position.y;

    const jumpInp = makeInput({
      isJumping: true, jumpProgress: 0.5, playerJumpY: 70,
      isOnBridge: true, activeBridgeX: 0,
    });
    for (let i = 0; i < 10; i++) fc.update(jumpInp);
    expect(cam.position.y).toBeGreaterThan(baseY + 30);
  });

  test('onLanding — 착지 후 임팩트가 감쇠됨', () => {
    const { cam, fc } = makeCamera();
    fc.update(makeInput({ isOnBridge: true, activeBridgeX: 0 }));
    const beforeY = cam.position.y;

    fc.onLanding(false);
    fc.update(makeInput({ isOnBridge: true, activeBridgeX: 0 }));
    const afterY = cam.position.y;

    // 착지 직후 Y가 임팩트로 변동됨
    expect(Math.abs(afterY - beforeY)).toBeGreaterThan(0.01);

    // 충분히 업데이트 후 임팩트 감쇠
    for (let i = 0; i < 120; i++) fc.update(makeInput({ isOnBridge: true, activeBridgeX: 0 }));
    expect(cam.position.y).toBeCloseTo(beforeY, 0);
  });

  test('speed FOV — 고속일 때 FOV 증가', () => {
    const { cam, fc } = makeCamera();
    for (let i = 0; i < 180; i++) fc.update(makeInput({ speed: 0.9 }));
    expect(cam.fov).toBeGreaterThan(65);
  });

  test('onDuckStart — 카메라 Y 하강', () => {
    const { cam, fc } = makeCamera();
    for (let i = 0; i < 10; i++) fc.update(makeInput({ isOnBridge: true, activeBridgeX: 0 }));
    const baseY = cam.position.y;
    fc.onDuckStart();
    for (let i = 0; i < 10; i++) fc.update(makeInput({ isOnBridge: true, activeBridgeX: 0 }));
    expect(cam.position.y).toBeLessThan(baseY - 5);
  });

  test('onDuckEnd — 덕 후 카메라 Y 회복', () => {
    const { cam, fc } = makeCamera();
    fc.onDuckStart();
    for (let i = 0; i < 5; i++) fc.update(makeInput({ isOnBridge: true, activeBridgeX: 0 }));
    fc.onDuckEnd();
    // duckBounceOffset(90) 이 0.985^n 감쇠 → 500프레임 후 ~0.05
    for (let i = 0; i < 500; i++) fc.update(makeInput({ isOnBridge: true, activeBridgeX: 0 }));
    expect(cam.position.y).toBeCloseTo(130 + GROUND_Y_TEST, 0);
  });

  test('reset() — 상태 초기화 후 재귀', () => {
    const { cam, fc } = makeCamera();
    fc.onDuckStart();
    fc.addMicroJolt(5);
    for (let i = 0; i < 10; i++) fc.update(makeInput());
    fc.reset();
    expect(cam.position.y).toBeCloseTo(130 + GROUND_Y_TEST, 1);
    expect(cam.position.z).toBeCloseTo(600, 1);
  });

  test('addHitShake — 충격 없으면 위치 결정론적', () => {
    const { cam: cam1, fc: fc1 } = makeCamera();
    const { cam: cam2, fc: fc2 } = makeCamera();
    const inp = makeInput({ gameTime: 1.5, isOnBridge: true, activeBridgeX: 0 });
    fc1.update(inp);
    fc2.update(inp);
    expect(cam1.position.x).toBeCloseTo(cam2.position.x, 10);
    expect(cam1.position.y).toBeCloseTo(cam2.position.y, 10);
    expect(cam1.position.z).toBeCloseTo(cam2.position.z, 10);
  });
});

// ── 6. stageBuilder — stage1의 activeModules 는 오직 jump ─────────────────────

describe('buildStages 불변 속성', () => {
  test('stage1 activeModules = {jump}', () => {
    for (const [, mods, dur] of STAGE_CASES) {
      const s = labBuildStages(mods, dur);
      expect([...s[0]!.activeModules]).toEqual(['jump']);
    }
  });

  test('보너스 activeModules = jump + 모든 선택 모듈', () => {
    const mods: AnyModuleKey[] = ['punch', 'duck', 'reach'];
    const stages = labBuildStages(mods, 25);
    const bonus  = stages.find((s) => s.isBonus)!;
    expect([...bonus.activeModules].sort()).toEqual(['duck', 'jump', 'punch', 'reach']);
  });

  test('stageNum = stageIndex + 1', () => {
    const stages = labBuildStages(['punch', 'duck'], 25);
    for (const s of stages) {
      expect(s.stageNum).toBe(s.stageIndex + 1);
    }
  });
});

// ── 7. BridgeRenderer 단위 테스트 ────────────────────────────────────────────

describe('BridgeRenderer', () => {
  const makeScene = () => new THREE.Scene();

  test('1. createBridge — THREE.Group 반환', () => {
    const br = new BridgeRenderer(makeScene());
    const v  = br.createBridge({ lane: 1, x: 0, z: 400 });
    expect(v.mesh).toBeInstanceOf(THREE.Group);
  });

  test('2. 자식 Mesh 수 — 4개 (상판·패드·좌빔·우빔)', () => {
    const br = new BridgeRenderer(makeScene());
    const v  = br.createBridge({ lane: 1, x: 0, z: 400 });
    expect(v.mesh.children).toHaveLength(4);
    for (const child of v.mesh.children) {
      expect(child).toBeInstanceOf(THREE.Mesh);
    }
  });

  test('3. 상판 geometry 크기 — width=LANE_WIDTH-5, depth=BRIDGE_LENGTH', () => {
    const br  = new BridgeRenderer(makeScene());
    const v   = br.createBridge({ lane: 1, x: 0, z: 400 });
    const top = v.mesh.children[0] as THREE.Mesh;
    const geo = top.geometry as THREE.BoxGeometry;
    expect(geo.parameters.width).toBe(LANE_WIDTH - 5);
    expect(geo.parameters.height).toBe(8);
    expect(geo.parameters.depth).toBe(BRIDGE_LENGTH);
  });

  test('4. 초기 Z 위치 — 입력값과 일치', () => {
    const br = new BridgeRenderer(makeScene());
    const v  = br.createBridge({ lane: 1, x: 0, z: 400 });
    expect(v.mesh.position.z).toBe(400);
    expect(v.mesh.position.y).toBe(0);
  });

  test('5. 레인별 X 위치 — lane 0=-80, 1=0, 2=80', () => {
    const br = new BridgeRenderer(makeScene());
    const v0 = br.createBridge({ lane: 0, x: -80, z: 0 });
    const v1 = br.createBridge({ lane: 1, x:   0, z: 0 });
    const v2 = br.createBridge({ lane: 2, x:  80, z: 0 });
    expect(v0.mesh.position.x).toBe(-80);
    expect(v1.mesh.position.x).toBe(0);
    expect(v2.mesh.position.x).toBe(80);
  });

  test('6. padMesh 참조 존재 + padDepth=PAD_DEPTH', () => {
    const br = new BridgeRenderer(makeScene());
    const v  = br.createBridge({ lane: 1, x: 0, z: 400 });
    expect(v.padMesh).toBeInstanceOf(THREE.Mesh);
    expect(v.padDepth).toBe(PAD_DEPTH);
  });

  test('7. createBridge 반복 호출 — scene 자식 수 증가', () => {
    const scene = makeScene();
    const br    = new BridgeRenderer(scene);
    br.createBridge({ lane: 0, x: -80, z:     0 });
    br.createBridge({ lane: 1, x:   0, z: -5000 });
    expect(scene.children).toHaveLength(2);
  });

  test('8. 레인별 상판 색상 — 0·1·2 모두 다름', () => {
    const br = new BridgeRenderer(makeScene());
    const v0 = br.createBridge({ lane: 0, x: -80, z: 0 });
    const v1 = br.createBridge({ lane: 1, x:   0, z: 0 });
    const v2 = br.createBridge({ lane: 2, x:  80, z: 0 });
    const hex = (v: typeof v0) =>
      ((v.mesh.children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial).color.getHex();
    expect(hex(v0)).not.toBe(hex(v1));
    expect(hex(v1)).not.toBe(hex(v2));
    expect(hex(v0)).not.toBe(hex(v2));
  });

  test('9. removeBridge — scene에서 제거됨', () => {
    const scene = makeScene();
    const br    = new BridgeRenderer(scene);
    const v     = br.createBridge({ lane: 1, x: 0, z: 400 });
    expect(scene.children).toHaveLength(1);
    br.removeBridge(v);
    expect(scene.children).toHaveLength(0);
  });

  test('10. removeBridge — 상판 geometry dispose 호출', () => {
    const br  = new BridgeRenderer(makeScene());
    const v   = br.createBridge({ lane: 1, x: 0, z: 400 });
    const top = v.mesh.children[0] as THREE.Mesh;
    let disposed = false;
    const orig   = top.geometry.dispose.bind(top.geometry);
    top.geometry.dispose = () => { disposed = true; orig(); };
    br.removeBridge(v);
    expect(disposed).toBe(true);
  });

  test('11. 동일 입력 — 결정적 구조 (자식 수·padDepth·geometry 일치)', () => {
    const br  = new BridgeRenderer(makeScene());
    const inp = { lane: 2 as const, x: 80, z: -5000 };
    const v1  = br.createBridge(inp);
    const v2  = br.createBridge(inp);
    expect(v1.mesh.children.length).toBe(v2.mesh.children.length);
    expect(v1.padDepth).toBe(v2.padDepth);
    const g1 = (v1.mesh.children[0] as THREE.Mesh).geometry as THREE.BoxGeometry;
    const g2 = (v2.mesh.children[0] as THREE.Mesh).geometry as THREE.BoxGeometry;
    expect(g1.parameters.width).toBe(g2.parameters.width);
    expect(g1.parameters.depth).toBe(g2.parameters.depth);
  });
});
