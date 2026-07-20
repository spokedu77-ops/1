import type { NotePersistOp } from './noteDocumentOps';
import type { NoteBlockCommandResult } from './noteBlockCommands';

export function persistOpForBlockCommand(
  command: NoteBlockCommandResult,
): NotePersistOp | null {
  const deleteIds = command.removedBlocks.map((block) => block.id);
  if (deleteIds.length > 0 || command.fieldPatches.length > 0) {
    return {
      type: 'blockTransaction',
      patches: command.fieldPatches,
      deleteIds,
      ...(deleteIds.length > 0 ? { deletedBlocks: command.removedBlocks } : {}),
    };
  }
  if (command.createdBlocks.length > 0) return null;
  return null;
}

export function deletedIdsForBlockCommand(command: NoteBlockCommandResult): string[] {
  return command.removedBlocks.map((block) => block.id);
}
