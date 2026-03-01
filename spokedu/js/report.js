function renderReport() {
  const bars = document.getElementById("bars");
  if (!bars) return;
  bars.innerHTML = "";
  REPORT_METRICS.forEach(m => {
    const v = Math.max(0, Math.min(100, m.value));
    const row = document.createElement("div");
    row.className = "barrow";
    const label = document.createElement("div");
    label.textContent = m.key;
    const barbg = document.createElement("div");
    barbg.className = "barbg";
    barbg.setAttribute("role", "progressbar");
    barbg.setAttribute("aria-valuenow", String(v));
    barbg.setAttribute("aria-valuemin", "0");
    barbg.setAttribute("aria-valuemax", "100");
    barbg.setAttribute("aria-label", m.key);
    const bar = document.createElement("span");
    bar.style.width = "0%";
    barbg.appendChild(bar);
    const val = document.createElement("div");
    val.textContent = String(v);
    val.style.textAlign = "right";
    val.style.color = "rgba(234,240,255,.82)";
    row.append(label, barbg, val);
    bars.appendChild(row);
  });
  const rep = document.getElementById("reportImg");
  if (rep && SLIDES_DATA[4]) {
    rep.src = SLIDES_DATA[4].src || makePlaceholder(SLIDES_DATA[4]);
    rep.alt = "";
    rep.setAttribute("aria-hidden", "true");
  }
  const reportEl = document.querySelector("#report .report");
  if (reportEl && !_reportAnimated) {
    _reportObserver.observe(reportEl);
  }
}
