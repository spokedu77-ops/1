import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {inspectSequentialCanvas,gateNextImage,findNativeTailAnchor} from './photo-sequential-core.mjs';
import {buildNativeEditorialPlan,auditNativeRenderedOutput,judgeNativeEditorial} from './native-editorial.mjs';

const here=dirname(fileURLToPath(import.meta.url));
const manifest=JSON.parse(await readFile(join(here,'example-article/manifest.json'),'utf8'));
const src=await readFile(join(here,'example-article/ARTICLE_FOR_NAVER.md'),'utf8');
let blocks=[],lines=[],title='';
const flush=()=>{if(lines.length){blocks.push({type:'paragraph',text:lines.join('\n')});lines=[];}};
for(const line of src.split(/\r?\n/)){
 if(line.startsWith('# ')&&!title){title=line.slice(2).trim();continue;}
 if(line.startsWith('## ')){flush();blocks.push({type:'heading',text:line.slice(3).trim()});continue;}
 if(!line.trim()){flush();continue;}
 lines.push(line);
}flush();
assert.equal(blocks.length,22);
const countForStage=n=>n===4?blocks.length:manifest.photoAfter[n]+1;
function snap(stage,{native=false,headingSize='19px',bodySize='16px',bodyBold=false,corruptText=false}={}){
 const visible=blocks.slice(0,countForStage(stage));
 const c=[],p=[],imgs=[];let paraIndex=0;
 for(let i=0;i<visible.length;i++){
  if(manifest.photoAfter.slice(0,stage).includes(i-1)){
   c.push({kind:'image'});imgs.push({loaded:true});
  }
  let x=visible[i];
  const heading=x.type==='heading';
  c.push({kind:'text'});
  p.push({kind:'text',componentIndex:c.length-1,bodyLocatorIndex:paraIndex++,text:corruptText&&i===2?'INCORRECT':x.text,
    align:'left',fullBold:heading||bodyBold,fontSizes:[heading?headingSize:bodySize],
    fontWeights:[heading||bodyBold?700:400],nativeHeading:native&&heading});
 }
 return {canvas:true,title,components:c,paragraphs:p,images:imgs};
}

for(let stage=1;stage<=4;stage++){
 test(`stage ${stage} accepts actual 19px provisional heading, exact source order, ${stage} loaded image(s)`,()=>{
  const s=snap(stage);
  const r=inspectSequentialCanvas(s,title,blocks.slice(0,countForStage(stage)),stage,manifest.photoAfter);
  assert.equal(r.headings,blocks.slice(0,countForStage(stage)).filter(b=>b.type==='heading').length);
  assert.equal(r.headingFormatting,'DEFERRED_TO_NATIVE_STAGE');
  assert.equal(r.nativeHeadingVerified,0);
  assert.equal(r.images,stage);
 });
}
test('incomplete heading cannot be accidentally reported as final native',()=>assert.throws(()=>
 inspectSequentialCanvas(snap(4),title,blocks,4,manifest.photoAfter,{requireNativeHeadings:true}),e=>e.code==='HEADING_NATIVE_MISSING'));
test('19px heading with authentic native components passes final gate without arbitrary >=20px cutoff',()=>{
 const res=inspectSequentialCanvas(snap(4,{native:true}),title,blocks,4,manifest.photoAfter,{requireNativeHeadings:true});
 assert.equal(res.nativeHeadingVerified,4);
 assert.equal(res.headingFormatting,'NATIVE_COMPONENT_VERIFIED');
});
test('text corruption still blocks provisional gate',()=>assert.throws(()=>inspectSequentialCanvas(snap(1,{corruptText:true}),title,blocks.slice(0,7),1,manifest.photoAfter),e=>e.code==='TEXT_CONTENT_CHANGED'));
test('body bold leak still blocks provisional gate',()=>assert.throws(()=>inspectSequentialCanvas(snap(1,{bodyBold:true}),title,blocks.slice(0,7),1,manifest.photoAfter),e=>e.code==='BODY_BOLD_LEAK'));
test('body size leak still blocks provisional gate',()=>assert.throws(()=>inspectSequentialCanvas(snap(1,{bodySize:'24px'}),title,blocks.slice(0,7),1,manifest.photoAfter),e=>e.code==='BODY_FONT_SIZE_LEAK'));
test('next image positioning requires exact preceding segment body, not just a photo',()=>{
 const s=snap(1);const r=gateNextImage(s,title,blocks.slice(0,7),1,manifest.photoAfter);assert.equal(r.bodyCount,7);
});
test('read-only empty native text anchor remains supported after image insertion',()=>{
 const s=snap(1);
 s.components.push({kind:'text'});s.paragraphs.push({kind:'text',bodyLocatorIndex:7,componentIndex:s.components.length-1,text:'',align:'left'});
 assert.equal(findNativeTailAnchor(s,title,blocks.slice(0,7),1,manifest.photoAfter).bodyLocatorIndex,7);
});
test('real native DOM and caption proof required, not successful UI events',()=>{
 const plan=buildNativeEditorialPlan({blocks},manifest);
 const events=judgeNativeEditorial(plan,{headings:plan.headings.map(()=>({code:'HEADING_NATIVE_APPLIED'})),captions:plan.captions.filter(c=>!c.isGraphic).map(()=>({code:'CAPTION_NATIVE_APPLIED'}))});
 assert.equal(events.nativeEditorialComplete,true);
 const fake={ready:true,images:manifest.photos.map(()=>({caption:''})),text:blocks.map(b=>({text:b.text,kind:'body'}))};
 const result=auditNativeRenderedOutput(plan,fake);
 assert.equal(result.complete,false);
 assert.equal(result.headingsNativeComplete,false);
 assert.equal(result.captionsComplete,false);
});
test('native DOM + exact 3 captions + 4 photographs required for complete',()=>{
 const plan=buildNativeEditorialPlan({blocks},manifest);
 const good={ready:true,images:manifest.photos.map(p=>({caption:p.caption})),text:blocks.map(b=>({text:b.text,kind:b.type==='heading'?'sectionTitle':'body'}))};
 const pass=auditNativeRenderedOutput(plan,good);assert.equal(pass.complete,true);
 assert.equal(pass.headingChecks.filter(x=>x.native).length,4);
 const wrong={...good,images:good.images.slice(0,3)};assert.equal(auditNativeRenderedOutput(plan,wrong).complete,false);
});
test('native audit fails if an expected heading duplicated',()=>{
 const plan=buildNativeEditorialPlan({blocks},manifest);
 const items=blocks.map(b=>({text:b.text,kind:b.type==='heading'?'sectionTitle':'body'}));
 items.push(items.find(p=>p.kind==='sectionTitle'));
 const result=auditNativeRenderedOutput(plan,{ready:true,images:manifest.photos.map(p=>({caption:p.caption})),text:items});
 assert.equal(result.complete,false);
});
