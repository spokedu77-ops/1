import { describe, expect, it } from 'vitest';
import { canTeacherEditSession } from './teacherSessionAccess';

describe('canTeacherEditSession', () => {
  it('allows the main teacher', () => {
    expect(canTeacherEditSession('MAIN-ID', { created_by: 'main-id' })).toBe(true);
  });

  it('allows an assistant recorded in either supported metadata field', () => {
    const metadata = 'EXTRA_TEACHERS:[{"id":"assistant-id","name":"보조"}]';
    expect(canTeacherEditSession('assistant-id', { memo: metadata })).toBe(true);
    expect(canTeacherEditSession('assistant-id', { students_text: metadata })).toBe(true);
  });

  it('rejects teachers unrelated to the session', () => {
    expect(canTeacherEditSession('other-id', { created_by: 'main-id' })).toBe(false);
  });
});
