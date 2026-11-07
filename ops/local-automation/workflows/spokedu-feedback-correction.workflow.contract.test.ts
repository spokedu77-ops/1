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

  it('blocks the LLM when claim context has an error or empty source fields', () => {
    const build = workflow.nodes.find((n) => n.name === 'Build LLM request');
    const code = String(build?.parameters?.jsCode);
    expect(code).toContain('ctx.error');
    expect(code).toContain('skipLlm');
    expect(code).toContain('SNAPSHOT_FIELDS_REQUIRED');
    const gate = workflow.connections['LLM input OK?'] as { main: unknown[][] };
    expect(gate.main[0]).toEqual([expect.objectContaining({ node: 'LM Studio chat' })]);
    expect(gate.main[1]).toEqual([expect.objectContaining({ node: 'Mark job failed' })]);
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
    const raw = JSON.stringify(workflow).replace(/\$env\.SPOKEDU_AUTOMATION_WORKER_SECRET\b/g, '');
    expect(raw).not.toMatch(/AUTOMATION_WORKER_SECRET|service_role|eyJ/);
  });
});
