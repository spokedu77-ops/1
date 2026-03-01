let _reportAnimated = false;

const _reportObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (!e.isIntersecting || _reportAnimated) return;
    _reportAnimated = true;
    e.target.querySelectorAll(".barbg > span").forEach((el, idx) => {
      const v = REPORT_METRICS[idx]?.value ?? 0;
      el.style.width = `${Math.max(0, Math.min(100, v))}%`;
    });
    _reportObserver.disconnect();
  });
}, { threshold: 0.25 });

const _fadeObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add("in");
      _fadeObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.12 });
