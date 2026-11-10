// Local component fixtures. No production requests, auth changes or external writes.
import { build } from 'vite';
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const out = 'artifacts/result-content-20261110';
const localFonts = [...(await fs.readFile('app/globals.css', 'utf8')).matchAll(/@font-face\s*\{[^}]+\}/g)].map(match => match[0]).join('\n');
await fs.mkdir(out, { recursive: true });
await fs.writeFile(`${out}/fixture.jsx`, `
import React from 'react';
import {createRoot} from 'react-dom/client';
import {TrainingResultScreen} from '../../app/admin/spomove/training/_player/components/TrainingResultScreen';
import {VisualReactionTraining} from '../../app/admin/spomove/training/_player/components/VisualReactionTraining';
import {TRAINING_ACTIVITIES} from '../../app/admin/spomove/training/_player/lib/trainingActivity';
import {buildTrainingResultPresentation} from '../../app/admin/spomove/training/_player/lib/trainingResultPresentation';
import {resolveResultEducationProfile,selectResultEducation} from '../../app/admin/spomove/training/_player/lib/trainingResultEducation';
import {laneCountToColorStimulusCounts} from '../../app/admin/spomove/training/_player/lib/trainingResultSummary';
const base={mode:'flanker',level:7,activityId:'visual-search',visualSearchStage:2,visualSearchTargetCount:1,speed:2,timeMode:'reps',duration:0,targetReps:20};
const cfg=window.qaCase==='direction'?{...base,mode:'basic',level:1,activityId:'direction-cue'}:window.qaCase==='bridge-missing'?{...base,mode:'spatial',level:8,activityId:'glass-bridge-memory'}:window.qaCase==='dive-missing'?{...base,mode:'flow',level:1,activityId:'action-move'}:window.qaCase==='bridge'?{...base,mode:'spatial',level:8,activityId:'glass-bridge-memory',targetReps:5}:window.qaCase==='dive'?{...base,mode:'flow',level:1,activityId:'action-move'}:window.qaCase==='sequence'?{...base,mode:'spatial',level:1,activityId:'sequence-memory'}:window.qaCase==='instant'?{...base,mode:'spatial',level:7,activityId:'instant-memory'}:window.qaCase==='arrow'?{...base,level:1,activityId:'flanker-arrow'}:base;
window.qaCoverage=window.qaBaseline?[]:Object.entries(TRAINING_ACTIVITIES).map(([activityId,definition])=>{
 const route=definition.routes[0];const input={cfg:{...base,mode:route.mode,level:route.levels[0],activityId},elapsedMs:0,colorCounts:null};
 const vm=buildTrainingResultPresentation(input);const data=resolveResultEducationProfile(input);
 if(!vm.feedback)throw new Error('Missing educational feedback: '+activityId);
 if(new Set(data.descriptions).size<4||new Set(data.tips).size<4||data.concepts.some(c=>new Set(c.descriptions).size<4))throw new Error('Missing copy variants: '+activityId);
 if(data.descriptions.some(text=>text.split(/(?<=[.!?])\\s+/).length>2))throw new Error('Activity description exceeds two sentences: '+activityId);
 return {activityId,profileId:vm.feedback.profileId,descriptions:data.descriptions.length,tips:data.tips.length,experienceVariants:data.concepts.map(c=>c.descriptions.length)};
});
window.qaModelChecks=()=>{
 const input={cfg:{...base,mode:'basic',level:1,activityId:'direction-cue',targetReps:5,adminRounds:true},elapsedMs:10000,colorCounts:null,stims:5};
 const vm=buildTrainingResultPresentation(input);
 if(vm.summary.find(x=>x.id==='presented')?.value!=='5/5회'||vm.summary.some(x=>x.id==='volume'))throw new Error('Duplicate cue volume');
 const search=buildTrainingResultPresentation({...input,cfg:base,stims:4});
 if(search.summary.find(x=>x.id==='tasks')?.value!=='4/20과제')throw new Error('Search task unit');
 const memory=buildTrainingResultPresentation({...input,cfg:{...base,mode:'spatial',level:1,activityId:'sequence-memory'},stims:undefined});
 if(memory.summary.some(x=>x.id==='presented'))throw new Error('Invented memory round progress');
 const instant=buildTrainingResultPresentation({...input,cfg:{...base,mode:'spatial',level:7,activityId:'instant-memory'},stims:4});
 if(instant.summary.find(x=>x.id==='presented')?.value!=='4/10라운드')throw new Error('Instant-memory round unit');
 const mismatch=buildTrainingResultPresentation({...input,cfg:{...input.cfg,adminRounds:false,timeMode:'time',duration:60}});
 if(mismatch.summary.find(x=>x.id==='presented')?.value!=='5회'||!mismatch.summary.some(x=>x.id==='volume'))throw new Error('Mixed progress units');
 const voice=selectResultEducation({...input,cfg:{...base,mode:'stroop',level:2,activityId:'stroop-word',stroopWordResponse:'voice'}},0);
 const move=selectResultEducation({...input,cfg:{...base,mode:'stroop',level:2,activityId:'stroop-word',stroopWordResponse:'movement'}},0);
 if(!voice.description.includes('말로')||!move.description.includes('이동'))throw new Error('Stroop response mismatch');
 const color=selectResultEducation({...input,cfg:{...input.cfg,spatialArrowColorMode:'color'}},0);
 if(color.profileId===selectResultEducation(input,0).profileId)throw new Error('Arrow rules merged');
 return true;
};
function BalloonLive() {
 const [stats,setStats]=React.useState(null);
 const started=React.useRef(performance.now());
 return stats ? <TrainingResultScreen cfg={{mode:'reactTrain',level:3,activityId:'balloon-pop',adminRounds:true,timeMode:'reps',targetReps:5,duration:60,speed:1}} elapsedMs={stats.elapsedMs} colorCounts={laneCountToColorStimulusCounts(stats.laneCount)} stims={stats.stims} completionReason={stats.completionReason} levelLabel="" onBack={()=>window.qaActions.push('back')} onRetry={()=>{started.current=performance.now();setStats(null);}} />
 : <VisualReactionTraining variant="flash" targetReps={5} speedSec={1} durationSec={60} onExit={()=>window.qaActions.push('exit')} onComplete={result=>{const recorded={...result,elapsedMs:performance.now()-started.current};window.qaEngineResult=recorded;setStats(recorded);}} />;
}
const extra={ 'direction-color':{mode:'basic',level:1,activityId:'direction-cue',spatialArrowColorMode:'color'},'stroop-voice':{mode:'stroop',level:2,activityId:'stroop-word',stroopWordResponse:'voice'},'stroop-move':{mode:'stroop',level:2,activityId:'stroop-word',stroopWordResponse:'movement'},'simon':{mode:'simon',level:1,activityId:'simon-shape'},'nested':{mode:'flanker',level:4,activityId:'flanker-nested'},'number-memory':{mode:'spatial',level:4,activityId:'color-number-memory'} };
const renderedCfg=extra[window.qaCase]?{...base,...extra[window.qaCase]}:cfg;
const qaRoot=createRoot(document.getElementById('root'));
window.qaRerender=()=>qaRoot.render(window.qaCase==='balloon-live' ? <BalloonLive/> : <TrainingResultScreen cfg={window.qaCase==='balloon'?{...base,mode:'reactTrain',level:3,activityId:'balloon-pop'}:renderedCfg} elapsedMs={42000} colorCounts={!['search','zero','balloon'].includes(window.qaCase)?null:window.qaCase==='zero'?{red:0,yellow:0,green:0,blue:0}:{red:2,yellow:0,green:0,blue:2}} stims={['missing','bridge-missing','dive-missing','sequence','number-memory'].includes(window.qaCase)?undefined:window.qaCase==='zero'?0:4} levelLabel="" completionReason={window.qaReason}
 glassBridge={window.qaCase==='bridge'?{startLength:3,lastLength:7,presentedRounds:5,completedRounds:5,correctSteps:20,incorrectSteps:5,successRounds:1,failureRounds:4,teacherFailed:false,scoringMode:'color-choice',difficulty:'easy'}:undefined}
 diveActionMove={window.qaCase==='dive'?{completed:true,stageDurationSec:20,flowFeatures:['punch','kick','duck'],flowIncludeBonus:true}:undefined}
 volumeLabel={window.qaCase==='dive'?'100초 + 보너스 60초':undefined}
 sessionSettings={{title:'실행 설정',primary:'SPOMAT 1장'}}
 footer={<button onClick={()=>window.qaActions.push('record')}>수업 기록 남기기</button>}
 onBack={()=>window.qaActions.push('back')} onRetry={()=>window.qaActions.push('retry')}/>);
window.qaRerender();
`);
await build({ configFile: false, define: { 'process.env.NODE_ENV': '"development"' },
  build: { outDir: out, emptyOutDir: false, minify: false,
    lib: { entry: `${out}/fixture.jsx`, name: 'SpomoveResultQA', formats: ['iife'], fileName: () => 'fixture.js', cssFileName: 'fixture' } },
  resolve: { alias: { '@': process.cwd() } },
});
const baselinePaths = ['components/TrainingResultScreen.tsx', 'components/TrainingResultActivityVisual.tsx', 'components/TrainingResultScreen.module.css', 'lib/trainingResultPresentation.ts']
  .map(path => `app/admin/spomove/training/_player/${path}`);
