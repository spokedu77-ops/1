/**
 * Smart Editor ONE may insert zero-width placeholder text in an empty line.
 * Never ignore substantive text or whitespace within the 19 existing paragraphs.
 * Pure functions: no browser access, no document mutation.
 */
export const canonical = (value) => String(value ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
export const isEditorEmpty = (value) =>
  String(value ?? '').replace(/[\s\u00a0\u200b\u200c\u200d\u2060\ufeff\u00ad\u034f\u180e]/gu, '') === '';

const clipped = (p) => ({
  text: String(p.text ?? '').slice(0, 95),
  codepoints: [...String(p.text ?? '')].slice(0, 18).map((c) => c.codePointAt(0).toString(16)),
  empty: isEditorEmpty(p.text),
});

/** Remove only truly empty editor placeholders. This is read-only verification. */
export function reconcileParagraphs(rawParagraphs, expectedTexts) {
  const kept = rawParagraphs.filter((p) => !isEditorEmpty(p.text));
  const actualTexts = kept.map((p) => canonical(p.text));
  const expected = expectedTexts.map(canonical);
  const textMatch = actualTexts.length === expected.length &&
    actualTexts.every((p, i) => p === expected[i]);
  return {
    kept,
    actualTexts,
    textMatch,
    totalRaw: rawParagraphs.length,
    ignoredEmpty: rawParagraphs.length - kept.length,
    rawDiagnostics: textMatch ? null : rawParagraphs.map((p, i) => ({index: i, ...clipped(p)})),
  };
}

/** Require exactly one new empty paragraph at the intended position.
 * A second nonempty paragraph, split sentence or unexpected reordering is NEVER allowed.
 */
export function validateNewImageSlot(beforeRaw, afterRaw, expectedTexts, anchorAfter) {
  const before = reconcileParagraphs(beforeRaw, expectedTexts);
  const after = reconcileParagraphs(afterRaw, expectedTexts);
  const expected = expectedTexts.map(canonical);
  const anchorPhysical = anchorAfter === -1
    ? beforeRaw.findIndex((p) => canonical(p.text) === expected[0])
    : beforeRaw.findIndex((p) => canonical(p.text) === expected[anchorAfter]);
  const expectedInsertion = anchorAfter === -1 ? anchorPhysical : anchorPhysical + 1;
  const insertionValid = anchorPhysical >= 0 &&
    beforeRaw.length + 1 === afterRaw.length &&
    isEditorEmpty(afterRaw[expectedInsertion]?.text) &&
    afterRaw.every((p, idx) => {
      if (idx === expectedInsertion) return true;
      const previous = beforeRaw[idx < expectedInsertion ? idx : idx - 1];
      return previous && canonical(p.text) === canonical(previous.text);
    });
  return {
    ok: before.textMatch && after.textMatch && insertionValid,
    beforeTextMatch: before.textMatch,
    afterTextMatch: after.textMatch,
    beforeRawCount: beforeRaw.length,
    afterRawCount: afterRaw.length,
    afterMeaningfulCount: after.actualTexts.length,
    beforeIgnoredEmpty: before.ignoredEmpty,
    afterIgnoredEmpty: after.ignoredEmpty,
    anchorAfter,
    expectedInsertion,
    insertionValid,
    afterRawDiagnostics: !insertionValid || !after.textMatch ? afterRaw.map((p, i) => ({index: i, ...clipped(p)})) : undefined,
  };
}
