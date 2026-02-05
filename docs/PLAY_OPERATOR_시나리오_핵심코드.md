# Play Operator·시나리오 핵심 코드 (필요 코드 정리)

operator 중심, 시나리오/정책까지 커버하는 “필요한 코드”만 모은 참고 문서.  
**경로·전체 내용**을 그대로 옮겨 두었으므로, 수정 시 해당 파일과 여기 내용을 함께 보면 됨.

---

## 1) Operator 허용 규칙과 프리셋 (가장 먼저)

**파일**: `app/lib/engine/play/presets.ts`

여기서 **“우리가 준비한 액션/연출 종류” 스펙**이 확정됨.

### MOTION_IDS, MOTION_LABELS

```ts
/** 15개 motionId 고정 */
export const MOTION_IDS = [
  'point', 'walk', 'pull_down', 'pull_up', 'throw', 'punch',
  'jump', 'turn_hand', 'swing', 'swipe', 'clap', 'say_hi',
  'cut', 'knock', 'tap',
] as const;

export type MotionId = (typeof MOTION_IDS)[number];

/** motionId → 표시 라벨 (EXPLAIN용) */
export const MOTION_LABELS: Record<MotionId, string> = {
  point: '콕 찌르기',
  walk: '제자리 걷기',
  pull_down: '줄 당기기(아래)',
  pull_up: '줄 당기기(위)',
  throw: '던지기',
  punch: '펀치',
  jump: '점프',
  turn_hand: '손 돌리기',
  swing: '휘두르기',
  swipe: '스와이프',
  clap: '박수',
  say_hi: '안녕 흔들기',
  cut: '자르기',
  knock: '노크',
  tap: '탭',
};
```

### motion별 허용 operator 패턴 (전체)

```ts
/** 허용 패턴: 'BINARY'|'DROP'|'PROGRESSIVE' 또는 PROGRESSIVE+style */
type AllowedPattern = 'BINARY' | 'DROP' | 'PROGRESSIVE' | { type: 'PROGRESSIVE'; style: 'wipe' | 'frames' };

/** Set별 허용 operator 패턴 */
export type AllowedOperatorPattern = {
  set1: AllowedPattern[];
  set2: AllowedPattern[];
};

export function isOperatorAllowed(op: SetOperator, patterns: AllowedPattern[]): boolean {
  return patterns.some((p) => {
    if (p === 'BINARY' || p === 'DROP') return op.type === p;
    if (p === 'PROGRESSIVE') return op.type === 'PROGRESSIVE';
    if (typeof p === 'object' && p.type === 'PROGRESSIVE' && op.type === 'PROGRESSIVE') return p.style === op.style;
    return false;
  });
}

/** motion별 허용 operator 패턴 (운영 표준) */
export const MOTION_OPERATOR_MAP: Record<MotionId, AllowedOperatorPattern> = {
  point: { set1: ['BINARY'], set2: ['BINARY'] },
  walk: { set1: ['BINARY'], set2: ['BINARY'] },
  pull_down: { set1: ['BINARY', 'PROGRESSIVE'], set2: ['BINARY', 'PROGRESSIVE'] },
  pull_up: { set1: ['BINARY', 'PROGRESSIVE'], set2: ['BINARY', 'PROGRESSIVE'] },
  throw: { set1: ['BINARY', 'DROP'], set2: ['BINARY', 'DROP'] },
  punch: { set1: ['BINARY'], set2: ['BINARY'] },
  jump: { set1: ['BINARY'], set2: ['BINARY'] },
  turn_hand: { set1: ['BINARY'], set2: ['BINARY'] },
  swing: { set1: ['BINARY'], set2: ['BINARY'] },
  swipe: { set1: ['BINARY', 'PROGRESSIVE'], set2: ['BINARY', 'PROGRESSIVE'] },
  clap: { set1: ['BINARY'], set2: ['BINARY'] },
  say_hi: {
    set1: ['BINARY'],
    set2: ['BINARY', { type: 'PROGRESSIVE', style: 'wipe' }],
  },
  cut: { set1: ['BINARY', 'PROGRESSIVE'], set2: ['BINARY', 'PROGRESSIVE'] },
  knock: { set1: ['BINARY'], set2: ['BINARY'] },
  tap: { set1: ['BINARY'], set2: ['BINARY'] },
};
```

