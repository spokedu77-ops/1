const { chromium } = require('playwright');
const fs = require('node:fs');
const mode = process.argv[2] || 'after';
const baseline = mode === 'before';
const root = __dirname;
const selectors = {
  hero: '.web-home-hero', quick: '#service-paths', why: '#showcase',
  metrics: '.web-operating-metrics', cases: '.web-home-cases', cta: '.web-home-final-cta',
};
const probes = {
  rail: '.web-home-hero .web-container', hero: '.web-home-hero', h1: '.web-home-hero h1',
  heroPhoto: '.web-hero-photo', heroImage: '.web-hero-photo img', heroActions: '.web-home-hero .web-actions',
  quickGrid: '#service-paths .web-card-grid', quickCard: '.web-audience-card', quickIcon: '.web-audience-icon',
  quickTitle: '.web-audience-card h3', whyRow: '.web-showcase', whyNumber: '.web-watermark', whyTitle: '.web-showcase h2',
  whyPhoto: '.web-showcase-photo', metrics: '.web-operating-metrics', metricNumber: '.web-operating-metrics dd',
  metricLabel: '.web-operating-metrics dt', caseCard: '.web-case-card', caseImage: '.web-case-image img',
  cta: '.web-cta', ctaTitle: '.web-cta h2', ctaButton: '.web-cta .web-button',
};
(async () => {
  fs.mkdirSync(`${root}/${mode}`, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ reducedMotion: 'reduce' });
  const results = [];
  for (const width of [375, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    const response = await page.goto(`http://127.0.0.1:3000/${baseline ? '?v21baseline=1' : ''}`, { waitUntil: 'networkidle' });
    if (response.status() !== 200) throw Error(`HTTP ${response.status()}`);
    await page.addStyleTag({ content: 'nextjs-portal {display:none!important}' });
    await page.evaluate(async () => { await document.fonts.ready; for (const i of document.images) i.loading = 'eager'; await Promise.all([...document.images].map(i => i.decode().catch(() => {}))); });
    const result = await page.evaluate(({ probes, width }) => {
      const measure = node => {
        if (!node) return null;
        const s = getComputedStyle(node), r = node.getBoundingClientRect();
        const css = {};
        for (const key of ['fontFamily','fontSize','fontWeight','lineHeight','letterSpacing','paddingTop','paddingRight','paddingBottom','paddingLeft','borderRadius','backgroundColor','color','gap','gridTemplateColumns','objectFit','objectPosition','minHeight','maxWidth']) css[key] = s[key];
        return { tag: node.tagName, class: node.className, text: node.textContent.slice(0,180), box: { width:r.width,height:r.height,x:r.x,y:r.y+scrollY }, css };
      };
      return { width, overflow:document.documentElement.scrollWidth > innerWidth+1,
        brokenImages:[...document.images].filter(i=>!i.naturalWidth).map(i=>i.getAttribute('src')),
        probes:Object.fromEntries(Object.entries(probes).map(([key,selector])=>[key,measure(document.querySelector(selector))])),
        sections:[...document.querySelectorAll('main > section, main > .web-home-final-cta')].map(n=>({id:n.id,classes:n.className})),
        quickCards:[...document.querySelectorAll('.web-audience-card')].map(n=>({height:n.getBoundingClientRect().height,linkBottom:n.querySelector('.web-text-link').getBoundingClientRect().bottom-n.getBoundingClientRect().top})),
        images:[...document.querySelectorAll('main img')].map(i=>({src:i.getAttribute('src'),width:i.clientWidth,height:i.clientHeight,naturalWidth:i.naturalWidth,naturalHeight:i.naturalHeight,fit:getComputedStyle(i).objectFit,position:getComputedStyle(i).objectPosition})),
      };
    }, { probes, width });
    results.push(result);
    await page.screenshot({ path:`${root}/${mode}/home-${width}.png`,fullPage:true });
    await page.addStyleTag({ content:'header,header * {opacity:0!important;visibility:hidden!important;transition:none!important}' });
    for (const [name,selector] of Object.entries(selectors)) {
      await page.locator(selector).first().screenshot({ path:`${root}/${mode}/${name}-${width}.png`,animations:'disabled' });
    }
    if (!baseline) {
      await page.locator('#spomove-experience').screenshot({ path:`${root}/${mode}/spomove-${width}.png`,animations:'disabled' });
      await page.locator('#field-stories').screenshot({ path:`${root}/${mode}/proof-${width}.png`,animations:'disabled' });
    }
    console.log(`${mode} ${width}: overflow=${result.overflow}, broken=${result.brokenImages.length}`);
  }
  fs.writeFileSync(`${root}/${mode}.json`,JSON.stringify(results,null,2));
  await browser.close();
})();
