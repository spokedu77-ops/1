// Local-only real component/runtime fixtures. No auth changes or external writes.
import { build } from 'vite';
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';

const out = 'artifacts/direction-result-20261110';
const layoutOnly = process.argv.includes('--layout-only');
const reportPath = `${out}/${layoutOnly ? 'layout-report' : 'report'}.json`;
await fs.mkdir(out, { recursive: true });
const fonts = [...(await fs.readFile('app/globals.css', 'utf8')).matchAll(/@font-face\s*\{[^}]+\}/g)].map(match => match[0]).join('\n');
await fs.writeFile(`${out}/fixture.jsx`, `
import React from 'react';
import {createRoot} from 'react-dom/client';
import {TrainingResultScreen} from '../../app/admin/spomove/training/_player/components/TrainingResultScreen';
import MemoryGameApp from '../../app/admin/spomove/training/_player/MemoryGameApp';
import {EngineRouter} from '../../app/spokedu-master/spomove/session/EngineRouter';
import {RelativeCompassReactionTraining} from '../../app/admin/spomove/training/_player/components/RelativeCompassReactionTraining';
const kind = window.qaCase;
const base={mode:'basic',level:1,activityId:'direction-cue',timeMode:'reps',targetReps:5,duration:0,adminRounds:true};
const cardinal={directions:['up','down','left','right'],counts:{up:2,down:1,left:1,right:1},signals:5,presented:5};
const all={directions:['up','down','left','right','up-left','up-right','down-left','down-right'],counts:{up:1,down:1,left:1,right:0,'up-left':0,'up-right':1,'down-left':1,'down-right':0},signals:5,presented:5};
window.qaActions=[];
function Result({data, enhanced=true}){
 const cfg=kind==='color'?{...base,level:3,activityId:'full-screen-cue'}:kind==='voice'?{...base,mode:'stroop',level:1,activityId:'stroop-arrow',stroopArrowResponse:'voice'}:kind==='memory'?{...base,mode:'spatial',level:1,activityId:'sequence-memory'}:kind==='dive'?{...base,mode:'flow',level:1,activityId:'action-move'}:kind==='diagonal'?{...base,level:7,activityId:'relative-compass'}:base;
 return <TrainingResultScreen enhancedFeedback={enhanced} cfg={data?.cfg??cfg} elapsedMs={5000} stims={kind==='memory'||kind==='dive'?undefined:data?.stims??5} directionRecord={data?.directionRecord??(kind==='historical'||kind==='color'||kind==='memory'||kind==='dive'?undefined:kind==='diagonal'?all:cardinal)} colorCounts={kind==='color'?{red:2,yellow:0,green:0,blue:3}:null} completionReason={window.qaReason??'natural_complete'} diveActionMove={kind==='dive'?{completed:true,stageDurationSec:20,flowFeatures:['punch','kick','duck'],flowIncludeBonus:true}:undefined} volumeLabel={kind==='dive'?'100초 + 보너스 60초':undefined} levelLabel="" onBack={()=>window.qaActions.push('back')} onRetry={()=>window.qaActions.push('retry')} />;
}
function Live(){
 const [result,setResult]=React.useState(null);
 const [run,setRun]=React.useState(0);
 const complete=data=>{window.qaEngineResult=data;setResult(data)};
 if(result)return <><Result data={result}/><button id="qa-restart" style={{position:'fixed',zIndex:9999,bottom:0}} onClick={()=>{window.qaEngineResult=null;setResult(null);setRun(run+1)}}>QA restart</button></>;
 if(kind==='live-relative')return <RelativeCompassReactionTraining key={run} targetRounds={2} difficulty="hard" startSeconds={2} responseSeconds={2} effectsEnabled={false} onExit={()=>{}} onComplete={complete}/>;
 if(kind==='live-lab')return <EngineRouter key={run} runtimeState="running" mode="basic" level={1} activityId="direction-cue" rounds={5} speedSec={1} durationSec={0} effectsEnabled={false} bgmEnabled={false} selectedBgmPath="" onExit={()=>{}} onComplete={complete}/>;
 return <MemoryGameApp key={run} initialMode="basic" initialLevel={1} adminMemorySettings embed disableBgm autoLaunch={{activityId:'direction-cue',timeMode:'reps',targetReps:5,speed:1,warmup:3,audioMode:'off'}} onComplete={complete} onExit={()=>{}}/>;
}
const root=createRoot(document.getElementById('root'));
window.qaRerender=()=>root.render(kind.startsWith('live-')?<Live/>:<Result enhanced={kind!=='teacher'}/>);
window.qaRerender();
`);
const screenPath = 'app/admin/spomove/training/_player/components/TrainingResultScreen.tsx';
const cssPath = 'app/admin/spomove/training/_player/components/TrainingResultScreen.module.css';
for (const baseline of layoutOnly ? [false] : [false, true]) {
  const originals = new Map(baseline ? [screenPath, cssPath].map(path => [path, execFileSync('git', ['show', `HEAD:${path}`], { encoding: 'utf8' })]) : []);
  await build({ configFile:false, logLevel:'error', define:{'process.env.NODE_ENV':'"development"'},
    plugins: baseline ? [{name:'head-reference',enforce:'pre',load(id){const entry=[...originals].find(([path])=>id.replaceAll('\\','/').endsWith('/'+path));return entry?.[1]??null;}}] : [],
    resolve:{alias:{'@':process.cwd()}},
    build:{outDir:out,emptyOutDir:false,minify:false,lib:{entry:`${out}/fixture.jsx`,name:'DirectionQA',formats:['iife'],fileName:()=>baseline?'baseline.js':'fixture.js',cssFileName:baseline?'baseline':'fixture'}},
  });
}
const browser = await chromium.launch({headless:true,channel:'chrome'});
const report={source:'Local real-component and runtime fixtures, not authenticated route E2E',cases:[],live:[],errors:[]};
async function pageFor(kind,width,baseline=false,reason='natural_complete'){
 const page=await browser.newPage({viewport:{width,height:900}});
 page.on('pageerror',error=>report.errors.push(error.message));
 await page.addInitScript(({kind,reason})=>{window.process={env:{NODE_ENV:'development'}};window.qaCase=kind;window.qaReason=reason;Math.random=()=>0.43;},{kind,reason});
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.hostname!=='127.0.0.1')return route.abort();
  if(url.pathname==='/__direction_qa')return route.fulfill({contentType:'text/html',body:'<!doctype html><meta charset="utf-8"><style>body{margin:0}button{font:inherit}'+fonts+'</style><link rel="stylesheet" href="/__direction_qa.css"><div id="root"></div><script src="/__direction_qa.js"></script>'});
  if(url.pathname==='/__direction_qa.js'||url.pathname==='/__direction_qa.css')return route.fulfill({contentType:url.pathname.endsWith('.js')?'application/javascript':'text/css',body:await fs.readFile(out+'/'+(baseline?'baseline':'fixture')+(url.pathname.endsWith('.js')?'.js':'.css'))});
  return route.continue();
 });
 await page.goto('http://127.0.0.1:3000/__direction_qa');
 return page;
}
try {
 for(const width of [390,1024,1440])for(const kind of layoutOnly ? ['direction','diagonal','dive'] : ['direction','diagonal','voice','memory','dive','historical','color','teacher']){
  const page=await pageFor(kind,width);
  await page.locator('[data-result-layout]').waitFor();
  await page.evaluate(()=>document.fonts.ready);
  const text=await page.locator('main').innerText();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  if(!['color','teacher'].includes(kind)){
   assert.ok(text.includes('이번 활동에서 경험한 것'));
   assert.ok(!/개별 기록 없음|사용하지 않음|별도로 집계되지|정답을 고르지/.test(text));
   assert.equal(await page.locator('[data-education-profile] dt').count(),3);
   if(kind==='direction')assert.equal(await page.locator('ul[aria-label="방향별 실제 제시 횟수"] li').count(),4);
   if(kind==='diagonal')assert.equal(await page.locator('ul[aria-label="방향별 실제 제시 횟수"] li').count(),8);
   if(kind==='historical')assert.equal(await page.locator('ul[aria-label="방향별 실제 제시 횟수"]').count(),0);
   if(width>=768){const summary=await page.locator('dl').first().boundingBox();const heading=await page.locator('h1').boundingBox();assert.ok(summary.x>heading.x+heading.width-2,'summary should stay right of heading');}
  }
  const before=await page.locator('main').innerText();await page.evaluate(()=>window.qaRerender());assert.equal(await page.locator('main').innerText(),before);
  await page.getByRole('button',{name:'활동 목록으로',exact:true}).click();
  await page.getByRole('button',{name:'다시 도전하기',exact:true}).click();
  assert.deepEqual(await page.evaluate(()=>window.qaActions),['back','retry']);
  await page.locator('main').evaluate(element=>{element.scrollTop=0;});
  await page.mouse.move(0,0);
  await page.screenshot({path:`${out}/${kind}-${width}.png`});
  if(kind==='color'||kind==='teacher'){
   const baseline=await pageFor(kind,width,true);await baseline.locator('[data-result-layout]').waitFor();await baseline.evaluate(()=>document.fonts.ready);
   const currentPixels=await page.screenshot({animations:'disabled'});const baselinePixels=await baseline.screenshot({animations:'disabled'});
   await fs.writeFile(`${out}/${kind}-baseline-${width}.png`,baselinePixels);
   assert.ok(currentPixels.equals(baselinePixels),kind+' pixels changed');await baseline.close();
  }
  report.cases.push({kind,width,pass:true});await fs.writeFile(reportPath,JSON.stringify(report,null,2));console.log(kind,width,'PASS');await page.close();
 }
 for(const kind of layoutOnly ? [] : ['live-admin','live-lab','live-relative']){
  const page=await pageFor(kind,1440);
  await page.waitForFunction(()=>window.qaEngineResult,{},{timeout:60000});
  const result=await page.evaluate(()=>window.qaEngineResult);
  assert.ok(result.directionRecord,'missing direction record: '+kind);
  assert.equal(Object.values(result.directionRecord.counts).reduce((sum,count)=>sum+count,0),result.directionRecord.presented);
  assert.equal(result.stims,result.directionRecord.signals);
  report.live.push({kind,stims:result.stims,record:result.directionRecord});
  if(kind==='live-admin'){
   await page.locator('#qa-restart').click();await page.waitForTimeout(3400);
   await page.getByRole('button',{name:/STOP/}).first().click();
   await page.waitForFunction(()=>window.qaEngineResult);
   const retry=await page.evaluate(()=>window.qaEngineResult);assert.ok(retry.directionRecord.presented<5);report.live.push({kind:'retry-stop',record:retry.directionRecord,reason:retry.completionReason});
  }
  await page.close();
 }
 for(const reason of layoutOnly ? [] : ['stopped_early','cancelled','failed']){const page=await pageFor('direction',390,false,reason);await page.locator('[data-completion="'+reason+'"]').waitFor();await page.close();}
 assert.deepEqual(report.errors,[]);
}finally{await browser.close();await fs.writeFile(reportPath,JSON.stringify(report,null,2));}
console.log(JSON.stringify({cases:report.cases.length,live:report.live,errors:report.errors}));
