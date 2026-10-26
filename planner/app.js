const STORAGE_KEY = "irctc-booking-plan-v4";
const VALID_CLASSES = ["1A", "2A", "3A", "3E", "SL", "CC", "EC", "2S"];
const RETRYABLE_RESULTS = new Set(["no_availability", "train_not_found", "class_unavailable", "fare_exceeded"]);

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
  resultBtn: document.querySelector("#resultBtn"),
  fileInput: document.querySelector("#fileInput"),
  resultInput: document.querySelector("#resultInput"),
  resultPanel: document.querySelector("#resultPanel"),
  saveStatus: document.querySelector("#saveStatus")
};

let attempts = [
  { priority: 1, train_no: "12951", class: "2A" },
  { priority: 2, train_no: "12953", class: "2A" },
  { priority: 3, train_no: "12951", class: "3A" }
];

function sanitizeTrainNo(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 5);
}

function sanitizeClass(value) {
  return VALID_CLASSES.includes(value) ? value : "2A";
}

function sanitizeStation(value) {
  return String(value || "").replace(/[^a-zA-Z0-9 ]/g, "").trim().toUpperCase().slice(0, 40);
}

function toDisplayDate(value) {
  if (!value) return "";
  const parts = value.split("-");
  if (parts.length !== 3) return "";
  const [year, month, day] = parts;
  return day + "/" + month + "/" + year;
}

function toInputDate(value) {
  if (!value || !value.includes("/")) return value || "";
  const parts = value.split("/");
  if (parts.length !== 3) return "";
  const [day, month, year] = parts;
  return year + "-" + month + "-" + day;
}

function normalizeAttempt(item, index) {
  return {
    priority: index + 1,
    train_no: sanitizeTrainNo(item?.train_no),
    class: sanitizeClass(item?.class)
  };
}

function buildPlan() {
  return {
    journey: {
      source: sanitizeStation(els.source.value),
      destination: sanitizeStation(els.destination.value),
      date: toDisplayDate(els.date.value),
      quota: els.quota.value
    },
    passenger_profile: els.profile.value.trim().slice(0, 80) || "family",
    rules: {
      book_only_if_confirmed: els.confirmedOnly.checked,
      auto_upgrade: els.autoUpgrade.checked,
      max_total_fare: Number(els.maxFare.value || 0) || null
    },
    attempts: attempts
      .map(normalizeAttempt)
      .filter(item => item.train_no.length === 5)
  };
}

function validatePlan(plan) {
  if (!plan || typeof plan !== "object") {
    throw new Error("Plan must be a JSON object.");
  }

  if (!plan.journey || !plan.journey.source || !plan.journey.destination || !plan.journey.date) {
    throw new Error("Journey source, destination and date are required.");
  }

  if (!Array.isArray(plan.attempts) || plan.attempts.length === 0) {
    throw new Error("At least one ranked attempt is required.");
  }

  for (const attempt of plan.attempts) {
    if (!/^\d{5}$/.test(String(attempt.train_no || ""))) {
      throw new Error("Every train number must contain exactly five digits.");
    }
    if (!VALID_CLASSES.includes(attempt.class)) {
      throw new Error("Unsupported class in imported plan.");
    }
  }

  return true;
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(buildPlan()));
  els.saveStatus.textContent = "Saved locally";
}

function createClassSelect(index, selectedClass) {
  const select = document.createElement("select");
  select.dataset.field = "class";
  select.dataset.index = String(index);
  select.setAttribute("aria-label", "Class");

  VALID_CLASSES.forEach(value => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    option.selected = value === selectedClass;
    select.appendChild(option);
  });

  return select;
}

function renderAttempts() {
  els.attempts.replaceChildren();

  attempts = attempts.map(normalizeAttempt);

  attempts.forEach((attempt, index) => {
    const row = document.createElement("div");
    row.className = "attempt-row";

    const priority = document.createElement("div");
    priority.className = "priority";
    priority.textContent = "#" + String(index + 1).padStart(2, "0");

    const train = document.createElement("input");
    train.dataset.field = "train_no";
    train.dataset.index = String(index);
    train.value = attempt.train_no;
    train.inputMode = "numeric";
    train.maxLength = 5;
    train.setAttribute("aria-label", "Train number");

    const remove = document.createElement("button");
    remove.className = "remove";
    remove.dataset.remove = String(index);
    remove.setAttribute("aria-label", "Remove attempt");
    remove.textContent = "x";

    row.append(priority, train, createClassSelect(index, attempt.class), remove);
    els.attempts.appendChild(row);
  });

  renderPreview();
  persist();
}

function renderPreview() {
  const plan = buildPlan();
  els.preview.replaceChildren();

  if (!plan.attempts.length) {
    const empty = document.createElement("p");
    empty.className = "hint";
    empty.textContent = "Add at least one valid five-digit train number.";
    els.preview.appendChild(empty);
    return;
  }

  plan.attempts.forEach(attempt => {
    const row = document.createElement("div");
    row.className = "preview-row";

    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = "#" + attempt.priority;

    const route = document.createElement("span");
    route.className = "route";
    route.textContent = "Train " + attempt.train_no;

    const classPill = document.createElement("span");
    classPill.className = "class-pill";
    classPill.textContent = attempt.class;

    row.append(badge, route, classPill);
    els.preview.appendChild(row);
  });
}

