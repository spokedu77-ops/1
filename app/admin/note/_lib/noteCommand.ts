import type { NoteBlockOpRecord, NoteBlockSnapshot } from '@/app/lib/note/noteBlockOpTypes';
import type { NoteBlockFieldPatch } from './noteBlocksApi';
import type { NoteBlock } from './types';

/**
 * 문서 블록 상태의 유일한 mutation 단위.
 * 로컬 편집·remote op·hydrate 모두 이 union을 통과해야 한다.
 */
export type NoteCommand =
  | { type: 'hydrate'; blocks: NoteBlock[] }
  | { type: 'replaceBlocks'; blocks: NoteBlock[] }
  | { type: 'patchContent'; blockId: string; content: Record<string, unknown> }
  | { type: 'applyPatches'; patches: NoteBlockFieldPatch[] }
  | { type: 'applyRemoteOps'; ops: NoteBlockOpRecord[] }
  | { type: 'mergeSnapshots'; snapshots: NoteBlockSnapshot[] }
  /** coordinator push/pull·다중 탭 state — local-only grace + store content 보존 */
  | { type: 'syncSnapshot'; blocks: NoteBlock[] };

export type NoteCommandContext = {
  documentId: string;
  activeBlockId: string | null;
  /** reducer가 active editor content 우선 병합에 사용 */
  storeContentById: Readonly<Record<string, Record<string, unknown> | undefined>>;
};

export type NoteCommandResult = {
  blocks: NoteBlock[];
  /** true면 syncBlocksStructure, false면 patchContent/replace만 */
  structural: boolean;
};
