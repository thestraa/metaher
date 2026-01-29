const BASE = "https://web-production-46e9.up.railway.app";
const API_RADNICI = `${BASE}/api/radnici`;
const API_PLAN = `${BASE}/api/radni-sati`; // GET ?mjesec=&period=  | POST upsert


const mjesecEl = document.getElementById("mjesec");
const periodEl = document.getElementById("period");
const headEl = document.getElementById("sati-head");
const bodyEl = document.getElementById("sati-body");
const obracunBodyEl = document.getElementById("obracun-body");

let radnici = [];
// planMap key = radnik_id, value = object sati {"1": 8, ...}
let planMap = new Map();

function getDays(period, yyyyMm) {
  const [y, m] = yyyyMm.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate(); // m is 1-12 here, ok

  if (Number(period) === 1) {
    return Array.from({ length: 14 }, (_, i) => i + 1);
  }
  return Array.from({ length: lastDay - 14 }, (_, i) => i + 15);
}

async function loadRadnici() {
  const res = await fetch(API_RADNICI);
  radnici = await res.json();
}

async function loadPlan() {
  const mjesec = mjesecEl.value;
  const period = periodEl.value;

  const res = await fetch(`${API_PLAN}?mjesec=${encodeURIComponent(mjesec)}&period=${encodeURIComponent(period)}`);
  const rows = await res.json();

  planMap = new Map();
  for (const row of rows) {
    // mysql2 često vraća JSON kao string; parsiraj ako treba
    let satiObj = row.sati;
    if (typeof satiObj === "string") {
      try { satiObj = JSON.parse(satiObj); } catch { satiObj = {}; }
    }
    planMap.set(row.radnik_id, satiObj || {});
  }
}

function render() {
  const mjesec = mjesecEl.value;
  const period = periodEl.value;
  const days = getDays(period, mjesec);

  // HEAD
    headEl.innerHTML = `
    <tr>
        <th class="sticky-col">Radnik</th>
        <th class="rate-col">Satnica (€)</th>
        ${days.map(d => `<th>${String(d).padStart(2, "0")}</th>`).join("")}
    </tr>
    `;

  // BODY (sati)
  bodyEl.innerHTML = "";
  obracunBodyEl.innerHTML = "";

  radnici.forEach(r => {
    const sati = planMap.get(r.id) || {};

    // enter za satnica
        bodyEl.querySelectorAll(".rate-input").forEach(inp => {
        inp.addEventListener("keydown", async (e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();

            const radnikId = Number(inp.dataset.radnik);
            const value = Number(inp.value || 0);

            try {
            const res = await fetch(`${API_RADNICI}/${radnikId}/satnica`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ satnica: value })
            });
            if (!res.ok) throw new Error("Save satnica failed");

            showNotification("Satnica sačuvana!", "success");
            await refreshAll(); // da se odmah preračuna plata i osvježi
            } catch (err) {
            console.error(err);
            showNotification("Greška pri čuvanju satnice", "error");
            }
        });
        });

    // red lijevo

const tr = document.createElement("tr");
tr.innerHTML = `
  <td class="sticky-col name">${r.ime} ${r.prezime}</td>

  <td class="rate-col">
    <input class="rate-input" type="number" min="0" step="0.5" value="${satnica}"
      data-radnik="${r.id}">
  </td>

  ${days.map(d => {
    const val = Number((sati[String(d)] ?? 0));
    return `
      <td>
        <input type="number" min="0" max="24" value="${val}"
          inputmode="numeric"
          data-radnik="${r.id}" data-day="${d}">
      </td>
    `;
  }).join("")}
`;
bodyEl.appendChild(tr);

    // obračun desno
    const ukupno = days.reduce((sum, d) => sum + Number(sati[String(d)] ?? 0), 0);
    const satnica = Number(r.satnica ?? 5);
    const plata = ukupno * satnica;


    const obr = document.createElement("tr");
    obr.innerHTML = `
      <td class="name">${r.ime} ${r.prezime}</td>
      <td>${ukupno}</td>
      <td class="money">${plata.toFixed(2)}</td>
    `;
    obracunBodyEl.appendChild(obr);
  });

  // eventovi na inpute
bodyEl.querySelectorAll("input[type='number']").forEach(inp => {
  inp.addEventListener("keydown", onInputKeyDown);
});
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
  const inputs = Array.from(bodyEl.querySelectorAll("input[type='number']"));
  const idx = inputs.indexOf(currentInput);
  if (idx >= 0 && idx < inputs.length - 1) {
    inputs[idx + 1].focus();
    inputs[idx + 1].select();
  }
}

async function onInputKeyDown(e) {
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
    const res = await fetch(API_PLAN, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ radnik_id: radnikId, mjesec, period, sati: current })
    });

    if (!res.ok) throw new Error("Save failed");

    showNotification("Uspešno sačuvano!", "success");

    // da obračun tabela osvježi iz planMap (najlakše)
    render();

    // UX: idi na sljedeću ćeliju
    focusNextInput(inp);
  } catch (err) {
    console.error(err);
    showNotification("Greška pri čuvanju", "error");
  }
}

async function refreshAll() {
  await loadRadnici();
  await loadPlan();
  render();
}

mjesecEl.addEventListener("change", refreshAll);
periodEl.addEventListener("change", refreshAll);

// Dodavanje radnika
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
