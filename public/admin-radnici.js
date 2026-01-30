const BASE = "https://web-production-46e9.up.railway.app";
const API_RADNICI = `${BASE}/api/radnici`;
const API_PLAN = `${BASE}/api/radni-sati`; // GET ?mjesec=&period=  | POST upsert

const mjesecEl = document.getElementById("mjesec");
const periodEl = document.getElementById("period");
const headEl = document.getElementById("sati-head");
const bodyEl = document.getElementById("sati-body");
const obracunBodyEl = document.getElementById("obracun-body");


//modal 
// ===== Worker Modal refs =====
const workerModal = document.getElementById("workerModal");
const workerModalClose = document.getElementById("workerModalClose");

const wmAvatar = document.getElementById("wmAvatar");
const wmTitle = document.getElementById("wm-title");
const wmRole = document.getElementById("wmRole");
const wmStatus = document.getElementById("wmStatus");
const wmRate = document.getElementById("wmRate");

const wmTotalHours = document.getElementById("wmTotalHours");
const wmTotalPay = document.getElementById("wmTotalPay");
const wmOvertime = document.getElementById("wmOvertime");
const wmWorkDays = document.getElementById("wmWorkDays");

const wmChartWrap = document.getElementById("wmChartWrap");

function openWorkerModal() {
  if (!workerModal) return;
  workerModal.classList.add("is-open");
  workerModal.setAttribute("aria-hidden", "false");
  if (workerModalClose) workerModalClose.focus();
}

function closeWorkerModal() {
  if (!workerModal) return;
  workerModal.classList.remove("is-open");
  workerModal.setAttribute("aria-hidden", "true");
  if (wmChartWrap) wmChartWrap.innerHTML = "";
}

let radnici = [];
let planMap = new Map(); // key radnik_id -> sati object

// Grid state (da strelice znaju gdje su)
let gridDays = [];
let gridRadnikIds = [];

let currentDays = [];            // da možemo računati obračun bez rerendera
const savingCells = new Set();   // da ne dupliramo save dok brzo stišćeš strelice


function getDays(period, yyyyMm) {
  const [y, m] = yyyyMm.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  if (Number(period) === 1) return Array.from({ length: 14 }, (_, i) => i + 1);
  return Array.from({ length: lastDay - 14 }, (_, i) => i + 15);
}

