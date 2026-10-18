/** B5 hero DOM checks (Playwright page.evaluate). */
export async function measureHeroB5Copy(page) {
  return page.evaluate(() => {
    const hero = document.querySelector('section[aria-labelledby="home-hero-heading"]');
    if (!hero) return { ok: false, reason: 'no-hero' };
    const h1s = hero.querySelectorAll('h1');
    const text = hero.textContent ?? '';
    const english = /MOVEMENT\s*BECOMES\s*LEARNING/i.test(text);
    const eyebrow = text.includes('아동 · 청소년 · 특수 체육교육');
    const h1Text = h1s[0]?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
    const expectedH1 = '움직임으로 아이의 성장을 설계합니다.';
    const lead = hero.querySelector('p[class*="heroLead"]')?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
    const expectedLead =
      '아이들을 직접 가르치고 체육수업에 필요한 프로그램과 도구를 만듭니다.';
    const imgs = hero.querySelectorAll('img');
    const primary = hero.querySelector('a[href="/education"]');
    const secondary = hero.querySelector('a[href="/spokedu-lab"]');
    const secondaryIsBtn = secondary?.className.includes('btnSecondary');
    const secondaryText = secondary?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
    const img = imgs[0];
    const imgOk = img && img.complete && img.naturalWidth > 0;
    const src = img?.getAttribute('src') ?? '';
    return {
      h1Count: h1s.length,
      h1Match: h1Text === expectedH1,
      leadMatch: lead === expectedLead,
      english,
      eyebrow,
      imgCount: imgs.length,
      imgOk,
      srcIncludes: src.includes('home-hero-coaching'),
      primaryHref: primary?.getAttribute('href'),
      secondaryHref: secondary?.getAttribute('href'),
      secondaryIsBtn,
      secondaryText,
      ok:
        h1s.length === 1 &&
        h1Text === expectedH1 &&
        lead === expectedLead &&
        !english &&
        !eyebrow &&
        imgs.length === 1 &&
        imgOk &&
        src.includes('home-hero-coaching') &&
        primary?.getAttribute('href') === '/education' &&
        secondary?.getAttribute('href') === '/spokedu-lab' &&
        !secondaryIsBtn &&
        secondaryText === '수업자료 둘러보기 →',
    };
  });
}

export async function measureHero941(page) {
  await page.locator('section[aria-labelledby="home-hero-heading"]').scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollTo(0, 0));
  return page.evaluate(() => {
    const hero = document.querySelector('section[aria-labelledby="home-hero-heading"]');
    const primary = hero?.querySelector('a[href="/education"]');
    const secondary = hero?.querySelector('a[href="/spokedu-lab"]');
    const r = primary?.getBoundingClientRect();
    const s = secondary?.getBoundingClientRect();
    const vh = window.innerHeight;
    const pass =
      r && s && r.top >= 0 && s.top >= 0 && r.bottom <= vh && s.bottom <= vh;
    return { ctaBottom: r?.bottom, secondaryBottom: s?.bottom, vh, pass: Boolean(pass) };
  });
}

export async function measureHeroAspect(page) {
  return page.evaluate(() => {
    const media = document.querySelector(
      'section[aria-labelledby="home-hero-heading"] [class*="heroVisual"] [class*="media"]',
    );
    if (!media) return { ok: false };
    const r = media.getBoundingClientRect();
    const ratio = r.width / r.height;
    const target = 16 / 9;
    return { w: r.width, h: r.height, ratio, ok: Math.abs(ratio - target) < 0.08 };
  });
}

export async function measureHeroOverlap(page) {
  return page.evaluate(() => {
    const hero = document.querySelector('section[aria-labelledby="home-hero-heading"]');
    if (!hero) return { ok: false };
    const nodes = [...hero.querySelectorAll('h1, p, a, img, [class*="media"]')];
    const rects = nodes.map((n) => ({ n, r: n.getBoundingClientRect() }));
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i].r;
        const b = rects[j].r;
        const overlap =
          a.width > 0 &&
          b.width > 0 &&
          a.left < b.right - 2 &&
          a.right > b.left + 2 &&
          a.top < b.bottom - 2 &&
          a.bottom > b.top + 2;
        if (overlap && rects[i].n !== rects[j].n) {
          const tagA = rects[i].n.tagName;
          const tagB = rects[j].n.tagName;
          if (tagA === 'IMG' || tagB === 'IMG') continue;
          return { ok: false, pair: [tagA, tagB] };
        }
      }
    }
    return { ok: true };
  });
}
