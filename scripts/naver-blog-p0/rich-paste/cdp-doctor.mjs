#!/usr/bin/env node
/** Non-invasive CDP diagnostics. No page creation, login or upload. */
import { chromium } from 'playwright-core';
import { probeChromeProtocol } from './cdp-health.mjs';
const url = process.env.NAVER_CDP_URL || 'http://127.0.0.1:9222';
const p = await probeChromeProtocol(url, {httpTimeoutMs: 3000,commandTimeoutMs: 5000});
if (!p.ok) {
  console.log(JSON.stringify({result:'CDP_BROWSER_UNRESPONSIVE',code:p.code,stage:p.stage,
    detail:p.detail,elapsedMs:p.elapsedMs,advice:'Chrome 창을 강제 종료하지 마세요. 저장하지 않은 다른 탭을 먼저 확인하세요.'},null,2));
  process.exit(2);
}
let result = {result:'CDP_PROTOCOL_PASS', browser:p.browser, targets:p.targets,probeMs:p.elapsedMs};
try {
  const start=performance.now();
  const b=await chromium.connectOverCDP(p.wsEndpoint,{timeout:16000});
  result={...result,result:'CDP_PLAYWRIGHT_PASS',playwrightMs:Math.round(performance.now()-start),contexts:b.contexts().length};
} catch (e) {
  result={...result,result:'CDP_PLAYWRIGHT_INIT_FAILED',detail:String(e.message||e).slice(0,1800),
    advice:'Chrome DevTools responds but Playwright initialization fails. Do not kill shared Chrome; use a new isolated debug profile or diagnose Playwright/Chrome compatibility.'};
}
console.log(JSON.stringify(result,null,2));
process.exit(result.result==='CDP_PLAYWRIGHT_PASS'?0:2);
