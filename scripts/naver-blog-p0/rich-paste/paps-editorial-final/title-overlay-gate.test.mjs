import {test} from 'node:test';
import assert from 'node:assert/strict';
import {classifyTitleOverlay,runOverlayGate,restoreDialogPattern} from './title-overlay-gate.mjs';
const clear=()=>({blocked:false,dimCount:0,dialogs:[],hits:[{blocker:false}]});
const hidden=()=>({blocked:true,dimCount:1,dialogs:[],hits:[{blocker:true,cls:'se-popup-dim se-popup-dim-white'}]});
const known=()=>({blocked:true,dimCount:1,dialogs:[{kind:'restore-confirm',visible:true,text:'이전에 작성하던 글을 불러오시겠습니까?',buttons:['취소','확인'],index:0}]});
const unknown=()=>({blocked:true,dimCount:1,dialogs:[{kind:'other-dialog',visible:true,text:'알 수 없는 알림',buttons:['확인','닫기'],index:0}]});
const choose=(xs)=>{let idx=0;return ()=>xs[Math.min(idx++,xs.length-1)];};
function fakeClock(){let t=0;return {now:()=>t,pause:async(n)=>{t+=n}};}
test('known previous-writing dialog is the only cancel candidate',()=>{
  assert.equal(classifyTitleOverlay(known()).status,'SAFE_RESTORE_CANCEL');
  assert.ok(restoreDialogPattern.test('이전에 작성하던 글을 불러오시겠습니까?'));
  assert.equal(classifyTitleOverlay(unknown()).status,'BLOCKED_UNKNOWN');
  assert.equal(classifyTitleOverlay(hidden()).status,'BLOCKED_UNKNOWN');
});
test('clear editor requires two successive readbacks, no user action',async()=>{
  const clock=fakeClock();let cancelled=0;
  const r=await runOverlayGate({inspect:choose([clear(),clear()]),cancelRestore:()=>{cancelled++},...clock,pause:clock.pause,timeoutMs:700});
  assert.equal(r.ok,true);assert.equal(r.records.length,2);assert.equal(cancelled,0);
});
test('brief delayed scrim is allowed to clear naturally',async()=>{
  const clock=fakeClock();let cancelled=0;
  const r=await runOverlayGate({inspect:choose([hidden(),hidden(),clear(),clear()]),cancelRestore:()=>{cancelled++},...clock,pause:clock.pause,timeoutMs:1500});
  assert.equal(r.ok,true);assert.equal(cancelled,0);
});
test('known restore prompt is cancelled once, then title becomes ready',async()=>{
  const clock=fakeClock();let cancelled=0;
  const r=await runOverlayGate({inspect:choose([known(),known(),clear(),clear()]),cancelRestore:async()=>{cancelled++},...clock,pause:clock.pause,timeoutMs:1500});
  assert.equal(r.ok,true);assert.equal(cancelled,1);assert.equal(r.cancelCount,1);
});
test('unknown modal is never clicked or bypassed',async()=>{
  const clock=fakeClock();let cancelled=0;
  await assert.rejects(runOverlayGate({inspect:choose([unknown()]),cancelRestore:async()=>{cancelled++},...clock,pause:clock.pause,timeoutMs:650}),{code:'TITLE_OVERLAY_BLOCKED'});
  assert.equal(cancelled,0);
});
test('no dialog but persistent .se-popup-dim is safe-stopped',async()=>{
  const clock=fakeClock();let cancelled=0;
  await assert.rejects(runOverlayGate({inspect:choose([hidden()]),cancelRestore:async()=>{cancelled++},...clock,pause:clock.pause,timeoutMs:650}),{code:'TITLE_OVERLAY_BLOCKED'});
  assert.equal(cancelled,0);
});
test('restore dialog without unambiguous cancel is never clicked',()=>{
  const x=known();x.dialogs[0].buttons=['확인','닫기'];assert.equal(classifyTitleOverlay(x).status,'BLOCKED_UNKNOWN');
});
