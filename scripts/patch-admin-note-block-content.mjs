import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const APPLY = process.argv.includes('--apply');
const blockId = process.argv.find((arg) => arg.startsWith('--block='))?.slice('--block='.length);
const text = process.argv.find((arg) => arg.startsWith('--text='))?.slice('--text='.length);

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

if (!blockId) throw new Error('--block is required');

const supabase = createClient(
  requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
  requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
  { auth: { persistSession: false } },
);

async function main() {
  const { data: block, error } = await supabase
    .from('note_blocks')
    .select('id,document_id,parent_block_id,type,order_index,content,deleted_at,updated_at')
    .eq('id', blockId)
    .single();
  if (error) throw error;
  if (!block) throw new Error(`block not found: ${blockId}`);

  const current = block.content && typeof block.content === 'object' ? block.content : {};
  const nextText = text
    ?? (
      typeof current.text === 'string' && current.text.trim()
        ? current.text
        : typeof current.legacyText === 'string'
          ? current.legacyText
          : ''
    );
  const nextContent = {
    ...current,
    text: nextText,
    html: `<p>${nextText}</p>`,
  };

  console.log(`Admin Note block content patch ${APPLY ? 'APPLY' : 'DRY RUN'}`);
  console.log(JSON.stringify({
    id: block.id,
    type: block.type,
    parent_block_id: block.parent_block_id,
    deleted_at: block.deleted_at,
    before: block.content,
    after: nextContent,
  }, null, 2));

  if (!APPLY) return;

  const { error: updateError } = await supabase
    .from('note_blocks')
    .update({ content: nextContent, updated_at: new Date().toISOString() })
    .eq('id', block.id);
  if (updateError) throw updateError;
  console.log('Patched 1 block.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
