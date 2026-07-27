import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * P7 — restore readiness packaging without claiming E launch close
 * or D 8+ from pretend Toss. Locks runbook stop criteria, integrity
 * gate wiring, and score-boundary language.
 */
function read(path: string) {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

describe('SPOKEDU MASTER restore readiness (P7)', () => {
  it('keeps backup/restore runbook stop criteria and integrity command', () => {
    const runbook = read('docs/spokedu-master-backup-restore-runbook.md');
    expect(runbook).toContain('## Stop Restore If');
    expect(runbook).toContain('Temporary DB and production DB cannot be clearly distinguished');
    expect(runbook).toContain('qa:spokedu-master:data-integrity');
    expect(runbook).toContain('Named owner for restore approval and execution');
    expect(runbook).toContain('confirmation required');
  });

  it('keeps release checklist restore rehearsal items', () => {
    const checklist = read('docs/spokedu-master-release-checklist.md');
    expect(checklist).toContain('restore rehearsal into a temporary database');
    expect(checklist).toContain('qa:spokedu-master:data-integrity');
    expect(checklist).toContain('restore owner');
    expect(checklist).toContain('mock만으로 D 8+ 선언 금지');
  });

  it('keeps risk-audit score boundary against pretend/mock Toss', () => {
    const audit = read('docs/spokedu-master-commercial-risk-audit.md');
    expect(audit).toContain('strictCommercialScore');
    expect(audit).toContain('mock only으로 D 8+ 선언 금지');
    expect(audit).toContain('Toss sandbox real charge logs');
    expect(audit).toContain('restore DB integrity');
  });

  it('wires data-integrity as release hard gate without skip-by-default', () => {
    const release = read('scripts/spokedu-master-release-automated.mjs');
    expect(release).toContain('data_integrity');
    expect(release).toContain('--skip-integrity');
    const integrity = read('scripts/spokedu-master-data-integrity.mjs');
    expect(integrity).toContain('SPOKEDU_MASTER_DATABASE_URL');
    expect(integrity).toContain('begin read only');
    expect(integrity).toContain('default_transaction_read_only');
  });
});
