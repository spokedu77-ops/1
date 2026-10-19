/** @param {import('playwright').Page} page */
export async function assessContactFlow(page) {
  let typeSelectorVisible = false;
  let typeSelectionWorked = false;
  let formVisibleAfterSelection = false;
  let submitControlPresent = false;
  let submitControlVisible = false;
  let submitDisabled = false;
  let formLayoutValid = false;
  let failureReason = null;

  typeSelectorVisible = await page.locator('#contact-type-select').isVisible().catch(() => false);
  if (!typeSelectorVisible) {
    failureReason = 'type_selector_missing';
    return finish(false);
  }

  const typeButton = page.locator('#contact-type-select button[type="button"][data-track]').first();
  const typeBox = await typeButton.boundingBox().catch(() => null);
  if (!typeBox || typeBox.width < 24) {
    failureReason = 'type_button_not_usable';
    return finish(false);
  }

  await typeButton.click();
  await page.waitForTimeout(400);

  typeSelectionWorked =
    (await page.locator('#contact-type-select button[aria-pressed="true"]').count()) > 0;

  const form = page.locator('form:has(button[type="submit"])').first();
  formVisibleAfterSelection = await form.isVisible().catch(() => false);

  const submit = page.locator('form button[type="submit"]').first();
  submitControlPresent = (await submit.count()) > 0;
  if (submitControlPresent) {
    submitControlVisible = await submit.isVisible().catch(() => false);
    submitDisabled = (await submit.getAttribute('disabled')) != null;
    const sb = await submit.boundingBox().catch(() => null);
    if (!submitControlVisible || !sb || sb.height < 24 || sb.width < 24) {
      failureReason = 'submit_not_visible';
    }
  } else {
    failureReason = 'submit_missing_after_selection';
  }

  if (!typeSelectionWorked && !failureReason) failureReason = 'type_selection_failed';
  if (!formVisibleAfterSelection && !failureReason) failureReason = 'form_not_visible';

  const noOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 2,
  );
  formLayoutValid =
    formVisibleAfterSelection && submitControlPresent && submitControlVisible && noOverflow;

  const pass =
    typeSelectorVisible &&
    typeSelectionWorked &&
    formVisibleAfterSelection &&
    submitControlPresent &&
    submitControlVisible &&
    formLayoutValid;

  return finish(pass);

  function finish(contactPass) {
    return {
      typeSelectorVisible,
      typeSelectionWorked,
      formVisibleAfterSelection,
      submitControlPresent,
      submitControlVisible,
      submitDisabled,
      formLayoutValid,
      failureReason: contactPass ? null : failureReason ?? 'contact_flow_incomplete',
      contactPass,
      ctaUsable: contactPass,
      ctaFailureKind: contactPass
        ? null
        : failureReason?.includes('submit') || failureReason?.includes('form')
          ? 'REAL_INTERACTION_DEFECT'
          : 'QA_SELECTOR_ERROR',
    };
  }
}
