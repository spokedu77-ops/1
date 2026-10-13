import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(join(process.cwd(), 'app/spokedu-master/library/[id]/LibraryDetailView.tsx'), 'utf8');

describe('Library detail load states', () => {
  it('distinguishes loading, fetch failure, and a completed missing lookup', () => {
    expect(source).toContain('programsLoaded');
    expect(source).toContain('programsLoading');
    expect(source).toContain('programsError');
    expect(source).toContain('data-library-detail-state="loading"');
    expect(source).toContain('data-library-detail-state="error"');
    expect(source.indexOf('if (!program && (!programsLoaded || programsLoading))')).toBeLessThan(source.indexOf('if (!program && programsError)'));
    expect(source.indexOf('if (!program && programsError)')).toBeLessThan(source.lastIndexOf('if (!program)'));
    expect(source).toContain('onClick={() => void reloadPrograms()}');
  });

  it('keeps stale content visible and preserves return context for missing, error, and locked states', () => {
    expect(source).not.toContain('if (programsLoading) return');
    expect(source).toContain('const detailReturnHref = fromSession ? workReturnHref : libraryReturnHref');
    expect(source).toContain('buildProgramLessonGateHref(program.id, detailCurrentPath)');
    expect(source).not.toContain('href="/spokedu-lab/library"');
  });
});
