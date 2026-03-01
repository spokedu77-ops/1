function normalizePhone(v) { return String(v ?? "").replace(/\D/g, ""); }

function validatePhone(raw) {
  const n = normalizePhone(raw);
  return n.length >= 10 && n.length <= 11;
}

function setFieldError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.toggle("error", !!msg);
  let errEl = el.parentElement.querySelector(".field-error");
  if (msg) {
    if (!errEl) { errEl = document.createElement("span"); errEl.className = "field-error"; el.parentElement.appendChild(errEl); }
    errEl.textContent = msg;
  } else {
    errEl?.remove();
  }
}

function clearFieldError(id) { setFieldError(id, ""); }

async function submitLead(e) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector("[type=submit]");
  let hasError = false;
  const fd = new FormData(form);
  const phone = normalizePhone(fd.get("phone") ?? "");
  if (!validatePhone(phone)) {
    setFieldError("phone", "연락처를 정확히 입력해주세요 (숫자 10–11자리)");
    hasError = true;
  } else {
    clearFieldError("phone");
  }
  if (hasError) return;
  submitBtn.disabled = true;
  submitBtn.textContent = "제출 중...";
  const data = Object.fromEntries(fd.entries());
  data.phone = phone;
  data.createdAt = new Date().toISOString();
  data.center = CONFIG.center.name;
  if (!CONFIG.leadEndpoint) {
    alert("⚠️ 운영 엔드포인트(CONFIG.leadEndpoint)가 설정되지 않았습니다.\n실제 데이터가 저장되지 않습니다. 관리자에게 문의하세요.");
    submitBtn.disabled = false;
    submitBtn.textContent = "상담 신청 제출";
    return;
  }
  try {
    const res = await fetch(CONFIG.leadEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    alert("접수 완료! 운영팀이 연락드립니다.");
    form.reset();
  } catch (err) {
    console.error("[submitLead]", err);
    alert("일시적 오류가 발생했습니다. 카카오 채널로 문의해 주세요.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "상담 신청 제출";
  }
}

function prefillAndGoContact() {
  const setVal = (fromId, toId) => {
    const val = document.getElementById(fromId)?.value;
    if (val) { const el = document.getElementById(toId); if (el) el.value = val; }
  };
  setVal("qAge", "age");
  setVal("qPref", "pref");
  setVal("qMsg", "msg");
  scrollToId("contact");
  setTimeout(() => document.getElementById("pref")?.focus(), 600);
}

function initFormValidation() {
  const phoneEl = document.getElementById("phone");
  if (phoneEl) {
    phoneEl.addEventListener("blur", () => {
      if (phoneEl.value && !validatePhone(phoneEl.value)) {
        setFieldError("phone", "연락처를 정확히 입력해주세요 (숫자 10–11자리)");
      } else {
        clearFieldError("phone");
      }
    });
    phoneEl.addEventListener("input", () => clearFieldError("phone"));
  }
}
