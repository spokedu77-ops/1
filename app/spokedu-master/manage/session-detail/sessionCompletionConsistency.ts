export class SessionCompletionAfterCaptureError extends Error {
  readonly cause: unknown;

  constructor(cause: unknown) {
    super('수업 기록은 저장됐지만 수업 완료에 실패했습니다. 내용을 유지한 채 수업 완료를 다시 눌러 주세요.');
    this.name = 'SessionCompletionAfterCaptureError';
    this.cause = cause;
  }
}

export async function completeSessionWithCapture<T>({
  saveCapture,
  completeSession,
}: {
  saveCapture?: () => Promise<boolean>;
  completeSession: () => Promise<T>;
}) {
  if (saveCapture) {
    const captureSaved = await saveCapture();
    if (!captureSaved) throw new Error('수업 기록을 저장하지 못했습니다.');
  }

  try {
    return await completeSession();
  } catch (cause) {
    if (saveCapture) throw new SessionCompletionAfterCaptureError(cause);
    throw cause;
  }
}
