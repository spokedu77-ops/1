import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';
import {PHOTO_AFTER,deriveSegments,verifyEditorialInput} from './sequential-plan.mjs';
import {IMAGE_AFTER,HEADING_INDEXES,inspectSequentialCanvas,findNativeTailAnchor,gateNextImage} from './photo-sequential-core.mjs';
import {buildExplicitEditorialHtml,verifyExplicitEditorialHtml} from './editorial-html.mjs';
import {classifyTitleOverlay} from './title-overlay-gate.mjs';
const dir=dirname(fileURLToPath(import.meta.url));
const TITLE='실제 PAPS 글 제목';
const blocks=Array.from({length:19},(_,i)=>({type:[2,7,12].includes(i)?'heading':'paragraph',text:`PAPS 원고 블록 ${i} 과제와 기록` }));
const after=[-1,3,8,13];
const cutoffs=[0,4,9,14,19];
function fixture(imageCount, paragraphCount,{boldBlock=-1,largeBlock=-1}={}){
  const components=[],paragraphs=[],images=[];
  for(let z=0;z<imageCount;z++){
    const photoIndex=components.push({kind:'image'})-1;
    images.push({loaded:true,count:1});
    const tail=Math.min(paragraphCount,cutoffs[z+1]);
    if(tail>cutoffs[z]){
      const textIndex=components.push({kind:'text'})-1;
      for(let i=cutoffs[z];i<tail;i++){
        const heading=blocks[i].type==='heading';
        const isBold=heading||i===boldBlock;
        paragraphs.push({kind:'text',componentIndex:textIndex,bodyLocatorIndex:i,text:blocks[i].text,align:'left',fullBold:isBold,fontWeights:[isBold?700:400],fontSizes:[heading||i===largeBlock?'24px':'16px']});
      }
    }
  }
  const anchorIdx=components.push({kind:'text'})-1;
  paragraphs.push({kind:'text',componentIndex:anchorIdx,bodyLocatorIndex:paragraphCount,text:'',align:'left',fullBold:false,fontWeights:[],fontSizes:[]});
  return {canvas:true,components,paragraphs,images,title:TITLE};
}
test('layout ends each prior-photo segment with an ordinary paragraph, never a heading',()=>{
  assert.deepEqual(IMAGE_AFTER,after);assert.deepEqual(PHOTO_AFTER.map(x=>x.after),after);
  assert.deepEqual(HEADING_INDEXES,[2,7,12]);
  const result=deriveSegments(blocks);
  assert.deepEqual(result.map(x=>x.blocks.length),[4,5,5,5]);
  assert.deepEqual(result.map(x=>x.blocks.at(-1).type),['paragraph','paragraph','paragraph','paragraph']);
  assert.deepEqual(result.flatMap(x=>x.blocks),blocks);
});
test('all layout stages permit exactly 4 image uploads and 19 paragraphs',()=>{
  for(const [count,para] of [[1,0],[1,4],[2,4],[2,9],[3,9],[3,14],[4,14],[4,19]]){
    const snap=fixture(count,para);
    const result=inspectSequentialCanvas(snap,TITLE,blocks.slice(0,para),count);
    assert.equal(result.images,count);assert.equal(result.paragraphs,para);
    if(para===cutoffs[count]&&count<4){
      const gate=gateNextImage(snap,TITLE,blocks.slice(0,para),count);
      assert.equal(gate.bodyCount,para);
    }
    const anchor=findNativeTailAnchor(snap,TITLE,blocks.slice(0,para),count);
    assert.equal(anchor.bodyLocatorIndex,para);
  }
});
test('style regression after image 2 fails closed on ordinary paragraph',()=>{
  assert.throws(()=>inspectSequentialCanvas(fixture(2,9,{boldBlock:4}),TITLE,blocks.slice(0,9),2),{code:'BODY_BOLD_LEAK'});
  assert.throws(()=>inspectSequentialCanvas(fixture(2,9,{largeBlock:4}),TITLE,blocks.slice(0,9),2),{code:'BODY_FONT_SIZE_LEAK'});
});
test('no extra or altered content can be accepted',()=>{
  const snap=fixture(4,19);snap.paragraphs[7].text='틀린 내용';
  assert.throws(()=>inspectSequentialCanvas(snap,TITLE,blocks,4),{code:'TEXT_CONTENT_CHANGED'});
});
test('markdown all paragraphs and titles are unchanged, PAPS only',()=>{
  const plan={title:TITLE,paragraphs:blocks.map(b=>b.text)};
  assert.equal(verifyEditorialInput({title:TITLE,blocks},plan),true);
  assert.throws(()=>verifyEditorialInput({title:TITLE,blocks:[...blocks.slice(0,1),{type:'paragraph',text:'POPS'},...blocks.slice(2)]},plan));
});
test('clipboard explicit 16px 400 plain paragraphs and heading bold',()=>{
  const s=deriveSegments(blocks);
  for(const seg of s){const html=buildExplicitEditorialHtml(seg.blocks);assert.equal(verifyExplicitEditorialHtml(html,seg.blocks).blocks,seg.blocks.length);assert.equal((html.match(/font-weight:400/g)||[]).length,seg.blocks.filter(x=>x.type==='paragraph').length*2)}
});
test('overlay dim without known dialog remains blocked',()=>{
  assert.equal(classifyTitleOverlay({blocked:true,dialogs:[]}).status,'BLOCKED_UNKNOWN');
});
test('assets exactly match original successful v13 sha256',async()=>{
  const sha={
    '01-cover-paps.jpg':'4a346f4329b0861aae0fab2a605c1699c693cd18f4ec13396efca86518acbcc1',
    '02-fitness-pair.jpg':'440af414d608fec3b3f566808853cba77f87e0087097ec14fa3d0d96c3029a4e',
    '03-movement-pair.jpg':'6e67fe36c38b8c870a5d32a2becea1a3a56ac9b628d944c1a4fbac1b90a4a549',
    '04-jump-single.jpg':'161c8f0dd01d4457c7cd4903911ebfbe2a25a814978b5e8bbad4fcc858549ba1',
  };
  for(const [name,expected] of Object.entries(sha))assert.equal(createHash('sha256').update(await readFile(join(dir,'editorial-assets',name))).digest('hex'),expected);
});
test('runtime has no browser close, save or publish action',async()=>{
  const s=await readFile(join(dir,'run.mjs'),'utf8');
  assert.doesNotMatch(s,/await\s+(?:page|browser|context)\.close\s*\(/);
  assert.doesNotMatch(s,/\.click\([^\n]*(?:publish|saveDraft|임시저장)/);
  assert.match(s, /connectOverCDP\(state\.wsEndpoint,\{timeout:90000\}\)/);
  assert.match(s, /\[4,5,5,5\]/);
  assert.match(s, /PAPS_FULL_EDITORIAL_PREVIEW_PASS/);
});
