/**
 * 노션식 교차 텍스트 드래그 — DOM 없이 검증 가능한 순수 로직.
 * document·list·toggle·preview 모든 경로가 같은 규칙을 쓴다.
 */

export const TEXT_DRAG_THRESHOLD_PX = 3;

export type CrossTextSurface = 'editor' | 'toggle-title' | 'preview' | 'list-preview';

export type CrossSelectAnchor = {
  blockId: string;
  pos: number;
  surface: CrossTextSurface;
};

export type CrossSelectRange = {
  blockId: string;
  from: number;
  to: number;
  surface: CrossTextSurface;
};

export type BlockCrossMeta = {
  surface: CrossTextSurface;
  textEnd: number;
};

export function resolveCrossRanges(
  blockIds: string[],
  anchor: CrossSelectAnchor,
  hoverId: string,
  hoverCaretPos: number,
  getBlockMeta: (blockId: string) => BlockCrossMeta | null,
): CrossSelectRange[] {
  const anchorIdx = blockIds.indexOf(anchor.blockId);
  const hoverIdx = blockIds.indexOf(hoverId);
  if (anchorIdx < 0 || hoverIdx < 0) return [];

  const lo = Math.min(anchorIdx, hoverIdx);
  const hi = Math.max(anchorIdx, hoverIdx);
  const ranges: CrossSelectRange[] = [];

  for (let i = lo; i <= hi; i += 1) {
    const blockId = blockIds[i];
    const meta = getBlockMeta(blockId);
    if (!meta) continue;

    const { surface, textEnd: docEnd } = meta;
    if (docEnd <= 0 && surface !== 'toggle-title') {
      ranges.push({ blockId, from: 0, to: 0, surface });
      continue;
    }

    let from = surface === 'editor' ? 1 : 0;
    let to = docEnd;

    if (lo === hi) {
      from = Math.min(anchor.pos, hoverCaretPos);
      to = Math.max(anchor.pos, hoverCaretPos);
    } else if (i === anchorIdx && i === lo) {
      if (anchorIdx < hoverIdx) {
        from = anchor.pos;
        to = docEnd;
      } else {
        from = hoverCaretPos;
        to = docEnd;
      }
    } else if (i === anchorIdx && i === hi) {
      if (anchorIdx < hoverIdx) {
        from = surface === 'editor' ? 1 : 0;
        to = hoverCaretPos;
      } else {
        from = surface === 'editor' ? 1 : 0;
        to = anchor.pos;
      }
    } else if (i === hoverIdx && i === lo) {
      if (hoverIdx < anchorIdx) {
        from = hoverCaretPos;
        to = docEnd;
      } else {
        from = anchor.pos;
        to = docEnd;
      }
    } else if (i === hoverIdx && i === hi) {
      if (hoverIdx < anchorIdx) {
        from = surface === 'editor' ? 1 : 0;
        to = anchor.pos;
      } else {
        from = surface === 'editor' ? 1 : 0;
        to = hoverCaretPos;
      }
    }

    ranges.push({ blockId, from, to, surface });
  }

  return ranges;
}

export function isMultiBlockCrossSelect(ranges: CrossSelectRange[]): boolean {
  if (ranges.length <= 1) return false;
  const touched = new Set(ranges.map((range) => range.blockId));
  return touched.size > 1;
}
