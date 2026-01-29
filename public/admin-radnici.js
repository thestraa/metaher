const API = "https://web-production-46e9.up.railway.app/api/radnici";
const SATNICA = 5;

const satiTabela = document.getElementById("sati-tabela");
const obracunTabela = document.getElementById("obracun-tabela");

async function loadRadnici() {
  const res = await fetch(API);
  const data = await res.json();

  satiTabela.innerHTML = "";
  obracunTabela.innerHTML = "";

  data.forEach(r => {
    const ukupno =
      r.ponedeljak + r.utorak + r.srijeda + r.cetvrtak + r.petak;
    const plata = ukupno * 5; // SATNICA

    // Tabela sati
const tr = document.createElement("tr");

tr.innerHTML = `
  <td class="ime">${r.ime} ${r.prezime}</td>

  <td><input type="number" value="${r.ponedeljak}"
      onchange="updateSati(${r.id}, 'ponedeljak', this.value)"></td>

  <td><input type="number" value="${r.utorak}"
      onchange="updateSati(${r.id}, 'utorak', this.value)"></td>

  <td><input type="number" value="${r.srijeda}"
      onchange="updateSati(${r.id}, 'srijeda', this.value)"></td>

  <td><input type="number" value="${r.cetvrtak}"
      onchange="updateSati(${r.id}, 'cetvrtak', this.value)"></td>

  <td><input type="number" value="${r.petak}"
      onchange="updateSati(${r.id}, 'petak', this.value)"></td>
`;
    satiTabela.appendChild(tr);

    // Tabela obračuna
    const obr = document.createElement("tr");
    obr.innerHTML = `
      <td>${r.ime} ${r.prezime}</td>
      <td>${ukupno}</td>
      <td>${plata} €</td>
    `;
    obracunTabela.appendChild(obr);
  });
}

async function updateSati(id, field, value) {
  await fetch(`${API}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ field, value: Number(value) })
  });
  loadRadnici();
}

document.getElementById("radnik-form").addEventListener("submit", async e => {
  e.preventDefault();
  await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ime: ime.value,
      prezime: prezime.value,
    })
  });
  e.target.reset();
  loadRadnici();
});

loadRadnici();