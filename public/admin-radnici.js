const BASE = "https://web-production-46e9.up.railway.app";
const API_RADNICI = `${BASE}/api/radnici`;
const API_PLAN = `${BASE}/api/radni-sati`; // GET ?mjesec=&period=  | POST upsert

const mjesecEl = document.getElementById("mjesec");
const periodEl = document.getElementById("period");
const headEl = document.getElementById("sati-head");
const bodyEl = document.getElementById("sati-body");
const obracunBodyEl = document.getElementById("obracun-body");

const statTotalHoursEl = document.getElementById("statTotalHours");
const statTotalPayEl = document.getElementById("statTotalPay");
const statAvgHoursEl = document.getElementById("statAvgHours");


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

const wmEditRateBtn = document.getElementById("wmEditRateBtn");
const wmRateEdit = document.getElementById("wmRateEdit");
const wmRateInput = document.getElementById("wmRateInput");
const wmRateSaveBtn = document.getElementById("wmRateSaveBtn");
const wmRateCancelBtn = document.getElementById("wmRateCancelBtn");
const wmInsight = document.getElementById("wmInsight");
const wmHistoryBody = document.getElementById("wmHistoryBody");

let modalWorkerId = null;
let modalTotalHours = 0; // da možemo odmah preračunati platu u modalu

function openWorkerModal() {
  if (!workerModal) return;
  workerModal.classList.add("is-open");
  workerModal.setAttribute("aria-hidden", "false");
  if (workerModalClose) workerModalClose.focus();
}

function closeWorkerModal() {

  modalWorkerId = null;
  modalTotalHours = 0;
  setRateEditMode(false);
  if (!workerModal) return;
  workerModal.classList.remove("is-open");
  workerModal.setAttribute("aria-hidden", "true");
  if (wmChartWrap) wmChartWrap.innerHTML = "";
  setInsight("");
}

