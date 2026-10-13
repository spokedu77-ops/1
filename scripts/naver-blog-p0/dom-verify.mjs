/**
 * 네이버 스마트에디터(PostUpdateForm) DOM 전용 검증.
 * window.SE / componentListStore 등 비공개 API는 사용하지 않는다.
 */

/** @typedef {{ logNo: string, preserve: { titleExact?: string, imageComponentCount: number, hashtags: string[], mustKeepTextSnippets: string[] }, edits: Array<{ id: string, blocks: Array<{ paragraphs: Array<{ text: string, link?: string }> }> }> }} PostConfig */

/**
 * 편집기 페이지에서 실행할 스냅샷 수집 함수 본문 (문자열).
 * Cursor Browser: browser_cdp → Runtime.evaluate { expression, returnByValue: true }
 */
export const COLLECT_SNAPSHOT_FN = `(() => {
  const wrap = document.querySelector('.se-components-wrap');
  const topLevel = wrap
    ? Array.from(wrap.children).filter((el) => String(el.className).includes('se-component'))
    : [];
  const fingerprint = topLevel.map((el) => {
    const kinds = String(el.className)
      .split(/\\s+/)
      .filter((c) => c.startsWith('se-') && c !== 'se-component')
      .slice(0, 3);
    const kind = kinds.join('|') || 'unknown';
    const textHead = (el.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 56);
    return kind + '::' + textHead;
  });
  const links = Array.from(document.querySelectorAll('[data-href]'))
    .map((el) => ({
      text: (el.innerText || '').trim().slice(0, 80),
      href: el.getAttribute('data-href') || '',
    }))
    .filter((l) => l.href.startsWith('http'));
  const paras = Array.from(document.querySelectorAll('.se-text-paragraph')).map((p) =>
    (p.innerText || '').trim(),
  );
  const tags = paras.filter((t) => t.startsWith('#'));
  const bodyText = document.body?.innerText || '';
  const saveStatus = {
    publishVisible: Array.from(document.querySelectorAll('button')).some(
      (b) => (b.innerText || '').trim() === '발행',
    ),
    saveButtonLabels: Array.from(document.querySelectorAll('button,[aria-label]'))
      .map((el) => (el.innerText || el.getAttribute('aria-label') || '').trim())
      .filter((t) => /저장|임시|draft|save/i.test(t)),
    bodyHints: ['저장됨', '저장 중', '임시저장', '자동 저장', '자동저장'].filter((k) =>
      bodyText.includes(k),
    ),
  };
  return {
    url: location.href,
    isEditor: /PostUpdateForm\\.naver/.test(location.href),
    logNo: (location.href.match(/logNo=(\\d+)/) || [])[1] || null,
    title: document.querySelector('.se-title-text')?.innerText?.trim() || null,
    componentCount: topLevel.length,
    imageCount: document.querySelectorAll('.se-component.se-image').length,
    fingerprint,
    links,
    tags,
    saveStatus,
    paragraphCount: paras.length,
    paragraphs: paras,
  };
})()`;

/**
 * @param {ReturnType<typeof collectSnapshotFromResult>} snapshot
 * @param {PostConfig} post
 * @param {{ componentCount: number, imageCount: number, fingerprint: string[] } | null} baseline
 */
export function verifySnapshot(snapshot, post, baseline) {
  const issues = [];
  const checks = [];

  const ok = (name, pass, detail) => {
    checks.push({ name, pass, detail });
    if (!pass) issues.push({ name, detail });
  };

  ok('editor-url', snapshot.isEditor && snapshot.logNo === post.logNo, {
    url: snapshot.url,
    logNo: snapshot.logNo,
  });

  if (post.preserve.titleExact) {
    ok('title', snapshot.title === post.preserve.titleExact, {
      expected: post.preserve.titleExact,
      actual: snapshot.title,
    });
  }

  if (post.preserve.imageComponentCount != null) {
    ok('image-count', snapshot.imageCount === post.preserve.imageComponentCount, {
      expected: post.preserve.imageComponentCount,
      actual: snapshot.imageCount,
    });
  }

  const hashtagLines = post.preserve.hashtags ?? [];
  for (const tagLine of hashtagLines) {
    ok(`hashtag:${tagLine.slice(0, 20)}`, snapshot.tags.includes(tagLine), {
      missing: tagLine,
    });
  }

  for (const snippet of post.preserve.mustKeepTextSnippets) {
    const paras = snapshot.paragraphs || [];
    const found =
      paras.some((t) => t.includes(snippet)) ||
      snapshot.fingerprint.some((f) => f.includes(snippet)) ||
      snapshot.links.some((l) => l.text.includes(snippet) || l.href.includes(snippet));
    ok(`snippet:${snippet.slice(0, 24)}`, found, { snippet });
  }

  for (const edit of post.edits) {
    for (const block of edit.blocks) {
      for (const para of block.paragraphs) {
        if (para.link) {
          const link = snapshot.links.find(
            (l) => l.href === para.link && l.text.includes(para.text.slice(0, 12)),
          );
          ok(`link:${edit.id}:${para.text.slice(0, 16)}`, !!link, {
            expected: { text: para.text, href: para.link },
            matches: snapshot.links.filter((l) => l.href === para.link),
          });
        } else {
          const head = para.text.slice(0, 20);
          const inParas = (snapshot.paragraphs || []).some((t) => t.includes(head));
          const inFp = snapshot.fingerprint.some((f) => f.includes(head));
          ok(`text:${edit.id}:${para.text.slice(0, 16)}`, inParas || inFp, {
            text: para.text.slice(0, 40),
          });
        }
      }
    }
  }

  if (baseline) {
    ok('component-count-vs-baseline', snapshot.componentCount === baseline.componentCount, {
      expected: baseline.componentCount,
      actual: snapshot.componentCount,
    });
    ok('image-count-vs-baseline', snapshot.imageCount === baseline.imageCount, {
      expected: baseline.imageCount,
      actual: snapshot.imageCount,
    });
    const fpLoss = baseline.fingerprint.filter((line) => !snapshot.fingerprint.includes(line));
    ok('fingerprint-no-loss', fpLoss.length === 0, {
      missingLines: fpLoss.slice(0, 5),
      missingCount: fpLoss.length,
    });
  }

  return {
    pass: issues.length === 0,
    checks,
    issues,
    snapshot: {
      logNo: snapshot.logNo,
      componentCount: snapshot.componentCount,
      imageCount: snapshot.imageCount,
      saveStatus: snapshot.saveStatus,
    },
  };
}