function formatDateSR(d) {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

function updateObracunTitle() {
  const mjesec = mjesecEl.value;
  const period = Number(periodEl.value);
  const [y, m] = mjesec.split("-").map(Number);

  const startDay = period === 1 ? 1 : 15;
  const endDay = period === 1 ? 14 : new Date(y, m, 0).getDate();

  const start = new Date(y, m - 1, startDay);
  const end = new Date(y, m - 1, endDay);

  const el = document.getElementById("obracun-title");
  if (el) el.textContent = `Obračun za Period ${formatDateSR(start)} - ${formatDateSR(end)}`;
}

// Zelena boja kad je > 0 (input + ćelija)
function updateInputState(input) {
  const val = Number(input.value || 0);
  const td = input.closest("td");
  if (val > 0) {
    input.classList.add("input-active");
    if (td) td.classList.add("cell-active");
  } else {
    input.classList.remove("input-active");
    if (td) td.classList.remove("cell-active");
  }
}

function showNotification(message, type) {
  const notification = document.getElementById("notification");
  if (!notification) return;

  notification.style.backgroundColor = type === "success" ? "#22c55e" : "#ef4444";
  notification.textContent = message;
  notification.classList.add("show");

  setTimeout(() => notification.classList.remove("show"), 2000);
}

//modal 
function initials(fullName) {
  const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  const a = parts[0][0] || "";
  const b = parts.length > 1 ? (parts[parts.length - 1][0] || "") : "";
  return (a + b).toUpperCase();
}

function formatMoney(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return v.toFixed(2);
}

function formatHours(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return v % 1 === 0 ? String(v) : v.toFixed(1);
}

// daily = [{ day: 1, hours: 8 }, ...]
function renderDailyBarChart(daily) {
  if (!wmChartWrap) return;

  const data = Array.isArray(daily) ? daily : [];
  if (!data.length) {
    wmChartWrap.innerHTML = `<div style="opacity:.8;font-size:13px;">Nema podataka za graf.</div>`;
    return;
  }

  const maxH = Math.max(...data.map(d => Number(d.hours) || 0), 1);
  const w = 680;
  const h = 140;
  const pad = 8;
  const gap = 2;
  const barW = Math.max(3, Math.floor((w - pad * 2) / data.length) - gap);

  const bars = data.map((d, i) => {
    const hours = Math.max(0, Number(d.hours) || 0);
    const bh = Math.round((hours / maxH) * (h - pad * 2));
    const x = pad + i * (barW + gap);
    const y = h - pad - bh;
    return `
      <g>
        <title>Dan ${d.day}: ${hours}h</title>
        <rect x="${x}" y="${y}" width="${barW}" height="${bh}" rx="2"></rect>
      </g>`;
  }).join("");

  wmChartWrap.innerHTML = `
    <svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" aria-label="Sati po danima" role="img">
      <g fill="rgba(255,255,255,0.75)">${bars}</g>
      <line x1="${pad}" y1="${h - pad}" x2="${w - pad}" y2="${h - pad}" stroke="rgba(255,255,255,0.18)"></line>
    </svg>`;
}

function openWorkerCard(workerId) {
  const r = radnici.find(x => Number(x.id) === Number(workerId));
  if (!r) return;

  const fullName = `${r.ime || ""} ${r.prezime || ""}`.trim() || "Radnik";
  const sati = planMap.get(Number(workerId)) || {};

  const totalHours = currentDays.reduce((sum, d) => sum + Number(sati[String(d)] ?? 0), 0);
  const workDays = currentDays.reduce((cnt, d) => cnt + ((Number(sati[String(d)] ?? 0) > 0) ? 1 : 0), 0);

  const satnica = Number(r.satnica ?? 5);
  const totalPay = totalHours * satnica;

  // Za sada overtime = 0 (dok ne uvedemo pravila)
  const overtimeHours = 0;

  // Fill
  if (wmTitle) wmTitle.textContent = fullName;
  if (wmAvatar) wmAvatar.textContent = initials(fullName);

  if (wmRole) wmRole.textContent = r.pozicija || r.uloga || "—"; // ako nemaš polje, ostaje —
  if (wmStatus) {
    // ako nemaš status u bazi, stavi neutralno
    const s = r.status || r.aktivan;
    if (s === "active" || s === 1 || s === true) wmStatus.textContent = "🟢 Aktivan";
    else if (s === "inactive" || s === 0 || s === false) wmStatus.textContent = "🔴 Neaktivan";
    else wmStatus.textContent = "—";
  }

  if (wmRate) wmRate.textContent = `${formatMoney(satnica)}/h`;

  if (wmTotalHours) wmTotalHours.textContent = formatHours(totalHours);
  if (wmOvertime) wmOvertime.textContent = formatHours(overtimeHours);
  if (wmWorkDays) wmWorkDays.textContent = String(workDays);
  if (wmTotalPay) wmTotalPay.textContent = formatMoney(totalPay);

  // Chart data
  const daily = currentDays.map(d => ({ day: d, hours: Number(sati[String(d)] ?? 0) }));
  renderDailyBarChart(daily);

  openWorkerModal();
}


// ---------- Data ----------
async function loadRadnici() {
  const res = await fetch(API_RADNICI);
  radnici = await res.json();
}

async function loadPlan() {
  const mjesec = mjesecEl.value;
  const period = periodEl.value;

  const res = await fetch(
    `${API_PLAN}?mjesec=${encodeURIComponent(mjesec)}&period=${encodeURIComponent(period)}`
  );
  const rows = await res.json();

  planMap = new Map();
  for (const row of rows) {
    let satiObj = row.sati;
    if (typeof satiObj === "string") {
      try { satiObj = JSON.parse(satiObj); } catch { satiObj = {}; }
    }
    planMap.set(row.radnik_id, satiObj || {});
  }
}

async function savePlan(radnikId, mjesec, period, satiObj) {
  const res = await fetch(API_PLAN, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ radnik_id: radnikId, mjesec, period, sati: satiObj })
  });
  if (!res.ok) throw new Error("Save plan failed");
}

async function saveSatnica(radnikId, satnica) {
  const res = await fetch(`${API_RADNICI}/${radnikId}/satnica`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ satnica })
  });
  if (!res.ok) throw new Error("Save satnica failed");
}

// ---------- Navigation helpers ----------
function getDayIndex(day) {
  return gridDays.indexOf(Number(day));
}
function getRadnikIndex(radnikId) {
  return gridRadnikIds.indexOf(Number(radnikId));
}

function focusDayCell(radnikId, day) {
  const sel = `input.day-input[data-radnik="${radnikId}"][data-day="${day}"]`;
  const el = bodyEl.querySelector(sel);
  if (el) {
    el.focus();
    el.select();
  }
}

