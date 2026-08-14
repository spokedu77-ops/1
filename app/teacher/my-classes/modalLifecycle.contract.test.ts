import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');

describe('teacher feedback modal lifecycle contract', () => {
  it('uses selectedEvent as the single source of truth for the report modal', () => {
    expect(source).not.toContain('isModalOpen');
    expect(source).not.toContain('setIsModalOpen');
    expect(source).toContain('{selectedEvent && (');
  });

  it('does not couple weekly modal cleanup to upload state changes', () => {
    expect(source).not.toContain('[currentDate, uploading]');
    expect(source).toContain('}, [currentDate]);');
  });
});
