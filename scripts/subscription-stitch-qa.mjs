import { chromium } from 'playwright';
import nextEnv from '@next/env';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { assertLocalQaTarget, isForbiddenQaRequest } from './lib/qa-network-guard.mjs';

nextEnv.loadEnvConfig(process.cwd());
const base='http://127.0.0.1:3000';
assertLocalQaTarget(base);
const output='artifacts/subscription-stitch';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const report={ mode:'Authenticated local admin; browser-only Free/Lite/Premium response fixtures for restricted UI. No billing writes.', errors:[], captures:[], checks:[] };
try {
  const context=await browser.newContext({viewport:{width:1280,height:1024}});
  await context.route('**/*',route=>isForbiddenQaRequest(route.request().url()) ? route.abort() : route.continue());
  await context.route('**/api/spokedu-master/payment/billing/**',route=>route.request().method()==='GET' ? route.continue() : route.abort());
  const page=await context.newPage();
  page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto(`${base}/login`);
  await page.locator('input[name=spk-account]').fill('spm.qa.admin@spokedu.test');
  await page.locator('input[name=spk-secret]').fill(process.env.SPM_QA_PASSWORD);
  await page.locator('button[type=submit]').click();
  await page.waitForURL(url=>!url.pathname.startsWith('/login'),{timeout:60000});
  const access=await (await context.request.get(`${base}/api/spokedu-master/access`)).json();
  assert(access.isAdmin && access.canUseLibrary,'Real admin and Library capability required');
  report.adminVerified=true;
  await page.goto(`${base}/spokedu-lab/library/198`);
  await page.locator('[data-library-detail-v2]').waitFor();
  assert(await page.locator('[data-lesson-access-modal]').count()===0);
  report.checks.push('Entitled real admin sees lesson, no access modal');

  let fixturePlan='free';
  await context.route('**/api/spokedu-master/access*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({...access,isAdmin:false,isCenterOrTeam:false,plan:fixturePlan,subscriptionStatus:fixturePlan==='free'?'none':'active',entitlementSource:fixturePlan==='free'?'none':'billing',canUseLibrary:fixturePlan!=='free',canUseClassTools:fixturePlan!=='free',canUseAttendance:fixturePlan!=='free',canUseRecords:fixturePlan!=='free',canUseSpomove:fixturePlan==='premium',freePreviewProgramIds:[]})}));
  await context.route('**/api/spokedu-master/subscription',route=>route.request().method()==='GET' ? route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({plan:fixturePlan,status:fixturePlan==='free'?'none':'active',isAdmin:false,canCancelAutoBilling:fixturePlan!=='free',billingPlan:fixturePlan==='free'?null:fixturePlan,billingStatus:fixturePlan==='free'?'none':'active',entitlementSource:fixturePlan==='free'?'none':'billing'})}) : route.abort());
  const capture=async(name,width,locator) => {
    await page.evaluate(()=>document.fonts.ready);
    await page.locator('[data-payment-stitch]').evaluate(element=>{let current=element;while(current){current.scrollTop=0;current=current.parentElement;}window.scrollTo(0,0);});
    await page.screenshot({path:`${output}/${name}-${width}-viewport.png`});
    const height=await page.locator('[data-spm-app-shell]').evaluate(e=>Math.ceil(e.scrollHeight)+100);
    await page.setViewportSize({width,height:Math.max(1024,height)});
    await page.locator('[data-payment-stitch]').evaluate(element=>{let current=element;while(current){current.scrollTop=0;current=current.parentElement;}window.scrollTo(0,0);});
    await page.waitForTimeout(200);
    await page.screenshot({path:`${output}/${name}-${width}.png`,fullPage:true});
    if(locator) await locator.screenshot({path:`${output}/${name}-${width}-content.png`});
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
    assert(!overflow,`Overflow ${name}/${width}`);
    report.captures.push({name,width,overflow});
  };
  let paymentHref;
  for(const width of [1280,768,390]) {
    await page.setViewportSize({width,height:1024});
    await page.goto(`${base}/spokedu-lab/library/198?view=all&q=running`);
    await page.locator('[data-lesson-access-modal]').waitFor();
    assert((await page.getByRole('dialog').innerText()).includes('스위치 러닝'));
    paymentHref=await page.getByRole('link',{name:/라이트 구독하기/}).getAttribute('href');
    const parsed=new URL(paymentHref,base);
    assert(parsed.searchParams.get('next').includes('/library/198'));
    await page.screenshot({path:`${output}/gate-${width}.png`});
    await page.getByRole('dialog').screenshot({path:`${output}/gate-${width}-content.png`});
    await page.getByRole('link',{name:/라이트 구독하기/}).click();
    await page.locator('[data-payment-plan="lite"]').waitFor();
    assert((await page.locator('[data-payment-lesson-banner]').innerText()).includes('스위치 러닝'));
    assert((await page.locator('[data-payment-summary]').innerText()).includes('9,900원'));
    await page.getByRole('button',{name:'프리미엄 이용권 선택',exact:true}).click();
    assert((await page.locator('[data-payment-summary]').innerText()).includes('28,900원'));
    assert(await page.locator('[data-payment-plan="premium"] [class*="selected"]').count()===1);
    assert(await page.locator('[data-payment-plan="lite"] [class*="selected"]').count()===0);
    await page.getByRole('button',{name:'라이트 이용권 선택',exact:true}).click();
    await capture('plans',width,page.locator('[data-payment-stitch] main'));
    assert.deepEqual(await page.locator('table tbody tr th').allTextContents(),['놀이체육','수업 운영 및 학생 관리','SPOMOVE']);
    assert(await page.locator('table button').count()===0);
  }
  report.checks.push('Free fixture: selected live title; modal to payment retains ID/next; card selection updates price/badge; three comparison rows without accordions; no overflow');
  await page.setViewportSize({width:1280,height:1024});
  await page.goto(`${base}/spokedu-lab/payment`);
  await page.locator('[data-payment-plan="lite"]').waitFor();
  assert(await page.locator('[data-payment-lesson-banner]').count()===0);
  await capture('direct',1280);
  const cancelParams=new URL(paymentHref,base).searchParams;
  cancelParams.set('code','USER_CANCEL');
  await page.goto(`${base}/spokedu-lab/payment/cancel?${cancelParams}`);
  await page.getByText('카드 등록이 취소되었습니다. 다시 진행하려면 구독 버튼을 선택해 주세요.',{exact:true}).waitFor();
  const previous=await page.getByRole('link',{name:'이전 화면으로 돌아가기',exact:true}).getAttribute('href');
  assert(previous.includes('/library/198'));
  assert((await page.getByRole('link',{name:'다시 시도',exact:true}).getAttribute('href')).includes('journeyId'));
  await page.screenshot({path:`${output}/cancel-1280.png`});
  cancelParams.set('code','AUTH_FAILED');
  await page.goto(`${base}/spokedu-lab/payment/cancel?${cancelParams}`);
  await page.getByText('결제 처리 중 오류가 발생했습니다. 구독은 활성화되지 않았습니다.',{exact:false}).waitFor();
  report.checks.push('Direct entry has no lesson banner; user cancellation differs from failure; retry and previous retain context');
  fixturePlan='lite';
  await context.route('**/api/spokedu-master/payment/billing/upgrade-quote',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({amountDueNow:6500,nextBillingAt:'2026-12-01T00:00:00Z',nextBillingAmount:28900})}));
  await page.goto(`${base}/spokedu-lab/payment?plan=premium`);
  await page.getByRole('button',{name:'프리미엄으로 업그레이드',exact:true}).waitFor();
  assert(await page.locator('button[data-plan-id="lite"]').isDisabled());
  assert((await page.locator('[data-payment-summary]').innerText()).includes('6,500원'));
  await capture('upgrade-fixture',1280);
  fixturePlan='premium';
  await page.goto(`${base}/spokedu-lab/payment`);
  await page.getByRole('link',{name:'구독 관리',exact:true}).waitFor();
  assert(await page.locator('button[data-plan-id]').count()===0);
  report.checks.push('Lite upgrade uses server-quote fixture and blocks Lite repurchase; active Premium has management only');

  for (const [name,reference,current,targetWidth] of [['plans','plans-available','plans-1280-content.png',848],['gate','gate','gate-1280-content.png',420]]) {
    const source=sharp(`${output}/reference/${reference}/screen.png`);
    const normalized=name==='plans' ? await source.extract({left:216,top:89,width:848,height:1443}).png().toBuffer() : await source.extract({left:430,top:278,width:420,height:468}).png().toBuffer();
    const currentMeta=await sharp(`${output}/${current}`).metadata();
    // main includes 24px page gutters; compare cards at the same 848px body width.
    const currentSource=name==='plans' ? sharp(`${output}/${current}`).extract({left:24,top:0,width:currentMeta.width-48,height:currentMeta.height}) : sharp(`${output}/${current}`);
    const actual=await currentSource.resize({width:targetWidth}).png().toBuffer();
    const a=await sharp(normalized).metadata(), b=await sharp(actual).metadata();
    await sharp({create:{width:targetWidth*2+24,height:Math.max(a.height,b.height),channels:3,background:'#f7f9fb'}}).composite([{input:normalized,left:0,top:0},{input:actual,left:targetWidth+24,top:0}]).png().toFile(`${output}/${name}-comparison.png`);
  }
  await writeFile(`${output}/report.json`,JSON.stringify(report,null,2));
  assert(report.errors.length===0,`Page errors: ${report.errors.join(',')}`);
  console.log(JSON.stringify(report));
} finally { await browser.close(); }
