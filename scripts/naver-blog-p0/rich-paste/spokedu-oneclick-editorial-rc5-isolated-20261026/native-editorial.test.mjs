import test from 'node:test';import assert from 'node:assert/strict';
import {buildNativeEditorialPlan,judgeNativeEditorial,enhanceNativeHeadings,enhanceNativeCaptions} from './native-editorial.mjs';
const sample={blocks:[{type:'paragraph',text:'내용'},{type:'heading',text:'Chapter 01'},{type:'paragraph',text:'설명'}]};
const sampleManifest={photos:[{name:'a.jpg',caption:'현장 사진',source:'Diary'},{name:'cta.jpg',caption:'상담 안내',source:'brand graphic asset'}]};
test('plan preserves source headings and genuine photo captions',()=>{const p=buildNativeEditorialPlan(sample,sampleManifest);assert.deepEqual(p.headings,['Chapter 01']);assert.equal(p.captions[0].caption,'현장 사진');assert.equal(p.captions[1].isGraphic,true)});
test('missing field photo caption blocks',()=>assert.throws(()=>buildNativeEditorialPlan(sample,{photos:[{name:'a.jpg',caption:''}]}),/EDITORIAL_CAPTION_MISSING/));
test('duplicate headings block',()=>assert.throws(()=>buildNativeEditorialPlan({blocks:[{type:'heading',text:'제목'},{type:'heading',text:'제목'}]},sampleManifest),/EDITORIAL_DUPLICATE_HEADING/));
test('native audit cannot call skipped a pass',()=>{const p=buildNativeEditorialPlan(sample,sampleManifest);const r=judgeNativeEditorial(p,{headings:[{code:'HEADING_NOT_ISOLATED_SKIP'}],captions:[{code:'CAPTION_NATIVE_APPLIED'}]});assert.equal(r.nativeEditorialComplete,false);assert.equal(r.verdict,'EDITORIAL_PARTIAL_MANUAL_REVIEW_REQUIRED')});
test('native audit only passes all expected native elements',()=>{const p=buildNativeEditorialPlan(sample,sampleManifest);const r=judgeNativeEditorial(p,{headings:[{code:'HEADING_NATIVE_APPLIED'}],captions:[{code:'CAPTION_ALREADY_PRESENT'}]});assert.equal(r.nativeEditorialComplete,true)});
test('heading requires unambiguous exact DOM target',async()=>{const page={evaluate:async()=>({code:'HEADING_AMBIGUOUS',count:2})};const r=await enhanceNativeHeadings(page,['Chapter 01'],{verify:()=>{},applyTextFormat:()=>{throw Error('SHOULD_NOT_RUN')}});assert.equal(r[0].code,'HEADING_AMBIGUOUS')});
test('caption can skip unsafe native edit with no text injection',async()=>{
 const photo={innerText:async()=>'',locator:()=>({first:()=>({click:async()=>{}}),count:async()=>0}),getByText:()=>({count:async()=>0})};
 const page={locator:sel=>sel.includes('se-component-image')?{count:async()=>1,nth:()=>photo}:null};
 const result=await enhanceNativeCaptions(page,[{index:0,caption:'사진',isGraphic:false}],{verify:async()=>{throw Error('DO NOT CALL')}});
 assert.equal(result[0].code,'CAPTION_NATIVE_EDITOR_NOT_FOUND');
});

import {buildExplicitEditorialHtml,verifyExplicitEditorialHtml} from './editorial-html.mjs';
test('blue highlights preserve exact paragraph text and pass old clipboard structure gate',()=>{
 const bs=[{type:'paragraph',text:'움직임으로 아이의 성장 설계'}];
 const html=buildExplicitEditorialHtml(bs,{highlightFragments:['움직임으로 아이의 성장']});
 assert.match(html,/spokedu-editorial-highlight/);
 assert.match(html,/color:#1D568A/);
 assert.doesNotMatch(html,/font-weight:600/);
 assert.equal(verifyExplicitEditorialHtml(html,bs).blocks,1);
});
