import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const DOC_ID = '7c095438-335b-4318-a3fb-09145f01d24a';
const TOGGLE_ID = 'c1cc08f4-e3dc-4aed-970d-009f0e46cdaa';
const TEXT_CHILD_ID = '0e1113e8-2ddb-4a20-b893-9b3f8669485b';
const TEXT_SOURCE_ID = '495d0d92-4aff-42e3-b159-83638d433b9c';
const PARKING_SUPABASE_IMAGE_ID = 'a66f6697-ce75-4917-bddc-3f920cdc1420';
const PARKING_POSTIMG_URL = 'https://i.postimg.cc/gjd9ZKqY/seupokidyu-LAB-kijeujim-juchagong-gan.jpg';

function textToHtml(raw) {
  return raw
    .split(/\n\n+/)
    .filter((p) => p.trim())
    .map((p) => `<p>${p.trim().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}</p>`)
    .join('');
}

const now = new Date().toISOString();

// 0) Restore text body from soft-deleted source
const { data: src, error: srcErr } = await sb
  .from('note_blocks')
  .select('content')
  .eq('id', TEXT_SOURCE_ID)
  .single();
if (srcErr) throw srcErr;
const text = (src.content?.text || '').trim();
if (!text) throw new Error('source text empty');

const { data: textChild, error: textChildErr } = await sb
  .from('note_blocks')
  .select('id,order_index,version')
  .eq('id', TEXT_CHILD_ID)
  .single();
if (textChildErr) throw textChildErr;

const { error: textUpdErr } = await sb
  .from('note_blocks')
  .update({
    parent_block_id: TOGGLE_ID,
    deleted_at: null,
    deleted_by: null,
    order_index: 0,
    updated_at: now,
    version: (textChild.version ?? 1) + 1,
    content: {
      text,
      html: textToHtml(text),
      placedInToggle: true,
      migratedFromToggleBody: true,
      restoredFromDeletedBlockId: TEXT_SOURCE_ID,
    },
  })
  .eq('id', TEXT_CHILD_ID);
if (textUpdErr) throw textUpdErr;
console.log('restored text child', TEXT_CHILD_ID, 'len', text.length);

let order = textChild.order_index + 1;

// 1) Restore supabase parking image under toggle
const { data: parkingImg, error: imgFetchErr } = await sb
  .from('note_blocks')
  .select('*')
  .eq('id', PARKING_SUPABASE_IMAGE_ID)
  .single();
if (imgFetchErr) throw imgFetchErr;

const { error: restoreImgErr } = await sb
  .from('note_blocks')
  .update({
    parent_block_id: TOGGLE_ID,
    order_index: order,
    deleted_at: null,
    deleted_by: null,
    updated_at: now,
    version: (parkingImg.version ?? 1) + 1,
    content: {
      ...(parkingImg.content ?? {}),
      placedInToggle: true,
      migratedFromToggleImages: true,
      restoredFromDeletedBlockId: PARKING_SUPABASE_IMAGE_ID,
    },
  })
  .eq('id', PARKING_SUPABASE_IMAGE_ID);
if (restoreImgErr) throw restoreImgErr;
console.log('restored supabase image', PARKING_SUPABASE_IMAGE_ID, 'order', order);
order += 1;

// 2) Add postimg parking photo if not already active under toggle
const { data: activeKids } = await sb
  .from('note_blocks')
  .select('id,content')
  .eq('document_id', DOC_ID)
  .eq('parent_block_id', TOGGLE_ID)
  .is('deleted_at', null);

const hasPostimg = (activeKids ?? []).some((b) => {
  const url = b.content?.url;
  return typeof url === 'string' && url.includes('postimg.cc/gjd9ZKqY');
});

if (!hasPostimg) {
  const newId = randomUUID();
  const { error: insertErr } = await sb.from('note_blocks').insert({
    id: newId,
    document_id: DOC_ID,
    parent_block_id: TOGGLE_ID,
    type: 'image',
    order_index: order,
    content: {
      url: PARKING_POSTIMG_URL,
      placedInToggle: true,
      migratedFromToggleImages: true,
      restoredFromDeletedToggleImages: true,
    },
    created_at: now,
    updated_at: now,
    version: 1,
  });
  if (insertErr) throw insertErr;
  console.log('inserted postimg image', newId, 'order', order);
} else {
  console.log('postimg already present under toggle');
}

// verify
const { data: finalKids } = await sb
  .from('note_blocks')
  .select('id,type,order_index,content')
  .eq('document_id', DOC_ID)
  .eq('parent_block_id', TOGGLE_ID)
  .is('deleted_at', null)
  .order('order_index');
console.log('\nactive toggle children:', finalKids?.length ?? 0);
for (const b of finalKids ?? []) {
  const c = b.content ?? {};
  console.log(b.type, b.order_index, (c.text ?? c.url ?? '').toString().slice(0, 100));
}
