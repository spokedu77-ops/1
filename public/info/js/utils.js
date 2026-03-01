/** DOM 이스케이핑 (XSS 방어) */
function escHtml(s) {
  const d = document.createElement("div");
  d.textContent = String(s ?? "");
  return d.innerHTML;
}

function fullPhone() {
  return CONFIG.phoneParts.join("");
}

function formatPhone() {
  const p = CONFIG.phoneParts;
  return p.join("-");
}

function scrollToId(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function toggleDrawer(open) {
  const drawer = document.getElementById("drawer");
  if (!drawer) return;
  drawer.classList.toggle("open", !!open);
  drawer.setAttribute("aria-hidden", open ? "false" : "true");
  document.body.style.overflow = open ? "hidden" : "";
  if (open) {
    drawer.querySelector(".panel .btn")?.focus();
  }
}

function statusLabel(s) { return s === "limited" ? "Limited" : s === "wait" ? "Waitlist" : "Open"; }
function slotClass(s) { return s === "limited" ? "limited" : s === "wait" ? "wait" : ""; }

function showDevBanner() {
  const b = document.getElementById("devBanner");
  if (b && !CONFIG.leadEndpoint && location.hostname !== "localhost") {
    b.classList.add("show");
  }
}
