import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {deriveSegments,validateArticle} from './sequential-plan.mjs';
import {inspectSequentialCanvas,gateNextImage} from './photo-sequential-core.mjs';
import {buildExplicitEditorialHtml,verifyExplicitEditorialHtml} from './editorial-html.mjs';
import {classifyEditorEntry} from './editor-entry-recovery.mjs';
const D=dirname(fileURLToPath(import.meta.url));
const m=JSON.parse(await readFile(join(D,'example-article/manifest.json'),'utf8'));
const md=await readFile(join(D,'example-article/ARTICLE_FOR_NAVER.md'),'utf8');
const blocks=[];let title='',para=[];
const flush=()=>{if(para.length){blocks.push({type:'paragraph',text:para.join('\n')});para=[];}};
for(const line of md.split(/\r?\n/)){
 if(line.startsWith('# ')&&!title){title=line.slice(2).trim();continue;}
 if(line.startsWith('## ')){flush();blocks.push({type:'heading',text:line.slice(3).trim()});continue;}
 if(!line.trim()){flush();continue;}para.push(line);
}flush();
const p={title,blocks};const sha=b=>createHash('sha256').update(b).digest('hex');
test('source SHA exact',()=>assert.equal(sha(md),m.source_sha256));
test('example manifest and true heading indexes',()=>{const v=validateArticle(p,m);assert.equal(v.headings,m.headingIndexes.length);assert.equal(v.segments.length,m.photos.length)});
test('segments reconstruct 22 blocks in declared order',()=>assert.deepEqual(deriveSegments(blocks,m).flatMap(s=>s.blocks),blocks));
test('no per-article fixed text/photo plan',()=>{
 const x={...m,articleKey:'new-local-article',title:'새 콘텐츠',blockCount:4,headingIndexes:[0],
   photoAfter:[-1,2],photos:m.photos.slice(0,2),editorialCompleteGate:[]};
 const b=[{type:'heading',text:'장'},{type:'paragraph',text:'설명'},{type:'paragraph',text:'추가'},{type:'paragraph',text:'마침'}];
 assert.equal(validateArticle({title:'새 콘텐츠',blocks:b},x).segments.length,2);
});
test('unsupported zero-image, reordering, heading boundary rejected',()=>{
 assert.throws(()=>validateArticle(p,{...m,photos:[],photoAfter:[]}),/PHOTO_COUNT_INVALID/);
 assert.throws(()=>validateArticle(p,{...m,photoAfter:[-1,10,6,16]}),/PHOTO_AFTER_ORDER_INVALID/);
 assert.throws(()=>validateArticle(p,{...m,photoAfter:[-1,7,10,16]}),/SEGMENT_BOUNDARY_INVALID|HEADING_AT_PHOTO_BOUNDARY/);
});
test('publication impossible by manifest',()=>{
 assert.throws(()=>validateArticle(p,{...m,publicationAllowed:true}),/PUBLICATION_SAFETY_GATE/);
 assert.throws(()=>validateArticle(p,{...m,draftSaveAllowed:true}),/PUBLICATION_SAFETY_GATE/);
});
for(const photo of m.photos){test(`photo sha ${photo.name}`,async()=>assert.equal(sha(await readFile(join(D,'example-article/editorial-assets',photo.name))),photo.sha256));}
for(const [i,seg] of deriveSegments(blocks,m).entries()){
 test(`segment ${i+1} body styling explicit`,()=>{
  const html=buildExplicitEditorialHtml(seg.blocks);const proof=verifyExplicitEditorialHtml(html,seg.blocks);
  assert.equal(proof.bodyExplicitWeight400,true);assert.equal(proof.noBodyBoldMarkup,true);
 });
}
test('native blog homepage is NOT login',()=>assert.equal(classifyEditorEntry({url:'https://blog.naver.com/spokedu77'}),'BLOG_HOME'));
test('login only from evidenced auth host',()=>assert.equal(classifyEditorEntry({url:'https://nid.naver.com/nidlogin.login'}),'AUTH_PAGE'));
test('Naver editor readiness DOM signal overrides route string',()=>assert.equal(classifyEditorEntry({url:'https://blog.naver.com/spokedu77',editorReady:true}),'EDITOR_READY'));
test('photo sequencing supports more than 4 images without hardcoded constants',()=>{
 const after=[-1,0,1,2,3];const bs=Array.from({length:5},(_,i)=>({type:'paragraph',text:'body '+i}));
 const photos=after.map((_,i)=>({name:`${i}.jpg`,sha256:'a'.repeat(64)}));
 const mm={...m,articleKey:'five-photos',title:'Five',blockCount:5,headingIndexes:[],photoAfter:after,photos,editorialCompleteGate:[]};
 const chunks=validateArticle({title:'Five',blocks:bs},mm).segments;
 assert.equal(chunks.length,5);
});