function updateObracunRow(radnikId) {
  const r = radnici.find(x => Number(x.id) === Number(radnikId));
  if (!r) return;

  const sati = planMap.get(Number(radnikId)) || {};
  const ukupno = currentDays.reduce((sum, d) => sum + Number(sati[String(d)] ?? 0), 0);
  const satnica = Number(r.satnica ?? 5);
  const plata = ukupno * satnica;

  // nađi obračun red po radniku (rate input nosi data-radnik)
  const rateInp = obracunBodyEl.querySelector(`input.rate-input[data-radnik="${radnikId}"]`);
  if (!rateInp) return;

  const row = rateInp.closest("tr");
  if (!row) return;

  // kolone: Radnik | Satnica | Ukupno | Plata
  const ukupnoTd = row.children[2];
  const plataTd = row.children[3];

  if (ukupnoTd) ukupnoTd.textContent = `${ukupno}h`;
  if (plataTd) plataTd.textContent = plata.toFixed(2);
}

async function saveDayIfChanged(inp) {
  const radnikId = Number(inp.dataset.radnik);
  const day = String(inp.dataset.day);
  const value = Number(inp.value || 0);
  const prev = Number(inp.dataset.prev || 0);

  // ništa se nije promijenilo
  if (value === prev) return false;

  const key = `${radnikId}:${day}`;
  if (savingCells.has(key)) return false; // već snima

  savingCells.add(key);

  const mjesec = mjesecEl.value;
  const period = Number(periodEl.value);

  const current = planMap.get(radnikId) || {};
  current[day] = value;
  planMap.set(radnikId, current);

  try {
    await savePlan(radnikId, mjesec, period, current);

    inp.dataset.prev = String(value);
    updateInputState(inp);

    // osvježi obračun samo za tog radnika
    updateObracunRow(radnikId);

    // notifikacija samo kad je stvarno sačuvano
    showNotification("Uspešno sačuvano!", "success");
    return true;
  } catch (err) {
    console.error(err);
    showNotification("Greška pri čuvanju", "error");
    return false;
  } finally {
    savingCells.delete(key);
  }
}

function moveDayFocus(currentInput, dRow, dCol) {
  const radnikId = Number(currentInput.dataset.radnik);
  const day = Number(currentInput.dataset.day);

  const r = getRadnikIndex(radnikId);
  const c = getDayIndex(day);

  if (r < 0 || c < 0) return;

  const nr = Math.max(0, Math.min(gridRadnikIds.length - 1, r + dRow));
  const nc = Math.max(0, Math.min(gridDays.length - 1, c + dCol));

  const nextRadnikId = gridRadnikIds[nr];
  const nextDay = gridDays[nc];
  focusDayCell(nextRadnikId, nextDay);
}

function focusNextDayCell(currentInput) {
  const radnikId = Number(currentInput.dataset.radnik);
  const day = Number(currentInput.dataset.day);

  const r = getRadnikIndex(radnikId);
  const c = getDayIndex(day);

  if (r < 0 || c < 0) return;

  // default: desno; ako je kraj reda -> prvi dan sljedeći radnik
  let nr = r;
  let nc = c + 1;

  if (nc >= gridDays.length) {
    nc = 0;
    nr = Math.min(gridRadnikIds.length - 1, r + 1);
  }

  focusDayCell(gridRadnikIds[nr], gridDays[nc]);
}

function attachSelectOnFocus(input) {
  input.addEventListener("focus", (e) => e.target.select());
  input.addEventListener("click", (e) => e.target.select());
}

