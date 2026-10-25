import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {deriveSegments,verifyEditorialInput,PHOTO_AFTER} from './sequential-plan.mjs';
import {buildExplicitEditorialHtml,verifyExplicitEditorialHtml} from './editorial-html.mjs';
import {inspectSequentialCanvas} from './photo-sequential-core.mjs';
const DIR=dirname(fileURLToPath(import.meta.url));
const manifest=JSON.parse(await readFile(join(DIR,'article','manifest.json'),'utf8'));
const markdown=await readFile(join(DIR,'article','ARTICLE_FOR_NAVER.md'),'utf8');
const lines=markdown.trim().split(/\r?\n/);let title='',blocks=[],buf=[];
const flush=()=>{if(buf.length){blocks.push({type:'paragraph',text:buf.join('\n').trim()});buf=[];}};
for(const l of lines){if(l.startsWith('# ')&&!title){flush();title=l.slice(2).trim();}else if(l.startsWith('## ')){flush();blocks.push({type:'heading',text:l.slice(3).trim()});}else if(!l.trim()){flush();}else{buf.push(l);}}flush();
const parsed={title,blocks};
const segments=deriveSegments(blocks);
const sha=t=>createHash('sha256').update(t).digest('hex');
const paragraphs=blocks.map(b=>b.text);
const plainSnapshot=(cnt,pics)=>{
  const components=[];const ps=[];const images=[];
  for(let n=0;n<pics;n++){
    components.push({kind:'image'});images.push({loaded:true});
    for(let i=PHOTO_AFTER[n].after+1;i<Math.min(cnt,n+1<pics?PHOTO_AFTER[n+1].after+1:cnt);i++){
      let comp=components.at(-1)?.kind==='text'?components.length-1:(components.push({kind:'text'}),components.length-1);
      const heading=blocks[i].type==='heading';
      ps.push({kind:'text',componentIndex:comp,text:blocks[i].text,align:'left',fullBold:heading,fontSizes:[heading?'24px':'16px'],fontWeights:[heading?700:400]});
    }
  }
  return {canvas:true,title,components,images,paragraphs:ps};
};
test('title and factual source SHA have not changed',()=>{assert.equal(sha(markdown),manifest.source_sha256);assert.equal(title,manifest.title);});
test('complete reviewed body blocks with closing and 5 headings',()=>{assert.equal(blocks.length,manifest.blockCount);assert.deepEqual(manifest.headingIndexes,[2, 7, 11, 17]);assert.equal(blocks.filter(b=>b.type==='heading').length,4);});
test('article passes structural review',()=>assert.ok(verifyEditorialInput(parsed,manifest)));
test('same paragraph order across three independent photos',()=>{assert.deepEqual(segments.map(s=>s.blocks.length),[7,4,6,blocks.length-17]);assert.deepEqual(segments.map(s=>s.after),[-1, 6, 10, 16]);assert.deepEqual(segments.flatMap(s=>s.blocks),blocks);});
test('each photo boundary ends on normal body instead of chapter heading',()=>{segments.forEach(s=>assert.equal(s.blocks.at(-1).type,'paragraph'));});
test('three photos from actual PDF, plus designed CTA asset',()=>{manifest.photos.slice(0,3).forEach(p=>assert.ok(/^source-00[012]\.jpg$/.test(p.source)));assert.match(manifest.photos[3].source,/brand/);});
for(const photo of manifest.photos){test(`actual photo asset SHA: ${photo.name}`,async()=>{const b=await readFile(join(DIR,'editorial-assets',photo.name));assert.equal(sha(b),photo.sha256);assert.equal(b[0],0xff);assert.equal(b[1],0xd8);});}
for(let n=0;n<segments.length;n++){test(`photo segment ${n+1} encodes only the intended headings and normal paragraphs`,()=>{const s=segments[n];const html=buildExplicitEditorialHtml(s.blocks);const gate=verifyExplicitEditorialHtml(html,s.blocks);assert.equal(gate.blocks,s.blocks.length);assert.equal(gate.headings,s.blocks.filter(x=>x.type==='heading').length);assert.equal(gate.bodyExplicitWeight400,true);assert.equal(gate.noBodyBoldMarkup,true);assert.equal(gate.bodyExplicit16Px,true);});}
test('plain paragraph never inherits heading bold in simulated editor tree',()=>{const snap=plainSnapshot(blocks.length,4);const result=inspectSequentialCanvas(snap,title,blocks,4);assert.equal(result.images,4);assert.equal(result.paragraphs,blocks.length);assert.equal(result.headings,4);});
test('body bold leakage is blocked in simulated editor tree',()=>{const snap=plainSnapshot(blocks.length,4);snap.paragraphs.find(x=>x.text===paragraphs[12]).fontWeights=[700];assert.throws(()=>inspectSequentialCanvas(snap,title,blocks,4),/block=12/);});
test('unexpected body font sizes are blocked',()=>{const snap=plainSnapshot(blocks.length,4);snap.paragraphs.find(x=>x.text===paragraphs[8]).fontSizes=['24px'];assert.throws(()=>inspectSequentialCanvas(snap,title,blocks,4),/block=8/);});
test('no save / publish approval in source manifest',()=>{assert.equal(manifest.publicationAllowed,false);assert.equal(manifest.draftSaveAllowed,false);});
test('correct SPOMOVE/PAPS terminology not artificially inserted',()=>{assert.doesNotMatch(markdown,/\bPOPS\b/);assert.doesNotMatch(markdown,/가짜 성과|반응속도 \d+초/);});

test('editorial completeness: contact, ending, operating terms, hashtags',()=>{
  assert.match(markdown,/승부가 생기는 순간/);
  assert.match(markdown,/스포츠맨십/);
  assert.match(markdown,/우리 기관에도 이런 움직임/);
  assert.match(markdown,/https?:\/\/pf\.kakao\.com\/_VGWxeb\/chat/);
  assert.match(markdown,/#센터체육수업/);
  assert.ok(verifyEditorialInput(parsed,manifest));
});
test('stop preflight if footer is missing',()=>{
  const broken={...parsed,blocks:parsed.blocks.map((x)=>({...x,text:x.text.replace('https://pf.kakao.com/_VGWxeb/chat','')}))};
  assert.throws(()=>verifyEditorialInput(broken,manifest),/CONTACT_LINK_MISSING/);
});

test('contact links are actual HTML anchors while preserving the original URL text',()=>{
 const b=[{type:'paragraph',text:'수업 안내: https://spokedu.kr/education\n상담: https://pf.kakao.com/_VGWxeb/chat'}];
 const h=buildExplicitEditorialHtml(b);
 assert.match(h,/<a href="https:\/\/spokedu.kr\/education"/);
 assert.match(h,/<a href="https:\/\/pf.kakao.com\/_VGWxeb\/chat"/);
 assert.equal(verifyExplicitEditorialHtml(h,b).bodyExplicitWeight400,true);
});