function hydrate(plan) {
  validatePlan(plan);

  els.source.value = sanitizeStation(plan.journey?.source);
  els.destination.value = sanitizeStation(plan.journey?.destination);
  els.date.value = toInputDate(plan.journey?.date || "");
  els.quota.value = ["GENERAL", "TATKAL", "PREMIUM_TATKAL"].includes(plan.journey?.quota)
    ? plan.journey.quota
    : "GENERAL";
  els.profile.value = String(plan.passenger_profile || "family").slice(0, 80);
  els.maxFare.value = plan.rules?.max_total_fare || "";
  els.confirmedOnly.checked = plan.rules?.book_only_if_confirmed !== false;
  els.autoUpgrade.checked = Boolean(plan.rules?.auto_upgrade);

  attempts = [...plan.attempts]
    .sort((a, b) => Number(a.priority) - Number(b.priority))
    .map(normalizeAttempt);

  renderAttempts();
}

function exportPlan() {
  const plan = buildPlan();

  try {
    validatePlan(plan);
  } catch (error) {
    els.saveStatus.textContent = error.message;
    return;
  }

  const blob = new Blob([JSON.stringify(plan, null, 2) + "\n"], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "booking-plan.json";
  anchor.click();
  URL.revokeObjectURL(url);
}

function nextAttemptForResult(result) {
  const plan = buildPlan();
  const currentPriority = Number(result.attempt_priority || 0);

  if (!RETRYABLE_RESULTS.has(result.status)) {
    return null;
  }

  return plan.attempts.find(attempt => Number(attempt.priority) > currentPriority) || null;
}

function reviewResult(result) {
  els.resultPanel.replaceChildren();
  els.resultPanel.classList.remove("empty");

  const title = document.createElement("div");
  title.className = "result-title";

  const meta = document.createElement("div");
  meta.className = "result-meta";

  const action = document.createElement("div");
  action.className = "result-action";

  const status = String(result?.status || "unknown");
  const priority = Number(result?.attempt_priority || 0);
  const next = nextAttemptForResult(result);

  if (status === "booked") {
    title.textContent = "Booking observed";
    meta.textContent = result.pnr ? "PNR " + result.pnr : "Booking confirmation detected.";
    action.textContent = "Stop. Do not run another attempt.";
    action.classList.add("safe");
  } else if (status === "booked_unverified_pnr") {
    title.textContent = "Booking may be complete";
    meta.textContent = "Success text was detected but no PNR was captured.";
    action.textContent = "Stop and verify the ticket before any retry.";
    action.classList.add("stop");
  } else if (next) {
    title.textContent = "Fallback available";
    meta.textContent = "Attempt #" + priority + " ended with " + status + ".";
    action.textContent = "Next safe attempt: #" + next.priority + " - Train " + next.train_no + " / " + next.class;
    action.classList.add("safe");
  } else {
    title.textContent = "Manual review required";
    meta.textContent = "Result: " + status + ".";
    action.textContent = "Do not start another booking until the current transaction is resolved.";
    action.classList.add("stop");
  }

  els.resultPanel.append(title, meta, action);
}

els.addAttempt.addEventListener("click", () => {
  attempts.push({ priority: attempts.length + 1, train_no: "", class: "2A" });
  renderAttempts();
});

els.attempts.addEventListener("input", event => {
  const index = Number(event.target.dataset.index);
  const field = event.target.dataset.field;
  if (!Number.isInteger(index) || !field || !attempts[index]) return;

  if (field === "train_no") {
    const clean = sanitizeTrainNo(event.target.value);
    event.target.value = clean;
    attempts[index][field] = clean;
  } else if (field === "class") {
    attempts[index][field] = sanitizeClass(event.target.value);
  }

  renderPreview();
  persist();
});

els.attempts.addEventListener("change", event => {
  const index = Number(event.target.dataset.index);
  const field = event.target.dataset.field;
  if (!Number.isInteger(index) || !field || !attempts[index]) return;
  if (field === "class") attempts[index][field] = sanitizeClass(event.target.value);
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
els.resultBtn.addEventListener("click", () => els.resultInput.click());

els.fileInput.addEventListener("change", async event => {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const plan = JSON.parse(await file.text());
    hydrate(plan);
    els.saveStatus.textContent = "Imported and saved";
  } catch (error) {
    els.saveStatus.textContent = error.message || "Could not import plan";
  } finally {
    event.target.value = "";
  }
});

els.resultInput.addEventListener("change", async event => {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const result = JSON.parse(await file.text());
    reviewResult(result);
  } catch {
    els.resultPanel.textContent = "Could not read run result.";
    els.resultPanel.classList.add("empty");
  } finally {
    event.target.value = "";
  }
});

const saved = localStorage.getItem(STORAGE_KEY);
if (saved) {
  try {
    hydrate(JSON.parse(saved));
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

if (!localStorage.getItem(STORAGE_KEY)) {
  els.source.value = "MMCT";
  els.destination.value = "NDLS";
  els.profile.value = "family";
  els.maxFare.value = "12000";
  renderAttempts();
}
