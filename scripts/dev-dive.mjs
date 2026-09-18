import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const addressablesRoot = resolve(
  process.env.DIVE_ADDRESSABLES_ROOT ?? 'C:/Users/joker/SPOMOVE/ServerData',
);
const nextCli = resolve('node_modules/next/dist/bin/next');

if (!existsSync(addressablesRoot)) {
  console.error(`[dev:dive] Addressables root not found: ${addressablesRoot}`);
  process.exit(1);
}

const children = [
  spawn(process.execPath, ['scripts/serve-local-addressables.mjs', addressablesRoot], {
    stdio: 'inherit',
  }),
  spawn(process.execPath, [nextCli, 'dev'], {
    stdio: 'inherit',
  }),
];

let shuttingDown = false;

function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM');
  }
  setTimeout(() => process.exit(exitCode), 1_000).unref();
}

for (const child of children) {
  child.on('error', (error) => {
    console.error('[dev:dive] Failed to start a child process:', error);
    shutdown(1);
  });
  child.on('exit', (code, signal) => {
    if (shuttingDown) return;
    console.error(`[dev:dive] A child process exited (${signal ?? `code ${code ?? 1}`}); stopping both servers.`);
    shutdown(code ?? 1);
  });
}

process.once('SIGINT', () => shutdown(0));
process.once('SIGTERM', () => shutdown(0));