const originals = new Map(baselinePaths.flatMap(path => {
  try { return [[path, execFileSync('git', ['show', `HEAD:${path}`], { encoding: 'utf8', stdio: ['ignore','pipe','ignore'] })]]; }
  catch { return []; } // Removed diagram files no longer exist in later HEADs.
}));
await build({ configFile: false, define: { 'process.env.NODE_ENV': '"development"' },
  plugins: [{ name: 'read-only-head-baseline', enforce: 'pre', resolveId(source) {
    if(source.endsWith('/TrainingResultActivityVisual')) return process.cwd().replaceAll('\\','/')+'/app/admin/spomove/training/_player/components/TrainingResultActivityVisual.tsx';
  }, load(id) {
    const path = baselinePaths.find(path => id.replaceAll('\\', '/').endsWith(`/${path}`));
    return path ? originals.get(path) : null;
  } }],
  build: { outDir: out, emptyOutDir: false, minify: false,
    lib: { entry: `${out}/fixture.jsx`, name: 'SpomoveResultBaseline', formats: ['iife'], fileName: () => 'baseline.js', cssFileName: 'baseline' } },
  resolve: { alias: { '@': process.cwd() } },
});
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const report = { source: 'Local component fixtures using real result component and CSS; not authenticated E2E.', cases: [], errors: [] };
try {
  for (const [width, height] of [[390, 1000], [1440, 1100]]) {
    for (const theme of ['light', 'dark']) {
      const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
      let baselineMode = false;
      await context.route('**/*', async route => {
        const path = new URL(route.request().url()).pathname;
        if (path === '/__spomove_result_qa') return route.fulfill({ contentType: 'text/html', body: `<!doctype html><html lang="ko"><meta charset="utf-8"><style>${localFonts}:root{--spm-font-body:Paperlogy,system-ui;--spm-cta:#2563eb}body{margin:0}</style><link rel="stylesheet" href="/__spomove_result_qa.css"><div id="root"></div><script src="/__spomove_result_qa.js"></script></html>` });
        if (/^\/fonts\/(?:paperlogy\/Paperlogy-[\w-]+\.woff2|plus-jakarta-sans\/PlusJakartaSans-Variable\.ttf|Cafe24SsurroundAir\.woff)$/.test(path)) return route.fulfill({body:await fs.readFile(`public${path}`)});
        if (path === '/__spomove_result_qa.js' || path === '/__spomove_result_qa.css') return route.fulfill({ contentType: path.endsWith('.js') ? 'application/javascript' : 'text/css', body: await fs.readFile(`${out}/${baselineMode ? 'baseline' : 'fixture'}${path.endsWith('.js') ? '.js' : '.css'}`) });
        return route.abort();
      });
      const page = await context.newPage();
      page.on('pageerror', error => report.errors.push(error.message));
      await page.addInitScript(({ theme }) => { localStorage.setItem('spokedu_theme', theme); window.qaActions = []; window.qaReason = 'natural_complete'; window.qaCase = 'search'; }, { theme });
      await page.goto('http://127.0.0.1:3000/__spomove_result_qa');
      await page.locator('[data-completion="natural_complete"]').waitFor();
      const zones=page.locator('li[data-color]');
      assert.deepEqual(await zones.evaluateAll(nodes=>nodes.map(n=>n.dataset.color)), ['red','yellow','green','blue']);
      assert.deepEqual(await zones.locator(':scope > div:last-child > strong').allTextContents(), ['2회','0회','0회','2회']);
      assert.equal(await page.locator('details').count(),0);
      assert.equal(await page.locator('[aria-pressed]').count(),0);
      assert.match(await page.locator('main').innerText(), /4\/20과제/);
      report.modelChecks=await page.evaluate(()=>window.qaModelChecks());
      const buttons=page.locator('nav button');
      await buttons.nth(0).click(); await buttons.nth(1).click(); await page.locator('footer button').click();
      assert.deepEqual(await page.evaluate(()=>window.qaActions),['back','retry','record']);
      const backgrounds=await zones.evaluateAll(nodes=>nodes.map(n=>getComputedStyle(n.querySelector('[class*="dot"]')).backgroundColor));
      assert.equal(new Set(backgrounds).size,4);
      const rects=await zones.evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y};}));
      if(width>540) { assert.equal(rects[0].y,rects[1].y); assert.equal(rects[2].y,rects[3].y); assert.ok(rects[0].x<rects[1].x && rects[0].y<rects[2].y); } else assert.ok(rects.every((r,i)=>i===0||r.y>rects[i-1].y));
      await page.locator('main').evaluate(el=>el.scrollTop=0);
      await page.evaluate(()=>document.fonts.ready);
      await page.screenshot({path:`${out}/search-${theme}-${width}.png`});
      await page.locator('ul:has(> li[data-color])').screenshot({path:`${out}/search-distribution-${theme}-${width}.png`});
      await page.locator('nav').scrollIntoViewIfNeeded();
      await page.screenshot({path:`${out}/search-bottom-${theme}-${width}.png`});
      for (const reason of ['stopped_early','cancelled','failed']) {
        await page.addInitScript(reason=>{window.qaReason=reason;},reason);
        await page.reload(); await page.locator(`[data-completion="${reason}"]`).waitFor();
        assert.equal(await page.locator('nav button').count(),2);
        assert.notEqual(await page.locator('h1').textContent(),'오늘의 미션을 마쳤어요!');
      }
      for (const kind of ['balloon','direction','direction-color','bridge','bridge-missing','dive','dive-missing','arrow','nested','number-memory','stroop-voice','stroop-move','simon','missing','zero','sequence','instant']) {
        await page.addInitScript(kind=>{window.qaCase=kind;window.qaReason='natural_complete';},kind);
        await page.reload(); await page.locator('[data-completion="natural_complete"]').waitFor();
        assert.equal(await page.locator('li[data-color]').count(),['zero','balloon'].includes(kind)?4:0);
        if(kind==='zero') assert.ok((await page.locator('li[data-color] > div:last-child > strong').allTextContents()).every(t=>t.startsWith('0')));
        if(kind==='bridge') assert.match(await page.locator('main').innerText(),/5개/);
        if(kind==='dive') assert.match(await page.locator('main').innerText(),/100초 \+ 보너스 60초/);
        const feedback=page.locator('[data-education-profile]');
        assert.equal(await feedback.count(),['zero','balloon'].includes(kind)?0:1);
        if(await feedback.count()) {
          assert.deepEqual(await feedback.locator('h3').allTextContents(),['어떤 활동인가요?','이번 활동의 핵심 경험','다음 활동에서 살펴볼 점']);
          assert.equal(await feedback.locator('dl dt').count(),3);
          assert.equal(await feedback.locator('svg,[data-pad-color],[data-direction]').count(),0);
          assert.equal(await page.locator('details,[aria-pressed]').count(),0);
          const text=await feedback.innerText();
          await page.evaluate(async()=>{window.qaRerender();await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
          assert.equal(await feedback.innerText(),text,'Copy must stay stable during the same result');
        }
        if(kind==='direction') {
          assert.equal(await feedback.getAttribute('data-education-profile'),'direction');
        }
        if(kind==='direction-color') assert.equal(await feedback.getAttribute('data-education-profile'),'direction-color');
        if(kind==='stroop-voice') assert.match(await feedback.locator('p').first().innerText(),/말로/);
        if(kind==='stroop-move') assert.match(await feedback.locator('p').first().innerText(),/이동/);
        if(kind==='bridge-missing') assert.equal(await page.getByRole('heading',{name:/이번 활동의 실제 기록/}).count(),0);
        const coverage=await page.evaluate(()=>window.qaCoverage);
        assert.ok(coverage.length>40);
        report.activityCoverage=coverage;
        const overflowing=await page.locator('.tr-result-root').evaluate(root=>[...root.querySelectorAll('*')].filter(el=>el.clientWidth>0&&el.scrollWidth>el.clientWidth+2).map(el=>el.tagName+':'+el.className));
        assert.deepEqual(overflowing,[],`${kind} ${theme} ${width}`);
        await page.locator('main').evaluate(el=>el.scrollTop=0);
        await page.screenshot({path:`${out}/${kind}-${theme}-${width}.png`});
        if(await feedback.count()) await feedback.screenshot({path:`${out}/${kind}-feedback-${theme}-${width}.png`});
      }
      if (process.env.SPOMOVE_RESULT_LIVE_RUNTIME === '1' && [390,1440].includes(width) && theme === 'light') {
        await page.addInitScript(()=>{window.qaCase='balloon-live';});
        await page.reload();
        await page.locator('[data-completion="natural_complete"]').waitFor({timeout:60000});
        const natural = await page.evaluate(()=>window.qaEngineResult);
        assert.equal(natural.stims,5);
        const expected = [natural.laneCount[0],natural.laneCount[3],natural.laneCount[2],natural.laneCount[1]];
        assert.deepEqual(await page.locator('li[data-color] > div:last-child > strong').evaluateAll(nodes=>nodes.map(n=>parseInt(n.textContent))),expected);
        assert.equal(expected.reduce((sum,n)=>sum+n,0),5);
        await page.screenshot({path:`${out}/balloon-live-complete-${width}.png`});
        await page.getByRole('button',{name:'다시 활동하기',exact:true}).click();
        await page.getByRole('button',{name:'STOP',exact:true}).waitFor();
        await page.waitForFunction(()=>parseInt(document.querySelector('#vrt-sst')?.textContent ?? '0') >= 1);
        await page.getByRole('button',{name:'STOP',exact:true}).click();
        await page.locator('[data-completion="stopped_early"]').waitFor();
        const stopped=await page.evaluate(()=>window.qaEngineResult);
        assert.deepEqual(await page.locator('li[data-color] > div:last-child > strong').evaluateAll(nodes=>nodes.map(n=>parseInt(n.textContent))),[stopped.laneCount[0],stopped.laneCount[3],stopped.laneCount[2],stopped.laneCount[1]]);
        await page.screenshot({path:`${out}/balloon-live-stop-${width}.png`});
        report.cases.push({width,actualBalloonRuntime:true,natural,stopped,retry:true,countsMatchRuntime:true});
        console.log('PASS actual balloon runtime',width);
      }
      report.cases.push({width,height,theme,callbacks:true,fourStates:true,zeroColors:true,spomatPositions:true,balloon:true,bridge:true,dive:true,sequence:true,instant:true,missing:true,horizontalOverflow:false});
      // Compare against the unchanged Stitch implementation, without checking out files.
      baselineMode = true;
      await page.addInitScript(()=>{window.qaBaseline=true;window.qaCase='search';window.qaReason='natural_complete';});
      await page.reload(); await page.locator('[data-completion="natural_complete"]').waitFor();
      await page.evaluate(()=>document.fonts.ready);
      await page.screenshot({path:`${out}/baseline-search-${theme}-${width}.png`});
      const baseline = await page.locator('ul:has(> li[data-color])').screenshot({path:`${out}/baseline-search-distribution-${theme}-${width}.png`});
      const current = await fs.readFile(`${out}/search-distribution-${theme}-${width}.png`);
      const pixelComparison = await page.evaluate(async ({ before, after }) => {
        const pixels = async base64 => {
          const img = new Image(); img.src = `data:image/png;base64,${base64}`; await img.decode();
          const canvas = document.createElement('canvas'); canvas.width=img.width;canvas.height=img.height;
          const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);return ctx.getImageData(0,0,img.width,img.height).data;
        };
        const a=await pixels(before),b=await pixels(after);let changedPixels=0,maxChannelDelta=0;
        for(let i=0;i<a.length;i+=4) {let changed=false;for(let c=0;c<4;c++){const delta=Math.abs(a[i+c]-b[i+c]);if(delta)changed=true;maxChannelDelta=Math.max(maxChannelDelta,delta);}if(changed)changedPixels++;}
        return {changedPixels,maxChannelDelta,totalPixels:a.length/4};
      }, {before:baseline.toString('base64'),after:current.toString('base64')});
      // Chromium can round a few translucent border pixels differently between captures.
      assert.ok(pixelComparison.maxChannelDelta<=2 && pixelComparison.changedPixels<=pixelComparison.totalPixels*0.00001,JSON.stringify(pixelComparison));
      await page.addInitScript(()=>{window.qaCase='direction';});
      await page.reload(); await page.locator('[data-completion="natural_complete"]').waitFor();
      await page.evaluate(()=>document.fonts.ready);
      await page.screenshot({path:`${out}/baseline-direction-${theme}-${width}.png`});
      const comparison = await context.newPage();
      const before=(await fs.readFile(`${out}/baseline-direction-${theme}-${width}.png`)).toString('base64');
      const after=(await fs.readFile(`${out}/direction-${theme}-${width}.png`)).toString('base64');
      await comparison.setViewportSize({width:width*2,height});
      await comparison.setContent(`<html><body style="margin:0;display:flex"><img width="${width}" src="data:image/png;base64,${before}"><img width="${width}" src="data:image/png;base64,${after}"></body></html>`);
      await comparison.screenshot({path:`${out}/direction-before-after-${theme}-${width}.png`});
      report.cases.at(-1).colorComparisonToHead=pixelComparison;
      await context.close();
      console.log('PASS result fixtures', width, theme);
    }
  }
  if (process.env.SPOMOVE_RESULT_REFERENCE) {
    const comparison = await browser.newPage({ viewport: { width: 1600, height: 900 } });
    const reference = (await fs.readFile(process.env.SPOMOVE_RESULT_REFERENCE)).toString('base64');
    const result = (await fs.readFile(`${out}/search-light-1440.png`)).toString('base64');
    await comparison.setContent(`<html><body style="margin:0;font-family:system-ui;background:#eee"><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:12px"><div>Stitch reference<img style="width:100%;display:block" src="data:image/png;base64,${reference}"></div><div>Local shared React component<img style="width:100%;display:block" src="data:image/png;base64,${result}"></div></div></body></html>`);
    await comparison.screenshot({path:`${out}/reference-comparison.png`,fullPage:true});
    await comparison.close();
    report.referenceComparison = 'reference-comparison.png';
  }
  assert.deepEqual(report.errors, []);
} finally {
  await fs.writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
  await browser.close();
}
