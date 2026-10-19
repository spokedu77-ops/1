/** Browser-side measurement (passed to page.evaluate) */

export function buildMeasurePayload() {
  return (cfg) => {
    const pickEl = (selectors) => {
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (r.width >= 8 && r.height >= 8) return el;
      }
      return null;
    };

    const isVisibleChain = (el) => {
      let node = el;
      while (node && node !== document.body) {
        const st = window.getComputedStyle(node);
        if (st.display === 'none' || st.visibility === 'hidden') return false;
        if (Number(st.opacity) === 0) return false;
        if (st.pointerEvents === 'none' && node === el) return false;
        node = node.parentElement;
      }
      return true;
    };

    const isUsableControl = (el) => {
      if (!el || !isVisibleChain(el)) return false;
      const r = el.getBoundingClientRect();
      return r.width >= 24 && r.height >= 24;
    };

    const pickUsableLink = (selectors) => {
      for (const sel of selectors) {
        const nodes = document.querySelectorAll(sel);
        for (const found of nodes) {
          if (isUsableControl(found)) return { el: found, sel };
          if (found && !isUsableControl(found)) return { el: null, sel, rejected: true };
        }
      }
      return { el: null, sel: null };
    };

    const textEl = pickEl(cfg.textSelectors ?? ['main h1', 'h1']);
    const textRect = textEl?.getBoundingClientRect() ?? null;
    const primaryTextLeft = textRect ? textRect.left : null;

    const railEl = pickEl(cfg.railSelectors ?? []);
    const railRect = railEl?.getBoundingClientRect() ?? null;
    let railContentLeft = null;
    if (railEl && railRect) {
      const pad = parseFloat(window.getComputedStyle(railEl).paddingLeft) || 0;
      railContentLeft = railRect.left + pad;
    }

    const alignmentActual = cfg.useTextAnchor ? primaryTextLeft : railContentLeft;
    const alignmentFound = alignmentActual != null;

    const h1 = textEl ?? document.querySelector('main h1, h1');
    const h1Rect = h1?.getBoundingClientRect();
    const h1Style = h1 ? window.getComputedStyle(h1) : null;
    const h1Visible =
      !!h1 &&
      !!h1Rect &&
      h1Rect.width > 0 &&
      h1Rect.height > 8 &&
      h1Style.visibility !== 'hidden' &&
      Number(h1Style.opacity) > 0.05 &&
      (h1.textContent?.trim().length ?? 0) > 0;

    let firstScreenOk = true;
    if (cfg.firstScreenSelector) {
      const fs = document.querySelector(cfg.firstScreenSelector);
      const fsR = fs?.getBoundingClientRect();
      const fsSt = fs ? window.getComputedStyle(fs) : null;
      firstScreenOk =
        !!fs &&
        !!fsR &&
        fsR.height > 8 &&
        Number(fsSt?.opacity ?? 1) > 0.05 &&
        (fs.textContent?.trim().length ?? 0) > 0 &&
        fsR.top < window.innerHeight * 0.85;
    }

    let ctaEl = null;
    let ctaMatchedSelector = null;
    let ctaFoundButNotUsable = false;
    if (!cfg.skipGenericCta) {
      for (const sel of cfg.ctaSelectors ?? []) {
        const nodes = document.querySelectorAll(sel);
        if (nodes.length === 0) continue;
        for (const found of nodes) {
          ctaMatchedSelector = sel;
          if (isUsableControl(found)) {
            ctaEl = found;
            break;
          }
          ctaFoundButNotUsable = true;
        }
        if (ctaEl) break;
      }
    }

    const ctaRect = ctaEl?.getBoundingClientRect() ?? null;
    const ctaUsable = cfg.skipGenericCta ? true : isUsableControl(ctaEl);
    const ctaFailureKind = cfg.skipGenericCta
      ? null
      : ctaUsable
        ? null
        : ctaMatchedSelector == null
          ? 'selector_miss'
          : ctaFoundButNotUsable
            ? 'not_usable'
            : 'selector_miss';

    let foldPrimaryVisible = true;
    if (cfg.foldPrimaryVisible && h1) {
      const r = h1.getBoundingClientRect();
      foldPrimaryVisible = r.top < window.innerHeight && r.bottom > 0 && Number(getComputedStyle(h1).opacity) > 0.05;
    }

    const doc = document.documentElement;
    const horizontalOverflow = doc.scrollWidth > doc.clientWidth + 2;

    let pendingImages = 0;
    for (const img of document.querySelectorAll('img')) {
      const st = window.getComputedStyle(img);
      const r = img.getBoundingClientRect();
      if (st.display === 'none' || r.width < 8) continue;
      if (!img.complete || img.naturalWidth <= 0) pendingImages += 1;
    }

    return {
      primaryTextLeft,
      textSelectorMatched: textEl ? cfg.textSelectors?.find((s) => document.querySelector(s) === textEl) : null,
      railContentLeft,
      alignmentActual,
      alignmentFound,
      railWidth: railRect?.width ?? null,
      railFound: !!railEl,
      h1Visible,
      firstScreenOk,
      foldPrimaryVisible,
      ctaUsable,
      ctaFailureKind,
      ctaSelectorMatched: ctaMatchedSelector,
      ctaBox: ctaRect ? { x: ctaRect.x, y: ctaRect.y, w: ctaRect.width, h: ctaRect.height } : null,
      horizontalOverflow,
      pendingImages,
      pageErrors: window.__gateAErrors ?? [],
    };
  };
}
