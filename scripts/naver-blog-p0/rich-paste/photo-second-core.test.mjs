import {test} from 'node:test';
import assert from 'node:assert/strict';
import {selectUploadNextImageGate,verifySecondImageAfterFirstSegment} from './photo-second-core.mjs';
const title='목원초 PAPS';
const blocks=[{type:'paragraph',text:'첫 단락'},{type:'paragraph',text:'다음 단락'},{type:'heading',text:'제1장'}];
function snap(two=false){const body=blocks.map((b,i)=>({kind:'text',componentIndex:1,bodyLocatorIndex:i,text:b.text,
 align:'left',fullBold:i===2,fontSizes:[i===2?'24px':'16px']}));return {canvas:true,title,
 components:two?[{kind:'image'},{kind:'text'},{kind:'image'}]:[{kind:'image'},{kind:'text'}],
 images:two?[{loaded:true},{loaded:true}]:[{loaded:true}],paragraphs:body};}
test('preflight permits intact cover and first segment',()=>assert.equal(selectUploadNextImageGate(snap(),title,blocks).meaningfulParagraphs,3));
test('preflight rejects mutated paragraph count',()=>{const s=snap();s.paragraphs.push({...s.paragraphs[1]});assert.throws(()=>selectUploadNextImageGate(s,title,blocks),{code:'FIRST_SEGMENT_COUNT_CHANGED'});});
test('preflight rejects broken title',()=>{const s=snap();s.title='나쁜제목';assert.throws(()=>selectUploadNextImageGate(s,title,blocks),{code:'TITLE_CHANGED'});});
test('preflight rejects bold regression',()=>{const s=snap();s.paragraphs[2].fullBold=false;assert.throws(()=>selectUploadNextImageGate(s,title,blocks),{code:'FIRST_HEADING_FORMAT_CHANGED'});});
test('preflight rejects center alignment',()=>{const s=snap();s.paragraphs[0].align='center';assert.throws(()=>selectUploadNextImageGate(s,title,blocks),{code:'FIRST_SEGMENT_ALIGNMENT_CHANGED'});});
test('second photo after the first text segment succeeds',()=>assert.equal(verifySecondImageAfterFirstSegment(snap(true),title,blocks).images,2));
test('second photo before text fails',()=>{const s=snap(true);s.components=[{kind:'image'},{kind:'image'},{kind:'text'}];s.paragraphs.forEach(p=>p.componentIndex=2);assert.throws(()=>verifySecondImageAfterFirstSegment(s,title,blocks),{code:'SECOND_IMAGE_NOT_AFTER_FIRST_SEGMENT'});});
test('second photo inside first component fails',()=>{const s=snap(true);s.components=[{kind:'image'},{kind:'text'}];assert.throws(()=>verifySecondImageAfterFirstSegment(s,title,blocks),{code:'SECOND_IMAGE_MODULE_COUNT_INVALID'});});
test('second image not loaded fails',()=>{const s=snap(true);s.images[1].loaded=false;assert.throws(()=>verifySecondImageAfterFirstSegment(s,title,blocks),{code:'IMAGE_NOT_LOADED'});});
test('preflight rejects cover lost',()=>{const s=snap();s.images=[];assert.throws(()=>selectUploadNextImageGate(s,title,blocks),{code:'INITIAL_IMAGE_CHANGED'});});
test('second photo rejects mutated body text',()=>{const s=snap(true);s.paragraphs[0].text='변조';assert.throws(()=>verifySecondImageAfterFirstSegment(s,title,blocks),{code:'FIRST_SEGMENT_TEXT_CHANGED'});});
