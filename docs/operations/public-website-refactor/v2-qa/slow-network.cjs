const { chromium } = require('playwright');
const fs = require('node:fs');
(async () => {
  const browser = await chromium.launch();
  const results = [];
  for (const width of [375, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 } });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 200000, uploadThroughput: 93750 });
    await page.addInitScript(() => {
      window.qaShifts = [];
      window.qaLcp = 0;
      new PerformanceObserver(list => { for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.qaShifts.push({ value: entry.value, time: entry.startTime }); }).observe({ type: 'layout-shift', buffered: true });
      new PerformanceObserver(list => { for (const entry of list.getEntries()) window.qaLcp = entry.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
    });
    await page.goto('http://127.0.0.1:3000', { waitUntil: 'load' });
    await page.waitForTimeout(6000);
    results.push(await page.evaluate(width => ({ width, conditions: '1.6Mbps / 150ms latency / cold cache / local dev', layoutShiftSum: window.qaShifts.reduce((sum, shift) => sum + shift.value, 0), lcpMs: window.qaLcp, overflow: document.documentElement.scrollWidth > innerWidth + 1, heroLoaded: document.querySelector('#brand img').naturalWidth > 0 }), width));
    await context.close();
  }
  await browser.close();
  fs.writeFileSync(__dirname + '/slow-network.json', JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results));
})();
