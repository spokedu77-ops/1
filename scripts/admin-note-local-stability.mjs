/**
 * Admin Note local stability suite.
 *
 * Runs the local checks that should pass before trusting editor changes.
 * Browser QA is intentionally local-only and not part of doctor/CI.
 *
 * Usage:
 *   node scripts/admin-note-local-stability.mjs
 *   node scripts/admin-note-local-stability.mjs http://localhost:3000
 */
import { spawnSync } from 'node:child_process';

const BASE = process.argv[2] || process.env.NOTE_QA_BASE_URL || 'http://localhost:3000';
const NPM = process.platform === 'win32' ? 'npm' : 'npm';

const STEPS = [
  {
    name: 'Admin note unit tests',
    args: ['run', 'test:admin-note'],
  },
  {
    name: 'Admin note foundation QA',
    args: ['run', 'qa:admin-note', '--', BASE],
  },
  {
    name: 'Admin note slow-machine QA',
    args: ['run', 'qa:admin-note:slow', '--', BASE],
  },
  {
    name: 'Admin note real-flow QA',
    args: ['run', 'qa:admin-note:real-flow', '--', BASE],
  },
  {
    name: 'All active document invariants',
    args: ['run', 'audit:admin-note-blocks:all'],
  },
];

function runStep(step) {
  console.log(`\n== ${step.name} ==`);
  console.log(`npm ${step.args.join(' ')}`);
  const command = [NPM, ...step.args].join(' ');
  const result = spawnSync(command, {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
    shell: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${step.name} failed with exit code ${result.status}`);
  }
}

for (const step of STEPS) {
  runStep(step);
}

console.log('\nAdmin Note local stability suite passed.');
