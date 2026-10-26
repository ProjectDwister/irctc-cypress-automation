const STORAGE_KEY = "irctc-booking-plan-v4";

const els = {
  source: document.querySelector("#source"),
  destination: document.querySelector("#destination"),
  date: document.querySelector("#date"),
  quota: document.querySelector("#quota"),
  profile: document.querySelector("#profile"),
  maxFare: document.querySelector("#maxFare"),
  confirmedOnly: document.querySelector("#confirmedOnly"),
  autoUpgrade: document.querySelector("#autoUpgrade"),
  attempts: document.querySelector("#attempts"),
  preview: document.querySelector("#preview"),
  addAttempt: document.querySelector("#addAttempt"),
  exportBtn: document.querySelector("#exportBtn"),
  importBtn: document.querySelector("#importBtn"),
  fileInput: document.querySelector("#fileInput"),
  saveStatus: document.querySelector("#saveStatus")
};

let attempts = [
  { priority: 1, train_no: "12951", class: "2A" },
  { priority: 2, train_no: "12953", class: "2A" },
  { priority: 3, train_no: "12951", class: "3A" }
];

function toDisplayDate(value) {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return day + "/" + month + "/" + year;
}

function toInputDate(value) {
  if (!value || !value.includes("/")) return value || "";
  const [day, month, year] = value.split("/");
  return year + "-" + month + "-" + day;
}

function buildPlan() {
  return {
    journey: {
      source: els.source.value.trim().toUpperCase(),
      destination: els.destination.value.trim().toUpperCase(),
      date: toDisplayDate(els.date.value),
      quota: els.quota.value
    },
    passenger_profile: els.profile.value.trim() || "family",
    rules: {
      book_only_if_confirmed: els.confirmedOnly.checked,
      auto_upgrade: els.autoUpgrade.checked,
      max_total_fare: Number(els.maxFare.value || 0) || null
    },
    attempts: attempts
      .map((item, index) => ({
        priority: index + 1,
        train_no: String(item.train_no || "").trim(),
        class: item.class
      }))
      .filter(item => item.train_no)
  };
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(buildPlan()));
  els.saveStatus.textContent = "Saved locally";
}

function renderAttempts() {
  els.attempts.innerHTML = "";

  attempts.forEach((attempt, index) => {
    const row = document.createElement("div");
    row.className = "attempt-row";
    row.innerHTML = `
      <div class="priority">#${String(index + 1).padStart(2, "0")}</div>
      <input data-field="train_no" data-index="${index}" value="${attempt.train_no || ""}" inputmode="numeric" maxlength="5" aria-label="Train number" />
      <select data-field="class" data-index="${index}" aria-label="Class">
        ${["1A","2A","3A","3E","SL","CC","EC","2S"].map(c =>
          `<option value="${c}" ${c === attempt.class ? "selected" : ""}>${c}</option>`
        ).join("")}
      </select>
      <button class="remove" data-remove="${index}" aria-label="Remove attempt">x</button>
    `;
    els.attempts.appendChild(row);
  });

  renderPreview();
  persist();
}

function renderPreview() {
  const plan = buildPlan();
  els.preview.innerHTML = "";

  if (!plan.attempts.length) {
    els.preview.innerHTML = '<p class="hint">Add at least one train/class attempt.</p>';
    return;
  }

  plan.attempts.forEach(attempt => {
    const row = document.createElement("div");
    row.className = "preview-row";
    row.innerHTML = `
      <span class="badge">#${attempt.priority}</span>
      <span class="route">Train ${attempt.train_no}</span>
      <span class="class-pill">${attempt.class}</span>
    `;
    els.preview.appendChild(row);
  });
}

function hydrate(plan) {
  if (!plan) return;

  els.source.value = plan.journey?.source || "";
  els.destination.value = plan.journey?.destination || "";
  els.date.value = toInputDate(plan.journey?.date || "");
  els.quota.value = plan.journey?.quota || "GENERAL";
  els.profile.value = plan.passenger_profile || "family";
  els.maxFare.value = plan.rules?.max_total_fare || "";
  els.confirmedOnly.checked = plan.rules?.book_only_if_confirmed !== false;
  els.autoUpgrade.checked = Boolean(plan.rules?.auto_upgrade);

  if (Array.isArray(plan.attempts) && plan.attempts.length) {
    attempts = [...plan.attempts]
      .sort((a, b) => Number(a.priority) - Number(b.priority))
      .map((a, index) => ({
        priority: index + 1,
        train_no: String(a.train_no || ""),
        class: a.class || "2A"
      }));
  }

  renderAttempts();
}

function exportPlan() {
  const plan = buildPlan();
  const blob = new Blob([JSON.stringify(plan, null, 2) + "\n"], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "booking-plan.json";
  anchor.click();
  URL.revokeObjectURL(url);
}

els.addAttempt.addEventListener("click", () => {
  attempts.push({ priority: attempts.length + 1, train_no: "", class: "2A" });
  renderAttempts();
});

els.attempts.addEventListener("input", event => {
  const index = Number(event.target.dataset.index);
  const field = event.target.dataset.field;
  if (!Number.isInteger(index) || !field || !attempts[index]) return;
  attempts[index][field] = event.target.value;
  renderPreview();
  persist();
});

els.attempts.addEventListener("click", event => {
  const index = Number(event.target.dataset.remove);
  if (!Number.isInteger(index)) return;
  attempts.splice(index, 1);
  renderAttempts();
});

document.querySelectorAll("input, select").forEach(node => {
  if (node.closest("#attempts")) return;
  node.addEventListener("input", () => {
    renderPreview();
    persist();
  });
  node.addEventListener("change", () => {
    renderPreview();
    persist();
  });
});

els.exportBtn.addEventListener("click", exportPlan);
els.importBtn.addEventListener("click", () => els.fileInput.click());

els.fileInput.addEventListener("change", async event => {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const plan = JSON.parse(await file.text());
    hydrate(plan);
    els.saveStatus.textContent = "Imported and saved";
  } catch {
    els.saveStatus.textContent = "Could not import plan";
  } finally {
    event.target.value = "";
  }
});

const saved = localStorage.getItem(STORAGE_KEY);
if (saved) {
  try {
    hydrate(JSON.parse(saved));
  } catch {
    renderAttempts();
  }
} else {
  els.source.value = "MMCT";
  els.destination.value = "NDLS";
  els.profile.value = "family";
  els.maxFare.value = "12000";
  renderAttempts();
}
