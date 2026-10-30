import { chromium } from 'playwright';
import { writeFile, readFile } from 'node:fs/promises';
import { installLocalQaRouteGuard } from './lib/qa-network-guard.mjs';

const out = '.qa-spokedu/hero-final';
const browser = await chromium.launch();
const context = await browser.newContext();
await installLocalQaRouteGuard(context);
const page = await context.newPage();
const results = { widths: [], links: [], forms: [] };
try {
  for (const width of [320,375,390,430,768,1024,1280,1440,1920]) {
    await page.setViewportSize({width,height:1000});
    await page.goto('http://127.0.0.1:3000/', {waitUntil:'domcontentloaded',timeout:120000});
    await page.locator('#home-heading').waitFor();
    await page.evaluate(async()=>{await document.fonts.ready; await Promise.all([...document.querySelectorAll('#top img')].map(i=>i.decode().catch(()=>{})));});
    const audit = await page.locator('#top').evaluate(el=>({
      overflow: [...el.querySelectorAll('*')].filter(e=>e.getBoundingClientRect().right>innerWidth+1 || e.getBoundingClientRect().left< -1).map(e=>e.tagName),
      lines:[...el.querySelectorAll('h1 span')].map(e=>({text:e.textContent,height:e.getBoundingClientRect().height,lineHeight:getComputedStyle(e).lineHeight})),
      image:{src:el.querySelector('img').getAttribute('src'),loaded:el.querySelector('img').naturalWidth>0,ratio:el.querySelector('img').parentElement.getBoundingClientRect().width/el.querySelector('img').parentElement.getBoundingClientRect().height},
      links:[...el.querySelectorAll('a')].map(e=>({text:e.textContent.trim(),href:e.getAttribute('href')})),
    }));
    await page.screenshot({path:`${out}/after-${width}.png`,fullPage:false});
    results.widths.push({width,...audit});
  }
  await page.setViewportSize({width:1440,height:1000});
  await page.goto('http://127.0.0.1:3000/', {waitUntil:'domcontentloaded',timeout:120000});
  await page.locator('#top a[href="#services"]').click();
  await page.waitForTimeout(500);
  results.anchor = await page.locator('#services').evaluate(e=>({hash:location.hash,top:e.getBoundingClientRect().top}));
  for (const href of ['/contact','/education','/private','/spokedu-lab']) {
    await page.goto('http://127.0.0.1:3000/', {waitUntil:'domcontentloaded',timeout:120000});
    await page.locator(`#top a[href="${href}"]`).click();
    await page.waitForURL(`**${href}`,{timeout:60000});
    results.links.push({href,url:page.url(),h1:await page.locator('h1').allTextContents(),forms:await page.locator('form').count()});
  }
  for (const [route,section,endpoint,fields] of [
    ['/education','#contact','/api/dispatch/leads',{organization:'LOCAL QA',name:'QA',contact:'010-0000-0000',message:'LOCAL QA ONLY'}],
    ['/private','#apply','/api/private/leads',{parent_name:'LOCAL QA',phone:'010-0000-0000',region:'서울 강동구'}],
  ]) {
    let payload;
    await page.route(`**${endpoint}`,async r=>{payload=r.request().postDataJSON();await r.fulfill({json:{ok:true,leadId:'local-qa-only'}});});
    await page.goto(`http://127.0.0.1:3000${route}`, {waitUntil:'domcontentloaded',timeout:120000});
    const form=page.locator(`${section} form`);
    await form.waitFor();
    for (const [name,value] of Object.entries(fields)) await form.locator(`[name="${name}"]`).fill(value);
    await form.locator('input[type=checkbox]').last().check({force:true});
    await form.locator('button[type=submit]').click();
    await page.waitForTimeout(700);
    results.forms.push({route,visible:await form.isVisible(),payload,status:await form.locator('[role=status]').allTextContents(),mode:'intercepted POST; no database write'});
    await page.screenshot({path:`${out}/form-${route.slice(1)}.png`,fullPage:false});
  }
  const before=await readFile(`${out}/before.tsx`,'utf8');
  const after=await readFile('app/spokedu/components/home-v0-landing.tsx','utf8');
  results.nonHeroUnchanged=before.slice(before.indexOf('      <section id="services"')).replaceAll('\r\n','\n')===after.slice(after.indexOf('      <section id="services"')).replaceAll('\r\n','\n');
} finally {
  await writeFile(`${out}/results.json`,JSON.stringify(results,null,2));
  await browser.close();
}
