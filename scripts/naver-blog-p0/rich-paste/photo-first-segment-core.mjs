/**
 * Pure, testable checks for a photo-first Naver editor document.
 * The adapter reads DOM snapshots, but this module never changes the editor.
 */
export const normalizeEditorText = s => String(s ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();

function fail(code, details) {
  const e = new Error(details || code);
  e.code = code;
  throw e;
}

export function resolveSafePhotoTailAnchor(snapshot) {
  if (!snapshot?.canvas) fail('CANVAS_MISSING');
  if (snapshot.images?.length !== 1) fail('PHOTO_COUNT_CHANGED', `imageCount=${snapshot.images?.length}`);
  if (snapshot.components?.filter(c => c.kind === 'image').length !== 1)
    fail('PHOTO_MODULE_AMBIGUOUS');
  const imageIndex = snapshot.components.findIndex(c => c.kind === 'image');
  if (imageIndex < 0) fail('PHOTO_MODULE_MISSING');
  if ((snapshot.paragraphs || []).some(p => normalizeEditorText(p.text)))
    fail('BODY_NOT_EMPTY_AFTER_PHOTO');
  // Never target a text paragraph that precedes the photograph. Never create a
  // new one with Range, ArrowDown or Enter. The editor must provide it natively.
  const anchors = (snapshot.paragraphs || []).filter(p =>
    p.kind === 'text' && p.componentIndex > imageIndex &&
    Number.isInteger(p.bodyLocatorIndex) && !normalizeEditorText(p.text));
  if (!anchors.length) fail('POST_IMAGE_TEXT_ANCHOR_UNAVAILABLE',
    'Naver did not expose an existing empty text paragraph after the image; no edit attempted.');
  // First trailing empty paragraph in document order. If it is in an invisible
  // or unowned canvas, the DOM adapter omits it from snapshot.paragraphs.
  const anchor = anchors[0];
  if (!snapshot.components[anchor.componentIndex] ||
      snapshot.components[anchor.componentIndex].kind !== 'text')
    fail('POST_IMAGE_ANCHOR_COMPONENT_INVALID');
  return { bodyLocatorIndex: anchor.bodyLocatorIndex,
    componentIndex: anchor.componentIndex, imageComponentIndex: imageIndex,
    candidateCount: anchors.length };
}

export function verifyFirstSegmentAfterPhoto(snapshot, title, expectedBlocks) {
  if (!snapshot?.canvas) fail('CANVAS_MISSING');
  if (normalizeEditorText(snapshot.title) !== normalizeEditorText(title))
    fail('TITLE_CHANGED');
  if (snapshot.images?.length !== 1 || snapshot.images[0].loaded !== true)
    fail('PHOTO_LOST_OR_NOT_LOADED', `images=${snapshot.images?.length}`);
  if (expectedBlocks?.length !== 3 || expectedBlocks[2]?.type !== 'heading')
    fail('SEGMENT_STRUCTURE_INVALID');
  const imageIndex = snapshot.components?.findIndex(c => c.kind === 'image') ?? -1;
  if (imageIndex < 0) fail('PHOTO_COMPONENT_MISSING');
  const meaningful = snapshot.paragraphs.filter(p => normalizeEditorText(p.text));
  if (meaningful.length !== expectedBlocks.length)
    fail('SEGMENT_COUNT_MISMATCH', `actual=${meaningful.length} expected=${expectedBlocks.length}`);
  for (let i = 0; i < expectedBlocks.length; i++) {
    if (normalizeEditorText(meaningful[i].text) !== normalizeEditorText(expectedBlocks[i].text))
      fail('SEGMENT_TEXT_MISMATCH', `paragraph=${i} actual=${JSON.stringify(meaningful[i].text?.slice(0,120))}`);
    if (meaningful[i].componentIndex <= imageIndex)
      fail('TEXT_NOT_AFTER_PHOTO', `paragraph=${i} component=${meaningful[i].componentIndex}, photo=${imageIndex}`);
    if (!['left','start'].includes(meaningful[i].align))
      fail('SEGMENT_NOT_LEFT_ALIGNED', `paragraph=${i} align=${meaningful[i].align}`);
  }
  const heading = meaningful[2];
  if (!heading.fullBold) fail('SEGMENT_HEADING_NOT_BOLD');
  if (!(heading.fontSizes || []).some(size => Number.parseFloat(size) >= 20))
    fail('SEGMENT_HEADING_SIZE_INVALID', JSON.stringify(heading.fontSizes));
  return {
    imageCount: snapshot.images.length,
    paragraphs: meaningful.length,
    textMatch: true,
    heading: { index:2, fullBold:true, fontSizes: heading.fontSizes },
    leftAligned: true,
    photoFirst: true,
    imageComponentIndex: imageIndex,
    paragraphComponentIndexes: meaningful.map(p => p.componentIndex),
  };
}
