import crypto from 'node:crypto';
import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const APPLY = process.argv.includes('--apply');
const DOCUMENT_ID = '630e1104-84f9-41a2-b25b-7c4faa6a1300';
const TOGGLE_ID = '117c0b2d-83d5-4edd-859e-2f9c89042bd2';
const CLAUDE_ID = '45a5cc1e-b77a-44b9-af00-be5c45506466';
const CURSOR_ID = '9e2289eb-66f0-4396-9674-f5825cba7be1';
const SUPABASE_ID = '238edec1-e4a1-4c08-9b59-8e656ddfcd4d';
const PHONE_ID = 'e6146ef3-8721-4595-a872-65bf512ee183';

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

const supabase = createClient(
  requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
  requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
  { auth: { persistSession: false } },
);

function content(text) {
  return { html: `<p>${text}</p>`, text };
}

async function main() {
  const { data: blocks, error } = await supabase
    .from('note_blocks')
    .select('id,document_id,parent_block_id,type,order_index,content,deleted_at,updated_at')
    .eq('document_id', DOCUMENT_ID)
    .or(`parent_block_id.eq.${TOGGLE_ID},id.eq.${TOGGLE_ID}`)
    .order('order_index', { ascending: true });
  if (error) throw error;

  const byId = new Map((blocks ?? []).map((block) => [block.id, block]));
  const existingGemini = (blocks ?? []).find((block) => {
    const text = `${block.content?.text ?? ''} ${block.content?.html ?? ''}`;
    return block.parent_block_id === TOGGLE_ID && text.includes('제미니');
  });

  const updates = [
    {
      id: CLAUDE_ID,
      values: {
        type: 'bulletList',
        parent_block_id: TOGGLE_ID,
        order_index: 2,
        content: content('클로드 : ~7.8 (19불)'),
        deleted_at: null,
      },
    },
    {
      id: SUPABASE_ID,
      values: {
        parent_block_id: TOGGLE_ID,
        order_index: 3,
        content: content('supabase : ~7.21 (25불)'),
        deleted_at: null,
      },
    },
    {
      id: PHONE_ID,
      values: {
        parent_block_id: TOGGLE_ID,
        order_index: 4,
        content: content('업무폰 : 매달 15일'),
        deleted_at: null,
      },
    },
  ];
  if (existingGemini) {
    updates.push({
      id: existingGemini.id,
      values: {
        type: 'bulletList',
        parent_block_id: TOGGLE_ID,
        order_index: 5,
        content: content('제미니'),
        deleted_at: null,
      },
    });
  }

  const inserts = [];
  if (!existingGemini) {
    inserts.push({
      id: crypto.randomUUID(),
      document_id: DOCUMENT_ID,
      parent_block_id: TOGGLE_ID,
      type: 'bulletList',
      order_index: 5,
      content: content('제미니'),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      version: 1,
    });
  }

  console.log('Current monthly toggle blocks:');
  for (const block of blocks ?? []) {
    console.log(`- ${block.id} parent=${block.parent_block_id ?? 'root'} order=${block.order_index} type=${block.type} deleted=${block.deleted_at ?? 'no'} text=${JSON.stringify(block.content?.text ?? '')}`);
  }
  console.log('\nPlanned updates:');
  for (const update of updates) {
    console.log(`- ${update.id}: before=${JSON.stringify(byId.get(update.id) ?? null)} after=${JSON.stringify(update.values)}`);
  }
  console.log('\nPlanned inserts:');
  for (const insert of inserts) console.log(`- ${JSON.stringify(insert)}`);

  if (!APPLY) {
    console.log('\nDry run only. Pass --apply to write.');
    return;
  }

  for (const update of updates) {
    const { error: updateError } = await supabase
      .from('note_blocks')
      .update({ ...update.values, updated_at: new Date().toISOString() })
      .eq('id', update.id)
      .eq('document_id', DOCUMENT_ID);
    if (updateError) throw updateError;
  }
  if (inserts.length > 0) {
    const { error: insertError } = await supabase.from('note_blocks').insert(inserts);
    if (insertError) throw insertError;
  }
  const { error: cursorError } = await supabase
    .from('note_blocks')
    .update({ parent_block_id: TOGGLE_ID, order_index: 1, updated_at: new Date().toISOString() })
    .eq('id', CURSOR_ID)
    .eq('document_id', DOCUMENT_ID);
  if (cursorError) throw cursorError;

  console.log('\nApplied monthly toggle restore.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
