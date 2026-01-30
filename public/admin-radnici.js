const BASE = "https://web-production-46e9.up.railway.app";
const API_RADNICI = `${BASE}/api/radnici`;
const API_PLAN = `${BASE}/api/radni-sati`; // GET ?mjesec=&period=  | POST upsert

const mjesecEl = document.getElementById("mjesec");
const periodEl = document.getElementById("period");
const headEl = document.getElementById("sati-head");
const bodyEl = document.getElementById("sati-body");
const obracunBodyEl = document.getElementById("obracun-body");

let radnici = [];
let planMap = new Map(); // key radnik_id -> sati object

function getDays(period, yyyyMm) {
  const [y, m] = yyyyMm.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate(); // m is 1-12
  if (Number(period) === 1) return Array.from({ length: 14 }, (_, i) => i + 1);
  return Array.from({ length: lastDay - 14 }, (_, i) => i + 15);
}

function formatDateSR(d) {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}
// Boje zelene se dodaju kad je > 0 
function updateInputState(input){
  const val = Number(input.value || 0);
  const td = input.closest("td");

  if(val > 0){
    input.classList.add("input-active");
    if(td) td.classList.add("cell-active");
  } else {
    input.classList.remove("input-active");
    if(td) td.classList.remove("cell-active");
  }
}


function updateObracunTitle() {
  const mjesec = mjesecEl.value;         // "2026-01"
  const period = Number(periodEl.value); // 1 ili 2
  const [y, m] = mjesec.split("-").map(Number);

  const startDay = period === 1 ? 1 : 15;
  const endDay = period === 1 ? 14 : new Date(y, m, 0).getDate();

  const start = new Date(y, m - 1, startDay);
  const end = new Date(y, m - 1, endDay);

  const el = document.getElementById("obracun-title");
  if (el) el.textContent = `Obračun za Period ${formatDateSR(start)} - ${formatDateSR(end)}`;
}

function showNotification(message, type) {
  const notification = document.getElementById("notification");
  if (!notification) return;

  notification.style.backgroundColor = type === "success" ? "#22c55e" : "#ef4444";
  notification.textContent = message;
  notification.classList.add("show");

  setTimeout(() => notification.classList.remove("show"), 2000);
}

function focusNextInput(currentInput) {
  // samo sat-inpute (da ne skače na satnicu)
  const inputs = Array.from(bodyEl.querySelectorAll("input.day-input"));
  const idx = inputs.indexOf(currentInput);
  if (idx >= 0 && idx < inputs.length - 1) {
    inputs[idx + 1].focus();
    inputs[idx + 1].select();
  }
}

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
    body: JSON.stringify({
      radnik_id: radnikId,
      mjesec,
      period,
      sati: satiObj
    })
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

function render() {
  const mjesec = mjesecEl.value;
  const period = Number(periodEl.value);
  const days = getDays(period, mjesec);
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

    // Tabela sati (lijevo)
    const tr = document.createElement("tr");
    tr.innerHTML = `
    <td class="idx-col">${i + 1}</td>
    <td class="sticky-col name">${r.ime} ${r.prezime}</td>

    ${days.map(d => {
        const key = String(d);
        const val = Number(sati[key] ?? 0);
        return `
        <td>
            <div class="hour-box">
            <input class="day-input" type="number" min="0" max="24" step="0.25" value="${val}"
                inputmode="decimal"
                data-radnik="${r.id}" data-day="${d}">
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
            <input class="rate-input" type="number" min="0" step="0.25" value="${satnica}"
            data-radnik="${r.id}">
        </td>
      <td>${ukupno}h</td>
      <td class="money">${plata.toFixed(2)}</td>
    `;
    obracunBodyEl.appendChild(obr);
  });

  // ENTER save za sate
    bodyEl.querySelectorAll("input.day-input").forEach(inp => {
    inp.addEventListener("keydown", onDayKeyDown);
    updateInputState(inp);
  });

  // ENTER save za satnicu
    obracunBodyEl.querySelectorAll("input.rate-input").forEach(inp => {
    inp.addEventListener("keydown", onRateKeyDown);
  });
  // Oboji sve inpute koji već imaju sate/satnicu
    bodyEl.querySelectorAll("input.day-input, input.rate-input").forEach(inp => {
    updateInputState(inp);
    });

}

async function onDayKeyDown(e) {
  if (e.key !== "Enter") return;
  e.preventDefault();

  const inp = e.target;
  const radnikId = Number(inp.dataset.radnik);
  const day = String(inp.dataset.day);
  const value = Number(inp.value || 0);

  const mjesec = mjesecEl.value;
  const period = Number(periodEl.value);

  const current = planMap.get(radnikId) || {};
  current[day] = value;
  planMap.set(radnikId, current);

  try {
    await savePlan(radnikId, mjesec, period, current);
    showNotification("Uspešno sačuvano!", "success");
    render(); // osvježi obračun
    focusNextInput(inp);
  } catch (err) {
    console.error(err);
    showNotification("Greška pri čuvanju", "error");
  }
}

async function onRateKeyDown(e) {
  if (e.key !== "Enter") return;
  e.preventDefault();

  const inp = e.target;
  const radnikId = Number(inp.dataset.radnik);
  const value = Number(inp.value || 0);

  try {
    await saveSatnica(radnikId, value);
    showNotification("Satnica sačuvana!", "success");
    await refreshAll(); // povuče satnicu iz baze + preračun
  } catch (err) {
    console.error(err);
    showNotification("Greška pri čuvanju satnice", "error");
  }
}

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

// init
refreshAll();
