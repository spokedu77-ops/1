import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const APPLY = process.argv.includes('--apply');
const DOCUMENT_ID = 'beb76c92-fc2c-4528-9369-0ed65cc02766';
const EMPTY_BLOCK_IDS = [
  '70079120-900d-4bb1-937d-eac1c93ae487',
  'd7205ccb-d8b1-4fc3-9aac-4468eb9dbf61',
];
const CLEAN_CONTENT_PATCHES = [
  {
    id: 'd5b4c7af-a699-4e45-a700-c13b163a5de2',
    content: {
      html: '<p>25일 업무내용 기재<br>- 블로그 글 2개<br>- 수업 안내 및 피드백 (5.1 일정 조정)</p>',
      text: '25일 업무내용 기재\n- 블로그 글 2개\n- 수업 안내 및 피드백 (5.1 일정 조정)',
      checked: false,
    },
  },
  {
    id: '5d0f6fff-4adc-4d5e-889b-3c286180e064',
    content: {
      html: '<p>반응인지 사분할 탈 것, 감정, 동물, 자연물, 음식</p>',
      text: '반응인지 사분할 탈 것, 감정, 동물, 자연물, 음식',
      checked: true,
    },
  },
];

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

function preview(content) {
  return String(content?.text ?? content?.title ?? content?.html ?? '').replace(/\s+/g, ' ').trim();
}

async function main() {
  const targetIds = [...EMPTY_BLOCK_IDS, ...CLEAN_CONTENT_PATCHES.map((patch) => patch.id)];
  const { data: before, error } = await supabase
    .from('note_blocks')
    .select('id,document_id,parent_block_id,type,order_index,content,deleted_at,updated_at')
    .eq('document_id', DOCUMENT_ID)
    .in('id', targetIds);
  if (error) throw error;

  console.log(`Kim Yunki repair ${APPLY ? 'APPLY' : 'DRY RUN'}:`);
  for (const block of before ?? []) {
    console.log(`- before ${block.id} parent=${block.parent_block_id ?? 'root'} order=${block.order_index} type=${block.type} deleted=${block.deleted_at ?? 'no'} text=${JSON.stringify(preview(block.content))}`);
  }
  console.log('\nWill soft-delete empty active blocks:');
  for (const id of EMPTY_BLOCK_IDS) console.log(`- ${id}`);
  console.log('\nWill patch content:');
  for (const patch of CLEAN_CONTENT_PATCHES) console.log(`- ${patch.id}: ${JSON.stringify(patch.content.text)}`);

  if (!APPLY) {
    console.log('\nDry run only. Pass --apply to write.');
    return;
  }

  const now = new Date().toISOString();
  const { error: deleteError } = await supabase
    .from('note_blocks')
    .update({ deleted_at: now, updated_at: now })
    .eq('document_id', DOCUMENT_ID)
    .in('id', EMPTY_BLOCK_IDS)
    .is('deleted_at', null);
  if (deleteError) throw deleteError;

  for (const patch of CLEAN_CONTENT_PATCHES) {
    const { error: patchError } = await supabase
      .from('note_blocks')
      .update({ content: patch.content, updated_at: now })
      .eq('document_id', DOCUMENT_ID)
      .eq('id', patch.id)
      .is('deleted_at', null);
    if (patchError) throw patchError;
  }

  console.log('\nApplied Kim Yunki repair.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
