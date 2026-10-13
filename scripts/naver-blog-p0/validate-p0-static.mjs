#!/usr/bin/env node
/**
 * source JSON + manifest posts[] 정적 검증 (브라우저/DOM 불필요).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(readFileSync(join(__dirname, 'manifest.json'), 'utf8'));
const source = JSON.parse(
  readFileSync(
    join(__dirname, 'source/SPOKEDU_P0_잔여6건_Cursor_수정데이터_20261009.json'),
    'utf8',
  ),
);

const issues = [];
const passes = [];

function ok(name, pass, detail) {
  if (pass) passes.push({ name, detail });
  else issues.push({ name, detail });
}

function isHttpUrl(s) {
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

const logNoRe = /^\d{12}$/;
const sourcePosts = source.posts ?? [];
ok('source-post-count', sourcePosts.length === 6, { count: sourcePosts.length });
ok('source-execute-order', (source.executeOrder ?? []).length === 6, {
  order: source.executeOrder,
});

const manifestByLog = new Map(manifest.posts.map((p) => [p.logNo, p]));
for (const logNo of source.executeOrder ?? []) {
  ok(`manifest-has-logNo:${logNo}`, manifestByLog.has(logNo), { logNo });
}

for (const sp of sourcePosts) {
  ok(`logNo-format:${sp.logNo}`, logNoRe.test(sp.logNo), { logNo: sp.logNo });
  ok(`url-logNo:${sp.logNo}`, sp.url?.includes(sp.logNo), { url: sp.url });
  const mp = manifestByLog.get(sp.logNo);
  if (!mp) continue;
  ok(`title-match:${sp.logNo}`, mp.title === sp.title, {
    source: sp.title,
    manifest: mp.title,
  });
  ok(`phase-match:${sp.logNo}`, mp.phase === sp.phase, { phase: mp.phase });

  for (const action of sp.actions ?? []) {
    ok(`anchor-nonempty:${sp.logNo}:${action.kind}`, Boolean(action.anchor?.trim()), {
      anchor: action.anchor,
    });
    if (action.anchor && action.mustMatch != null) {
      ok(`mustMatch-1:${sp.logNo}:${action.kind}`, action.mustMatch === 1, {
        mustMatch: action.mustMatch,
      });
    }
    for (const block of action.blocks ?? []) {
      ok(`block-text:${sp.logNo}`, Boolean(block.text?.trim()), { block });
      if (block.href) ok(`block-href:${sp.logNo}`, isHttpUrl(block.href), { href: block.href });
    }
    if (action.kind === 'replace_text_and_link') {
      ok(`replace-new-href:${sp.logNo}`, isHttpUrl(action.newText), { newText: action.newText });
    }
  }
}

for (const post of manifest.posts) {
  ok(`manifest-id:${post.id}`, /^p0-/.test(post.id), { id: post.id });
  for (const edit of post.edits ?? []) {
    ok(`edit-anchor:${post.id}:${edit.id}`, Boolean(edit.anchorText?.trim()), {
      anchorText: edit.anchorText,
    });
    for (const block of edit.blocks ?? []) {
      for (const para of block.paragraphs ?? []) {
        if (para.link) ok(`edit-link:${post.id}`, isHttpUrl(para.link), { link: para.link });
      }
    }
  }
  for (const le of post.linkEdits ?? []) {
    ok(`link-edit-hrefs:${post.id}`, isHttpUrl(le.replaceText), { replaceText: le.replaceText });
  }
  for (const vc of post.verifyChecks ?? []) {
    ok(`verify-check:${post.id}`, Boolean(vc.anchor?.trim()), { anchor: vc.anchor });
  }
}

const ids = manifest.posts.map((p) => p.id);
ok('manifest-unique-ids', ids.length === new Set(ids).size, { ids });

const result = {
  pass: issues.length === 0,
  manifestPostCount: manifest.posts.length,
  sourceMappedCount: (source.executeOrder ?? []).filter((l) => manifestByLog.has(l)).length,
  passCount: passes.length,
  issueCount: issues.length,
  issues,
};

console.log(JSON.stringify(result, null, 2));
process.exit(result.pass ? 0 : 1);