// ukupni izvjestaj
function updateTopStats(){
  if (!statTotalHoursEl || !statTotalPayEl || !statAvgHoursEl) return;

  const n = radnici.length || 0;
  if (!n) {
    statTotalHoursEl.textContent = "0h";
    statTotalPayEl.textContent = "0.00";
    statAvgHoursEl.textContent = "0h";
    return;
  }

  let totalHours = 0;
  let totalPay = 0;

  for (const r of radnici) {
    const sati = planMap.get(Number(r.id)) || {};
    const workerHours = currentDays.reduce(
      (sum, d) => sum + Number(sati[String(d)] ?? 0),
      0
    );
    const rate = Number(r.satnica ?? 5);

    totalHours += workerHours;
    totalPay += workerHours * rate;
  }

  const avgHours = totalHours / n;

  statTotalHoursEl.textContent = `${totalHours.toFixed(2)}h`;
  statTotalPayEl.textContent = totalPay.toFixed(2);
  statAvgHoursEl.textContent = `${avgHours.toFixed(2)}h`;
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

  if (Number(period) === 0) {
    // 01 -> kraj mjeseca
    return Array.from({ length: lastDay }, (_, i) => i + 1);
  }

  if (Number(period) === 1) {
    // 01 -> 14
    return Array.from({ length: 14 }, (_, i) => i + 1);
  }

  // 15 -> kraj
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

  const lastDay = new Date(y, m, 0).getDate();

  let startDay, endDay;
  if (period === 0) { startDay = 1; endDay = lastDay; }
  else if (period === 1) { startDay = 1; endDay = 14; }
  else { startDay = 15; endDay = lastDay; }


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
  modalWorkerId = Number(workerId);
  modalTotalHours = totalHours;
  setRateEditMode(false);
  const workDays = currentDays.reduce((cnt, d) => cnt + ((Number(sati[String(d)] ?? 0) > 0) ? 1 : 0), 0);

  const satnica = Number(r.satnica ?? 5);
  const totalPay = totalHours * satnica;

  // Za sada overtime = 0 (dok ne uvedemo pravila)
  const overtimeHours = 0;
  // --- Insight: 30% iznad prosjeka ---
  const avg = getAverageHoursAllWorkers();
  loadWorkerHistory(workerId, satnica);

  if (avg > 0) {
    const diffPct = (totalHours - avg) / avg; // npr. 0.30 = 30%
    if (diffPct >= 0.30) {
      const pct = Math.round(diffPct * 100);
      setInsight(`⚠️ Ovaj radnik ima <strong>${pct}%</strong> više sati od prosjeka za izabrani period.`);
    } else {
      setInsight("");
    }
  } else {
    setInsight("");
  }


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
  const period = Number(periodEl.value);

  async function fetchRows(p) {
    const res = await fetch(
      `${API_PLAN}?mjesec=${encodeURIComponent(mjesec)}&period=${encodeURIComponent(p)}`
    );
    if (!res.ok) throw new Error("Load plan failed");
    return await res.json();
  }

  function rowsToMap(rows) {
    const map = new Map();
    for (const row of rows) {
      let satiObj = row.sati;
      if (typeof satiObj === "string") {
        try { satiObj = JSON.parse(satiObj); } catch { satiObj = {}; }
      }
      map.set(Number(row.radnik_id), satiObj || {});
    }
    return map;
  }

  function mergeMaps(a, b) {
    const out = new Map(a);
    for (const [rid, objB] of b.entries()) {
      const objA = out.get(rid) || {};
      out.set(rid, { ...objA, ...objB });
    }
    return out;
  }

  if (period === 0) {
    const [rows1, rows2] = await Promise.all([fetchRows(1), fetchRows(2)]);
    const map1 = rowsToMap(rows1);
    const map2 = rowsToMap(rows2);
    planMap = mergeMaps(map1, map2);
    return;
  }

  const rows = await fetchRows(period);
  planMap = rowsToMap(rows);
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
function effectivePeriod(uiPeriod, dayNumber) {
  if (Number(uiPeriod) !== 0) return Number(uiPeriod);
  return Number(dayNumber) <= 14 ? 1 : 2;
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
  const effective = effectivePeriod(period, Number(day));

  const current = planMap.get(radnikId) || {};
  current[day] = value;
  planMap.set(radnikId, current);

  try {
    await savePlan(radnikId, mjesec, effective, current);

    inp.dataset.prev = String(value);
    updateInputState(inp);

    // osvježi obračun samo za tog radnika
    updateObracunRow(radnikId);
    updateTopStats();
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
          <div class="worker-name-main">${r.ime} ${r.prezime}</div>
          <div class="worker-role-sub">${r.pozicija || ""}</div>
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
  updateTopStats();
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
    updateTopStats();
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
      prezime: document.getElementById("prezime").value,
      pozicija: document.getElementById("pozicija").value
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
// modal satnica 
function setRateEditMode(isEditing) {
  if (!wmRateEdit || !wmEditRateBtn) return;
  wmRateEdit.hidden = !isEditing;
  wmEditRateBtn.hidden = isEditing;

  if (isEditing && wmRateInput) {
    wmRateInput.focus();
    wmRateInput.select();
  }
}
if (wmEditRateBtn) {
  wmEditRateBtn.addEventListener("click", () => {
    if (modalWorkerId == null) return;

    const r = radnici.find(x => Number(x.id) === Number(modalWorkerId));
    const currentRate = Number(r?.satnica ?? 0);

    if (wmRateInput) wmRateInput.value = String(currentRate);
    setRateEditMode(true);
  });
}
// prosjek sati svih radnika u modalu
function getTotalHoursForWorker(radnikId){
  const sati = planMap.get(Number(radnikId)) || {};
  return currentDays.reduce((sum, d) => sum + Number(sati[String(d)] ?? 0), 0);
}
//istorija radnika u modalu
function getLastMonths(count){
  const out = [];
  const now = new Date();

  for(let i=0;i<count;i++){
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,"0");
    out.push(`${y}-${m}`);
  }
  return out;
}
async function fetchWorkerMonthTotal(radnikId, yyyyMm) {
  async function fetchPeriod(p) {
    const res = await fetch(`${API_PLAN}?mjesec=${encodeURIComponent(yyyyMm)}&period=${p}`);
    if (!res.ok) return [];
    return await res.json();
  }

  const [rows1, rows2] = await Promise.all([fetchPeriod(1), fetchPeriod(2)]);
  const all = [...rows1, ...rows2];

  // uzmi SVE redove za tog radnika (period 1 + period 2)
  const matches = all.filter(r => Number(r.radnik_id) === Number(radnikId));
  if (!matches.length) return 0;

  let total = 0;

  for (const row of matches) {
    let satiObj = row.sati;

    if (typeof satiObj === "string") {
      try { satiObj = JSON.parse(satiObj); }
      catch { satiObj = {}; }
    }

    // saberemo sve dane iz tog perioda
    total += Object.values(satiObj || {}).reduce((a, b) => a + Number(b || 0), 0);
  }

  return total;
}

async function loadWorkerHistory(radnikId, satnica){
  if(!wmHistoryBody) return;
  wmHistoryBody.innerHTML = `<tr><td colspan="3" style="opacity:.7">Učitavam…</td></tr>`;

  const months = getLastMonths(6); // zadnjih 6 mjeseci

  const rowsHtml = [];

  for(const m of months){
    const hours = await fetchWorkerMonthTotal(radnikId, m);
    const amount = hours * Number(satnica || 0);

    rowsHtml.push(`
      <tr>
        <td>${m}</td>
        <td>${hours.toFixed(1)}</td>
        <td>${amount.toFixed(2)}</td>
      </tr>
    `);
  }

  wmHistoryBody.innerHTML = rowsHtml.join("");
}

function getAverageHoursAllWorkers(){
  if (!radnici.length) return 0;
  const totals = radnici.map(r => getTotalHoursForWorker(r.id));
  const sum = totals.reduce((a,b) => a + b, 0);
  return sum / totals.length;
}
//STAMPANJE
const btnPrintPlan = document.getElementById("btnPrintPlan");
const printTitleEl = document.getElementById("printTitle");

function buildPrintTitle() {
  const mjesec = mjesecEl.value; // YYYY-MM
  const period = Number(periodEl.value);

  const [y, m] = mjesec.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();

  let label = "";
  if (period === 0) label = `01 - ${lastDay}`;
  else if (period === 1) label = "01 - 14";
  else label = `15 - ${lastDay}`;

  return `Evidencija radnih sati — ${mjesec} (${label})`;
}

if (btnPrintPlan) {
  btnPrintPlan.addEventListener("click", () => {
    if (printTitleEl) printTitleEl.textContent = buildPrintTitle();
    window.print();
  });
}

function setInsight(text){
  if (!wmInsight) return;
  if (!text){
    wmInsight.hidden = true;
    wmInsight.textContent = "";
    return;
  }
  wmInsight.hidden = false;
  wmInsight.innerHTML = text;
}

async function saveRateFromModal() {
  if (modalWorkerId == null) return;

  const newRate = Number(wmRateInput?.value ?? NaN);
  if (!Number.isFinite(newRate) || newRate < 0) {
    showNotification("Unesi ispravnu satnicu", "error");
    return;
  }

  try {
    // koristi tvoj postojeći API poziv
    await saveSatnica(modalWorkerId, newRate); // :contentReference[oaicite:2]{index=2}

    // 1) update local state
    const r = radnici.find(x => Number(x.id) === Number(modalWorkerId));
    if (r) r.satnica = newRate;

    // 2) update obračun input odmah (bez refreshAll)
    const rateInp = obracunBodyEl.querySelector(`input.rate-input[data-radnik="${modalWorkerId}"]`);
    if (rateInp) {
      rateInp.value = String(newRate);
      rateInp.dataset.prev = String(newRate);
      updateInputState(rateInp); // već imaš ovu funkciju :contentReference[oaicite:3]{index=3}
    }

    // 3) update obračun row (ukupno/plata)
    updateObracunRow(modalWorkerId); // :contentReference[oaicite:4]{index=4}

    // 4) update modal prikaz
    if (wmRate) wmRate.textContent = `${newRate.toFixed(2)}/h`;

    const newTotalPay = modalTotalHours * newRate;
    if (wmTotalPay) wmTotalPay.textContent = newTotalPay.toFixed(2);

    showNotification("Satnica sačuvana!", "success");
    setRateEditMode(false);
  } catch (err) {
    console.error(err);
    showNotification("Greška pri čuvanju satnice", "error");
  }
}

if (wmRateSaveBtn) wmRateSaveBtn.addEventListener("click", saveRateFromModal);

if (wmRateCancelBtn) {
  wmRateCancelBtn.addEventListener("click", () => setRateEditMode(false));
}

// Enter = save, Esc = cancel dok je fokus na inputu
if (wmRateInput) {
  wmRateInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveRateFromModal();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setRateEditMode(false);
    }
  });
}

// init
refreshAll();