- **operator 테스트**: `mockAssetIndex`에는 operator 정보 없음. say_hi(wipe), walk, throw(DROP), clap, punch용 **이미지 URL만** 있음. operator 조합은 Draft에서 정함.

---

## 2) Draft가 실제로 무엇을 담는지 (motion + operator 구조)

**“시나리오가 뭐냐” 혼란의 대부분은 Draft가 motion 리스트인지, operator까지 포함하는지에서 옴.**  
Draft는 **motion + set1/set2 각각의 operator**까지 담는 구조임.

### mockAssetIndex (참고)

**파일**: `app/lib/engine/play/mockAssetIndex.ts`

- operator 테스트용 필드는 없음. **에셋 URL만** 정의 (say_hi: off/on/bgSrc/fgSrc, walk/throw/clap/punch: off/on, throw는 objects·bgSrc).  
- operator 조합은 Draft에서 정하고, 컴파일 시 이 URL이 set1/set2에 매핑됨.

### DEFAULT_DRAFT 정의 위치와 내용 전체

**위치 1**: `app/components/subscriber/PlayRuntimeWrapper.tsx`

```ts
const DEFAULT_DRAFT = {
  blocks: [
    { motionId: 'say_hi', set1: { operator: { type: 'BINARY' as const } }, set2: { operator: { type: 'PROGRESSIVE' as const, style: 'wipe' as const } } },
    { motionId: 'walk', set1: { operator: { type: 'BINARY' as const } }, set2: { operator: { type: 'BINARY' as const } } },
    { motionId: 'throw', set1: { operator: { type: 'DROP' as const } }, set2: { operator: { type: 'DROP' as const } } },
    { motionId: 'clap', set1: { operator: { type: 'BINARY' as const } }, set2: { operator: { type: 'BINARY' as const } } },
    { motionId: 'punch', set1: { operator: { type: 'BINARY' as const } }, set2: { operator: { type: 'BINARY' as const } } },
  ],
};
```

**위치 2**: `app/components/play-test/PlayTestContent.tsx`

```ts
const DEFAULT_DRAFT = {
  blocks: [
    { motionId: 'say_hi', set1: { operator: { type: 'BINARY' as const } }, set2: { operator: { type: 'PROGRESSIVE' as const, style: 'wipe' as const } } },
    { motionId: 'walk', set1: { operator: { type: 'BINARY' as const } }, set2: { operator: { type: 'BINARY' as const } } },
    { motionId: 'throw', set1: { operator: { type: 'DROP' as const } }, set2: { operator: { type: 'DROP' as const } } },
    { motionId: 'clap', set1: { operator: { type: 'BINARY' as const } }, set2: { operator: { type: 'BINARY' as const } } },
    { motionId: 'punch', set1: { operator: { type: 'BINARY' as const } }, set2: { operator: { type: 'BINARY' as const } } },
  ],
};
```

- 내용 동일. **block = motionId + set1.operator + set2.operator** 구조.

### PlayBlockSchema, PlayDraftSchema (block에 operator가 어떤 필드로 들어가는지)

**파일**: `app/lib/constants/schemas.ts`

```ts
/** PROGRESSIVE style: wipe | frames */
export const PROGRESSIVE_STYLE = ['wipe', 'frames'] as const;

/** Set operator 3타입 - discriminated union */
export const BinaryOperatorSchema = z.object({ type: z.literal('BINARY') });
export const ProgressiveOperatorSchema = z.object({
  type: z.literal('PROGRESSIVE'),
  style: z.enum(PROGRESSIVE_STYLE),
});
export const DropOperatorSchema = z.object({ type: z.literal('DROP') });

export const SetOperatorSchema = z.discriminatedUnion('type', [
  BinaryOperatorSchema,
  ProgressiveOperatorSchema,
  DropOperatorSchema,
]);

/** Set: set1, set2 각각 operator 가짐 */
export const PlaySetSchema = z.object({
  operator: SetOperatorSchema,
});

/** Block: motionId + set1 + set2 */
export const PlayBlockSchema = z.object({
  motionId: z.string(),
  set1: PlaySetSchema,
  set2: PlaySetSchema,
});

/** PlayDraft: blocks length=5 */
export const PlayDraftSchema = z.object({
  blocks: z.array(PlayBlockSchema).length(5),
});
```

