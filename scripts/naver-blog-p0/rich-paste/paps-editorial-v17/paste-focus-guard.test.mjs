import test from 'node:test';
import assert from 'node:assert/strict';
import {pasteWithFreshBodyStyle} from './paste-focus-guard.mjs';
const hooks=(events,readback={anchor:{bodyLocatorIndex:2},boldToolbarPresent:true,boldToolbarActive:false})=>({
 putClipboard:async()=>events.push('clipboard'),
 focusAnchor:async()=>events.push('anchor'),
 setBodyFormat:async()=>events.push('body'),
 setNormalSize:async()=>events.push('16px'),
 setBoldOff:async()=>events.push('boldOff'),
 readBeforePaste:async()=>{events.push('readback');return readback},
 pressPaste:async()=>events.push('paste')});
test('clipboard prepared BEFORE click/focus and typography actions',async()=>{
 const events=[];await pasteWithFreshBodyStyle(hooks(events));
 assert.deepEqual(events,['clipboard','anchor','body','anchor','16px','boldOff','readback','paste']);
});
test('no text click between final Bold OFF and paste',async()=>{
 const events=[];const result=await pasteWithFreshBodyStyle(hooks(events));
 assert.deepEqual(events.slice(events.indexOf('boldOff')),['boldOff','readback','paste']);
 assert.equal(result.postResetClick,false);
});
test('inherited Bold ON before paste fails closed',async()=>{
 const events=[];await assert.rejects(()=>pasteWithFreshBodyStyle(hooks(events,{anchor:{bodyLocatorIndex:2},boldToolbarPresent:true,boldToolbarActive:true})),
 {code:'BODY_ANCHOR_BOLD_STILL_ACTIVE'});
 assert.ok(!events.includes('paste'));
});
test('lost anchor fails without paste',async()=>{
 const events=[];await assert.rejects(()=>pasteWithFreshBodyStyle(hooks(events,{anchor:null,boldToolbarPresent:true,boldToolbarActive:false})),
 {code:'BODY_ANCHOR_NOT_VERIFIED'});
 assert.ok(!events.includes('paste'));
});
test('inner toolbar preparation failure leaves previous content unchanged',async()=>{
 const events=[];const h=hooks(events);h.setBoldOff=async()=>{throw new Error('Naver toolbar missing')};
 await assert.rejects(()=>pasteWithFreshBodyStyle(h),/Naver toolbar missing/);
 assert.ok(!events.includes('paste'));
});
