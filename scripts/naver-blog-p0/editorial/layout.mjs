/** SPOKEDU editorial display model: never alters FINAL article wording or block order. */
export const EDITORIAL_SLOTS = Object.freeze([
  { id: 'cover', after: -1, layout: 'cover', min: 1, max: 1, label: '대표 수업 사진' },
  { id: 'activity-one', after: 2, layout: 'pair', min: 1, max: 2, label: '첫 번째 활동 단계' },
  { id: 'activity-two', after: 7, layout: 'pair', min: 1, max: 2, label: '두 번째 활동 단계' },
  { id: 'activity-three', after: 12, layout: 'single', min: 1, max: 1, label: '세 번째 활동 단계' },
]);
export const HEADING_INDICES = Object.freeze([2, 7, 12]);

const str = (v) => String(v ?? '');
export const compact = (v) => str(v).replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
export function escapeHtml(value) {
  return str(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

export function validateSource({ title, blocks, paragraphs, headingIndexes }) {
  if (!title || !Array.isArray(blocks) || !Array.isArray(paragraphs)) throw new Error('SOURCE_REQUIRED');
  if (blocks.length !== 19 || paragraphs.length !== 19) throw new Error('SOURCE_BLOCK_COUNT_NOT_19');
  const indices = blocks.flatMap((b, i) => b.type === 'heading' ? [i] : []);
  if (JSON.stringify(indices) !== JSON.stringify(HEADING_INDICES) ||
      JSON.stringify(headingIndexes) !== JSON.stringify(HEADING_INDICES)) throw new Error('SOURCE_HEADING_INDEX_MISMATCH');
  if (!blocks.every((b, i) => compact(b.text) === compact(paragraphs[i]))) throw new Error('SOURCE_TEXT_MISMATCH');
  return true;
}

const REQUIRED_IMAGE_PROOFS = ['sourceFile', 'sourceName', 'sessionMatchEvidence', 'useRightsApproved', 'portraitRightsCleared', 'activityMatchReviewed'];
/**
 * A photo is only usable after verification. Metadata-only Drive candidates are never automatically used.
 * Files are physically validated and copied to a local generated output in build-editorial-preview.mjs.
 */
export function validatePhotoMeta(photo, slot) {
  if (!photo || typeof photo !== 'object') return ['invalid_photo'];
  const issues = [];
  if (photo.slot !== slot.id) issues.push('slot_mismatch');
  for (const key of REQUIRED_IMAGE_PROOFS) {
    if (typeof photo[key] !== 'string' || !photo[key].trim()) issues.push(`${key}_missing`);
  }
  for (const key of ['useRightsApproved', 'portraitRightsCleared', 'activityMatchReviewed']) {
    if (photo[key] !== 'approved') issues.push(`${key}_not_approved`);
  }
  if (!['jpg', 'jpeg', 'png', 'webp'].includes(str(photo.sourceFile).split('.').pop().toLowerCase())) {
    issues.push('invalid_file_extension');
  }
  if (photo.caption && typeof photo.caption !== 'string') issues.push('invalid_caption');
  return issues;
}

export function compileLayout(source, photoEntries = [], options = {}) {
  validateSource(source);
  if (!Array.isArray(photoEntries) || photoEntries.length > 8) throw new Error('PHOTO_LIMIT_EXCEEDED');
  const slotModels = EDITORIAL_SLOTS.map((slot) => {
    const supplied = photoEntries.filter((p) => p.slot === slot.id);
    return { ...slot, entries: supplied, metadataIssues: supplied.flatMap((p) => validatePhotoMeta(p, slot)),
      ready: supplied.length >= slot.min && supplied.length <= slot.max && supplied.every((p) => !validatePhotoMeta(p, slot).length) };
  });
  const unassigned = photoEntries.filter((p) => !EDITORIAL_SLOTS.some((s) => s.id === p.slot));
  if (unassigned.length) throw new Error(`UNKNOWN_PHOTO_SLOT:${unassigned.map((p) => p.slot).join(',')}`);
  const highlightIndices = Array.isArray(options.highlightIndices) ? options.highlightIndices : [18];
  if (highlightIndices.length > 2 || highlightIndices.some((i) => !Number.isInteger(i) || i < 0 || i > 18 || source.blocks[i].type === 'heading')) throw new Error('INVALID_HIGHLIGHT_INDEX');
  const relatedLinks = Array.isArray(options.relatedLinks) ? options.relatedLinks : [];
  if (relatedLinks.length > 3 || relatedLinks.some((l) => !l || l.reviewed !== true || typeof l.title !== 'string' || !l.title.trim() || !/^https:\/\/[^\s]+$/.test(l.url||''))) throw new Error('INVALID_RELATED_LINKS');
  return { title: source.title, blocks: source.blocks.map((b, index) => ({...b, index})),
    slots: slotModels, highlightIndices, relatedLinks, editorialReady: slotModels.every((s) => s.ready) };
}

const img = (photo) => photo?.outputUrl && photo?.verified ? `<figure class="photo"><img alt="${escapeHtml(photo.alt || photo.sourceName)}" src="${escapeHtml(photo.outputUrl)}" loading="lazy"/><figcaption>${escapeHtml(photo.caption || '')}</figcaption></figure>` : '';
const photoPlaceholder = (slot) => `<div class="photo-pending" role="note"><span>PHOTO SLOT · ${escapeHtml(slot.id)}</span><strong>${escapeHtml(slot.label)}</strong><small>수업 일치·초상권·이용 승인된 원본 사진만 사용</small></div>`;
function renderSlot(slot) {
  if (!slot.ready || !slot.entries.some((p) => p.verified)) return photoPlaceholder(slot);
  const photos = slot.entries.filter((p) => p.verified);
  if (photos.length < slot.min || photos.length > slot.max) return photoPlaceholder(slot);
  const actualLayout = photos.length === 1 && slot.layout === 'pair' ? 'single' : slot.layout;
  return `<div class="photos photos--${actualLayout}">${photos.map(img).join('')}</div>`;
}

const STYLES = `
:root { color-scheme:light; --ink:#152d42; --navy:#112b42; --blue:#196aad; --muted:#627889; --line:#dae4eb; --pale:#f3f7fa; }
* {box-sizing:border-box} body {margin:0;background:#edf2f6;color:var(--ink);font-family:"Pretendard","Noto Sans KR","Malgun Gothic",Arial,sans-serif}
.editorial {width:min(100%,800px);margin:22px auto 80px;background:white;box-shadow:0 18px 48px #102b4712}
.masthead {display:flex;align-items:center;justify-content:space-between;padding:22px 42px;border-bottom:1px solid var(--line);letter-spacing:.06em}
.brand {font-size:15px;font-weight:900;letter-spacing:.16em}.brand span{color:var(--blue)}.type{font-size:10px;color:var(--muted);font-weight:700}
.hero {background:var(--navy);color:white;padding:45px 42px 38px;position:relative}.eyebrow {color:#9fd2f5;letter-spacing:.2em;font-size:11px;font-weight:800}
.hero h1 {font-size:clamp(26px,4.2vw,36px);font-weight:800;line-height:1.38;letter-spacing:-.048em;margin:17px 0 19px;word-break:keep-all}.hero-rule{height:2px;background:linear-gradient(90deg,#6dc6fa,transparent);width:80px}
.hero-media {margin:0}.hero-media .photos--cover figure {margin:0}.hero-media img {width:100%;aspect-ratio:16/9;object-fit:cover;display:block}.hero-media .photo-pending {min-height:230px;border-radius:0}
.content {padding:44px 58px 72px}.section-marker {font-size:10px;color:var(--blue);font-weight:800;letter-spacing:.15em;margin:26px 0 13px}
.body-text {font-size:15.5px;line-height:1.95;letter-spacing:-.02em;white-space:pre-line;overflow-wrap:anywhere;margin:15px 0 22px;word-break:keep-all}
.section-title {font-size:24px;line-height:1.48;letter-spacing:-.052em;color:var(--navy);font-weight:800;padding:23px 0 17px;border-bottom:2px solid var(--navy);margin:53px 0 27px;word-break:keep-all}
.body-text--insight{border-left:3px solid var(--blue);background:var(--pale);padding:17px 19px;font-weight:600;margin:29px 0 30px}.section-title::before{content:"";display:block;width:25px;height:4px;background:var(--blue);margin-bottom:13px}
.visual-slot {margin:35px 0 35px}.photos{display:grid;gap:9px}.photos--pair{grid-template-columns:repeat(2,minmax(0,1fr))}.photos--single,.photos--cover{grid-template-columns:1fr}
.photo {margin:0;min-width:0}.photo img{display:block;width:100%;aspect-ratio:4/3;object-fit:cover;background:#f3f6f8}.photos--single img{aspect-ratio:16/10}.photo figcaption{font-size:11px;color:var(--muted);line-height:1.6;padding:9px 3px}
.photo-pending {border:1px dashed #8eacc0;background:repeating-linear-gradient(135deg,#f1f6fa,#f1f6fa 12px,#eaf2f7 12px,#eaf2f7 24px);min-height:165px;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;gap:9px;padding:14px;color:#48657b}
.photo-pending span{font-size:10px;letter-spacing:.15em;font-weight:800}.photo-pending strong{font-size:15px}.photo-pending small{font-size:11px}
.related{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:20px 0}.related a{border:1px solid var(--line);padding:14px;display:block;text-decoration:none;color:var(--ink);background:white;font-size:12px;font-weight:700;line-height:1.55}.related a span{display:block;color:var(--blue);font-size:10px;margin-bottom:5px}.footer {padding:29px 42px 32px;background:var(--pale);border-top:1px solid var(--line)}.footer b{font-size:14px}.footer p{font-size:12px;line-height:1.7;color:var(--muted)}
.watermark{color:#7f939e;font-size:10px;font-weight:700;letter-spacing:.07em;margin-top:18px}
@media(max-width:620px) {.editorial{margin:0;box-shadow:none}.masthead{padding:15px 20px}.hero{padding:30px 23px}.content{padding:28px 23px 50px}.body-text{font-size:15px;line-height:1.85}.section-title{font-size:21px}.photos--pair{gap:6px}.footer{padding:24px}}
`;

/** Local-only structural preview. Never paste entire HTML into Naver (CSS would be stripped). */
export function renderEditorialHtml(layout) {
  const slotsByAfter = new Map(layout.slots.map((s) => [s.after, s]));
  const cover = slotsByAfter.get(-1);
  const body = layout.blocks.map((b) => {
    const html = b.type === 'heading' ? `<h2 class="section-title" data-block-index="${b.index}">${escapeHtml(b.text)}</h2>` :
      `<p class="body-text${layout.highlightIndices.includes(b.index) ? ' body-text--insight' : ''}" data-block-index="${b.index}">${escapeHtml(b.text)}</p>`;
    const slot = slotsByAfter.get(b.index);
    return html + (slot ? `<div class="visual-slot" data-slot="${escapeHtml(slot.id)}">${renderSlot(slot)}</div>` : '');
  }).join('\n');
  const related = layout.relatedLinks.length ? `<nav class="related" aria-label="관련 수업 사례">${layout.relatedLinks.map(l => `<a rel="noopener noreferrer" target="_blank" href="${escapeHtml(l.url)}"><span>RELATED STORY ↗</span>${escapeHtml(l.title)}</a>`).join('')}</nav>` : '';
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${escapeHtml(layout.title)} — SPOKEDU Preview</title><style>${STYLES}</style></head><body><main class="editorial"><header class="masthead"><div class="brand">SPO<span>KEDU</span></div><div class="type">FIELD STORY · EDITORIAL PREVIEW</div></header><div class="hero"><div class="eyebrow">SPOKEDU · MOVEMENT EDUCATION</div><h1>${escapeHtml(layout.title)}</h1><div class="hero-rule"></div></div><div class="hero-media" data-slot="cover">${renderSlot(cover)}</div><article class="content">${body}</article><footer class="footer"><b>SPOKEDU · 움직임으로 아이의 성장을 설계합니다.</b><p>현장 활동과 교육적 관찰을 중심으로 기록합니다. 모든 사진은 실제 촬영본 확인 및 사용 승인 후 반영합니다.</p>${related}<div class="watermark">LOCAL REVIEW ONLY · NOT A PUBLISHED POST</div></footer></main></body></html>`;
}
