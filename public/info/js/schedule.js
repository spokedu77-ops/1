function renderSchedule(ageFilter) {
  const grid = document.getElementById("scheduleGrid");
  if (!grid) return;
  const dayMap = new Map(DAYS_ORDER.map(d => [d, []]));
  SLOTS
    .filter(s => !ageFilter || s.age === ageFilter)
    .forEach(s => {
      if (!dayMap.has(s.day)) dayMap.set(s.day, []);
      dayMap.get(s.day).push(s);
    });
  const activeDays = DAYS_ORDER.filter(d => (dayMap.get(d) ?? []).length > 0);
  if (!activeDays.length) {
    grid.innerHTML = `
      <div class="day">
        <h3>표시할 시간이 없습니다</h3>
        <p class="hint" style="margin-top:10px;">연령 필터를 해제해보세요.</p>
      </div>
    `;
    return;
  }
  grid.innerHTML = "";
  activeDays.forEach(day => {
    const slots = [...(dayMap.get(day) ?? [])].sort((a, b) => a.time.localeCompare(b.time));
    const dayEl = document.createElement("div");
    dayEl.className = "day";
    const h3 = document.createElement("h3");
    h3.textContent = `${day}요일`;
    dayEl.appendChild(h3);
    const slotsEl = document.createElement("div");
    slotsEl.className = "slots";
    slots.forEach(s => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `slot ${slotClass(s.status)}`;
      btn.dataset.id = s.id;
      btn.setAttribute("aria-label", `${s.time} ${s.age} ${s.title} - ${statusLabel(s.status)}`);
      btn.innerHTML = `
        <span class="s-dot" aria-hidden="true"></span>
        <span>${escHtml(s.time)} · ${escHtml(s.age)} · ${escHtml(s.title)}</span>
        <span class="meta">· ${statusLabel(s.status)}</span>
      `;
      btn.addEventListener("click", () => prefillFromSlot(s));
      slotsEl.appendChild(btn);
    });
    dayEl.appendChild(slotsEl);
    grid.appendChild(dayEl);
  });
}

function prefillFromSlot(slot) {
  const setVal = (id, val) => { const el = document.getElementById(id); if (el && val) el.value = val; };
  setVal("qAge", slot.age);
  setVal("qPref", `${slot.day} ${slot.time}`);
  setVal("age", slot.age);
  setVal("pref", `${slot.day} ${slot.time}`);
  scrollToId("contact");
  setTimeout(() => document.getElementById("pref")?.focus(), 600);
}
