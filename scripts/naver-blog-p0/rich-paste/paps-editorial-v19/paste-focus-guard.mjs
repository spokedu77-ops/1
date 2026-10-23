/**
 * Non-destructive, Naver-native style boundary at an EMPTY post-image anchor.
 * No Enter, no Range, no mutation of existing text, no post-reset re-click.
 * The effect callbacks are explicit to make their order unit-testable.
 */
export async function pasteWithFreshBodyStyle({
  putClipboard, focusAnchor, setBodyFormat, setNormalSize,
  setBoldOff, readBeforePaste, pressPaste,
}) {
  // Preparing clipboard must happen before restoring the editor caret.
  await putClipboard();
  await focusAnchor();
  await setBodyFormat();
  // Toolbar format menus may have shifted focus; refocus before font/Bold reset.
  // Crucially this is the LAST click on text. Do not refocus after Bold OFF.
  await focusAnchor();
  await setNormalSize();
  // Make Bold OFF the last toolbar change. The v16 sequence ended with a click
  // on the text, reloading the previous heading's cached style.
  await setBoldOff();
  const before=await readBeforePaste();
  if (!before || !before.anchor) {
    const e=new Error('Anchor disappeared after typography reset');
    e.code='BODY_ANCHOR_NOT_VERIFIED';throw e;
  }
  if (before.boldToolbarPresent && before.boldToolbarActive) {
    const e=new Error('Bold still enabled at post-photo empty anchor before paste');
    e.code='BODY_ANCHOR_BOLD_STILL_ACTIVE';throw e;
  }
  // No focus/click/selection commands allowed between this and Ctrl+V.
  await pressPaste();
  return {order:'clipboard → anchor → body → anchor → 16px → boldOff → readback → paste',
    lastAnchorClickBeforeFinalBoldOff:true,postResetClick:false,prePaste:before};
}
