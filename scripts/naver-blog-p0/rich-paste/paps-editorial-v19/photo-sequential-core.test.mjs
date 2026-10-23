import {test} from 'node:test';
import assert from 'node:assert/strict';
import {inspectSequentialCanvas,findNativeTailAnchor,gateNextImage, IMAGE_AFTER} from './photo-sequential-core.mjs';

const title='목원초 PAPS 현장수업';
const blocks=Array.from({length:19},(_,i)=>({type:[2,7,12].includes(i)?'heading':'paragraph',text:`PAPS 활동 ${i} 수업 문장`}));
function fixture(photos=4,bodyCount=19,{anchor=false}={}){
 const comps=[],images=[],paras=[];
 for(let j=0;j<photos;j++){
   comps.push({kind:'image'});images.push({loaded:true});
   const textComponentIndex=comps.length;
   comps.push({kind:'text'});
   for(let k=IMAGE_AFTER[j]+1;k<=Math.min(bodyCount-1,IMAGE_AFTER[j+1]??18);k++){
     const b=blocks[k];
     paras.push({kind:'text',componentIndex:textComponentIndex,bodyLocatorIndex:paras.length,text:b.text,
       align:'left',fullBold:b.type==='heading',fontSizes:[b.type==='heading'?'24px':'16px'],fontWeights:[b.type==='heading'?700:400]});
   }
 }
 if(anchor){paras.push({kind:'text',componentIndex:comps.length-1,bodyLocatorIndex:paras.length,text:'',align:'left'});}
 return {canvas:true,title,components:comps,images,paragraphs:paras};
}

for(const [img,body] of [[1,0],[1,3],[2,3],[2,8],[3,8],[3,13],[4,13],[4,19]]){
 test(`exact ordered modules hold: ${img} photos ${body} paragraphs`,()=>{
   const out=inspectSequentialCanvas(fixture(img,body),title,blocks.slice(0,body),img);
   assert.equal(out.images,img);assert.equal(out.paragraphs,body);assert.equal(out.textMatch,true);
 });
}
test('last photo must precede native blank anchor',()=>{
  const s=fixture(2,3,{anchor:true});
  const a=findNativeTailAnchor(s,title,blocks.slice(0,3),2);
  assert.equal(a.imageComponentIndex,2);assert.equal(a.componentIndex,3);
});
test('never create blank anchor when Naver provides none',()=>{
  assert.throws(()=>findNativeTailAnchor(fixture(2,3),title,blocks.slice(0,3),2),{code:'POST_PHOTO_NATIVE_ANCHOR_MISSING'});
});
test('gate photo 2 after 3 meaningful paragraphs',()=>assert.equal(gateNextImage(fixture(1,3),title,blocks.slice(0,3),1).bodyCount,3));
test('gate photo 3 only after 8 meaningful paragraphs',()=>assert.equal(gateNextImage(fixture(2,8),title,blocks.slice(0,8),2).bodyCount,8));
test('gate photo 4 only after 13 meaningful paragraphs',()=>assert.equal(gateNextImage(fixture(3,13),title,blocks.slice(0,13),3).bodyCount,13));
test('reject next image if previous segment not complete',()=>assert.throws(()=>gateNextImage(fixture(2,7),title,blocks.slice(0,7),2),{code:'IMAGE_INSERT_STAGE_INVALID'}));
test('reject duplicate meaningful text',()=>{
 const s=fixture(); s.paragraphs.push({...s.paragraphs[0]});
 assert.throws(()=>inspectSequentialCanvas(s,title,blocks,4),{code:'TEXT_COUNT_CHANGED'});
});
test('reject altered text even with same count',()=>{
 const s=fixture();s.paragraphs[14].text='changed';
 assert.throws(()=>inspectSequentialCanvas(s,title,blocks,4),{code:'TEXT_CONTENT_CHANGED'});
});
test('reject broken heading Bold at second heading',()=>{
 const s=fixture();s.paragraphs[7].fullBold=false;
 assert.throws(()=>inspectSequentialCanvas(s,title,blocks,4),{code:'HEADING_BOLD_LOST'});
});
test('reject heading size regression',()=>{
 const s=fixture();s.paragraphs[12].fontSizes=['16px'];
 assert.throws(()=>inspectSequentialCanvas(s,title,blocks,4),{code:'HEADING_SIZE_LOST'});
});
test('reject centered text',()=>{
 const s=fixture();s.paragraphs[17].align='center';
 assert.throws(()=>inspectSequentialCanvas(s,title,blocks,4),{code:'TEXT_ALIGNMENT_CHANGED'});
});
test('reject image module loss',()=>{
 const s=fixture();s.components.splice(6,1);
 assert.throws(()=>inspectSequentialCanvas(s,title,blocks,4),{code:'PHOTO_COUNT_CHANGED'});
});
test('reject unloaded image',()=>{
 const s=fixture();s.images[2].loaded=false;
 assert.throws(()=>inspectSequentialCanvas(s,title,blocks,4),{code:'PHOTO_NOT_LOADED'});
});
test('reject text moved after next image',()=>{
 const s=fixture();s.paragraphs[2].componentIndex=3;
 assert.throws(()=>inspectSequentialCanvas(s,title,blocks,4),{code:'TEXT_AFTER_NEXT_PHOTO'});
});
test('reject photo inserted before prior body',()=>{
 const s=fixture();s.paragraphs[7].componentIndex=4;
 assert.throws(()=>inspectSequentialCanvas(s,title,blocks,4));
});
test('reject broken title',()=>{
 const s=fixture();s.title='different';
 assert.throws(()=>inspectSequentialCanvas(s,title,blocks,4),{code:'TITLE_CHANGED'});
});

test('reject ordinary paragraph inheriting 24px heading size after photo 2',()=>{
 const s=fixture(); s.paragraphs[3].fontSizes=['24px'];
 assert.throws(()=>inspectSequentialCanvas(s,title,blocks,4),{code:'BODY_FONT_SIZE_LEAK'});
});
test('reject ordinary paragraph inheriting bold after photo 2',()=>{
 const s=fixture();s.paragraphs[3].fullBold=true;s.paragraphs[3].fontWeights=[700];
 assert.throws(()=>inspectSequentialCanvas(s,title,blocks,4),{code:'BODY_BOLD_LEAK'});
});
test('reject any mixed-size ordinary paragraph even when other leaves are 16px',()=>{
 const s=fixture();s.paragraphs[8].fontSizes=['16px','24px'];
 assert.throws(()=>inspectSequentialCanvas(s,title,blocks,4),{code:'BODY_FONT_SIZE_LEAK'});
});
test('reject partial bold inside ordinary paragraph',()=>{
 const s=fixture();s.paragraphs[13].fontWeights=[400,700];
 assert.throws(()=>inspectSequentialCanvas(s,title,blocks,4),{code:'BODY_BOLD_LEAK'});
});
