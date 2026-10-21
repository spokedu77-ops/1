import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveSafePhotoTailAnchor,verifyFirstSegmentAfterPhoto} from './photo-first-segment-core.mjs';
const title = '목원초 PAPS 수업';
const blocks = [{type:'paragraph',text:'문장 하나'},{type:'paragraph',text:'문장 둘'},{type:'heading',text:'첫 번째 제목'}];
const image={kind:'image'};
const text={kind:'text'};
const imgLoaded={loaded:true};
const sample=()=>({canvas:true,title,images:[imgLoaded],components:[image,text],paragraphs:[
 {kind:'text',componentIndex:1,bodyLocatorIndex:0,text:''},
]});
const inserted=()=>({canvas:true,title,images:[imgLoaded],components:[image,text],paragraphs:blocks.map((b,i)=>({
 kind:'text',componentIndex:1,bodyLocatorIndex:i,text:b.text,align:'left',fullBold:i===2,fontSizes:i===2?['24px']:['16px']}))});
test('finds only native blank paragraph following photo',()=>assert.equal(resolveSafePhotoTailAnchor(sample()).bodyLocatorIndex,0));
test('allows a blank text module before photo but never selects it',()=>{
 const a=sample();a.components.unshift(text);a.paragraphs.unshift({kind:'text',componentIndex:0,bodyLocatorIndex:0,text:''});a.paragraphs[1].componentIndex=2;a.paragraphs[1].bodyLocatorIndex=1;
 assert.equal(resolveSafePhotoTailAnchor(a).bodyLocatorIndex,1);
});
test('rejects absent trailing anchor (no synthetic Enter)',()=>{
 const a=sample();a.paragraphs=[];assert.throws(()=>resolveSafePhotoTailAnchor(a),{code:'POST_IMAGE_TEXT_ANCHOR_UNAVAILABLE'});
});
test('rejects existing meaningful text before attempting insertion',()=>{
 const a=sample();a.paragraphs[0].text='누군가 쓴 글';assert.throws(()=>resolveSafePhotoTailAnchor(a),{code:'BODY_NOT_EMPTY_AFTER_PHOTO'});
});
test('preserves photo and exactly 3 formatted text blocks',()=>assert.equal(verifyFirstSegmentAfterPhoto(inserted(),title,blocks).paragraphs,3));
test('blocks text accidentally inserted before the photo',()=>{
 const a=inserted();a.paragraphs[0].componentIndex=0;assert.throws(()=>verifyFirstSegmentAfterPhoto(a,title,blocks),{code:'TEXT_NOT_AFTER_PHOTO'});
});
test('rejects split or duplicated text',()=>{
 const a=inserted();a.paragraphs.push({...a.paragraphs[0],text:'분리된 문장'});assert.throws(()=>verifyFirstSegmentAfterPhoto(a,title,blocks),{code:'SEGMENT_COUNT_MISMATCH'});
});
test('rejects lost boldness',()=>{
 const a=inserted();a.paragraphs[2].fullBold=false;assert.throws(()=>verifyFirstSegmentAfterPhoto(a,title,blocks),{code:'SEGMENT_HEADING_NOT_BOLD'});
});
test('rejects centered body',()=>{
 const a=inserted();a.paragraphs[1].align='center';assert.throws(()=>verifyFirstSegmentAfterPhoto(a,title,blocks),{code:'SEGMENT_NOT_LEFT_ALIGNED'});
});
test('rejects missing photo',()=>{
 const a=inserted();a.images=[];assert.throws(()=>verifyFirstSegmentAfterPhoto(a,title,blocks),{code:'PHOTO_LOST_OR_NOT_LOADED'});
});
