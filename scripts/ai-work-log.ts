/** Trusted local integration. No HTTP route, bearer bypass, migration or credential output. */
import { loadEnvConfig } from '@next/env';
import { createClient } from '@supabase/supabase-js';
import { readFile } from 'node:fs/promises';
import { createWorkLogRepository } from '../app/lib/admin/updateLog/repository';
import { buildProjectContext, type WorkWrite } from '../app/lib/admin/updateLog/contract';

async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (!['context', 'record'].includes(command)) throw new Error('Usage: node --import tsx scripts/ai-work-log.ts context --project NAME | record --input FILE.json');
  const options = new Map<string, string>();
  for (let i = 0; i < args.length; i += 2) {
    if (!['--project', '--instruction', '--input'].includes(args[i]) || !args[i + 1] || options.has(args[i])) throw new Error('Invalid options');
    options.set(args[i], args[i + 1]);
  }
  loadEnvConfig(process.cwd());
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || new URL(url).origin !== 'https://mwgvserdyflsqyhcqecp.supabase.co' || !key) throw new Error('Expected project and local service credential required');
  const repository = createWorkLogRepository(createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }));
  let input: WorkWrite | undefined;
  if (command === 'record') {
    if (!options.get('--input')) throw new Error('--input JSON file required');
    const body: unknown = JSON.parse(await readFile(options.get('--input')!, 'utf8'));
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('JSON object required');
    input = body as WorkWrite;
    if (typeof input.project !== 'string' || typeof input.summary !== 'string' || typeof input.workKey !== 'string' || !input.workKey.trim()) throw new Error('project, workKey, summary required; reuse the key from context');
    if (!['reported', 'verified', 'blocked'].includes(input.status)) throw new Error('Codex may record only reported, verified or blocked; approval belongs to the user');
    for (const field of ['details', 'sourceUrl', 'verificationNote'] as const) if (input[field] !== undefined && typeof input[field] !== 'string') throw new Error(`Invalid ${field}`);
  }
  const project = input?.project.trim() || options.get('--project')?.trim();
  if (!project || [...project].length > 80) throw new Error('Project required (1–80 characters)');
  // Always read before writing. Read failure stops recording instead of inventing history.
  const listed = await repository.list({ project });
  if (!listed.ok) throw new Error(listed.error);
  const context = buildProjectContext(listed.events, options.get('--instruction'));
  if (!input) { process.stdout.write(JSON.stringify({ project, ...context }, null, 2) + '\n'); return; }
  const result = await repository.append(null, { ...input, sourceType: 'codex' });
  if (!result.ok) throw new Error(result.error);
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
}
main().catch(error => {
  // Only our own validation/read/write errors are safe to show; never dump SDK responses.
  const message = error instanceof Error ? error.message : '';
  const safe = /^(Usage:|Invalid options|Expected project|--input|JSON object|project, workKey|Codex may|Invalid (details|sourceUrl|verificationNote)|Project required|업데이트 로그|작업|프로젝트|검증|기록|중복|같은|출처|상세)/.test(message);
  console.error(`AI work log failed: ${safe ? message : 'check arguments, credentials and network'} (${error instanceof Error ? error.name : 'unknown'})`);
  if (!safe && error instanceof Error) console.error(error.stack?.split('\n').filter(line => line.includes('ai-work-log.ts')).join('\n'));
  process.exitCode = 1;
});
