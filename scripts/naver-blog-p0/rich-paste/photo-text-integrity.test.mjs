import test from 'node:test';
import assert from 'node:assert/strict';
import { isEditorEmpty, reconcileParagraphs, validateNewImageSlot } from './photo-text-integrity.mjs';
const p = (text) => ({text});
const originals = Array.from({length:19},(_,i)=>`본문 문단 ${i+1}`);
const raw = originals.map(p);

test('regular whitespace and zero-width editor placeholders are empty', () => {
  for (const s of ['', '  \u200b', '\u00a0\u2060\ufeff', '\u200c\u200d']) assert.ok(isEditorEmpty(s),s);
  for (const s of ['본문', '본문\u200b', 'x', '\uFFFC']) assert.ok(!isEditorEmpty(s),s);
});
test('exact 19 paragraphs unchanged is valid', () => {
  assert.equal(reconcileParagraphs(raw,originals).textMatch,true);
});
test('leading placeholder after Enter is ignored but slot position is checked', () => {
  const after=[p('\u200b'),...raw];
  assert.equal(reconcileParagraphs(after,originals).textMatch,true);
  assert.equal(validateNewImageSlot(raw,after,originals,-1).ok,true);
  assert.equal(validateNewImageSlot(raw,[...raw,p('\u200b')],originals,-1).ok,false);
});
test('placeholder after section paragraph is accepted only at intended position', () => {
  const after=[...raw.slice(0,3),p('\u200b'),...raw.slice(3)];
  assert.equal(validateNewImageSlot(raw,after,originals,2).ok,true);
  assert.equal(validateNewImageSlot(raw,after,originals,7).ok,false);
});
test('substantive extra paragraphs cannot be ignored', () => {
  const after=[p('부정확한 새 문장'),...raw];
  assert.equal(reconcileParagraphs(after,originals).textMatch,false);
  assert.equal(validateNewImageSlot(raw,after,originals,-1).ok,false);
});
test('splitting original paragraph into two cannot pass', () => {
  const after=[p('본문'),p(' 문단 1'),...raw.slice(1)];
  assert.equal(validateNewImageSlot(raw,after,originals,-1).ok,false);
});
test('injected empty without new physical paragraph is rejected', () => {
  assert.equal(validateNewImageSlot(raw,raw,originals,-1).ok,false);
});
test('duplicate or missing existing text is rejected', () => {
  const duplicate=[p(''),...raw.slice(0,3),p(originals[2]),...raw.slice(3)];
  assert.equal(validateNewImageSlot(raw,duplicate,originals,-1).ok,false);
  const missing=[p('\u200b'),...raw.slice(1)];
  assert.equal(validateNewImageSlot(raw,missing,originals,-1).ok,false);
});
