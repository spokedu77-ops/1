function initBrand() {
  const { name, tagline, address, hours, privacyUrl } = CONFIG.center;
  const setText = (id, t) => { const el = document.getElementById(id); if (el) el.textContent = t; };
  setText("brandName", name);
  setText("brandTagline", tagline);
  setText("footName", name);
  const ctaCall = document.getElementById("ctaCall");
  if (ctaCall) ctaCall.href = `tel:${fullPhone()}`;
  const infoEl = document.getElementById("centerInfo");
  if (infoEl) infoEl.innerHTML = [
    escHtml(name),
    `주소: ${escHtml(address)}`,
    `운영: ${escHtml(hours)}`,
    `문의: <b>${escHtml(formatPhone())}</b>`,
  ].join("<br/>");
  const hintEl = document.getElementById("centerHint");
  if (hintEl) hintEl.innerHTML = `센터: <b>${escHtml(name)}</b><br/>${escHtml(address)}<br/>운영: ${escHtml(hours)}`;
  const footLine = document.getElementById("footLine");
  if (footLine) footLine.innerHTML = `${escHtml(address)}<br/>운영: ${escHtml(hours)} · 문의: <b>${escHtml(formatPhone())}</b>`;
  const privacyLink = document.getElementById("privacyLink");
  if (privacyLink) privacyLink.href = privacyUrl;
  const privacyConsent = document.getElementById("privacyConsent");
  if (privacyConsent) privacyConsent.href = privacyUrl;
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
}

function initMenuDropdown() {
  document.querySelectorAll(".nav-cat").forEach((wrap) => {
    const trigger = wrap.querySelector(".menu-trigger");
    if (!trigger) return;
    trigger.addEventListener("click", (e) => {
      e.preventDefault();
      document.querySelectorAll(".nav-cat").forEach((w) => w.classList.remove("menu-dropdown-open"));
      wrap.classList.toggle("menu-dropdown-open");
      trigger.setAttribute("aria-expanded", wrap.classList.contains("menu-dropdown-open"));
    });
  });
  document.addEventListener("click", (e) => {
    if (e.target.closest(".nav-cat")) return;
    document.querySelectorAll(".nav-cat").forEach((w) => {
      w.classList.remove("menu-dropdown-open");
      const t = w.querySelector(".menu-trigger");
      if (t) t.setAttribute("aria-expanded", "false");
    });
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      document.querySelectorAll(".nav-cat").forEach((w) => {
        w.classList.remove("menu-dropdown-open");
        const t = w.querySelector(".menu-trigger");
        if (t) t.setAttribute("aria-expanded", "false");
      });
    }
  });
}

function boot() {
  showDevBanner();
  initBrand();
  initMenuDropdown();
  renderSlider();
  setupSliderControls();
  renderSchedule("");
  renderReport();
  initFormValidation();
  document.getElementById("ageFilter")?.addEventListener("change", (e) => {
    renderSchedule(e.target.value);
  });
  document.querySelectorAll(".fade").forEach(el => _fadeObserver.observe(el));
  window.addEventListener("beforeunload", () => {
    if (typeof _blobUrls !== "undefined") _blobUrls.forEach(url => URL.revokeObjectURL(url));
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
