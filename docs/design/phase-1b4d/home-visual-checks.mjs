/** Shared runtime checks (no server spawn). */

export function checkLabel(pass, label, detail) {
  return { label, status: pass ? 'PASS' : 'FAIL', detail };
}

export async function measureGateway(page) {
  return page.evaluate(() => {
    const cards = [...document.querySelectorAll('a[class*="gatewayCard"]')].filter(
      (el) => el.tagName === 'A' && el.querySelector('[class*="gatewayCardTitle"]'),
    );
    const cardDetails = cards.map((c) => {
      const cs = getComputedStyle(c);
      const link = c.querySelector('[class*="gatewayCardLink"]');
      return {
        borderTopWidth: parseFloat(cs.borderTopWidth) || 0,
        borderWidth: parseFloat(cs.borderWidth) || 0,
        bg: cs.backgroundColor,
        href: c.getAttribute('href'),
        linkText: link?.textContent?.trim(),
      };
    });
    const rects = cards.map((c) => c.getBoundingClientRect());
    const row =
      rects.length === 3 &&
      Math.abs(rects[0].top - rects[1].top) < 8 &&
      Math.abs(rects[1].top - rects[2].top) < 8;
    const col =
      rects.length === 3 &&
      rects[1].top > rects[0].bottom - 4 &&
      rects[2].top > rects[1].bottom - 4;
    const bordersOk =
      cardDetails.length === 3 &&
      cardDetails.every((d) => d.borderTopWidth >= 1 || d.borderWidth >= 1) &&
      cardDetails.every((d) => d.href);
    return {
      count: cards.length,
      rowDesktop: row,
      colMobile: col,
      bordersOk,
      cardDetails,
    };
  });
}

export async function measureRecords(page, { mobileMinRatio = null } = {}) {
  return page.evaluate((minRatio) => {
    const section = document.querySelector('#home-records-heading')?.closest('section');
    const bg = section ? getComputedStyle(section).backgroundColor : null;
    const cards = [...(section?.querySelectorAll('[class*="tileCard"]') ?? [])];
    const tiles = cards.map((card, i) => {
      const media = card.querySelector('[class*="tileMedia"]');
      const info = card.querySelector('[class*="tileInfo"]');
      const img = media?.querySelector('img');
      const mr = media?.getBoundingClientRect();
      const ir = img?.getBoundingClientRect();
      const mcs = media ? getComputedStyle(media) : null;
      const ratio = mr && mr.width > 0 ? mr.height / mr.width : 0;
      const heightOk = minRatio == null ? true : mr != null && mr.height >= mr.width * minRatio;
      return {
        index: i,
        href: card.getAttribute('href'),
        mediaW: mr?.width,
        mediaH: mr?.height,
        ratio,
        heightOk,
        imgNatural: img?.naturalWidth ?? 0,
        aspectRatio: mcs?.aspectRatio,
        flex: mcs?.flex,
        infoH: info?.getBoundingClientRect().height,
      };
    });
    const allImages = tiles.every((t) => t.imgNatural > 0);
    const allLinks = tiles.every((t) => t.href);
    const allInfo = tiles.every((t) => (t.infoH ?? 0) > 20);
    const mobileHeightsOk = minRatio == null ? true : tiles.every((t) => t.heightOk);
    return {
      tileCount: tiles.length,
      bg,
      tiles,
      allImages,
      allLinks,
      allInfo,
      mobileHeightsOk,
    };
  }, mobileMinRatio);
}

export async function measureOverflow(page) {
  return page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
}

export async function measureHero941(page) {
  await page.locator('section[aria-labelledby="home-hero-heading"]').scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollTo(0, 0));
  return page.evaluate(() => {
    const primary = document.querySelector('section[aria-labelledby="home-hero-heading"] a[class*="btnPrimary"]');
    const secondary = document.querySelector('section[aria-labelledby="home-hero-heading"] a[class*="btnSecondary"]');
    const r = primary?.getBoundingClientRect();
    const s = secondary?.getBoundingClientRect();
    const vh = window.innerHeight;
    const pass =
      r && s && r.top >= 0 && s.top >= 0 && r.bottom <= vh && s.bottom <= vh;
    return { ctaBottom: r?.bottom, secondaryBottom: s?.bottom, vh, pass: Boolean(pass) };
  });
}

export async function measureLab(page) {
  return page.evaluate(() => {
    const section = document.querySelector('#home-master-heading')?.closest('section');
    const text = section?.textContent ?? '';
    const img = section?.querySelector('[class*="productFrame"] img');
    const cs = img ? getComputedStyle(img) : null;
    return {
      has144: /144\+/.test(text),
      objectFit: cs?.objectFit,
      imgNatural: img?.naturalWidth ?? 0,
    };
  });
}

export const REQUIRED_WIDTHS = ['390', '767', '768', '834', '941', '1023', '1024', '1440'];
