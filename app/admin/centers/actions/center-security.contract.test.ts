import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function source(path: URL): string {
  return readFileSync(path, 'utf8');
}

describe('center admin security contract', () => {
  it('guards every externally callable center action before service-role access', () => {
    const files: Array<[string, URL]> = [
      ['centers.ts', new URL('./centers.ts', import.meta.url)],
      ['center-history.ts', new URL('./center-history.ts', import.meta.url)],
      ['criminal-check-files.ts', new URL('./criminal-check-files.ts', import.meta.url)],
    ];
    for (const [label, path] of files) {
      const text = source(path);
      const starts = [...text.matchAll(/export async function\s+(\w+)/g)];
      expect(starts.length, label).toBeGreaterThan(0);
      for (const [index, match] of starts.entries()) {
        const start = match.index;
        const end = starts[index + 1]?.index ?? text.length;
        const body = text.slice(start, end);
        expect(body.indexOf('await requireAdmin()'), `${label}:${match[1]}`).toBeGreaterThan(-1);
        const authIndex = body.indexOf('await requireAdmin()');
        const serviceIndex = body.indexOf('getServiceSupabase()');
        if (serviceIndex >= 0) expect(authIndex, `${label}:${match[1]}`).toBeLessThan(serviceIndex);
      }
    }
  });

  it('keeps the facility password out of normal center result types and selects', () => {
    const actions = source(new URL('./centers.ts', import.meta.url));
    const types = source(new URL('../../../lib/centers/types.ts', import.meta.url));
    const normalSelect = actions.slice(
      actions.indexOf('const CENTER_SELECT_WITH_TEACHERS'),
      actions.indexOf('export async function getCenters')
    );
    const centerType = types.slice(types.indexOf('export interface Center {'));

    expect(normalSelect).not.toContain('criminal_check_facility_password');
    expect(normalSelect).not.toContain('*');
    expect(centerType).not.toContain('criminal_check_facility_password');
    expect(actions).not.toContain(".select('*')");
  });

  it('serializes JSONB snapshots before optimistic concurrency filters', () => {
    const actions = source(new URL('./criminal-check-files.ts', import.meta.url));
    expect(actions.match(/\.eq\('criminal_check_files', JSON\.stringify\(currentFiles\)\)/g)).toHaveLength(2);
    expect(actions).not.toContain(".eq('criminal_check_files', currentFiles)");
  });
});
