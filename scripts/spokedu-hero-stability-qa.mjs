import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';
import { installLocalQaRouteGuard } from './lib/qa-network-guard.mjs';
const browser=await chromium.launch();
const context=await browser.newContext();
await installLocalQaRouteGuard(context);
await context.addInitScript(()=>{
  window.heroShifts=[];
  new PerformanceObserver(list=>{for(const e of list.getEntries()) if(!e.hadRecentInput) window.heroShifts.push({value:e.value,time:e.startTime});}).observe({type:'layout-shift',buffered:true});
});
const results=[];
try {
  for(const width of [320,375,390,430,768,1024,1280,1440,1920]){
    const page=await context.newPage({viewport:{width,height:1000}});
    await page.setViewportSize({width,height:1000});
    await page.goto('http://127.0.0.1:3000/',{waitUntil:'domcontentloaded',timeout:120000});
    await page.locator('#top img').evaluate(i=>i.decode());
    await page.evaluate(()=>document.fonts.ready);
    await page.waitForTimeout(500);
    await page.locator('#top a').first().focus();
    await page.keyboard.press('Tab');
    results.push(await page.evaluate(()=>({width:innerWidth,shifts:window.heroShifts,focusHref:document.activeElement.getAttribute('href'),focusVisible:document.activeElement.matches(':focus-visible'),outline:getComputedStyle(document.activeElement).outline,highlight:getComputedStyle(document.querySelector('#home-heading span:nth-child(2)')).color})));
    await page.locator('#top').screenshot({path:`.qa-spokedu/hero-final/hero-${width}.png`});
    await page.close();
  }
}finally{await writeFile('.qa-spokedu/hero-final/stability.json',JSON.stringify(results,null,2));await browser.close();}