- **Draft = blocks 5개**.  
- **각 block** = `motionId` + `set1: { operator }` + `set2: { operator }`.  
- **operator** = `BINARY` | `PROGRESSIVE`(style: wipe|frames) | `DROP`.

---

## 3) Compiler가 operator/motion을 어떻게 resolve 하는지 (핵심 파이프라인)

**파일**: `app/lib/engine/play/compiler.ts` 전체

**PlayDraft + AssetIndex → ResolvedPlayDraft**.  
block마다 **어떤 set(set1/set2)과 어떤 operator가 선택되는지**가 여기서 확정됨.  
“액션 더 준비했다”가 반영되는지 여부는 **AssetIndex.motions**에 해당 motionId가 있고, **policy(presets)** 에서 허용 패턴을 통과하는지로 판별됨.

```ts
/**
 * PLAY v1 컴파일러
 * 유일한 랜덤/풀 결정 지점. Date, Math.random 사용 금지.
 * 입력: PlayDraft + AssetIndex + seed + policy + shutterPoolTag?
 * 출력: ResolvedPlayDraft (모든 imageId 확정)
 */

import { PlayDraftSchema, type PlayDraft, type PlayBlock, type SetOperator } from '@/app/lib/constants/schemas';
import { MOTION_IDS, MOTION_OPERATOR_MAP, isOperatorAllowed, type MotionId } from './presets';
import type { AssetIndex, ResolvedBlock, ResolvedPlayDraft } from './types';

function createSeededRandom(seed: number): () => number {
  return function next() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface CompilerInput {
  draft: PlayDraft;
  assetIndex: AssetIndex;
  seed: number;
  policy?: 'presets';
  shutterPoolTag?: string;
  backgroundPool?: string[];
}

export function compile(input: CompilerInput): ResolvedPlayDraft {
  const { draft, assetIndex, seed, policy = 'presets', shutterPoolTag, backgroundPool } = input;

  const validated = PlayDraftSchema.parse(draft);
  const random = createSeededRandom(seed);

  if (policy === 'presets') {
    for (const block of validated.blocks) {
      const motionId = block.motionId as MotionId;
      if (!MOTION_IDS.includes(motionId)) {
        throw new Error(`Invalid motionId: ${motionId}. Must be one of ${MOTION_IDS.join(', ')}`);
      }
      const pattern = MOTION_OPERATOR_MAP[motionId];
      if (!isOperatorAllowed(block.set1.operator, pattern.set1)) {
        throw new Error(`Motion ${motionId} set1: operator ${JSON.stringify(block.set1.operator)} not allowed`);
      }
      if (!isOperatorAllowed(block.set2.operator, pattern.set2)) {
        throw new Error(`Motion ${motionId} set2: operator ${JSON.stringify(block.set2.operator)} not allowed`);
      }
    }
  }

  const blocks: ResolvedBlock[] = validated.blocks.map((block: PlayBlock) => {
    const motionAssets = assetIndex.motions[block.motionId];
    if (!motionAssets) {
      throw new Error(`Missing assets for motionId: ${block.motionId}`);
    }
    const { off, on, set1: set1Assets, set2: set2Assets, frames, objects, bgSrc, fgSrc } = motionAssets;
    const imageIds1 = set1Assets ?? { off, on };
    const imageIds2 = set2Assets ?? { off, on };

    const baseSet = (op: SetOperator, imageIds: { off: string; on: string }) => ({
      operator: op,
      imageIds,
      ...(frames?.length ? { frames } : undefined),
      ...(objects?.length ? { objects } : undefined),
      ...(bgSrc ? { bgSrc } : undefined),
      ...(fgSrc ? { fgSrc } : undefined),
    });

    return {
      motionId: block.motionId,
      set1: baseSet(block.set1.operator, imageIds1),
      set2: baseSet(block.set2.operator, imageIds2),
    };
  });

  let backgroundUrl: string | undefined = assetIndex.background;
  if (shutterPoolTag && backgroundPool && backgroundPool.length > 0) {
    const filtered = backgroundPool.filter((p) => p.includes(shutterPoolTag));
    const pool = filtered.length > 0 ? filtered : backgroundPool;
    const idx = Math.floor(random() * pool.length);
    backgroundUrl = pool[idx];
  }

  return {
    blocks,
    backgroundUrl,
    bgmPath: assetIndex.bgm,
    sfxPath: assetIndex.sfx,
  };
}
```

