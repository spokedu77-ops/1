import { chromium } from 'playwright';
import nextEnv from '@next/env';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { isForbiddenQaRequest } from './lib/qa-network-guard.mjs';
nextEnv.loadEnvConfig(process.cwd());
const output='artifacts/program-gateway-finish-20261114';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const report={errors:[],captures:[]};
try {
  const context=await browser.newContext();
  await context.route('**/*',route=>isForbiddenQaRequest(route.request().url()) ? route.abort() : route.continue());
  const page=await context.newPage();
  page.on('pageerror',error=>report.errors.push(error.message));
  await page.goto('http://127.0.0.1:3000/login');
  await page.locator('input[name=spk-account]').fill('spm.qa.admin@spokedu.test');
  await page.locator('input[name=spk-secret]').fill(process.env.SPM_QA_PASSWORD);
  await page.locator('button[type=submit]').click();
  await page.waitForURL(url=>!url.pathname.startsWith('/login'),{timeout:60000});
  const access=await (await context.request.get('http://127.0.0.1:3000/api/spokedu-master/access')).json();
  assert(access.isAdmin && access.canUseLibrary && access.canUseSpomove);
  report.adminVerified=true;
  for(const [width,height] of [[1440,900],[1440,768],[1366,768],[768,1024],[390,844],[375,667],[360,640]]) {
    await page.setViewportSize({width,height});
    await page.goto('http://127.0.0.1:3000/spokedu-lab/programs');
    const main=page.locator('[data-program-gateway]');
    await main.waitFor();
    await main.locator('img').first().waitFor();
    await page.waitForFunction(()=>[...document.querySelectorAll('[data-program-gateway] img')].length===2 && [...document.querySelectorAll('[data-program-gateway] img')].every(i=>i.complete && i.naturalWidth>0));
    await page.evaluate(()=>document.fonts.ready);
    const result=await main.evaluate(el=>({
      overflow:el.scrollWidth>el.clientWidth,
      verticalScroll:el.scrollHeight>el.clientHeight+1,
      documentScroll:document.documentElement.scrollHeight>innerHeight+1,
      availableHeight:el.clientHeight,contentHeight:el.scrollHeight,
      images:[...el.querySelectorAll('img')].map(i=>({loaded:i.complete && i.naturalWidth>0,source:i.currentSrc.split('?')[0]})),
      specs:el.querySelectorAll('dd').length,
      features:el.querySelectorAll('article li').length,
      links:[...el.querySelectorAll('article a')].map(a=>a.getAttribute('href')),
      cards:[...el.querySelectorAll('article')].map(a=>({x:a.getBoundingClientRect().x,width:a.getBoundingClientRect().width,height:a.getBoundingClientRect().height,imageHeight:a.querySelector('img')?.getBoundingClientRect().height,buttonBottom:a.querySelector('a').getBoundingClientRect().bottom})),
      clipped:[...el.querySelectorAll('dd,li,a,h2,p')].filter(e=>e.scrollWidth>e.clientWidth+1).map(e=>e.textContent),
    }));
    assert(!result.overflow && !result.clipped.length);
    assert.equal(result.specs,6); assert.equal(result.features,0);
    assert.deepEqual(result.links,['/spokedu-lab/library','/spokedu-lab/spomove']);
    assert(result.cards[0].x!==result.cards[1].x);
    if(width>=1024 || width<=600) { assert(result.cards.every(card=>card.buttonBottom<height-80)); assert(!result.verticalScroll && !result.documentScroll); assert.equal(result.cards[0].height,result.cards[1].height); assert.equal(result.cards[0].buttonBottom,result.cards[1].buttonBottom); }
    await page.screenshot({path:`${output}/${width}x${height}-viewport.png`});
    await main.evaluate(el=>{let current=el;while(current){current.style.height='auto';current.style.maxHeight='none';current.style.overflow='visible';current=current.parentElement;}});
    await main.screenshot({path:`${output}/${width}x${height}-content.png`});
    report.captures.push({width,height,...result});
  }
  for(const href of ['/spokedu-lab/library','/spokedu-lab/spomove']) {
    await page.goto('http://127.0.0.1:3000/spokedu-lab/programs');
    await page.locator(`[data-program-gateway] article a[href="${href}"]`).click();
    await page.waitForURL(url=>url.pathname===href);
  }
  report.destinationsVerified=true;
  const current=await sharp(`${output}/1440x900-content.png`).resize({width:792}).png().toBuffer();
  const reference=await sharp('artifacts/program-gateway-retransplant/reference/screen.png').resize({width:792}).png().toBuffer();
  const [a,b]=await Promise.all([sharp(current).metadata(),sharp(reference).metadata()]);
  await sharp({create:{width:1584,height:Math.max(a.height,b.height),channels:3,background:'white'}}).composite([{input:reference,left:0,top:0},{input:current,left:792,top:0}]).png().toFile(`${output}/comparison.png`);
  assert.equal(report.errors.length,0);
} finally { await writeFile(`${output}/report.json`,JSON.stringify(report,null,2)); await browser.close(); }
