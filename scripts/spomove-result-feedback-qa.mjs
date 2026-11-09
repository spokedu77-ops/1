// Local component fixtures. No production requests, auth changes or external writes.
import { build } from 'vite';
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const out = 'artifacts/result-stitch-20261109';
const localFonts = [...(await fs.readFile('app/globals.css', 'utf8')).matchAll(/@font-face\s*\{[^}]+\}/g)].map(match => match[0]).join('\n');
await fs.mkdir(out, { recursive: true });
await fs.writeFile(`${out}/fixture.jsx`, `
import React from 'react';
import {createRoot} from 'react-dom/client';
import {TrainingResultScreen} from '../../app/admin/spomove/training/_player/components/TrainingResultScreen';
import {VisualReactionTraining} from '../../app/admin/spomove/training/_player/components/VisualReactionTraining';
import {laneCountToColorStimulusCounts} from '../../app/admin/spomove/training/_player/lib/trainingResultSummary';
const base={mode:'flanker',level:7,activityId:'visual-search',visualSearchStage:2,visualSearchTargetCount:1,speed:2,timeMode:'reps',duration:0,targetReps:20};
const cfg=window.qaCase==='bridge'?{...base,mode:'spatial',level:8,activityId:'glass-bridge-memory',targetReps:5}:window.qaCase==='dive'?{...base,mode:'flow',level:1,activityId:'action-move'}:window.qaCase==='sequence'?{...base,mode:'spatial',level:1,activityId:'sequence-memory'}:window.qaCase==='instant'?{...base,mode:'spatial',level:7,activityId:'instant-memory'}:window.qaCase==='arrow'?{...base,level:1,activityId:'flanker-arrow'}:base;
function BalloonLive() {
 const [stats,setStats]=React.useState(null);
 const started=React.useRef(performance.now());
 return stats ? <TrainingResultScreen cfg={{mode:'reactTrain',level:3,activityId:'balloon-pop',adminRounds:true,timeMode:'reps',targetReps:5,duration:60,speed:1}} elapsedMs={stats.elapsedMs} colorCounts={laneCountToColorStimulusCounts(stats.laneCount)} stims={stats.stims} completionReason={stats.completionReason} levelLabel="" onBack={()=>window.qaActions.push('back')} onRetry={()=>{started.current=performance.now();setStats(null);}} />
 : <VisualReactionTraining variant="flash" targetReps={5} speedSec={1} durationSec={60} onExit={()=>window.qaActions.push('exit')} onComplete={result=>{const recorded={...result,elapsedMs:performance.now()-started.current};window.qaEngineResult=recorded;setStats(recorded);}} />;
}
createRoot(document.getElementById('root')).render(window.qaCase==='balloon-live' ? <BalloonLive/> : <TrainingResultScreen cfg={window.qaCase==='balloon'?{...base,mode:'reactTrain',level:3,activityId:'balloon-pop'}:cfg} elapsedMs={42000} colorCounts={window.qaCase==='missing'?null:window.qaCase==='zero'?{red:0,yellow:0,green:0,blue:0}:{red:2,yellow:0,green:0,blue:2}} stims={window.qaCase==='missing'?undefined:window.qaCase==='zero'?0:4} levelLabel="" completionReason={window.qaReason}
 glassBridge={window.qaCase==='bridge'?{startLength:3,lastLength:7,presentedRounds:5,completedRounds:5,correctSteps:20,incorrectSteps:5,successRounds:1,failureRounds:4,teacherFailed:false,scoringMode:'color-choice',difficulty:'easy'}:undefined}
 diveActionMove={window.qaCase==='dive'?{completed:true,stageDurationSec:20,flowFeatures:['punch','kick','duck'],flowIncludeBonus:true}:undefined}
 volumeLabel={window.qaCase==='dive'?'100초 + 보너스 60초':undefined}
 sessionSettings={{title:'실행 설정',primary:'SPOMAT 1장'}}
 footer={<button onClick={()=>window.qaActions.push('record')}>수업 기록 남기기</button>}
 onBack={()=>window.qaActions.push('back')} onRetry={()=>window.qaActions.push('retry')}/>);
`);
await build({ configFile: false, define: { 'process.env.NODE_ENV': '"development"' },
  build: { outDir: out, emptyOutDir: false, minify: false,
    lib: { entry: `${out}/fixture.jsx`, name: 'SpomoveResultQA', formats: ['iife'], fileName: () => 'fixture.js', cssFileName: 'fixture' } },
  resolve: { alias: { '@': process.cwd() } },
});
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const report = { source: 'Local component fixtures using real result component and CSS; not authenticated E2E.', cases: [], errors: [] };
try {
  for (const [width, height] of [[390, 844], [768, 1024], [1126, 910], [1440, 1000], [1600, 1280]]) {
    for (const theme of ['light', 'dark']) {
      const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
      await context.route('**/*', async route => {
        const path = new URL(route.request().url()).pathname;
        if (path === '/__spomove_result_qa') return route.fulfill({ contentType: 'text/html', body: `<!doctype html><html lang="ko"><meta charset="utf-8"><style>${localFonts}:root{--spm-font-body:Paperlogy,system-ui;--spm-cta:#2563eb}body{margin:0}</style><link rel="stylesheet" href="/__spomove_result_qa.css"><div id="root"></div><script src="/__spomove_result_qa.js"></script></html>` });
        if (/^\/fonts\/(?:paperlogy\/Paperlogy-[\w-]+\.woff2|plus-jakarta-sans\/PlusJakartaSans-Variable\.ttf|Cafe24SsurroundAir\.woff)$/.test(path)) return route.fulfill({body:await fs.readFile(`public${path}`)});
        if (path === '/__spomove_result_qa.js' || path === '/__spomove_result_qa.css') return route.fulfill({ contentType: path.endsWith('.js') ? 'application/javascript' : 'text/css', body: await fs.readFile(`${out}/fixture${path.endsWith('.js') ? '.js' : '.css'}`) });
        return route.abort();
      });
      const page = await context.newPage();
      page.on('pageerror', error => report.errors.push(error.message));
      await page.addInitScript(({ theme }) => { localStorage.setItem('spokedu_theme', theme); window.qaActions = []; window.qaReason = 'natural_complete'; window.qaCase = 'search'; }, { theme });
      await page.goto('http://127.0.0.1:3000/__spomove_result_qa');
      await page.locator('[data-completion="natural_complete"]').waitFor();
      const zones=page.locator('li[data-color]');
      assert.deepEqual(await zones.evaluateAll(nodes=>nodes.map(n=>n.dataset.color)), ['red','yellow','green','blue']);
      assert.deepEqual(await zones.locator('strong').allTextContents(), ['2회','0회','0회','2회']);
      assert.equal(await page.locator('details').count(),0);
      assert.equal(await page.locator('[aria-pressed]').count(),0);
      assert.match(await page.locator('main').innerText(), /4과제/);
      const buttons=page.locator('nav button');
      await buttons.nth(0).click(); await buttons.nth(1).click(); await page.locator('footer button').click();
      assert.deepEqual(await page.evaluate(()=>window.qaActions),['back','retry','record']);
      const backgrounds=await zones.evaluateAll(nodes=>nodes.map(n=>getComputedStyle(n).backgroundColor));
      assert.equal(new Set(backgrounds).size,4);
      const rects=await zones.evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y};}));
      assert.equal(rects[0].y,rects[1].y); assert.equal(rects[2].y,rects[3].y);
      assert.ok(rects[0].x<rects[1].x && rects[0].y<rects[2].y);
      await page.locator('main').evaluate(el=>el.scrollTop=0);
      await page.screenshot({path:`${out}/search-${theme}-${width}.png`});
      await page.locator('nav').scrollIntoViewIfNeeded();
      await page.screenshot({path:`${out}/search-bottom-${theme}-${width}.png`});
      for (const reason of ['stopped_early','cancelled','failed']) {
        await page.addInitScript(reason=>{window.qaReason=reason;},reason);
        await page.reload(); await page.locator(`[data-completion="${reason}"]`).waitFor();
        assert.equal(await page.locator('nav button').count(),2);
        assert.notEqual(await page.locator('h1').textContent(),'오늘의 미션을 마쳤어요!');
      }
      for (const kind of ['balloon','bridge','dive','arrow','missing','zero','sequence','instant']) {
        await page.addInitScript(kind=>{window.qaCase=kind;window.qaReason='natural_complete';},kind);
        await page.reload(); await page.locator('[data-completion="natural_complete"]').waitFor();
        assert.equal(await page.locator('li[data-color]').count(),['zero','balloon'].includes(kind)?4:0);
        if(kind==='zero') assert.ok((await page.locator('li[data-color] strong').allTextContents()).every(t=>t.startsWith('0')));
        if(kind==='bridge') assert.match(await page.locator('main').innerText(),/5개/);
        if(kind==='dive') assert.match(await page.locator('main').innerText(),/100초 \+ 보너스 60초/);
        if(kind==='missing') assert.match(await page.locator('main').innerText(),/미전달/);
        const overflowing=await page.locator('.tr-result-root').evaluate(root=>[...root.querySelectorAll('*')].filter(el=>el.clientWidth>0&&el.scrollWidth>el.clientWidth+2).map(el=>el.tagName+':'+el.className));
        assert.deepEqual(overflowing,[],`${kind} ${theme} ${width}`);
        await page.screenshot({path:`${out}/${kind}-${theme}-${width}.png`});
      }
      if ([390,1440].includes(width) && theme === 'light') {
        await page.addInitScript(()=>{window.qaCase='balloon-live';});
        await page.reload();
        await page.locator('[data-completion="natural_complete"]').waitFor({timeout:60000});
        const natural = await page.evaluate(()=>window.qaEngineResult);
        assert.equal(natural.stims,5);
        const expected = [natural.laneCount[0],natural.laneCount[3],natural.laneCount[2],natural.laneCount[1]];
        assert.deepEqual(await page.locator('li[data-color] strong').evaluateAll(nodes=>nodes.map(n=>parseInt(n.textContent))),expected);
        assert.equal(expected.reduce((sum,n)=>sum+n,0),5);
        await page.screenshot({path:`${out}/balloon-live-complete-${width}.png`});
        await page.getByRole('button',{name:'다시 실행',exact:true}).click();
        await page.getByRole('button',{name:'STOP',exact:true}).waitFor();
        await page.waitForFunction(()=>parseInt(document.querySelector('#vrt-sst')?.textContent ?? '0') >= 1);
        await page.getByRole('button',{name:'STOP',exact:true}).click();
        await page.locator('[data-completion="stopped_early"]').waitFor();
        const stopped=await page.evaluate(()=>window.qaEngineResult);
        assert.deepEqual(await page.locator('li[data-color] strong').evaluateAll(nodes=>nodes.map(n=>parseInt(n.textContent))),[stopped.laneCount[0],stopped.laneCount[3],stopped.laneCount[2],stopped.laneCount[1]]);
        await page.screenshot({path:`${out}/balloon-live-stop-${width}.png`});
        report.cases.push({width,actualBalloonRuntime:true,natural,stopped,retry:true,countsMatchRuntime:true});
        console.log('PASS actual balloon runtime',width);
      }
      report.cases.push({width,height,theme,callbacks:true,fourStates:true,zeroColors:true,spomatPositions:true,balloon:true,bridge:true,dive:true,sequence:true,instant:true,missing:true,horizontalOverflow:false});
      await context.close();
      console.log('PASS result fixtures', width, theme);
    }
  }
  if (process.env.SPOMOVE_RESULT_REFERENCE) {
    const comparison = await browser.newPage({ viewport: { width: 1600, height: 900 } });
    const reference = (await fs.readFile(process.env.SPOMOVE_RESULT_REFERENCE)).toString('base64');
    const result = (await fs.readFile(`${out}/search-light-1600.png`)).toString('base64');
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
