// Local component fixtures. No production requests, auth changes or external writes.
import { build } from 'vite';
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const out = 'artifacts/result-feedback-20261109';
await fs.mkdir(out, { recursive: true });
await fs.writeFile(`${out}/fixture.jsx`, `
import React from 'react';
import {createRoot} from 'react-dom/client';
import {TrainingResultScreen} from '../../app/admin/spomove/training/_player/components/TrainingResultScreen';
const base={mode:'flanker',level:7,activityId:'visual-search',visualSearchStage:2,visualSearchTargetCount:2,speed:2,timeMode:'reps',duration:0,targetReps:20};
const cfg=window.qaCase==='bridge'?{...base,mode:'spatial',level:8,activityId:'glass-bridge-memory',targetReps:5}:window.qaCase==='dive'?{...base,mode:'flow',level:1,activityId:'action-move'}:window.qaCase==='arrow'?{...base,level:1,activityId:'flanker-arrow'}:base;
createRoot(document.getElementById('root')).render(<TrainingResultScreen cfg={cfg} elapsedMs={42000} colorCounts={window.qaCase==='missing'?null:{red:4,yellow:6,green:2,blue:8}} stims={window.qaCase==='missing'?undefined:10} levelLabel="" completionReason={window.qaReason}
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
const browser = await chromium.launch({ headless: true });
const report = { source: 'Local component fixtures using real result component and CSS; not authenticated E2E.', cases: [], errors: [] };
try {
  for (const [width, height] of [[390, 844], [768, 1024], [1440, 1000]]) {
    for (const theme of ['light', 'dark']) {
      const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
      await context.route('**/*', async route => {
        const path = new URL(route.request().url()).pathname;
        if (path === '/__spomove_result_qa') return route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="ko"><meta charset="utf-8"><link rel="stylesheet" href="/__spomove_result_qa.css"><div id="root"></div><script src="/__spomove_result_qa.js"></script></html>' });
        if (path === '/__spomove_result_qa.js' || path === '/__spomove_result_qa.css') return route.fulfill({ contentType: path.endsWith('.js') ? 'application/javascript' : 'text/css', body: await fs.readFile(`${out}/fixture${path.endsWith('.js') ? '.js' : '.css'}`) });
        return route.abort();
      });
      const page = await context.newPage();
      page.on('pageerror', error => report.errors.push(error.message));
      await page.addInitScript(({ theme }) => { localStorage.setItem('spokedu_theme', theme); window.qaActions = []; window.qaReason = 'natural_complete'; window.qaCase = 'search'; }, { theme });
      await page.goto('http://127.0.0.1:3000/__spomove_result_qa');
      await page.getByRole('heading', { name: '오늘의 미션을 마쳤어요!' }).waitFor();
      assert.equal(await page.locator('details').getAttribute('open'), null);
      const records = page.getByRole('region', { name: '오늘의 활동 기록', exact: true });
      assert.match(await records.innerText(), /제시된 탐색 과제\s*10회/);
      assert.match(await records.innerText(), /제시된 목표 기호\s*20개/);
      for (const label of ['쉬웠어요', '괜찮았어요', '어려웠어요']) {
        const button = page.getByRole('button', { name: label, exact: true });
        await button.click(); assert.equal(await button.getAttribute('aria-pressed'), 'true');
        assert.match(await page.getByRole('status').innerText(), /고마워요/);
      }
      await page.getByRole('button', { name: '수업 기록 남기기' }).click();
      await page.getByRole('button', { name: '다시 실행' }).click();
      await page.getByRole('button', { name: '목록', exact: true }).click();
      assert.deepEqual(await page.evaluate(() => window.qaActions), ['record', 'retry', 'back']);
      const overflowing = await page.locator('.tr-result-root').evaluate(root => [...root.querySelectorAll('*')].filter(el => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 2).map(el => el.tagName + ':' + el.className));
      assert.deepEqual(overflowing, []);
      await page.getByRole('heading', { name: '오늘의 미션을 마쳤어요!' }).scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${out}/search-${theme}-${width}.png` });
      await page.locator('summary').click();
      await page.getByRole('heading', { name: '활동 목표', exact: true }).scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${out}/details-${theme}-${width}.png` });
      assert.match(await page.locator('details').innerText(), /SPOMAT 1장/);
      for (const reason of ['stopped_early', 'cancelled', 'failed']) {
        await page.addInitScript(reason => { window.qaReason = reason; }, reason);
        await page.reload();
        await page.locator(`[data-completion="${reason}"]`).waitFor();
        assert.equal(await page.getByRole('group', { name: '오늘 활동의 느낌' }).count(), reason === 'stopped_early' ? 1 : 0);
      }
      for (const kind of ['bridge', 'dive', 'arrow', 'missing']) {
        await page.addInitScript(kind => { window.qaCase = kind; window.qaReason = 'natural_complete'; }, kind);
        await page.reload(); await page.locator('[data-completion="natural_complete"]').waitFor();
        if (kind === 'bridge') assert.match(await page.locator('main').innerText(), /틀린 발판\s*5개/);
        if (kind === 'dive') assert.match(await page.locator('main').innerText(), /100초 \+ 보너스 60초/);
        if (kind === 'arrow' || kind === 'missing') assert.equal(await page.locator('main [aria-hidden="true"]').filter({ has: page.locator('span[style]') }).count(), 0);
        if (kind === 'missing') assert.match(await page.locator('main').innerText(), /미전달/);
        if (kind === 'bridge' || kind === 'dive') await page.screenshot({ path: `${out}/${kind}-${theme}-${width}.png` });
      }
      report.cases.push({ width, height, theme, feelings: true, disclosure: true, callbacks: true, fourStates: true, searchUnits: true, bridge: true, dive: true, missing: true, horizontalOverflow: false });
      await context.close();
      console.log('PASS result fixtures', width, theme);
    }
  }
  assert.deepEqual(report.errors, []);
} finally {
  await fs.writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
  await browser.close();
}
