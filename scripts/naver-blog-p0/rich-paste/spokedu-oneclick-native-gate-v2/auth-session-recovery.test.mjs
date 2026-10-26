import test from 'node:test';
import assert from 'node:assert/strict';
import { openEditorInNewTab } from './editor-entry-recovery.mjs';
const WRITE='https://blog.naver.com/PostWriteForm.naver?blogId=spokedu77';
const HOME='https://blog.naver.com/spokedu77';
const AUTH='https://nid.naver.com/nidlogin.login';
function mock({manual='success',alreadyAuthenticated=false}={}){
  let url='about:blank', navigations=0, ticks=0, login=false, clicks=0;
  const page={
    url:()=>url, mainFrame:()=>page, frames:()=>[],
    goto: async dest=>{
      navigations++;
      if(dest===WRITE){url=alreadyAuthenticated||login?WRITE:AUTH;}
      else url=dest;
    },
    evaluate:async()=>({editorReady:url===WRITE,hasCanvas:url===WRITE,frames:0}),
    waitForTimeout:async()=>{ticks++;if(manual==='success'&&ticks===1){login=true;url=HOME;}},
    locator:()=>({nth:()=>({click:async()=>{clicks++;}})})
  };
  return {page,context:{pages:()=>[page]}, stats:()=>({url,navigations,ticks,clicks})};
}
test('authenticated CDP session enters editor without login loop',async()=>{
 const m=mock({alreadyAuthenticated:true});
 const out=await openEditorInNewTab(m.page,m.context,{blogId:'spokedu77',directUrl:WRITE,allowManualAuthRecovery:true});
 assert.equal(out.diagnostics.at(-1).state,'EDITOR_READY');
 assert.deepEqual(m.stats(),{url:WRITE,navigations:1,ticks:0,clicks:0});
});
test('manual login in SAME browser tab recovers to editor exactly once',async()=>{
 const m=mock({manual:'success'});
 const out=await openEditorInNewTab(m.page,m.context,{blogId:'spokedu77',directUrl:WRITE,allowManualAuthRecovery:true});
 assert.equal(out.diagnostics.at(-1).state,'EDITOR_READY');
 assert.equal(m.stats().navigations,2);
 assert.equal(m.stats().clicks,0);
 assert(out.diagnostics.some(d=>d.phase==='manual_auth_left_login'));
});
test('auth failure times out without modifying existing tabs or repeated navigation',async()=>{
 const m=mock({manual:'never'});
 await assert.rejects(()=>openEditorInNewTab(m.page,m.context,{blogId:'spokedu77',directUrl:WRITE,allowManualAuthRecovery:true,authWaitMs:3}),e=>{
   assert.equal(e.code,'NAVER_AUTH_REQUIRED_IN_CDP_PROFILE');return true;
 });
 assert.equal(m.stats().navigations,1);
 assert.equal(m.stats().clicks,0);
});
test('manual login recovery disabled retains earlier explicit auth classification',async()=>{
 const m=mock({manual:'never'});
 await assert.rejects(()=>openEditorInNewTab(m.page,m.context,{blogId:'spokedu77',directUrl:WRITE}),e=>{
   assert.equal(e.code,'NAVER_AUTH_PAGE');return true;
 });
});