- **Resolved block** = motionId + set1/set2 각각 **operator + imageIds(off, on) + (선택) frames, objects, bgSrc, fgSrc**.  
- **액션 추가**: `MOTION_IDS`/`MOTION_OPERATOR_MAP`에 motion 추가 + `AssetIndex.motions[motionId]` 채우면 반영됨.

---

## 4) Timeline에서 operator가 tick 이벤트로 어떻게 펼쳐지는지 (가장 중요)

**파일**: `app/lib/engine/play/timeline.ts` 전체

**EXPLAIN / set1 / set2 / TRANSITION** 구간 생성.  
tick 루프에서 **어떤 VisualEvent를 push하는지**가 여기서 결정됨.  
“0.5초(1 tick) 단위로 on/off + wipe/drop 같은 연출 섞기”가 구현된 곳.

```ts
/**
 * PLAY v1 타임라인 생성
 * Pure: ResolvedPlayDraft → PlayTimeline
 */

import { PLAY_RULES } from '@/app/lib/constants/rules';
import { MOTION_LABELS } from './presets';
import type { ResolvedBlock, ResolvedPlayDraft } from './types';
import type {
  VisualEvent, BinaryEvent, RevealWipeEvent, DropEvent,
  ExplainEvent, TransitionEvent, AudioEvent, PlayTimeline,
} from './types';

const { TICKS } = PLAY_RULES;
const EXPLAIN = TICKS.EXPLAIN;
const SET = TICKS.SET;
const TRANSITION = TICKS.TRANSITION;
const BLOCKS = TICKS.BLOCKS;

export function buildTimeline(resolved: ResolvedPlayDraft): PlayTimeline {
  const visuals: VisualEvent[] = [];
  const audio: AudioEvent[] = [];
  let globalTick = 0;

  for (let blockIdx = 0; blockIdx < BLOCKS; blockIdx++) {
    const block = resolved.blocks[blockIdx];
    const blockStartTick = globalTick;
    const motionId = block.motionId;
    const label = MOTION_LABELS[motionId as keyof typeof MOTION_LABELS] ?? motionId;

    // explain 5ticks
    for (let t = 0; t < EXPLAIN; t++) {
      visuals.push({ kind: 'EXPLAIN', tick: blockStartTick + t, motionId, label } as ExplainEvent);
    }
    globalTick += EXPLAIN;

    // set1 20ticks
    emitSetEvents(block, 1, globalTick, blockIdx, visuals);
    globalTick += SET;

    // set2 20ticks
    emitSetEvents(block, 2, globalTick, blockIdx, visuals);
    globalTick += SET;

    // transition 5ticks
    for (let t = 0; t < TRANSITION; t++) {
      visuals.push({ kind: 'TRANSITION', tick: globalTick + t, blockIndex: blockIdx } as TransitionEvent);
    }
    globalTick += TRANSITION;
  }

  const totalTicks = globalTick;
  audio.push({ kind: 'BGM_START', tick: 0, path: resolved.bgmPath });
  audio.push({ kind: 'BGM_STOP', tick: totalTicks - 1 });

  const isActionTick = (v: VisualEvent): boolean => {
    if (v.kind === 'BINARY') return v.isActionPhase === true;
    if (v.kind === 'REVEAL_WIPE') return v.phase === 'action';
    if (v.kind === 'DROP') return v.phase === 'drop';
    return false;
  };
  const actionTicks = visuals
    .filter((v) => (v.kind === 'BINARY' || v.kind === 'REVEAL_WIPE' || v.kind === 'DROP') && isActionTick(v))
    .map((v) => v.tick);
  const uniqueActionTicks = [...new Set(actionTicks)];
  for (const tick of uniqueActionTicks) {
    audio.push({ kind: 'SFX', tick, path: resolved.sfxPath });
  }

  const visualsByTick: VisualEvent[][] = Array.from({ length: totalTicks }, (_, tick) =>
    visuals.filter((v) => v.tick === tick)
  );
  const audioByTick: AudioEvent[][] = Array.from({ length: totalTicks }, (_, tick) =>
    audio.filter((a) => a.tick === tick)
  );

  return { visuals, audio, totalTicks, visualsByTick, audioByTick };
}

function emitSetEvents(
  block: ResolvedBlock,
  setIndex: 1 | 2,
  startTick: number,
  blockIndex: number,
  out: VisualEvent[]
): void {
  const set = setIndex === 1 ? block.set1 : block.set2;
  const { operator, imageIds, frames, objects, bgSrc, fgSrc } = set;
  const offSrc = imageIds.off;
  const onSrc = imageIds.on;

  if (operator.type === 'BINARY') {
    for (let t = 0; t < SET; t++) {
      const isOn = t % 2 === 0;
      const src = isOn ? onSrc : offSrc;
      out.push({
        kind: 'BINARY',
        tick: startTick + t,
        blockIndex, setIndex, src,
        isActionPhase: isOn,
      } as BinaryEvent);
    }
    return;
  }

  if (operator.type === 'PROGRESSIVE') {
    if (operator.style === 'wipe') {
      const bg = bgSrc ?? offSrc;
      const fg = fgSrc ?? onSrc;
      for (let t = 0; t < SET; t++) {
        const phase = t % 2 === 0 ? 'action' : 'rest';
        const step = Math.floor(t / 2) % 5;
        const progress = (step + (phase === 'action' ? 1 : 0)) / 5;
        out.push({
          kind: 'REVEAL_WIPE',
          tick: startTick + t,
          blockIndex, setIndex,
          bgSrc: bg, fgSrc: fg,
          progress, phase, direction: 'bottom-up',
        } as RevealWipeEvent);
      }
    } else {
      for (let t = 0; t < SET; t++) {
        const src = t < 10 ? (frames?.[t] ?? onSrc) : (frames?.[9] ?? onSrc);
        out.push({ kind: 'BINARY', tick: startTick + t, blockIndex, setIndex, src } as BinaryEvent);
      }
    }
    return;
  }

  if (operator.type === 'DROP') {
    const objectsArr = objects ?? [];
    const bg = bgSrc;
    for (let t = 0; t < SET; t++) {
      if (t % 2 !== 0) continue;
      const objIndex = Math.floor(t / 2) % 5;
      const objSrc = objectsArr[objIndex] ?? onSrc;
      out.push({
        kind: 'DROP',
        tick: startTick + t,
        blockIndex, setIndex,
        ...(bg ? { bgSrc: bg } : {}),
        objSrc, phase: 'drop', objIndex,
      } as DropEvent);
    }
  }
}
```

