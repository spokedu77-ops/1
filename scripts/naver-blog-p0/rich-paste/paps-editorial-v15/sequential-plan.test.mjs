import test from 'node:test'; import assert from 'node:assert/strict';
import {deriveSegments,verifyEditorialInput} from './sequential-plan.mjs';
const blocks=Array.from({length:19},(_,i)=>({type:[2,7,12].includes(i)?'heading':'paragraph',text:`PAPS text ${i}`}));
const title='목원초 PAPS';
test('sequential segments cover all 19 blocks without split or duplicate',()=>{
 const s=deriveSegments(blocks);
 assert.deepEqual(s.map(x=>x.blocks.length),[3,5,5,6]);
 assert.deepEqual(s.map(x=>x.photo),['01-cover-paps.jpg','02-fitness-pair.jpg','03-movement-pair.jpg','04-jump-single.jpg']);
 assert.deepEqual(s.flatMap(x=>x.blocks),blocks);
});
test('heading positions remain 2 7 12',()=>{
 const s=deriveSegments(blocks);assert.deepEqual(s.map(x=>x.blocks.filter(b=>b.type==='heading').length),[1,1,1,0]);
});
test('safe verification accepts PAPS final',()=>{
 assert.equal(verifyEditorialInput({title,blocks},{title,paragraphs:blocks.map(x=>x.text)}),true);
});
test('safe verification rejects POPS',()=>{
 const b=blocks.map(x=>({...x}));b[0].text='POPS activity';
 assert.throws(()=>verifyEditorialInput({title,blocks:b},{title,paragraphs:b.map(x=>x.text)}),{code:'PAPS_CORRECTION_REQUIRED'});
});
test('safe verification rejects text discrepancy',()=>{
 assert.throws(()=>verifyEditorialInput({title,blocks},{title,paragraphs:blocks.map((x,i)=>i===0?'changed':x.text)}),{code:'ARTICLE_TEXT_MISMATCH'});
});
