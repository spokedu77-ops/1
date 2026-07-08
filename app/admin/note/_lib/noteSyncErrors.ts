/** op-log sync 중 자동 재시도 가능한 오류 — UI에 노출하지 않는다. */
export function isNoteSyncRecoverableError(message: string): boolean {
  const normalized = message.toLowerCase();
  return normalized.includes('seq_conflict')
    || normalized.includes('duplicate key')
    || normalized.includes('unique constraint')
    || normalized.includes('note_block_ops_document_seq')
    || normalized.includes('note_block_ops_document_client_op')
    || normalized.includes('sync state fetch failed')
    || normalized.includes('op pull failed')
    || normalized.includes('op push failed');
}

export function toNoteSyncUserMessage(error: unknown): string | null {
  const message = error instanceof Error ? error.message : String(error);
  if (isNoteSyncRecoverableError(message)) return null;
  return message;
}