- **BINARY**: 매 tick마다 on/off 교대 (t%2===0 → ON, isActionPhase로 SFX).
- **PROGRESSIVE wipe**: action/rest 교대, progress 0..1로 clip 쌓기.
- **PROGRESSIVE frames**: 10프레임 후 반복, BINARY처럼 src만 바꿔서 push.
- **DROP**: 짝수 tick만, obj 5개 로테이션, phase 'drop'.

---

## 5) VisualEvent 타입과 Renderer가 실제 지원하는 operator 목록

**operator가 “말로만 있는지”, “뷰에서 구현되어 있는지”** 여기서 확정.

### types.ts — VisualEvent(union) / operator 관련 타입

**파일**: `app/lib/engine/play/types.ts` (VisualEvent·이벤트 타입만)

```ts
export type ExplainEvent = {
  kind: 'EXPLAIN';
  tick: number;
  motionId: string;
  label: string;
};

export type BinaryEvent = {
  kind: 'BINARY';
  tick: number;
  blockIndex: number;
  setIndex: 1 | 2;
  src: string;
  isActionPhase?: boolean;
};

export type RevealWipeEvent = {
  kind: 'REVEAL_WIPE';
  tick: number;
  blockIndex: number;
  setIndex: 1 | 2;
  bgSrc: string;
  fgSrc: string;
  progress: number;
  phase: 'action' | 'rest';
  direction: 'bottom-up';
};

export type DropEvent = {
  kind: 'DROP';
  tick: number;
  blockIndex: number;
  setIndex: 1 | 2;
  bgSrc?: string;
  objSrc: string;
  phase: 'drop' | 'rest';
  objIndex: number;
};

export type TransitionEvent = {
  kind: 'TRANSITION';
  tick: number;
  blockIndex: number;
};

export type VisualEvent = ExplainEvent | BinaryEvent | RevealWipeEvent | DropEvent | TransitionEvent;
```

