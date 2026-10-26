process.env.NAVER_ENTRY_HOME_MAX_MS='40';
import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyEditorEntry, openEditorInNewTab } from './editor-entry-recovery.mjs';

const WRITE='https://blog.naver.com/PostWriteForm.naver?blogId=spokedu77';
const HOME='https://blog.naver.com/spokedu77';

test('blog homepage is NOT equivalent to authentication failure',()=>{
  assert.equal(classifyEditorEntry({url:HOME}), 'BLOG_HOME');
  assert.equal(classifyEditorEntry({url:'https://nid.naver.com/nidlogin.login'}),'AUTH_PAGE');
  assert.equal(classifyEditorEntry({url:WRITE,editorReady:true}),'EDITOR_READY');
  assert.equal(classifyEditorEntry({url:WRITE}),'EDITOR_LOADING');
  assert.equal(classifyEditorEntry({url:HOME,editorEmbedded:true}),'EDITOR_NOT_TOP_LEVEL');
});

function setup({direct=WRITE,native=false,redirect=false,go=false,auth=false,iframe=false}={}){
  let url='about:blank', closed=0, clickCount=0;
  const routes={
    [WRITE]:auth?'https://nid.naver.com/nidlogin.login':direct,
    ['https://blog.naver.com/spokedu77?Redirect=Write']:redirect?WRITE:HOME,
    ['https://blog.naver.com/GoBlogWrite.naver?blogId=spokedu77']:go?WRITE:HOME,
  };
  const page={
    url:()=>url,
    goto: async dest=>{url=routes[dest]||dest;},
    evaluate: async fn=>{
      if(fn.toString().includes('const els=['))return native && url===HOME ?
        [{index:0,label:'글쓰기',href:'javascript:goWrite()',visible:true,suitable:true}]:[];
      return {editorReady:url===WRITE,hasCanvas:url===WRITE,frames:0};
    },
    frames:()=>iframe?[{url:()=>WRITE,evaluate:async()=>true}]:[],
    mainFrame:()=>page,
    waitForTimeout:async()=>{},
    locator:()=>({nth:()=>({click:async()=>{clickCount++;url=WRITE;}})}),
    close:async()=>{closed++},
  };
  const context={pages:()=>[page]};
  return {page,context,stats:()=>({closed,clickCount,url})};
}

test('existing proven direct editor entry remains unchanged',async()=>{
 const {page,context,stats}=setup();
 const out=await openEditorInNewTab(page,context,{blogId:'spokedu77',directUrl:WRITE});
 assert.equal(out.page,page); assert.equal(out.diagnostics.length,1);
 assert.equal(out.diagnostics[0].state,'EDITOR_READY');assert.equal(stats().closed,0);
});

test('home redirect recovers through blog native writing action without closing tabs',async()=>{
 const {page,context,stats}=setup({direct:HOME,native:true});
 const out=await openEditorInNewTab(page,context,{blogId:'spokedu77',directUrl:WRITE});
 assert.equal(out.diagnostics.at(-1).state,'EDITOR_READY');
 assert.equal(stats().clickCount,1);assert.equal(stats().closed,0);
});

test('homepage cannot be treated as editor just because a speculative redirect route would work',async()=>{
 const {page,context}=setup({direct:HOME,redirect:true,go:true});
 await assert.rejects(()=>openEditorInNewTab(page,context,{blogId:'spokedu77',directUrl:WRITE}),err=>{
  assert.equal(err.code,'NAVER_EDITOR_ENTRY_UNRESOLVED');
  assert.equal(err.entryDiagnostics.at(-1).phase,'native_write_discovery');return true;
 });
});

test('remaining on homepage is unresolved entry, NOT assumed login expiry',async()=>{
 const {page,context,stats}=setup({direct:HOME});
 await assert.rejects(()=>openEditorInNewTab(page,context,{blogId:'spokedu77',directUrl:WRITE}),err=>{
  assert.equal(err.code,'NAVER_EDITOR_ENTRY_UNRESOLVED');
  assert.equal(err.entryDiagnostics[0].state,'BLOG_HOME');return true;
 });
 assert.equal(stats().closed,0);
});

test('actual nid.naver.com login redirects are classified explicitly',async()=>{
 const {page,context,stats}=setup({auth:true});
 await assert.rejects(()=>openEditorInNewTab(page,context,{blogId:'spokedu77',directUrl:WRITE}),err=>{
  assert.equal(err.code,'NAVER_AUTH_PAGE');return true;
 });
 assert.equal(stats().closed,0);
});

test('no attempt to interact with iframe-only editor from top-level selectors',async()=>{
 const {page,context}=setup({direct:HOME,iframe:true});
 await assert.rejects(()=>openEditorInNewTab(page,context,{blogId:'spokedu77',directUrl:WRITE}),err=>{
  assert.equal(err.code,'NAVER_EDITOR_FRAME_CHANGED');return true;
 });
});
