import { readFile } from 'node:fs/promises';
import pg from 'pg';

const apply = process.argv.includes('--apply');
const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || process.env.SPOKEDU_MASTER_DATABASE_URL;
if (!connectionString) throw new Error('A database connection URL is required.');
const projectRef = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0];
const database = new URL(connectionString);
if (!database.hostname.includes(projectRef) && !decodeURIComponent(database.username).endsWith(`.${projectRef}`)) {
  throw new Error('Database project does not match the configured application.');
}
const client = new pg.Client({ connectionString, connectionTimeoutMillis: 10000 });
try {
  await client.connect();
  if (apply) {
    const sql = await readFile(new URL('../supabase/migrations/20261110001000_teacher_tier_fees_90_minutes.sql', import.meta.url), 'utf8');
    await client.query('BEGIN');
    try {
      await client.query("SET LOCAL lock_timeout = '5s'");
      await client.query(sql);
      await client.query('COMMIT');
      console.log('Applied 90-minute tier rates and silver 60-minute assistant rate.');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  }
  const result = await client.query(`SELECT tier_id, fee_private, fee_group, fee_center_main, fee_center_assist,
    fee_private_90, fee_group_90, fee_center_main_90, fee_center_assist_90
    FROM public.teacher_tier_fees ORDER BY tier_id`);
  console.log(JSON.stringify(result.rows, null, 2));
} catch (error) {
  console.error('Tier rate operation failed:', error.code ?? 'unknown');
  process.exitCode = 1;
} finally {
  await client.end();
}