- **실제 연출에 대응**: BINARY → BinaryEvent, PROGRESSIVE(wipe) → RevealWipeEvent, DROP → DropEvent.  
- PROGRESSIVE(frames)는 timeline에서 BINARY로 내려보냄.

### PlayRenderer.tsx — 이벤트 타입별 렌더 분기 전체

**파일**: `app/components/runtime/PlayRenderer.tsx`

```tsx
export function PlayRenderer({ tMs, visuals, totalTicks }: PlayRendererProps) {
  const currentTick = Math.floor(tMs / TICK_MS);
  const eventsAtTick = visuals.filter((v) => v.tick === currentTick);

  const dropEvents = visuals.filter(
    (v): v is Extract<VisualEvent, { kind: 'DROP' }> => v.kind === 'DROP' && v.tick <= currentTick
  );

  const binary = eventsAtTick.find((v): v is Extract<VisualEvent, { kind: 'BINARY' }> => v.kind === 'BINARY');
  const revealWipe = eventsAtTick.find((v): v is Extract<VisualEvent, { kind: 'REVEAL_WIPE' }> => v.kind === 'REVEAL_WIPE');
  const explain = eventsAtTick.find((v): v is Extract<VisualEvent, { kind: 'EXPLAIN' }> => v.kind === 'EXPLAIN');
  const transition = eventsAtTick.find((v): v is Extract<VisualEvent, { kind: 'TRANSITION' }> => v.kind === 'TRANSITION');

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-neutral-900">
      {/* EXPLAIN: 텍스트/아이콘만 */}
      {explain && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4">
          <span className="text-2xl font-bold text-white">{explain.label}</span>
          <span className="text-sm text-neutral-400">{explain.motionId}</span>
        </div>
      )}

      {/* BINARY: 풀스크린 img */}
      {binary && !explain && (
        <img src={binary.src} alt="" className="absolute inset-0 h-full w-full object-cover" />
      )}

      {/* REVEAL_WIPE: bg + fg 오버레이, clip-path inset 아래->위 */}
      {revealWipe && !explain && (
        <div className="absolute inset-0">
          <img src={revealWipe.bgSrc} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0" style={{ clipPath: `inset(${(1 - revealWipe.progress) * 100}% 0 0 0)` }}>
            <img src={revealWipe.fgSrc} alt="" className="h-full w-full object-cover" />
          </div>
        </div>
      )}

      {/* DROP: obj 이미지 위->아래, key=tick로 애니메이션 리스타트 */}
      {dropEvents.length > 0 && !explain && !binary && !revealWipe && !transition && (
        <div className="absolute inset-0">
          {dropEvents[0]?.bgSrc && (
            <img src={dropEvents[0].bgSrc} alt="" className="absolute inset-0 h-full w-full object-cover" />
          )}
          {dropEvents.map((ev) => (
            <div key={`${ev.blockIndex}-${ev.setIndex}-${ev.tick}-${ev.objIndex}`}
                 className="absolute left-1/2 top-0 flex h-24 w-24 -translate-x-1/2 justify-center">
              <img src={ev.objSrc} alt="" className="h-full w-auto object-contain animate-drop" style={{ animationDuration: '0.5s' }} />
            </div>
          ))}
        </div>
      )}

      {/* TRANSITION */}
      {transition && !explain && !binary && !revealWipe && (
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-800">
          <span className="text-sm text-neutral-500">전환</span>
        </div>
      )}

      {/* 기본: 아무것도 없을 때 */}
      {!explain && !binary && !revealWipe && dropEvents.length === 0 && !transition && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-neutral-600">대기</span>
        </div>
      )}
    </div>
  );
}
```

- **실제 지원**: EXPLAIN, BINARY, REVEAL_WIPE, DROP, TRANSITION 모두 뷰에 구현됨.  
- operator별: BINARY → img 풀스크린, PROGRESSIVE(wipe) → clip-path wipe, DROP → 배경 + obj 애니메이션.

