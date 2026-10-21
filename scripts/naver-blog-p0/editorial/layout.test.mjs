import test from 'node:test';
import assert from 'node:assert/strict';
import {compileLayout,renderEditorialHtml,validatePhotoMeta} from './layout.mjs';
const blocks = Array.from({length:19},(_,i)=>({type:[2,7,12].includes(i)?'heading':'paragraph',text:`샘플 구분 텍스트 ${i} & < >` }));
const model = { title:'원고 제목 <정확성>',blocks,paragraphs:blocks.map(b=>b.text),headingIndexes:[2,7,12]};
test('verified 19 blocks, 3 heading markers, render text exactly once',()=>{
 const p=compileLayout(model,[]);const html=renderEditorialHtml(p);
 assert.equal(p.blocks.length,19);assert.equal(p.slots.length,4);assert.equal(p.editorialReady,false);
 assert.equal((html.match(/data-block-index=/g)||[]).length,19);
 assert.equal((html.match(/class="section-title"/g)||[]).length,3);
 for(const b of blocks)assert.equal(html.split(b.text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')).length-1,1);
 assert.doesNotMatch(html,/<script/i);
});
test('unapproved image is never embedded',()=>{
 const p=compileLayout(model,[{slot:'cover',sourceFile:'/tmp/x.jpg',sourceName:'bad',useRightsApproved:'approved',portraitRightsCleared:'pending',activityMatchReviewed:'approved'}]);
 assert.equal(p.slots[0].ready,false);assert.equal(p.editorialReady,false);
 assert.match(renderEditorialHtml(p),/PHOTO SLOT/);
});
test('any heading index mismatch fails closed',()=>{
 assert.throws(()=>compileLayout({...model,headingIndexes:[1,7,12]},[]),/SOURCE_HEADING_INDEX_MISMATCH/);
});
test('image metadata approval requires source evidence and explicit rights',()=>{
 const meta={slot:'cover',sourceFile:'/photos/image.jpg',sourceName:'image.jpg',sessionMatchEvidence:'verified 2025 class',useRightsApproved:'approved',portraitRightsCleared:'approved',activityMatchReviewed:'approved'};
 assert.deepEqual(validatePhotoMeta(meta,{id:'cover'}),[]);
 assert.ok(validatePhotoMeta({...meta,activityMatchReviewed:'pending'},{id:'cover'}).length);
});