// ---------- Render ----------
function render() {
  const mjesec = mjesecEl.value;
  const period = Number(periodEl.value);
  const days = getDays(period, mjesec);

  currentDays = days.slice();
  gridDays = days.slice();
  gridRadnikIds = radnici.map(r => Number(r.id));

  updateObracunTitle();

  // HEAD
  headEl.innerHTML = `
    <tr>
      <th class="idx-col">#</th>
      <th class="sticky-col">Ime i Prezime</th>
      ${days.map(d => `<th>${String(d).padStart(2, "0")}</th>`).join("")}
    </tr>
  `;

  // BODY
  bodyEl.innerHTML = "";
  obracunBodyEl.innerHTML = "";

  radnici.forEach((r, i) => {
    const sati = planMap.get(r.id) || {};
    const satnica = Number(r.satnica ?? 5);

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="idx-col">${i + 1}</td>
      <td class="sticky-col name">
        <button type="button" class="worker-name" data-worker-id="${r.id}">
            ${r.ime} ${r.prezime}
        </button>
      </td>
      ${days.map(d => {
        const key = String(d);
        const val = Number(sati[key] ?? 0);
        return `
          <td>
            <div class="hour-box">
              <input class="day-input" type="number" min="0" max="24" step="0.25"
                value="${val}" inputmode="decimal"
                data-radnik="${r.id}" data-day="${d}" data-prev="${val}">
              <span class="h-suffix">h</span>
            </div>
          </td>
        `;
      }).join("")}
    `;
    bodyEl.appendChild(tr);

    // Obračun (desno)
    const ukupno = days.reduce((sum, d) => sum + Number(sati[String(d)] ?? 0), 0);
    const plata = ukupno * satnica;

    const obr = document.createElement("tr");
    obr.innerHTML = `
      <td class="name">${r.ime} ${r.prezime}</td>
      <td>
        <input class="rate-input" type="number" min="0" step="0.25"
          value="${satnica}" data-radnik="${r.id}" data-prev="${satnica}">
      </td>
      <td>${ukupno}h</td>
      <td class="money">${plata.toFixed(2)}</td>
    `;
    obracunBodyEl.appendChild(obr);
  });

  // Events: day inputs
  bodyEl.querySelectorAll("input.day-input").forEach(inp => {
    attachSelectOnFocus(inp);
    inp.addEventListener("keydown", onDayKeyDown);
    inp.addEventListener("blur", () => saveDayIfChanged(inp));
    updateInputState(inp);
  });

  // Events: rate inputs (obracun)
  obracunBodyEl.querySelectorAll("input.rate-input").forEach(inp => {
    attachSelectOnFocus(inp);
    inp.addEventListener("keydown", onRateKeyDown); 
  });
}

// ---------- Key handlers ----------
function onDayKeyDown(e) {
  const inp = e.target;

  const move = async (dRow, dCol) => {
    // prije pomjeranja: ako je promijenjeno -> snimi
    await saveDayIfChanged(inp);
    moveDayFocus(inp, dRow, dCol);
  };

  // Strelice = autosave (ako treba) + pomjeri fokus
  if (e.key === "ArrowLeft")  { e.preventDefault(); move(0, -1); return; }
  if (e.key === "ArrowRight") { e.preventDefault(); move(0, +1); return; }
  if (e.key === "ArrowUp")    { e.preventDefault(); move(-1, 0); return; }
  if (e.key === "ArrowDown")  { e.preventDefault(); move(+1, 0); return; }

  // Enter = snimi (ako treba) + idi na sljedeću ćeliju (desno / novi red)
  if (e.key === "Enter") {
    e.preventDefault();
    (async () => {
      await saveDayIfChanged(inp);
      focusNextDayCell(inp);
    })();
    return;
  }
}


async function onRateKeyDown(e) {
  const inp = e.target;

  // Navigacija satnice: gore/dolje između satnica (bez snimanja)
  if (e.key === "ArrowUp" || e.key === "ArrowDown") {
    e.preventDefault();
    const inputs = Array.from(obracunBodyEl.querySelectorAll("input.rate-input"));
    const idx = inputs.indexOf(inp);
    if (idx === -1) return;

    const nextIdx = e.key === "ArrowUp" ? Math.max(0, idx - 1) : Math.min(inputs.length - 1, idx + 1);
    const next = inputs[nextIdx];
    next.focus();
    next.select();
    return;
  }

  // Enter = snimi samo ako je promjena
  if (e.key !== "Enter") return;
  e.preventDefault();

  const radnikId = Number(inp.dataset.radnik);
  const value = Number(inp.value || 0);
  const prev = Number(inp.dataset.prev || 0);

  if (value === prev) return; // ništa se nije promijenilo

  try {
    await saveSatnica(radnikId, value);
    inp.dataset.prev = String(value);
    updateInputState(inp);
    showNotification("Satnica sačuvana!", "success");

    // Refresh da plata odmah bude tačna
    await refreshAll();

    // Fokus ostaje na istoj satnici
    const again = obracunBodyEl.querySelector(`input.rate-input[data-radnik="${radnikId}"]`);
    if (again) { again.focus(); again.select(); }
  } catch (err) {
    console.error(err);
    showNotification("Greška pri čuvanju satnice", "error");
  }
}

// ---------- Boot ----------
async function refreshAll() {
  await loadRadnici();
  await loadPlan();
  render();
}

mjesecEl.addEventListener("change", refreshAll);
periodEl.addEventListener("change", refreshAll);

// Dodavanje radnika (ime + prezime)
document.getElementById("radnik-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  await fetch(API_RADNICI, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ime: document.getElementById("ime").value,
      prezime: document.getElementById("prezime").value
    })
  });

  e.target.reset();
  await refreshAll();
});

// Close: X
if (workerModalClose) workerModalClose.addEventListener("click", closeWorkerModal);

// Close: klik na overlay (blur)
if (workerModal) {
  workerModal.addEventListener("click", (e) => {
    if (e.target === workerModal) closeWorkerModal();
  });
}

// Close: ESC
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && workerModal && workerModal.classList.contains("is-open")) {
    closeWorkerModal();
  }
});

// Open: klik na ime radnika (event delegation)
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".worker-name");
  if (!btn) return;
  const id = btn.getAttribute("data-worker-id");
  if (!id) return;
  openWorkerCard(id);
});

// init
refreshAll();
