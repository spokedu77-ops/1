/** Per-route alignment expectations (DOM/CSS SSOT — not global site-container only). */

export const STANDARD_MAX = 1368;
export const LAB_NAV_MAX = 1120;

export function expectedGutter(viewport) {
  if (viewport >= 1200) return 48;
  if (viewport >= 768) return 32;
  return 20;
}

export function expectedStandardContentLeft(viewport) {
  const gutter = expectedGutter(viewport);
  const outer = Math.min(viewport, STANDARD_MAX);
  return (viewport - outer) / 2 + gutter;
}

export function expectedLabNavPadding(viewport) {
  if (viewport <= 640) return 18;
  if (viewport <= 1023) return 24;
  return 40;
}

export function expectedLabNavContentLeft(viewport) {
  const outer = Math.min(viewport, LAB_NAV_MAX);
  return (viewport - outer) / 2 + expectedLabNavPadding(viewport);
}

/** SPOMOVE --gutter: clamp(1.25rem, 4vw, 3rem) */
export function spomoveGutterPx(viewport) {
  const mobile = 20;
  const wide = 48;
  return Math.min(wide, Math.max(mobile, viewport * 0.04));
}

const SPOMOVE_TEXT_RAIL_PX = 1220; // 76.25rem

export function expectedSpomoveHeroTextLeft(viewport) {
  const gutter = spomoveGutterPx(viewport);
  const rail = Math.min(SPOMOVE_TEXT_RAIL_PX, viewport);
  return Math.max(gutter, (viewport - rail) / 2 + gutter);
}

/** education-hub.module.css hero copy padding / heroInner margin */
export function expectedEducationHeroTextLeft(viewport) {
  if (viewport <= 767) return 20;
  if (viewport <= 1023) return 32;
  if (viewport <= 1199) return 40;
  return 80;
}

/** records hero: centered rail with side inset (40px at ≤1199 on 1024 viewport) */
export function expectedRecordsHeroTextLeft(viewport) {
  if (viewport <= 767) return 20;
  if (viewport <= 1023) return 32;
  if (viewport <= 1199) return 40;
  return expectedStandardContentLeft(viewport);
}

/** Focused marketing pages (contact, private): container gutter + inner hero inset */
export function focusedMarketingHeroInset(viewport) {
  if (viewport >= 1200) return 40;
  if (viewport >= 1024) return 40;
  if (viewport >= 767) return 32;
  return 20;
}

export function expectedFocusedMarketingHeroTextLeft(viewport) {
  return expectedStandardContentLeft(viewport) + focusedMarketingHeroInset(viewport);
}

/**
 * @param {{ route: string, measure: string, alignmentMode?: string }} cfg
 * @param {number} viewport
 */
export function expectedPrimaryTextLeft(cfg, viewport) {
  switch (cfg.alignmentMode ?? cfg.measure) {
    case 'lab-nav':
      return expectedLabNavContentLeft(viewport);
    case 'spomove-hero':
      return expectedSpomoveHeroTextLeft(viewport);
    case 'education-hero':
      return expectedEducationHeroTextLeft(viewport);
    case 'records-hero':
      return expectedRecordsHeroTextLeft(viewport);
    case 'contact-page':
    case 'focused-marketing':
      return expectedFocusedMarketingHeroTextLeft(viewport);
    case 'standard':
    case 'site-container':
    case 'marketing-rail':
    default:
      return expectedStandardContentLeft(viewport);
  }
}

/** @type {Record<string, { alignmentMode: string, textSelectors: string[] }>} */
export const ALIGNMENT_ANCHORS = {
  '/': { alignmentMode: 'standard', textSelectors: ['#home-hero-heading', 'main h1'] },
  '/education': {
    alignmentMode: 'education-hero',
    textSelectors: ['#edu-hero h1', '.hero h1', 'h1'],
  },
  '/spomove': {
    alignmentMode: 'spomove-hero',
    textSelectors: ['main .hero h1', '[class*="hero"] h1', 'main h1'],
  },
  '/records': {
    alignmentMode: 'records-hero',
    textSelectors: ['#records-title', '.hero h1', 'main h1'],
  },
  '/spokedu-lab': {
    alignmentMode: 'lab-nav',
    textSelectors: ['[class*="masterLocalNavInner"]', '.hero h1'],
  },
};