---

## 6) 125초 → 150초(300 tick)로 늘릴 때 영향을 받는 규칙

**파일**: `app/lib/constants/rules.ts` (TICK_MS, TICKS 정의 전체)

```ts
/**
 * PLAY v1 엔진 규칙 상수
 * rules/timeline/renderer 분리 원칙: timeline은 이 값만 참조
 */

export const PLAY_RULES = {
  /** BPM (beats per minute) */
  BPM: 120,
  /** tick당 밀리초 (BPM 120 → 2 beat/sec → 0.5s = 500ms per tick) */
  TICK_MS: 500,
  /** 구간별 tick 수 */
  TICKS: {
    EXPLAIN: 5,
    SET: 20,
    TRANSITION: 5,
    BLOCKS: 5,
  },
} as const;

export type PlayRules = typeof PLAY_RULES;
```

- **현재 총 tick**: `BLOCKS * (EXPLAIN + SET + SET + TRANSITION)` = 5 * 50 = **250 tick** → 125초.
- **150초(300 tick)** 로 늘리려면:
  - **rules.ts**: `TICK_MS` 또는 `TICKS` 조정 (예: EXPLAIN/SET/TRANSITION 비율 유지하고 SET만 24로 하거나, TICK_MS를 500 그대로 두고 총 tick만 300이 되도록 구간 수 변경).
  - **timeline.ts**: `PRE_CALCULATED_TOTAL_TICKS` 등 하드코드된 상수가 있으면 rules만 참조하도록 이미 되어 있으므로, rules 변경만으로 반영됨.  
- 즉 **rules.ts**와 **timeline.ts**(구간 수/비율 결정)를 같이 보면서 150초 규칙을 맞추면 됨.

---

## 7) tMs 업데이트 루프와 PLAY_RULES 런타임 일치 (이식 가능한 diff용)

### 7-A) RuntimePlayer — tMs 업데이트 루프 (정확한 동작·드리프트)

**파일**: `app/components/runtime/RuntimePlayer.tsx`

- **TICK_MS**는 `PLAY_RULES.TICK_MS`에서 한 번만 가져옴 (아래 7-B와 동일 상수).

```ts
import { PLAY_RULES } from '@/app/lib/constants/rules';
const TICK_MS = PLAY_RULES.TICK_MS;
```

- **재생 루프** (전체):

```ts
useEffect(() => {
  if (!playing) return;
  onEndCalledRef.current = false;
  startMsRef.current = performance.now();
  startTMsRef.current = tMsRef.current;

  const tick = () => {
    const elapsed = (performance.now() - startMsRef.current) * speed;
    const newTMs = startTMsRef.current + elapsed;
    const maxTMs = (timeline.totalTicks - 1) * TICK_MS;
    const clamped = Math.min(newTMs, maxTMs);
    setTMs(clamped);

    if (clamped >= maxTMs) {
      setPlaying(false);
      if (!onEndCalledRef.current) {
        onEndCalledRef.current = true;
        onEnd?.();
      }
    }

    rafRef.current = requestAnimationFrame(tick);
  };

  rafRef.current = requestAnimationFrame(tick);

  return () => cancelAnimationFrame(rafRef.current);
}, [playing, speed, timeline.totalTicks, onEnd]);
```

- **tick → 오디오 디스패치** (tMs 기준으로 현재 tick 계산):

```ts
useEffect(() => {
  const currentTick = Math.floor(tMs / TICK_MS);
  if (currentTick === lastProcessedTickRef.current) return;
  lastProcessedTickRef.current = currentTick;

  const eventsAtTick = timeline.audio.filter((e) => e.tick === currentTick);
  for (const ev of eventsAtTick) {
    onAudioEvent?.(ev);
  }
}, [tMs, timeline.audio, onAudioEvent]);
```

**동작 요약**

