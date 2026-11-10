// Local rendering fixture: real catalog components/CSS, no authentication or API mocks.
import { build } from 'vite';
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const out = 'artifacts/spomove-scroll-20261110';
await fs.mkdir(out, { recursive: true });
await fs.writeFile(`${out}/fixture.jsx`, `
import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {TrainingDashboard} from '../../app/admin/spomove/training/TrainingDashboard';
import {AppSidebarProvider} from '../../app/providers/AppSidebarProvider';
function Fixture(){
 const [filter,setFilter]=useState('ALL');
 return <AppSidebarProvider><TrainingDashboard tab="training" filter={filter} onFilterChange={setFilter} onTabChange={()=>{}} onPick={id=>window.qaPicks.push(id)} appContent={<div>App management</div>}/></AppSidebarProvider>;
}
window.qaPicks=[];
createRoot(document.getElementById('root')).render(<Fixture/>);
`);
await build({configFile:false,logLevel:'error',
 plugins:process.argv.includes('--final')?[]:[{name:'original-catalog-background',enforce:'pre',load(id){
  const path='app/admin/spomove/training/TrainingDashboard.module.css';
  if(id.replaceAll('\\','/').endsWith('/'+path))return execFileSync('git',['show',`HEAD:${path}`],{encoding:'utf8'});
 }}],
 define:{'process.env.NODE_ENV':'"production"'},
 build:{outDir:out,emptyOutDir:false,minify:true,cssMinify:false,lib:{entry:`${out}/fixture.jsx`,name:'ScrollQA',formats:['iife'],fileName:()=> 'fixture.js',cssFileName:'fixture'}},
 resolve:{alias:{'@':process.cwd()}},
});
const browser=await chromium.launch({headless:true,channel:'chrome'});
const report={scope:'Actual catalog components and CSS in isolated local browser fixture; not authenticated route E2E.',browser:browser.version(),cpuThrottle:4,cases:[],errors:[]};
const variants=process.argv.includes('--final') ? {current:''} : {
 baseline:'',
 noFixed: '#root > div:first-child{background-attachment:scroll!important}',
 noBlur: '.glass-card{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}',
 noFixedOrBlur:'#root > div:first-child{background-attachment:scroll!important}.glass-card{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}',
};
try{
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:900}});
  await context.route('**/*',async route=>{
   const url=new URL(route.request().url());
   const path=url.pathname;
   if(url.hostname!=='127.0.0.1')return route.abort();
   if(path==='/__scroll_qa')return route.fulfill({contentType:'text/html',body:'<!doctype html><meta charset="utf-8"><style>body{margin:0}*{box-sizing:border-box}:root{--font-sans:Arial,sans-serif;--spm-font-body:Arial,sans-serif}button{font:inherit}</style><link rel="stylesheet" href="/__scroll_qa.css"><div id="root"></div><script src="/__scroll_qa.js"></script>'});
   if(path==='/__scroll_qa.js'||path==='/__scroll_qa.css')return route.fulfill({contentType:path.endsWith('.js')?'application/javascript':'text/css',body:await fs.readFile(`${out}/fixture${path.endsWith('.js')?'.js':'.css'}`)});
   if(path.startsWith('/spokedu/')||path.startsWith('/spomove-dashboard/')){
    try{return await route.fulfill({body:await fs.readFile(`public${path}`)});}catch{return route.abort();}
   }
   return route.abort();
  });
  const page=await context.newPage();
  page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto('http://127.0.0.1:3000/__scroll_qa');
  await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(im=>im.decode().catch(()=>{})));});
  await page.waitForTimeout(800);
  const cdp=await context.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
  for(let round=0;round<3;round++)for(const [variant,css]of Object.entries(variants)){
   await page.evaluate(()=>{document.getElementById('qa-override')?.remove();window.scrollTo(0,0)});
   if(css)await page.evaluate(css=>{const s=document.createElement('style');s.id='qa-override';s.textContent=css;document.head.append(s)},css);
   await page.waitForTimeout(250);
   const events=[];
   cdp.on('Tracing.dataCollected',collect);
   function collect(data){events.push(...data.value)}
   await cdp.send('Tracing.start',{categories:'devtools.timeline,disabled-by-default-devtools.timeline,cc',transferMode:'ReportEvents'});
   await page.evaluate(()=>{window.qaFrames=[];window.qaRunning=true;let previous=performance.now();function frame(t){window.qaFrames.push(t-previous);previous=t;if(window.qaRunning)requestAnimationFrame(frame)}requestAnimationFrame(frame)});
   for(const yDistance of [-1800,1800])await cdp.send('Input.synthesizeScrollGesture',{x:Math.round(width*.65),y:450,yDistance,speed:1500,gestureSourceType:'mouse'});
   const metrics=await page.evaluate(()=>{window.qaRunning=false;const times=window.qaFrames.slice(1).sort((a,b)=>a-b);return{frames:times.length,p95:times[Math.floor(times.length*.95)],over33:times.filter(x=>x>33.4).length,max:times.at(-1),scrollHeight:document.documentElement.scrollHeight,attachment:getComputedStyle(document.querySelector('#root > div')).backgroundAttachment,blurCards:[...document.querySelectorAll('.glass-card')].filter(x=>getComputedStyle(x).backdropFilter!=='none').length}});
   const done=new Promise(resolve=>cdp.once('Tracing.tracingComplete',resolve));
   await cdp.send('Tracing.end');await done;cdp.off('Tracing.dataCollected',collect);
   const durations={};for(const name of ['Paint','RasterTask','Layout','UpdateLayoutTree','PrePaint']){const matches=events.filter(x=>x.name===name&&x.ph==='X');durations[name]={count:matches.length,ms:+(matches.reduce((sum,x)=>sum+(x.dur||0),0)/1000).toFixed(2)}}
   report.cases.push({width,round,variant,...metrics,durations});
   console.log(JSON.stringify(report.cases.at(-1)));
  }
  await page.evaluate(()=>{document.getElementById('qa-override')?.remove();window.scrollTo(0,0)});
  await page.screenshot({path:`${out}/${process.argv.includes('--final')?'after':'before'}-${width}.png`,fullPage:true,animations:'disabled'});
  if(process.argv.includes('--final')){
   const before=await page.addStyleTag({content:'#root > div:first-child{background-attachment:fixed!important}'});
   await page.screenshot({path:`${out}/before-${width}.png`,fullPage:true,animations:'disabled'});
   await before.evaluate(el=>el.remove());
  }
  const buttons=page.locator('[data-filter="response"]:visible');await buttons.click();
  if(await page.locator('[data-axis="attention"]:visible').count())throw new Error('Filter failed');
  await page.locator('[data-filter="ALL"]:visible').click();
  await page.locator('[data-program="basic"] button:visible').first().click();
  if(!await page.evaluate(()=>window.qaPicks.includes('basic')))throw new Error('Course callback failed');
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw new Error('Horizontal overflow');
  await context.close();
 }
}finally{await browser.close();await fs.writeFile(`${out}/${process.argv.includes('--final')?'after':'baseline'}-report.json`,JSON.stringify(report,null,2));}
if(report.errors.length)throw new Error(report.errors.join('\n'));
