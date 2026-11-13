import { chromium } from 'playwright';
import nextEnv from '@next/env';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { assertLocalQaTarget, isForbiddenQaRequest } from './lib/qa-network-guard.mjs';

nextEnv.loadEnvConfig(process.cwd());
const base = 'http://127.0.0.1:3000';
assertLocalQaTarget(base);
const output = 'artifacts/library-detail-v2';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.grantPermissions(['clipboard-read','clipboard-write']);
  await context.route('**/*', route => isForbiddenQaRequest(route.request().url()) ? route.abort() : route.continue());
  const page = await context.newPage();
  await page.goto(`${base}/login`);
  await page.locator('input[name=spk-account]').fill('spm.qa.admin@spokedu.test');
  await page.locator('input[name=spk-secret]').fill(process.env.SPM_QA_PASSWORD);
  await page.locator('button[type=submit]').click();
  await page.waitForURL(url => !url.pathname.startsWith('/login'), { timeout: 60000 });
  const access = await (await context.request.get(`${base}/api/spokedu-master/access`)).json();
  assert(access.isAdmin === true || access.data?.isAdmin === true, 'Admin access required');
  assert(access.canUseLibrary === true || access.data?.canUseLibrary === true, 'Library capability required');
  const response = await context.request.get(`${base}/api/spokedu-master/programs`);
  assert(response.ok(), 'Programs read failed');
  const payload = await response.json();
  await writeFile(`${output}/programs.json`, JSON.stringify(payload.data, null, 2));
  const ranked = payload.data.map(p => ({ id: p.id, title: p.title, score: [p.lessonDetail?.videoUrl, p.lessonDetail?.setupImageUrl, p.lessonDetail?.rules?.length || p.steps?.length, p.equipment?.length, p.lessonDetail?.variations?.length, p.lessonDetail?.coachScript].filter(Boolean).length })).sort((a,b) => b.score-a.score);
  console.log(JSON.stringify({ access: { isAdmin: access.isAdmin ?? access.data?.isAdmin, canUseLibrary: access.canUseLibrary ?? access.data?.canUseLibrary }, candidates: ranked.slice(0, 12) }));
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const report = { errors, viewports: [] };
  for (const width of [1600, 1440, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(`${base}/spokedu-lab/library/198`);
    await page.locator('[data-library-detail-v2]').waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1500);
    await page.locator('[data-v2-related]').scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);
    await page.locator('[data-library-detail-v2]').evaluate(e=>{let p=e.parentElement;while(p){p.scrollTop=0;p=p.parentElement;}window.scrollTo(0,0);});
    await page.screenshot({ path: `${output}/v2-${width}-viewport.png` });
    // The existing app scrolls an inner main. A tall capture viewport exposes
    // that entire scroller without changing any widths or application styles.
    const captureHeight = await page.locator('[data-spm-app-shell]').evaluate(e=>Math.ceil(e.scrollHeight)+100);
    await page.setViewportSize({width,height:captureHeight});
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${output}/v2-${width}.png`, fullPage: true });
    const layout = await page.evaluate(() => {
      const root = document.querySelector('[data-library-detail-v2]');
      const rect = e => { const r=e.getBoundingClientRect(); return { x:r.x, y:r.y, width:r.width, height:r.height }; };
      return { root: rect(root), overflow: document.documentElement.scrollWidth > innerWidth, cards: [...root.querySelectorAll('[data-v2-card]')].map(e => ({ name:e.dataset.v2Card,...rect(e) })), images:[...root.querySelectorAll('img')].map(e=>({loaded:e.complete && e.naturalWidth > 0, src:e.src.split('?')[0]})) };
    });
    assert(!layout.overflow, `Overflow at ${width}`);
    const preview = await page.locator('#lesson-video > div').boundingBox();
    assert(Math.abs(preview.width/preview.height-4/3)<0.01, '4:3 poster');
    await page.locator('#lesson-video').screenshot({path:`${output}/video-refined-${width}.png`});
    const steps = await page.locator('[data-v2-card="method"] li').evaluateAll(items => items.map(item => {
      const number = item.querySelector('span').getBoundingClientRect();
      const body = item.querySelector('p');
      const p = body.getBoundingClientRect();
      const range = document.createRange(); range.selectNodeContents(body);
      return {numberX:number.x,numberWidth:number.width,numberHeight:number.height,firstLineCenter:p.y+parseFloat(getComputedStyle(body).paddingTop)+parseFloat(getComputedStyle(body).lineHeight)/2,numberCenter:number.y+number.height/2,bodyX:p.x,gap:p.x-number.right,lines:[...range.getClientRects()].map(r=>r.x)};
    }));
    assert(steps.every(s=>s.numberWidth===28 && s.numberHeight===28 && s.gap===14 && Math.abs(s.firstLineCenter-s.numberCenter)<0.1));
    assert(steps.every(s=>s.bodyX===steps[0].bodyX && s.numberX===steps[0].numberX && s.lines.every(x=>Math.abs(x-s.bodyX)<0.1)));
    assert(await page.locator('[data-v2-card="guidance"] blockquote q').count()===1);
    report.stepAlignment ??= []; report.stepAlignment.push({width,steps});
    await page.locator('[data-v2-card="method"]').screenshot({path:`${output}/method-refined-${width}.png`});
    await page.locator('[data-v2-card="variations"]').screenshot({path:`${output}/variation-refined-${width}.png`});
    await page.locator('[data-v2-card="guidance"]').screenshot({path:`${output}/guidance-refined-${width}.png`});

    if (width >= 1024) {
      assert(layout.cards.find(c=>c.name==='video').x < layout.cards.find(c=>c.name==='method').x);
      const card = name => layout.cards.find(c=>c.name===name);
      assert(Math.abs(card('video').y-card('method').y)<1, 'Independent columns share starting edge');
      assert(Math.abs(card('setup').y-card('video').y-card('video').height-24)<1, 'Left card gap is 24px');
      assert(Math.abs(card('variations').y-card('method').y-card('method').height-24)<1, 'Right card gap is 24px');
      assert(Math.abs(card('guidance').y-card('variations').y-card('variations').height-24)<1, 'Guide gap is 24px');
      assert(Math.abs(card('video').width/card('method').width-7/5)<0.01, '7:5 columns');
      if(width===1440) await page.locator('[data-library-detail-v2]').screenshot({ path: `${output}/v2-content-1440.png` });
    } else {
      const readingOrder = [...layout.cards].sort((a,b)=>a.y-b.y).map(c=>c.name);
      assert.deepEqual(readingOrder,['video','method','setup','variations','guidance']);
    }
    report.viewports.push({width,...layout});
    await page.getByRole('button', { name: /크게 보기/ }).click();
    await page.getByRole('dialog').waitFor();
    await page.keyboard.press('Escape');
    assert(await page.getByRole('dialog').count()===0);
    assert(await page.getByRole('button', { name: /크게 보기/ }).evaluate(e=>e===document.activeElement));
    await page.setViewportSize({width,height:1000});
  }
  await page.getByRole('button', { name:'내 수업에 추가', exact:true }).click();
  await page.getByRole('dialog').waitFor();
  report.assignmentDialog = await page.getByRole('dialog').innerText();
  await page.keyboard.press('Escape');
  await page.getByRole('button', {name:'지도안 복사',exact:true}).click();
  await page.getByRole('button', {name:'복사 완료',exact:true}).waitFor();
  const copied = await page.evaluate(()=>navigator.clipboard.readText());
  assert(copied.includes('스위치 러닝') && copied.includes('출발 원마커'));
  report.copy = true;
  const favoriteRequests = [];
  await page.route('**/api/spokedu-master/favorites', async route => {
    if(route.request().method()==='GET') return route.continue();
    favoriteRequests.push({method:route.request().method(),body:route.request().postDataJSON()});
    return route.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'});
  });
  const favorite = page.locator('[data-library-detail-v2]').getByRole('button',{name:'즐겨찾기',exact:true});
  const initial = await favorite.getAttribute('aria-pressed');
  await favorite.click();
  assert(await favorite.getAttribute('aria-pressed')!==initial);
  await favorite.click();
  assert(await favorite.getAttribute('aria-pressed')===initial);
  assert.deepEqual(favoriteRequests.map(r=>r.method).sort(),['DELETE','POST']);
  assert(favoriteRequests.every(r=>r.body.id==='198' && r.body.type==='program'));
  report.favorite = {toggleAndRestore:true,persistence:'intercepted; no DB write'};
  await page.setViewportSize({width:1440,height:1000});
  await page.getByRole('button',{name:/수업 영상 재생/}).click();
  await page.locator('#lesson-video iframe').waitFor();
  const playingFrame = await page.locator('#lesson-video > div').boundingBox();
  assert(Math.abs(playingFrame.width/playingFrame.height-4/3)<0.01, '4:3 playback frame without layout shift');
  await page.locator('#lesson-video').screenshot({path:`${output}/video-playing-1440.png`});
  report.videoIframe = await page.locator('#lesson-video iframe').getAttribute('src');
  assert(report.videoIframe.includes('enoSbLsxK-Q'));
  try {
    await page.frameLocator('#lesson-video iframe').locator('video').waitFor({timeout:15000});
    report.videoPlaying = await page.frameLocator('#lesson-video iframe').locator('video').evaluate(async v=>{await v.play(); await new Promise(r=>setTimeout(r,1500));return v.currentTime>0 && !v.paused;});
  } catch { report.videoPlaying = 'unverified: provider playback unavailable'; }
  await page.goto(`${base}/spokedu-lab/library/198?source=session&session=00000000-0000-4000-8000-000000000001`);
  await page.locator('[data-library-detail-v2]').waitFor();
  report.sessionReturn = await page.getByRole('link',{name:'수업으로 돌아가기',exact:true}).getAttribute('href');
  assert(report.sessionReturn.includes('session=00000000-0000-4000-8000-000000000001'));
  await page.goto(`${base}/spokedu-lab/library/198`);
  await page.locator('[data-library-detail-v2]').waitFor();
  await page.evaluate(()=>document.documentElement.classList.add('dark'));
  await page.screenshot({path:`${output}/v2-dark-1440-viewport.png`});
  await page.setViewportSize({width:390,height:1000});
  await page.screenshot({path:`${output}/v2-dark-390-viewport.png`});
  await page.evaluate(()=>document.documentElement.classList.remove('dark'));
  await page.goto(`${base}/spokedu-lab/library/201`);
  await page.locator('[data-library-detail-v2]').waitFor();
  assert(await page.locator('[data-library-detail-v2]').count()===1);
  report.otherProgramUsesV2 = true;
  const reference = await sharp(`${output}/reference/screen.png`).extract({left:19,top:85,width:726,height:1410}).resize({width:1216}).png().toBuffer();
  const current = await sharp(`${output}/v2-content-1440.png`).png().toBuffer();
  const referenceMeta = await sharp(reference).metadata();
  const currentMeta = await sharp(current).metadata();
  await sharp({create:{width:2464,height:Math.max(referenceMeta.height,currentMeta.height),channels:3,background:'#f8fafc'}}).composite([{input:reference,left:0,top:0},{input:current,left:1248,top:0}]).png().toFile(`${output}/reference-comparison.png`);
  report.comparison = {left:'Stitch screenshot; body cropped and scaled uniformly to 1216px',right:'actual V2 body at 1216px',pixelEqualityClaim:false};
  await writeFile(`${output}/report.json`, JSON.stringify(report,null,2));
  console.log(JSON.stringify({ viewports:report.viewports.map(v=>({width:v.width,overflow:v.overflow})), errors, otherProgramUsesV2:true }));
} finally { await browser.close(); }