| 항목 | 현재 구현 | 비고 |
|------|-----------|------|
| **500ms 단위** | **아님**. tMs는 연속 값(실제 경과 시간). 매 프레임 `elapsed = performance.now() - startMsRef.current`로 증가. | tick 경계(0, 500, 1000…)는 `Math.floor(tMs / TICK_MS)`로만 사용. tMs 자체는 500ms 단위로 스냅하지 않음. |
| **드리프트 보정** | **없음**. `performance.now()` 기준이라 “실제 시간 대비 누적 오차”는 없음. | 단, RAF 주기(~16ms)만큼 tMs가 이산적으로 올라가서, **화면이 바뀌는 시점**은 500ms와 최대 약 1프레임(16ms) 정도 어긋날 수 있음. |
| **몰입 깨짐** | 연속 시간 + floor(tMs/500)이므로 “0.5초 리듬”과 틀어지는 건 프레임 간 이산화 한도. | 정확히 500ms 스냅이나 드리프트 보정을 넣으려면 여기 루프를 수정해야 함 (예: tMs를 tick 경계에 스냅하거나, 경과 시간을 주기적으로 500ms 단위로 재기준). |

**이식/수정 시 포인트**

- “정확히 500ms 단위”로 맞추려면: `tick()` 안에서 `newTMs`를 `Math.round(newTMs / TICK_MS) * TICK_MS` 등으로 스냅한 뒤 `setTMs`에 넣는 방식이 필요.
- 드리프트 보정을 넣으려면: 주기적으로 `startMsRef.current = performance.now()`, `startTMsRef.current = tMsRef.current`로 기준점을 다시 잡는 로직을 추가할 수 있음.

---

### 7-B) rules.ts 참조 방식 + PLAY_RULES가 runtime에 동일 적용되는지

**정의 (단일 소스)**  
`app/lib/constants/rules.ts` — `PLAY_RULES` (TICK_MS, TICKS 등) 정의.

**참조 위치 (전부 동일 상수)**

| 파일 | 사용 |
|------|------|
| `app/components/runtime/RuntimePlayer.tsx` | `import { PLAY_RULES } from '@/app/lib/constants/rules';` → `const TICK_MS = PLAY_RULES.TICK_MS` → seek 상한, maxTMs, `currentTick = Math.floor(tMs / TICK_MS)` |
| `app/components/runtime/PlayRenderer.tsx` | `import { PLAY_RULES } from '@/app/lib/constants/rules';` → `const TICK_MS = PLAY_RULES.TICK_MS` → `currentTick = Math.floor(tMs / TICK_MS)` |
| `app/components/runtime/PlayTestDebugOverlay.tsx` | `import { PLAY_RULES } from '@/app/lib/constants/rules';` → `const TICK_MS = PLAY_RULES.TICK_MS` → `currentTick = Math.floor(tMs / TICK_MS)` |
| `app/lib/engine/play/timeline.ts` | `import { PLAY_RULES } from '@/app/lib/constants/rules';` → `const { TICKS } = PLAY_RULES` (EXPLAIN, SET, TRANSITION, BLOCKS) — tick 수 계산만, TICK_MS는 사용 안 함 |
| `app/components/subscriber/PlayRuntimeWrapper.tsx` | `import { PLAY_RULES } from '@/app/lib/constants/rules';` → `totalMs = (timeline.totalTicks - 1) * PLAY_RULES.TICK_MS` (BGM 길이) |
| `app/components/play-test/PlayTestContent.tsx` | `import { PLAY_RULES } from '@/app/lib/constants/rules';` → `TICK_MS` 표시용 |

**결론**

- **Renderer**를 포함한 모든 runtime 경로가 **같은 `PLAY_RULES`**를 import하고, tick 계산은 모두 **`PLAY_RULES.TICK_MS`**로 함.  
- **timeline.ts**는 `PLAY_RULES.TICKS`만 쓰고, tick 인덱스만 만듦. 재생 시간(ms)은 RuntimePlayer/PlayRuntimeWrapper에서 `TICK_MS`로만 계산.  
- 따라서 **rules.ts 한 파일만 바꾸면** TICK_MS·TICKS가 timeline 생성과 런타임·렌더러에 동일하게 적용됨.  
- “정확히 이식 가능한 diff”를 만들 때는, **RuntimePlayer의 tMs 루프**(7-A)와 **위 참조 테이블**만 맞추면 됨.

---

이 문서는 operator·시나리오·정책을 다룰 때 필요한 코드만 모은 것이며, 수정 시 위 경로의 원본 파일과 함께 보면 됨.
