/** op-log sync 중 자동 재시도 가능한 오류 — UI에 노출하지 않는다. */
export function isNoteSyncRecoverableError(message: string): boolean {
  const normalized = message.toLowerCase();
  return normalized.includes('seq_conflict')
    || normalized.includes('duplicate key')
    || normalized.includes('unique constraint')
    || normalized.includes('note_block_ops_document_seq')
    || normalized.includes('note_block_ops_document_client_op')
    || normalized.includes('block not found')
    || normalized.includes('sync state fetch failed')
    || normalized.includes('op pull failed')
    || normalized.includes('op push failed')
    // 문서 전환·HMR·오프라인 — fetch가 TypeError로 터짐
    || normalized.includes('failed to fetch')
    || normalized.includes('networkerror')
    || normalized.includes('load failed')
    || normalized.includes('aborted')
    || normalized.includes('the operation was aborted');
}

/** Abort / Failed to fetch 등 — 네트워크 레이어 일시 실패 */
export function isNoteSyncTransientNetworkError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === 'AbortError') return true;
  if (typeof DOMException !== 'undefined'
    && error instanceof Error
    && error.name === 'AbortError') {
    return true;
  }
  if (error instanceof TypeError) {
    return isNoteSyncRecoverableError(error.message);
  }
  if (error instanceof Error) {
    return isNoteSyncRecoverableError(error.message);
  }
  return isNoteSyncRecoverableError(String(error));
}

export function toNoteSyncUserMessage(error: unknown): string | null {
  if (isNoteSyncTransientNetworkError(error)) return null;
  const message = error instanceof Error ? error.message : String(error);
  if (isNoteSyncRecoverableError(message)) return null;
  return message;
}
