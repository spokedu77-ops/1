import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const workflow = JSON.parse(
  readFileSync(
    join(process.cwd(), 'ops/local-automation/workflows/spokedu-feedback-correction.json'),
    'utf8',
  ),
) as {
  nodes: Array<{ name: string; type: string; parameters?: Record<string, unknown> }>;
  connections: Record<string, unknown>;
  settings?: Record<string, unknown>;
};

describe('n8n feedback correction workflow contract', () => {
  it('handles zero jobs via idle branch without reaching LLM', () => {
    const names = workflow.nodes.map((n) => n.name);
    expect(names).toContain('Expand or idle');
    expect(names).toContain('No pending jobs');
    expect(names).toContain('Has pending job?');
    const expand = workflow.nodes.find((n) => n.name === 'Expand or idle');
    expect(String(expand?.parameters?.jsCode)).toContain('no_pending_jobs');
  });

  it('processes each claimed job through LLM parse and complete/fail paths', () => {
    const names = new Set(workflow.nodes.map((n) => n.name));
    for (const required of [
      'Build LLM request',
      'LM Studio chat',
      'Parse correction JSON',
      'Complete job',
      'Mark job failed',
    ]) {
      expect(names.has(required)).toBe(true);
    }
  });

  it('limits execution data retention for PII', () => {
    expect(workflow.settings?.saveDataSuccessExecution).toBe('none');
    expect(workflow.settings?.saveDataErrorExecution).toBe('none');
  });

  it('does not embed secrets in workflow JSON', () => {
    const raw = JSON.stringify(workflow);
    expect(raw).not.toMatch(/AUTOMATION_WORKER_SECRET|service_role|eyJ/);
  });
});
