// Local execution audit. No production images, authentication bypass or data writes.
import { build } from 'vite';
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import ts from 'typescript';

const out='artifacts/spomove-audio-countdown-20261110';
await fs.mkdir(out,{recursive:true});
const teacherSource=await fs.readFile('app/teacher/spomove/page.tsx','utf8');
const teacherAst=ts.createSourceFile('teacher.tsx',teacherSource,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const teacherCountdown=teacherAst.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='CountdownScreen');
assert.ok(teacherCountdown);
const teacherCountdownJs=ts.transpileModule(teacherCountdown.getText(teacherAst),{compilerOptions:{jsx:ts.JsxEmit.React,target:ts.ScriptTarget.ES2022}}).outputText;
const teacherCountCss=teacherSource.match(/\.spm-countdown-num\s*\{[^}]*\}/)?.[0]??'';
const teacherBackground=teacherSource.match(/const DEFAULT_GAME_BG = '([^']+)'/)?.[1]??'#08090c';
await fs.writeFile(`${out}/fixture.jsx`, `
import React,{useState,useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {EngineRouter} from '../../app/spokedu-master/spomove/session/EngineRouter';
import MemoryGameApp from '../../app/admin/spomove/training/_player/MemoryGameApp';
import {TRAINING_ACTIVITIES,resolveTrainingSelection} from '../../app/admin/spomove/training/_player/lib/trainingActivity';
import {OFFICIAL_SPOMOVE_LIBRARY} from '../../app/spokedu-master/spomove/officialSpomovePresets';
import {SPOMOVE_PUBLIC_CATALOG_FLAT_ORDER} from '../../app/spokedu-master/spomove/spomovePublicCatalogOrder';
import {DIVE_THEME_IDS} from '../../app/lib/spomove/diveThemes';
import {MODES} from '../../app/admin/spomove/training/_player/constants';
import {resetSpomoveRuntimeClock,setSpomoveRuntimePaused} from '../../app/admin/spomove/training/_player/lib/runtimeClock';
import {FlowAudio} from '../../app/admin/spomove/training/_player/flow-lab/engine/FlowAudio';
import {primeFlowAudioContext} from '../../app/admin/spomove/training/_player/flow-lab/engine/flowAudioActivation';
import {FlowEngine} from '../../app/admin/spomove/training/_player/flow-lab/engine/FlowEngine';
import {DiveBgmController} from '../../app/admin/spomove/training/_player/lib/diveBgmController';
import {BgmPlayer} from '../../app/lib/admin/audio/bgmPlayer';
import {SPOMOVE_BGM_VOLUME,SPOMOVE_BGM_LOAD_TIMEOUT_MS} from '../../app/lib/spomove/audioSettings';
let root=createRoot(document.getElementById('root'));
const DEFAULT_GAME_BG=${JSON.stringify(teacherBackground)};
const ScreenShell=({children})=><div style={{position:'fixed',inset:0,display:'grid',placeItems:'center'}}><style>{${JSON.stringify(teacherCountCss)}}</style>{children}</div>;
${teacherCountdownJs}
const canonical=Object.entries(TRAINING_ACTIVITIES).flatMap(([activityId,definition])=>definition.routes.flatMap(route=>route.levels.map(level=>({key:'canonical:'+activityId+':'+route.mode+':'+level,activityId,engine:{mode:route.mode,level},surface:'master',runtime:definition.runtime}))));
const publicCases=SPOMOVE_PUBLIC_CATALOG_FLAT_ORDER.map(id=>{const p=OFFICIAL_SPOMOVE_LIBRARY.find(p=>p.id===id);if(!p)throw new Error('Unresolved public preset '+id);return {key:'public:'+id,activityId:p.activityId,engine:p.engine,surface:'master',runtime:resolveTrainingSelection(p.engine.mode,p.engine.level,{activityId:p.activityId}).runtime};});
const admin=Object.entries(TRAINING_ACTIVITIES).map(([activityId,d])=>({key:'admin:'+activityId,activityId,engine:{mode:d.routes[0].mode,level:d.routes[0].levels[0]},surface:'admin',runtime:d.runtime}));
const teacher=admin.map(c=>({...c,key:c.key.replace('admin:','teacher-preset:'),surface:'teacher'}));
const themes=DIVE_THEME_IDS.map(theme=>({key:'dive-theme:'+theme,activityId:'action-move',engine:{mode:'flow',level:1,flowFeatures:['punch','duck'],flowDuration:20,flowIncludeBonus:true,diveEnvironmentTheme:theme},surface:'master',runtime:'flow'}));
window.auditCases=[...canonical,...publicCases,...admin,...themes,...teacher,...themes.filter(c=>['theme2','theme3'].includes(c.engine.diveEnvironmentTheme)).map(c=>({...c,key:'teacher-preset:'+c.key,surface:'teacher'})),{key:'teacher-direct',surface:'teacher-direct',engine:{},activityId:null,runtime:'direct'}].map(c=>({...c,availability:c.surface==='teacher-direct'||c.engine.mode in MODES?'exposed':'registry-only'}));
window.renderAuditCase=index=>{
 flushSync(()=>root.render(null));resetSpomoveRuntimeClock();window.auditCompletion=null;
 const c=window.auditCases[index];const e=c.engine;
 const common={runtimeState:'running',...e,activityId:c.activityId,rounds:10,speedSec:2,effectsEnabled:false,bgmEnabled:false,selectedBgmPath:'',variantColorTheme:'color',onExit:()=>{},onComplete:r=>window.auditCompletion=r};
 flushSync(()=>root.render(c.surface==='teacher-direct'?<CountdownScreen onDone={()=>window.auditCompletion={done:true}}/>:['admin','teacher'].includes(c.surface)?<MemoryGameApp key={c.key} initialMode={e.mode} initialLevel={e.level} adminMemorySettings={c.surface==='admin'} embed disableBgm flowBgmEnabled={false} flowSfxEnabled={false} autoLaunch={{...e,activityId:c.activityId,timeMode:'reps',targetReps:10,speed:2,warmup:3,audioMode:'off',variantColorTheme:'color'}} onExit={()=>{}} />:<EngineRouter key={c.key} {...common}/>));
};
window.checkAudio=async()=>{
 const checks=[];const check=(ok,name)=>{if(!ok)throw new Error(name);checks.push(name);};
 const tick=()=>new Promise(r=>queueMicrotask(r));
 const fake=()=>({starts:0,stops:0,init:async()=>{},loadBgm:async()=>true,resume:async()=>{},isSuspended:()=>false,isPlaybackBlocked:()=>false,startMusic(){this.starts++},stopMusic(){this.stops++},dispose(){this.disposed=true}});
 const a=fake();const c=new DiveBgmController(()=>{},a);c.start();await c.prepare('late.mp3');await tick();check(a.starts===1,'Unity starts when its path arrives after countdown');c.stop();await c.prepare('other.mp3');check(a.starts===1,'Unity does not start after stop');c.dispose();
 const b=fake();let finishLoad;b.loadBgm=()=>new Promise(r=>finishLoad=r);const d=new DiveBgmController(()=>{},b);d.start();const loading=d.prepare('pending.mp3');await tick();await tick();d.dispose();finishLoad(true);await loading;check(b.starts===0,'Unity ignores a load finishing after disposal');
 for(const phase of ['countdown','stage-intro','speed-intro','playing','complete']){const audio=fake();const engine=Object.create(FlowEngine.prototype);Object.assign(engine,{audio,cb:{},sessionStarted:true,disposed:false,phase});await engine.loadBgmLate('late.mp3');check(audio.starts===(phase==='complete'?0:1),'Flow late music phase '+phase);}
 const pendingAudio=fake();let resolvePending;pendingAudio.loadBgm=()=>new Promise(r=>resolvePending=r);const stopped=Object.create(FlowEngine.prototype);Object.assign(stopped,{audio:pendingAudio,cb:{},sessionStarted:true,disposed:false,phase:'stage-intro'});const promise=stopped.loadBgmLate('stop.mp3');stopped.stop();resolvePending(true);await promise;check(pendingAudio.starts===0,'Flow ignores late music after stop');
 const originalAudio=window.Audio;class FakeAudio extends EventTarget{volume=1;currentTime=0;loop=false;load(){}pause(){}removeAttribute(){}play(){return Promise.resolve();}}window.Audio=FakeAudio;const html=new BgmPlayer();html.init('fixture.mp3');check(html.audio.volume===SPOMOVE_BGM_VOLUME,'HTMLAudio shared BGM volume');html.stop();window.Audio=originalAudio;
 const originalContext=window.AudioContext;const originalFetch=window.fetch;const gains=[];
 class FakeContext{state='running';sampleRate=10;currentTime=0;destination={};createGain(){const g={gain:{value:0},connect(){}};gains.push(g);return g;}createBuffer(){return {getChannelData:()=>new Float32Array(10)}}resume(){this.state='running';return Promise.resolve()}suspend(){this.state='suspended';return Promise.resolve()}close(){this.state='closed';return Promise.resolve()}decodeAudioData(){return Promise.resolve({})}}
 window.AudioContext=FakeContext;const web=new FlowAudio();await web.init();check(Math.abs(gains[0].gain.value*gains[1].gain.value-SPOMOVE_BGM_VOLUME)<1e-9,'Flow effective BGM equals HTMLAudio');check(Math.abs(gains[0].gain.value*gains[2].gain.value-.54*.55)<1e-9,'Flow SFX level preserved');
 setSpomoveRuntimePaused(true);await web.resume();check(web.isSuspended()&&!web.isPlaybackBlocked(),'Late BGM loading cannot override session pause');setSpomoveRuntimePaused(false);
 window.fetch=(_url,{signal})=>new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(new DOMException('aborted','AbortError'))));
 window.auditTimeoutPending=web.loadBgm('timeout.mp3').then(ok=>{window.auditTimeoutResult=ok;web.dispose();window.AudioContext=originalContext;window.fetch=originalFetch;});
 window.audioChecks=checks;window.audioTimeoutMs=SPOMOVE_BGM_LOAD_TIMEOUT_MS;return checks;
};
window.checkNativeAudio=async()=>{
 await primeFlowAudioContext();const c=new DiveBgmController();c.start();await c.prepare('audio/spomove/bgm/Ready_Set_Leap.mp3');
 const a=c.audio;window.nativeAudioResult={playing:c.playing,contextState:a.ctx?.state,effectiveGain:a.masterGain?.gain.value*a.bgmGain?.gain.value,playbackRate:a.bgmSource?.playbackRate.value,duration:a.bgmSource?.buffer.duration};c.dispose();
};
`);
await build({configFile:false,define:{'process.env.NODE_ENV':JSON.stringify('development'),'process.env.NEXT_PUBLIC_SUPABASE_URL':JSON.stringify('http://127.0.0.1:3000/_audit_supabase'),'process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY':JSON.stringify('local-fixture-only')},resolve:{alias:{'@':process.cwd()}},build:{outDir:out,emptyOutDir:false,minify:false,lib:{entry:`${out}/fixture.jsx`,name:'SpomoveAudit',formats:['iife'],fileName:()=> 'fixture.js',cssFileName:'fixture'}}});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--mute-audio','--enable-unsafe-swiftshader']});
const report={source:'Local real React/runtime countdowns. Supabase reads stubbed; Unity bridge handshake simulated, Unity native rendering not assessed.',audioChecks:[],cases:[],errors:[]};
try {
 const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 const publicRoot=path.resolve('public');
 await context.route('**/*',async route=>{
  const url=new URL(route.request().url());const p=url.pathname;
  if(p==='/__spomove_audit')return route.fulfill({contentType:'text/html',body:'<html><meta charset="utf-8"><script>window.process={env:{NODE_ENV:"development"},browser:true}</script><style>body{margin:0}</style><link rel="stylesheet" href="/__audit.css"><div id="root"></div><script src="/__audit.js"></script></html>'});
  if(p==='/__audit.js'||p==='/__audit.css')return route.fulfill({contentType:p.endsWith('.js')?'application/javascript':'text/css',body:await fs.readFile(`${out}/fixture${p.endsWith('.js')?'.js':'.css'}`)});
  if(p.includes('_audit_supabase/')&&p.endsWith('/Ready_Set_Leap.mp3')){
    const r=await fetch('https://mwgvserdyflsqyhcqecp.supabase.co/storage/v1/object/public/iiwarmup-files/audio/spomove/bgm/Ready_Set_Leap.mp3');
    return route.fulfill({status:r.status,contentType:'audio/mpeg',body:Buffer.from(await r.arrayBuffer()),headers:{'access-control-allow-origin':'*'}});
  }
  if(p.includes('_audit_supabase/')&&p.endsWith('.svg'))return route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="gold"/></svg>',headers:{'access-control-allow-origin':'*'}});
  if(p.includes('_audit_supabase/')){
    let data=[];
    if(p.includes('think_asset_packs')){
      const id=url.searchParams.get('id')??'';
      const row=id=>({id,assets_json:{paths:Array.from({length:8},(_,i)=>`_fixtures/${id}/${i}.svg`),bgmList:[]}});
      data=id.startsWith('in.')?id.slice(4,-1).split(',').map(x=>row(x.replaceAll('"',''))):row(id.replace('eq.',''));
    }
    return route.fulfill({contentType:'application/json',body:JSON.stringify(data),headers:{'access-control-allow-origin':'*'}});
  }
  if(p.includes('/unity/')&&p.endsWith('.html'))return route.fulfill({contentType:'text/html',body:'<html><script>addEventListener("message",e=>{if(e.data.type==="SPOMOVE_SESSION_CONFIG")parent.postMessage({type:"THEME_READY"},location.origin)});setTimeout(()=>parent.postMessage({type:"SPOMOVE_UNITY_READY"},location.origin),0)</script></html>'});
  if(url.hostname==='127.0.0.1'){const file=path.resolve(publicRoot,'.'+decodeURIComponent(p));if(file.startsWith(publicRoot+path.sep)){try{return route.fulfill({body:await fs.readFile(file)});}catch{}}}
  return route.abort();
 });
 const page=await context.newPage();page.on('pageerror',error=>report.errors.push(error.message));
 await page.clock.install();await page.clock.pauseAt(new Date(Date.now()+50));await page.goto('http://127.0.0.1:3000/__spomove_audit');await page.waitForFunction(()=>Boolean(window.auditCases),null,{polling:50});
 report.audioChecks=await page.evaluate(()=>window.checkAudio());await page.clock.fastForward(12001);await page.waitForFunction(()=>window.auditTimeoutResult!==undefined);assert.equal(await page.evaluate(()=>window.auditTimeoutResult),false);report.audioChecks.push('Audio request aborts after bounded timeout');
 const cases=await page.evaluate(()=>window.auditCases);
 const surface=process.env.SPOMOVE_AUDIT_SURFACE;
 if(surface==='audio'){
   await page.evaluate(()=>{const b=document.createElement('button');b.id='native-audio';b.textContent='Native audio';b.onclick=()=>void window.checkNativeAudio();document.body.append(b);});
   await page.click('#native-audio');await page.waitForFunction(()=>Boolean(window.nativeAudioResult),null,{polling:50});report.nativeAudio=await page.evaluate(()=>window.nativeAudioResult);
   assert.equal(report.nativeAudio.playing,true);assert.equal(report.nativeAudio.contextState,'running');assert.equal(report.nativeAudio.playbackRate,1);assert.ok(Math.abs(report.nativeAudio.effectiveGain-.65)<1e-9);
 }
 const indices=cases.map((c,index)=>({c,index})).filter(({c})=>!surface||c.surface.startsWith(surface)).map(({index})=>index);
 for(const index of indices){
  const c=cases[index];const errorStart=report.errors.length;
  await page.evaluate(i=>window.renderAuditCase(i),index);
  const countdown=page.locator('[data-spomove-countdown]:visible');
  let available=false;
  for(let attempt=0;attempt<100;attempt++) {if(await countdown.count()){available=true;break;}await page.clock.fastForward(50);await page.waitForTimeout(10);}
  let style=null;if(available){style=await countdown.first().evaluate(node=>({color:getComputedStyle(node).color,fontSize:getComputedStyle(node).fontSize}));
   if(['teacher-preset:direction-cue','teacher-preset:action-move','teacher-preset:dive-theme:theme2','teacher-direct'].includes(c.key)){
    for(const width of [1440,390]){await page.setViewportSize({width,height:1000});await page.screenshot({path:out+'/'+c.key.replaceAll(':','-')+'-'+width+'.png',animations:'disabled'});}await page.setViewportSize({width:1440,height:1000});
   }
  }
  const digits=[];const overlays=[];if(available){for(let step=0;step<3;step++){const values=await countdown.evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-spomove-countdown')));overlays.push(values.length);digits.push(values[0]??null);await page.clock.fastForward(1000);await page.evaluate(()=>new Promise(r=>queueMicrotask(r)));}}
  const afterThree=await countdown.evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-spomove-countdown')));
  const result={...c,style,digits,overlays,afterThree,pass:JSON.stringify(digits)===JSON.stringify(['3','2','1'])&&overlays.every(n=>n===1)&&afterThree.length===0,errors:report.errors.slice(errorStart)};report.cases.push(result);
  if(!result.pass){result.screen=(await page.locator('body').innerText()).slice(0,350);await page.screenshot({path:`${out}/failure-${index}.png`});}
  if(index%20===0)console.log('COUNTDOWN AUDIT',index+1,'/',cases.length,result.key,result.pass);
 }
 console.log(JSON.stringify({cases:report.cases.length,passed:report.cases.filter(c=>c.pass).length,failed:report.cases.filter(c=>!c.pass).map(c=>({key:c.key,digits:c.digits,screen:c.screen})),audioChecks:report.audioChecks,errors:report.errors.slice(0,12)}));
} finally {const suffix=process.env.SPOMOVE_AUDIT_SURFACE?'-'+process.env.SPOMOVE_AUDIT_SURFACE:'';await fs.writeFile(`${out}/report${suffix}.json`,JSON.stringify(report,null,2));await browser.close();}
