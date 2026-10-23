import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {titlePointerLocations,titleBlank,enterTitleWithRecovery} from './title-input.mjs';

test('pointer positions are deterministic and within visible rectangle',()=>{
  const points=titlePointerLocations({x:20,y:40,width:300,height:60});
  assert.equal(points.length,2);
  assert.ok(points.every(p=>p.x>=20&&p.x<=320&&p.y>=40&&p.y<=100));
});
test('pointer locations refuse invalid title boxes',()=>{
  assert.deepEqual(titlePointerLocations(null),[]);
  assert.deepEqual(titlePointerLocations({x:0,y:0,width:0,height:30}),[]);
});
test('only empty placeholder title can be modified',()=>{
  assert.equal(titleBlank('제목'),true);
  assert.equal(titleBlank('  '),true);
  assert.equal(titleBlank('PAPS 글'),false);
});
function fakePage({alwaysFail=false,dirty=false,partial=false}={}){
  const state={title:'제목',clicks:[],body:[],focus:'DIV',typed:0};
  let focused=false;
  const wrapper={
    async click(args){state.clicks.push(args);
      if(!args.force||alwaysFail)throw new Error('locator.click: Timeout 1500ms exceeded');
      focused=true;state.focus='IFRAME';
    }
  };
  const title={
    async innerText(){return state.title;},
    async click(args){state.clicks.push(args);if(alwaysFail)throw new Error('timeout');focused=true;state.focus='IFRAME';}
  };
  const page={
    locator:sel=>({first:()=>sel==='.se-title-text'?wrapper:title}),
    keyboard:{
      async insertText(text){state.typed++;if(partial)state.title=text.slice(0,8);else if(dirty)state.body.push(text);else state.title=text;},
      async press(){state.typed++;if(dirty)state.body.push('oops');else state.title='PAPS 제목';}
    },
    mouse:{async click(){if(alwaysFail)throw Error('mouse failure');focused=true;state.focus='IFRAME';}},
    async waitForTimeout(){},
    async evaluate(fn){
      const source=fn.toString();
      if(source.includes('scrollIntoView'))return {targetFound:true,rect:{x:30,y:40,width:400,height:72},hits:[{inTitle:true}]};
      if(source.includes('document.activeElement'))return {tag:state.focus,isEditable:false,inTitle:false,className:''};
      return undefined;
    }
  };
  return {page,state};
}
function abort(code,detail){let error=new Error(detail||code);error.code=code;throw error;}
test('natural click timeout falls back to force click and enters title exactly once',async()=>{
  const {page,state}=fakePage();
  const r=await enterTitleWithRecovery(page,'PAPS 제목',{snapshot:async()=>({body:state.body}),abort});
  assert.equal(state.title,'PAPS 제목');
  assert.equal(state.typed,1);
  assert.deepEqual(r.map(x=>x.method),['wrapper-natural','wrapper-force']);
  assert.equal(r.at(-1).after,'PAPS 제목');
});
test('fails closed if attempted title input changes body',async()=>{
  const {page,state}=fakePage({dirty:true});
  await assert.rejects(enterTitleWithRecovery(page,'PAPS 제목',{snapshot:async()=>({body:state.body}),abort}),{code:'TITLE_WRITTEN_IN_BODY'});
});
test('fails closed on partial title input',async()=>{
  const {page,state}=fakePage({partial:true});
  await assert.rejects(enterTitleWithRecovery(page,'목원초 PAPS 수업 블로그 제목',{snapshot:async()=>({body:state.body}),abort}),{code:'TITLE_PARTIAL'});
});
test('no input if focus cannot be obtained',async()=>{
  const {page,state}=fakePage({alwaysFail:true});
  await assert.rejects(enterTitleWithRecovery(page,'PAPS 제목',{snapshot:async()=>({body:state.body}),abort}),{code:'TITLE_INPUT_FAILED'});
  assert.equal(state.typed,0);
});
test('title-only probe code branches before first photo upload',async()=>{
  const code=await readFile(fileURLToPath(new URL('./run.mjs',import.meta.url)),'utf8');
  const probe=code.indexOf("if(MODE==='probe-title')");
  const photo=code.indexOf("step('PHOTO_1_UPLOAD');");
  assert.ok(probe>0 && photo>probe);
  assert.match(code,/report\.outcome='PAPS_TITLE_PROBE_PASS'/);
  assert.match(code,/if\(MODE==='probe-title'\)[\s\S]*?}else\{\s*step\('PHOTO_1_UPLOAD'\)/);
});

test('unknown overlay gate prevents every title click, paste, and force fallback',async()=>{
  const {page,state}=fakePage();let probes=0;
  await assert.rejects(enterTitleWithRecovery(page,'PAPS 제목',{
    snapshot:async()=>({body:state.body}),abort,
    beforeTitleClick:async()=>{probes++;const e=new Error('Blocked popup');e.code='TITLE_OVERLAY_BLOCKED';throw e;}
  }),{code:'TITLE_OVERLAY_BLOCKED'});
  assert.equal(probes,1);assert.equal(state.clicks.length,0);assert.equal(state.typed,0);
});
test('overlay gate succeeds before each title click retry',async()=>{
  const {page,state}=fakePage();const checks=[];
  const r=await enterTitleWithRecovery(page,'PAPS 제목',{snapshot:async()=>({body:state.body}),abort,
    beforeTitleClick:async(label)=>{checks.push(label)}});
  assert.deepEqual(checks,['wrapper-natural','wrapper-force']);
  assert.equal(r.at(-1).after,'PAPS 제목');
});
