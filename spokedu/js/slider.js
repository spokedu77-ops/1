const _blobUrls = [];

function makeSvgBlob(svgStr) {
  const blob = new Blob([svgStr], { type: "image/svg+xml" });
  return URL.createObjectURL(blob);
}

function makePlaceholder(slide) {
  const { col1, col2 } = slide.svgTheme;
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="800" viewBox="0 0 1400 800">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#0B0F1A"/>
      <stop offset="1" stop-color="#070A12"/>
    </linearGradient>
    <linearGradient id="a" x1="0" x2="1">
      <stop offset="0" stop-color="${col1}"/>
      <stop offset="1" stop-color="${col2}"/>
    </linearGradient>
  </defs>
  <rect width="1400" height="800" fill="url(#bg)"/>
  <circle cx="280" cy="160" r="260" fill="${col1}" opacity="0.12"/>
  <circle cx="1160" cy="150" r="280" fill="${col2}" opacity="0.10"/>
  <rect x="90" y="90" width="1220" height="620" rx="28" fill="white" opacity="0.05" stroke="white" stroke-opacity="0.12"/>
  <rect x="120" y="120" width="520" height="42" rx="14" fill="url(#a)" opacity="0.95"/>
  <text x="140" y="150" font-family="Arial" font-size="18" fill="#0B0F1A" font-weight="800">SPOKEDU · ${slide.title.toUpperCase()}</text>
  <text x="120" y="230" font-family="Arial" font-size="42" fill="#EAF0FF" font-weight="900">${slide.heading}</text>
  <text x="120" y="274" font-family="Arial" font-size="16" fill="#A9B4D6" font-weight="700">${slide.body}</text>
  <rect x="120" y="320" width="1160" height="290" rx="24" fill="white" opacity="0.05"/>
  <rect x="160" y="460" width="1040" height="12" rx="6" fill="white" opacity="0.10"/>
  <rect x="160" y="460" width="680" height="12" rx="6" fill="url(#a)" opacity="0.90"/>
  <text x="160" y="530" font-family="Arial" font-size="14" fill="#9AA6C8">SAMPLE IMAGE — 실사진으로 교체하세요</text>
</svg>`;
  const url = makeSvgBlob(svg);
  _blobUrls.push(url);
  return url;
}

function renderSlider() {
  const track = document.getElementById("track");
  if (!track) return;
  const total = SLIDES_DATA.length;
  track.innerHTML = "";
  SLIDES_DATA.forEach((s, idx) => {
    const imgSrc = s.src || makePlaceholder(s);
    const slide = document.createElement("div");
    slide.className = "slide";
    slide.setAttribute("role", "group");
    slide.setAttribute("aria-label", `슬라이드 ${idx + 1} / ${total}: ${escHtml(s.title)}`);
    slide.setAttribute("tabindex", "0");
    const img = document.createElement("img");
    img.src = imgSrc;
    img.alt = "";
    img.setAttribute("aria-hidden", "true");
    img.setAttribute("loading", "lazy");
    img.width = 1400;
    img.height = 800;
    slide.innerHTML = `
      <div class="cap">
        <div class="pill"><b>${escHtml(s.title)}</b> · ${escHtml(s.subtitle)}</div>
        <div class="note">${escHtml(s.note)}<span>${idx + 1} / ${total}</span></div>
      </div>
    `;
    slide.insertBefore(img, slide.firstChild);
    track.appendChild(slide);
  });
  track.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") scrollSlider(1);
    if (e.key === "ArrowLeft") scrollSlider(-1);
  });
}

function scrollSlider(dir) {
  const track = document.getElementById("track");
  if (!track) return;
  const first = track.querySelector(".slide");
  if (!first) return;
  const step = first.getBoundingClientRect().width + 12;
  track.scrollBy({ left: dir * step, behavior: "smooth" });
}

function setupSliderControls() {
  document.getElementById("prevBtn")?.addEventListener("click", () => scrollSlider(-1));
  document.getElementById("nextBtn")?.addEventListener("click", () => scrollSlider(1));
}
