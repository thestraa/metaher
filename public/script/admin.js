const API_URL = 'https://morning-taiga-69885-23caee796dab.herokuapp.com/api/takmicari';
const API_POBEDE = "https://morning-taiga-69885-23caee796dab.herokuapp.com/api/pobede";

// Modified log function to handle combined messages
function logUpdate(message) {
    const logList = document.getElementById('logList');
    const logEntry = document.createElement('li');
    logEntry.innerHTML = `
        <strong>[${new Date().toLocaleTimeString()}]</strong> 
        ${message}
    `;
    logList.prepend(logEntry);
}

// Funkcija za učitavanje takmičara
function ucitajTakmicare() {
    fetch(API_URL)
        .then(res => res.json())
        .then(data => {
            const listaTakmicara = document.getElementById("listaTakmicara");
            listaTakmicara.innerHTML = "";
            const sviTakmicari = [...data.zeleniTim, ...data.zutiTim];

            if (Array.isArray(sviTakmicari)) {
                    sviTakmicari.forEach(t => {
                        if (!t.u_igri) return;
                    const row = document.createElement("tr");
                    row.setAttribute("data-id", t.id);
                    row.setAttribute("tim", t.tim)

                    if(t.tim === "zuti"){
                        row.classList.add("zuti")
                    }

                    row.innerHTML = `
                        <td class="id">${t.id}</td>
                        <td>${t.tim || "Nema tima"}</td>
                        <td class="ime">${t.ime}</td>
                        <td>${t.prezime}</td>
                        <td class="ukupne-igre">
                            <button class="plusIgre">+</button>
                            <span class="brojUkupneIgre">${t.ukupne_igre}</span>
                            <button class="minusIgre">-</button>
                        </td>
                        <td class="pobede">
                            <button class="plusPobeda">+</button>
                            <span class="brojPobeda">${t.pobede}</span>
                            <button class="minusPobeda">-</button>
                        </td>
                        
                    `;
                    listaTakmicara.appendChild(row);
                });
            } else {
                console.error("Očekivao se niz, ali je dobijen:", sviTakmicari);
            }
        })
        .catch(err => console.error("Greška pri učitavanju takmičara:", err));
}

document.getElementById("listaTakmicara").addEventListener("click", function(event) {
    let dugme = event.target;
    let red = dugme.closest("tr");
    let imeTakmicara = red.querySelector(".ime").textContent.trim();
    if (!red) return; // Osigurava da postoji red

    let id = red.dataset.id;
    let spanPobeda = red.querySelector(".brojPobeda");
    let spanIgre = red.querySelector(".brojUkupneIgre");

    if (dugme.classList.contains("plusIgre")) {
        let trenutneIgre = parseInt(spanIgre.textContent, 10);
        spanIgre.textContent = trenutneIgre + 1;
        azurirajTakmicara(id, null, trenutneIgre + 1);
        logUpdate(`${imeTakmicara}: Ukupne Igre + 1,  Total: ${trenutneIgre + 1}`);
    }

    if (dugme.classList.contains("minusIgre")) {
        let trenutneIgre = parseInt(spanIgre.textContent, 10);
        if (trenutneIgre > 0) {
            spanIgre.textContent = trenutneIgre - 1;
            azurirajTakmicara(id, null, trenutneIgre - 1);
            logUpdate(`${imeTakmicara}: Ukupne Igre - 1,  Total: ${trenutneIgre - 1}`);
        }
    }

    if (dugme.classList.contains("plusPobeda")) {
        let trenutnePobede = parseInt(spanPobeda.textContent, 10);
        spanPobeda.textContent = trenutnePobede + 1;
        azurirajTakmicara(id, trenutnePobede + 1, null);
        logUpdate(`${imeTakmicara}: Pobede + 1,  Total: ${trenutnePobede + 1}`);
    }

    if (dugme.classList.contains("minusPobeda")) {
        let trenutnePobede = parseInt(spanPobeda.textContent, 10);
        if (trenutnePobede > 0) {
            spanPobeda.textContent = trenutnePobede - 1;
            azurirajTakmicara(id, trenutnePobede - 1, null);
            logUpdate(`${imeTakmicara}: Pobede - 1,  Total: ${trenutnePobede - 1}`);
        }
    }
});


function azurirajTakmicara(id) {

    let red = document.querySelector(`tr[data-id="${id}"]`);

    let pobedeEl = red.querySelector(".brojPobeda");
    let ukupneIgreEl = red.querySelector(".brojUkupneIgre");


    let pobede = parseInt(pobedeEl.textContent);
    let ukupneIgre = parseInt(ukupneIgreEl.textContent);

    // Sprečavanje slanja undefined vrednosti
    if (isNaN(pobede)) pobede = 0;
    if (isNaN(ukupneIgre)) ukupneIgre = 0;

    pobedeEl.textContent = pobede;
    ukupneIgreEl.textContent = ukupneIgre;


    // Šaljemo zahtev serveru
    const body = JSON.stringify({ pobede, ukupne_igre: ukupneIgre });

    fetch(`https://morning-taiga-69885-23caee796dab.herokuapp.com/api/takmicari/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body
    })
    .then(response => response.json())
    .then(data => console.log("✅ Uspešno ažurirano:", data))
    .catch(error => console.error("❌ Greška prilikom ažuriranja:", error));
}

ucitajTakmicare();


function ucitajPobedeTimova() {
    fetch(API_POBEDE)
        .then(res => res.json())
        .then(data => {
            document.getElementById("pobedeZeleni").textContent = data.zeleni;
            document.getElementById("pobedeZuti").textContent = data.zuti;
        })
        .catch(err => console.error("Greška pri učitavanju pobeda timova:", err));
}

// function azurirajPobedeTimova(tim) {
//     let pobedeEl = document.getElementById(tim === "zeleni" ? "pobedeZeleni" : "pobedeZuti");
//     let novePobede = parseInt(pobedeEl.textContent, 10) + 1;
//     pobedeEl.textContent = novePobede;

//     fetch(API_POBEDE, {
//         method: "PUT",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ [tim]: novePobede })
//     })
//     .then(res => res.json())
//     .then(data => console.log(`✅ Ažurirane pobede za ${tim}:`, data))
//     .catch(err => console.error(`❌ Greška pri ažuriranju pobeda za ${tim}:`, err));
// }

// document.getElementById("plusZeleni").addEventListener("click", () => azurirajPobedeTimova("zeleni"));
// document.getElementById("plusZuti").addEventListener("click", () => azurirajPobedeTimova("zuti"));

// Učitaj pobede kada se stranica otvori
ucitajPobedeTimova();

function dodajPobedu(tim) {
    fetch('/api/pobede', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ tim }) // tim može biti "zeleni" ili "zuti"
    })
    .then(response => response.json())
    .then(data => {
      console.log(data);
      location.reload(); // Osveži stranicu da prikaže nove podatke
    })
    .catch(error => console.error('Greška:', error));
  }