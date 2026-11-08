// Disposable in-memory PostgreSQL only. Never reads .env or connects to an external DB.
// npm install --prefix .tmp/field-records-db --no-save @electric-sql/pglite
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require = createRequire(new URL('../.tmp/field-records-db/package.json', import.meta.url));
const { PGlite } = require('@electric-sql/pglite');
const db = new PGlite();
const user = '11111111-1111-4111-8111-111111111111';
const id = '22222222-2222-4222-8222-222222222222';
const other = '33333333-3333-4333-8333-333333333333';
const media = '44444444-4444-4444-8444-444444444444';
const seed = JSON.parse(readFileSync(new URL('../app/lib/field-records/approved-seed.json', import.meta.url), 'utf8'));
let checks = 0;
async function rejects(sql, args, pattern) { await assert.rejects(db.query(sql, args), pattern); checks++; }
try {
 await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS; CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY); INSERT INTO auth.users VALUES('${user}'); CREATE SCHEMA storage; CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]); CREATE TABLE storage.objects(bucket_id text); ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY; GRANT USAGE ON SCHEMA storage TO anon,authenticated; GRANT SELECT,INSERT ON storage.objects TO anon,authenticated; CREATE POLICY broad_legacy_policy ON storage.objects FOR ALL TO anon,authenticated USING(true) WITH CHECK(true); INSERT INTO storage.objects VALUES('field-record-media'),('existing-bucket');`);
 await db.exec(readFileSync(new URL('../supabase/migrations/20261107120000_field_records_cms.sql', import.meta.url), 'utf8'));
 const insert = (recordId, slug) => db.query('INSERT INTO public.field_records(id,slug,draft_content,created_by,updated_by) VALUES($1,$2,$3,$4,$4)', [recordId, slug, seed.records[0].content, user]);
 await insert(id, 'qa-record'); await insert(other, 'qa-other');
 for (const role of ['anon', 'authenticated']) {
  await db.exec(`SET ROLE ${role}`);
  await rejects('SELECT * FROM public.field_records', [], /permission denied/);
  await rejects('SELECT * FROM public.field_record_media', [], /permission denied/);
  await rejects('SELECT public.mutate_field_record($1,1,\'publish\',$2)', [id, user], /permission denied/);
  assert.deepEqual((await db.query('SELECT * FROM storage.objects')).rows, [{ bucket_id: 'existing-bucket' }]); checks++;
  await rejects("INSERT INTO storage.objects VALUES('field-record-media')", [], /row-level security/);
  await db.exec('RESET ROLE');
 }
 const mutate = (recordId, revision, action, content = null, slot = null, slug = 'qa-record') => db.query('SELECT * FROM public.mutate_field_record($1,$2,$3,$4,$5,$6,$7)', [recordId, revision, action, user, slug, content, slot]);
 await rejects('SELECT * FROM public.mutate_field_record($1,1,\'publish\',$2)', [id, user], /IMAGE_CONSENT_REQUIRED/);
 const content = structuredClone(seed.records[0].content); content.imagePublicConfirmed = true; content.hero.publicConfirmed = true;
 await mutate(id, 1, 'save', content); checks++;
 await mutate(id, 2, 'publish', null, 1); checks++;
 const edited = { ...content, title: 'Unpublished revision' };
 await mutate(id, 3, 'review', edited);
 let row = (await db.query('SELECT * FROM public.field_records WHERE id=$1', [id])).rows[0];
 assert.equal(row.published_content.title, content.title); assert.equal(row.draft_content.title, edited.title); checks++;
 await rejects('SELECT * FROM public.mutate_field_record($1,2,\'unpublish\',$2)', [id, user], /REVISION_CONFLICT/);
 await mutate(other, 1, 'save', content, null, 'qa-other');
 await rejects('SELECT * FROM public.mutate_field_record($1,2,\'publish\',$2,NULL,NULL,1::smallint)', [other, user], /duplicate key/);
 await db.query('INSERT INTO public.field_record_media(id,record_id,object_path,mime_type,byte_size,created_by) VALUES($1,$2,\'qa/image.webp\',\'image/webp\',100,$3)', [media, id, user]);
 const withImage = { ...content, hero: { id: media, alt: 'QA photo', caption: '', publicConfirmed: true } };
 await mutate(id, 4, 'save', withImage); await mutate(id, 5, 'publish', null, 1);
 await rejects('SELECT public.delete_field_record_media($1)', [media], /MEDIA_IN_USE/);
 await mutate(id, 6, 'unpublish');
 row = (await db.query('SELECT * FROM public.field_records WHERE id=$1', [id])).rows[0];
 assert.equal(row.published_content, null); assert.equal(row.featured_slot, null); assert.equal(row.published_at, null); checks++;
 await rejects('SELECT * FROM public.mutate_field_record($1,7,\'save\',$2,\'changed-url\',$3)', [id, user, content], /PUBLISHED_SLUG_IMMUTABLE/);
 await mutate(id, 7, 'save', content);
 await db.query('SELECT public.delete_field_record_media($1)', [media]); checks++;
 const wrongMedia = { ...content, hero: { id: media, alt: 'Missing photo', publicConfirmed: true } };
 await mutate(id, 8, 'save', wrongMedia);
 await rejects('SELECT * FROM public.mutate_field_record($1,9,\'publish\',$2)', [id, user], /MEDIA_NOT_OWNED/);
 assert.equal((await db.query("SELECT public FROM storage.buckets WHERE id='field-record-media'")).rows[0].public, false); checks++;
 console.log(`Field records disposable PostgreSQL checks: ${checks} PASS`);
} finally { await db.close(); }
