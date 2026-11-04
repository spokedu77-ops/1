/**
 * Auto-import SPOKEDU feedback correction workflow into local n8n (Docker).
 *
 * Root cause of prior CLI failure: `n8n import:workflow` expects a JSON **array**
 * of workflow objects (`workflows.map`), not a single workflow object.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(process.cwd());
const workflowPath = join(root, 'ops/local-automation/workflows/spokedu-feedback-correction.json');
const bundlePath = join(root, 'ops/local-automation/workflows/spokedu-feedback-correction.import-bundle.json');
const container = process.env.N8N_CONTAINER_NAME ?? 'local-automation-n8n-1';

function runDocker(args) {
  return execFileSync('docker', ['exec', container, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function main() {
  const workflow = JSON.parse(readFileSync(workflowPath, 'utf8'));
  writeFileSync(bundlePath, JSON.stringify([workflow], null, 2), 'utf8');

  const importOut = runDocker([
    'n8n',
    'import:workflow',
    '--input=/import/spokedu-feedback-correction.import-bundle.json',
  ]);

  let listOut = '';
  try {
    listOut = runDocker(['n8n', 'list:workflow']);
  } catch {
    listOut = importOut;
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        bundlePath,
        importSnippet: importOut.slice(0, 500),
        workflows: listOut.slice(0, 800),
        cliFormatNote:
          'Single-object JSON caused `workflows.map is not a function`; bundle wraps `[workflow]`.',
      },
      null,
      2,
    ),
  );
}

try {
  main();
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: String(error?.message ?? error) }, null, 2));
  process.exit(1);
}
