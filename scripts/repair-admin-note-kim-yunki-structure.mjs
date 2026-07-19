import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const APPLY = process.argv.includes('--apply');
const DOCUMENT_ID = 'beb76c92-fc2c-4528-9369-0ed65cc02766';
const SPOMOVE_TOGGLE_ID = '44b7a7b0-9b59-4d91-a16a-d73b84be23ef';

const SPOMOVE_CHILD_IDS = [
  '63961972-79eb-4abd-bc1a-dab08d87df19',
  '9dc9c2f1-6d0d-40f9-9baa-0de2b08cf7a8',
  'd5981ac3-4561-47d0-a2a3-54229d9d2c46',
  'c552e11b-d445-47c9-b931-422824c441bb',
  'e906b5a2-d6f0-461a-9520-36337e917d0c',
  '66d5578e-9d40-43f9-8290-7584f07625df',
  '02d7aeee-9219-49e0-8efc-f30fa4192949',
  '9aae2ae7-e16f-450a-b539-a2d27a0e6461',
  '0c6744de-017b-4e8a-a7fe-92d2b409c723',
  '9653f082-6b4f-40f5-b484-f7018e128db3',
  '215c65de-19bb-4a87-bcd4-6cd7c6a9b029',
  'a0007bd8-0b16-44e6-a157-12bf58d8623c',
  '5d0f6fff-4adc-4d5e-889b-3c286180e064',
  '0c08133d-9c48-4260-974e-3f16316efcec',
  '5834a0f2-e335-49ec-b4a0-eb3638924337',
  '7e437e63-1278-4a8f-9dd1-720a58d5f1a0',
  '4efbb8ac-cf3b-48df-9d9d-148785a7d0a8',
  'd6e30d9f-7070-40ec-ad8a-b127383b51f6',
  'd1018585-161f-425c-828b-c3b4a982687c',
];

const ROOT_ORDER = [
  'abbfbe89-eb48-41f1-ad75-45b56e12e7ab',
  '38045cb9-b715-474f-b825-87121b05d82a',
  '286b6f79-a95c-49ff-98a7-22da705bbc95',
  '728dda55-e457-4db0-a28c-93ec17a8f6f7',
  'e468cb0b-3353-4315-967a-d81da257e6e6',
  'b32183de-6605-4e3d-8007-9ef90e6dacea',
  'edf044dd-ab9c-4e71-8469-27d7e5875fe8',
  SPOMOVE_TOGGLE_ID,
  '78419d31-210b-4fc2-a08a-555da517b8c1',
  'e700c0d6-cd2c-4f10-bd95-abed72b20eb1',
  '01f17807-c4e4-42a8-b4e1-d68a8947c423',
  '121a02ae-c1c7-4dd8-bd3f-50413eaf9e08',
  '5bba7f76-f3e6-4aef-960f-d2bd4d7a1d53',
  '0331ac36-d2a8-435a-adfb-10c05a46f3a5',
  'd5b4c7af-a699-4e45-a700-c13b163a5de2',
  '37df0022-b9a9-4c16-bce5-e156a12ecfa0',
  '13fdbbf8-3d2c-4c71-8e7f-40118bc2e95d',
  '1f766bb3-a37e-4be7-9a49-58c2a1be5a61',
  '6704bb3d-03ed-4fca-a57e-2306851f9fd0',
  '5e0d05f3-de1c-426e-975d-428048312e60',
  'ce32a2ca-e623-48dd-a0e4-e218692b1018',
  '4b4caa21-73cb-4dc4-8f33-6c642aa8269e',
  '138bdfd3-a37a-469d-885e-273a80224030',
  'd377d12e-2fe7-49fb-83c1-8c3227d846d6',
  '9d287d67-0555-41cc-8a75-8f95c4530772',
  '78b0e7b4-93fa-4729-945f-ab21f195b6c4',
  'a081b186-0701-412b-aafb-5eb62b565624',
  'e6f758eb-b9b5-4948-b78e-e0c93484fd0a',
  '1fe8ab94-2a41-4859-a9fc-413b6a43781a',
  '3f249e34-96c1-4e3b-94ed-f572b57c3bc5',
  'c3ef4a75-d9a0-4840-889d-48073edd6941',
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

function textOf(block) {
  return String(block.content?.text ?? block.content?.title ?? '').replace(/\s+/g, ' ').trim();
}

async function main() {
  const { data: blocks, error } = await supabase
    .from('note_blocks')
    .select('id,parent_block_id,type,order_index,content,deleted_at')
    .eq('document_id', DOCUMENT_ID)
    .is('deleted_at', null);
  if (error) throw error;

  const byId = new Map((blocks ?? []).map((block) => [block.id, block]));
  console.log(`Kim Yunki structure repair ${APPLY ? 'APPLY' : 'DRY RUN'}`);
  console.log('\nMove into SPOMOVE toggle:');
  SPOMOVE_CHILD_IDS.forEach((id, order) => {
    const block = byId.get(id);
    console.log(`- ${order}: ${id} ${block ? textOf(block) : '(missing)'}`);
  });
  console.log('\nRoot order after repair:');
  ROOT_ORDER.forEach((id, order) => {
    const block = byId.get(id);
    console.log(`- ${order}: ${id} ${block ? textOf(block) : '(missing)'}`);
  });

  if (!APPLY) {
    console.log('\nDry run only. Pass --apply to write.');
    return;
  }

  const now = new Date().toISOString();
  for (const [order, id] of SPOMOVE_CHILD_IDS.entries()) {
    const block = byId.get(id);
    if (!block) continue;
    const { error: updateError } = await supabase
      .from('note_blocks')
      .update({
        parent_block_id: SPOMOVE_TOGGLE_ID,
        order_index: order,
        updated_at: now,
      })
      .eq('document_id', DOCUMENT_ID)
      .eq('id', id)
      .is('deleted_at', null);
    if (updateError) throw updateError;
  }

  for (const [order, id] of ROOT_ORDER.entries()) {
    const block = byId.get(id);
    if (!block) continue;
    const { error: updateError } = await supabase
      .from('note_blocks')
      .update({
        parent_block_id: null,
        order_index: order,
        updated_at: now,
      })
      .eq('document_id', DOCUMENT_ID)
      .eq('id', id)
      .is('deleted_at', null);
    if (updateError) throw updateError;
  }

  const { error: todoOrderError } = await supabase
    .from('note_blocks')
    .update({
      parent_block_id: SPOMOVE_TOGGLE_ID,
      order_index: SPOMOVE_CHILD_IDS.length,
      updated_at: now,
    })
    .eq('document_id', DOCUMENT_ID)
    .eq('id', 'e3105cfe-faa4-4d78-a498-0fbcec7d33d2')
    .is('deleted_at', null);
  if (todoOrderError) throw todoOrderError;

  console.log('\nApplied Kim Yunki structure repair.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
