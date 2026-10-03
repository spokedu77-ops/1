import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');

describe('MASTER QA passwordless authentication tooling', () => {
  const helper = read('scripts/lib/spokedu-master-auth-state.mjs');
  const loggedQa = read('scripts/spokedu-master-home-logged-qa.mjs');
  const commercialQa = read('scripts/spokedu-master-commercial-smoke-qa.mjs');
  const capture = read('scripts/spokedu-master-auth-state-capture.mjs');

  it('uses an ignored Playwright storage state and verifies the server access snapshot', () => {
    expect(helper).toContain("'.tmp'");
    expect(helper).toContain("'spm-master-auth'");
    expect(helper).toContain("'storage-state.json'");
    expect(helper).toContain('/api/spokedu-master/access');
    expect(helper).toContain('snapshot?.authenticated !== true');
    expect(helper).toContain('snapshot?.canUseLibrary !== true');
  });

  it('captures only through the real MASTER passwordless login surface', () => {
    expect(capture).toContain('/spokedu-master/login?next=');
    expect(capture).toContain('headless: false');
    expect(capture).not.toContain('signInWithPassword');
    expect(capture).not.toContain("`${baseUrl}/login");
  });

  it('does not treat operations passwords as MASTER real authentication', () => {
    for (const source of [loggedQa, commercialQa]) {
      expect(source).not.toContain('SPOKEDU_MASTER_QA_PASSWORD');
      expect(source).not.toContain('SPM_QA_PASSWORD');
      expect(source).not.toContain('signInWithPassword');
      expect(source).not.toContain("gotoPage(page, '/login')");
    }
    expect(loggedQa).not.toContain("getByRole('tab', { name: 'MASTER' })");
  });
});
