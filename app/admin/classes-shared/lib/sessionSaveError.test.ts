import { describe, expect, it } from 'vitest';
import { sessionSaveErrorMessage } from './sessionSaveError';

describe('session save errors', () => {
  it('reserves the overlap message for an actual teacher schedule conflict', () => {
    expect(sessionSaveErrorMessage('TEACHER_SCHEDULE_CONFLICT')).toContain('시간이 겹칩니다');
    for (const code of ['SESSION_SCHEDULE_METADATA_INVALID', 'SESSION_COUNT_EXTRA_TEACHERS_INVALID', 'SESSION_UPDATE_METADATA_INVALID']) {
      const message = sessionSaveErrorMessage(code);
      expect(message).not.toBeNull();
      expect(message).not.toContain('시간이 겹칩니다');
      expect(message).toContain('입력 내용은 유지했습니다');
    }
  });
  it('leaves unrelated errors to the caller', () => {
    expect(sessionSaveErrorMessage('SESSION_UPDATE_STALE')).toBeNull();
  });
});
