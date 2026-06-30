export function shouldDeleteSelectedNoteBlocks(event: {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  isComposing?: boolean;
}) {
  if (event.isComposing) return false;
  if (event.ctrlKey || event.metaKey || event.altKey) return false;
  return event.key === 'Delete' || event.key === 'Backspace';
}
