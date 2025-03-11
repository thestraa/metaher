const API_URL = 'https://morning-taiga-69885-23caee796dab.herokuapp.com/api/takmicari';

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
    console.log("Klik na dugme:", event.target);
    let dugme = event.target;
    let red = dugme.closest("tr");
    if (!red) return; // Osigurava da postoji red

    let id = red.dataset.id;
    let spanPobeda = red.querySelector(".brojPobeda");
    let spanIgre = red.querySelector(".brojUkupneIgre");

    if (dugme.classList.contains("plusIgre")) {
        let trenutneIgre = parseInt(spanIgre.textContent, 10);
        spanIgre.textContent = trenutneIgre + 1;
        azurirajTakmicara(id, null, trenutneIgre + 1);
    }

    if (dugme.classList.contains("minusIgre")) {
        let trenutneIgre = parseInt(spanIgre.textContent, 10);
        if (trenutneIgre > 0) {
            spanIgre.textContent = trenutneIgre - 1;
            azurirajTakmicara(id, null, trenutneIgre - 1);
        }
    }

    if (dugme.classList.contains("plusPobeda")) {
        let trenutnePobede = parseInt(spanPobeda.textContent, 10);
        spanPobeda.textContent = trenutnePobede + 1;
        azurirajTakmicara(id, trenutnePobede + 1, null);
    }

    if (dugme.classList.contains("minusPobeda")) {
        let trenutnePobede = parseInt(spanPobeda.textContent, 10);
        if (trenutnePobede > 0) {
            spanPobeda.textContent = trenutnePobede - 1;
            azurirajTakmicara(id, trenutnePobede - 1, null);
        }
    }
});


function azurirajTakmicara(id, promenaPobeda, promenaUkupneIgre) {
    console.log("ID takmičara:", id);
    console.log(`🔄 Ažuriram takmičara ${id} | Pobede: ${promenaPobeda}, Ukupne igre: ${promenaUkupneIgre}`);

    let red = document.querySelector(`tr[data-id="${id}"]`);
    if (!red) {
        console.error("❌ Greška: Red za takmičara nije pronađen!");
        return;
    }

    let imeTakmicara = red.querySelector(".ime").textContent.trim();
    let pobedeEl = red.querySelector(".brojPobeda");
    let ukupneIgreEl = red.querySelector(".brojUkupneIgre");

    if (!pobedeEl || !ukupneIgreEl) {
        console.error("❌ Greška: Nisu pronađene pobede ili ukupne igre!");
        return;
    }

    let pobede = parseInt(pobedeEl.textContent);
    let ukupneIgre = parseInt(ukupneIgreEl.textContent);

    // Sprečavanje slanja undefined vrednosti
    if (isNaN(pobede)) pobede = 0;
    if (isNaN(ukupneIgre)) ukupneIgre = 0;

    pobede = promenaPobeda !== null ? promenaPobeda : pobede;
    ukupneIgre = promenaUkupneIgre !== null ? promenaUkupneIgre : ukupneIgre;

    pobedeEl.textContent = pobede;
    ukupneIgreEl.textContent = ukupneIgre;

    if (promenaPobeda !== null) {
        logUpdate(`${imeTakmicara}: Pobede ${promenaPobeda > 0 ? ":" : ""}${promenaPobeda}`);
    }
    if (promenaUkupneIgre !== null) {
        logUpdate(`${imeTakmicara}: Ukupne igre ${promenaUkupneIgre > 0 ? ":" : ""}${promenaUkupneIgre}`);
    }

    // Šaljemo zahtev serveru
    const body = JSON.stringify({ pobede, ukupne_igre: ukupneIgre });

    console.log("🔵 Šaljem podatke:", body); // Debugging
    console.log("🔄 Ažuriram:", { id, pobede, ukupneIgre });

    fetch(`https://morning-taiga-69885-23caee796dab.herokuapp.com/api/takmicari/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body
    })
    .then(response => response.json())
    .then(data => console.log("✅ Uspešno ažurirano:", data))
    .catch(error => console.error("❌ Greška prilikom ažuriranja:", error));
}
// Pozovi funkciju posle učitavanja takmičara

ucitajTakmicare();


// function azurirajTakmicara(id, promenaPobeda, promenaUkupneIgre) {
//     console.log("ID takmičara:", id);  // ✅ Provera ID-a

//     // Pronađi red takmičara
//     let red = document.querySelector(`tr[data-id="${id}"]`);
//     if (!red) {
//         console.error("❌ Greška: Red za takmičara nije pronađen!");
//         return;
//     }
//     let imeTakmicara = red.querySelector(".ime").textContent.trim();
//     // Pronađi pobede i ukupne igre
//     let pobedeEl = red.querySelector(".pobede");
//     let ukupneIgreEl = red.querySelector(".ukupne-igre");

//     if (!pobedeEl || !ukupneIgreEl) {
//         console.error("❌ Greška: Nisu pronađene pobede ili ukupne igre!");
//         return;
//     }

//     console.log("Pobede:", pobedeEl.textContent, "Ukupne igre:", ukupneIgreEl.textContent);

//     // Pretvori tekst u broj
//     let pobede = parseInt(pobedeEl.textContent);
//     let ukupneIgre = parseInt(ukupneIgreEl.textContent);

//     // Ažuriraj vrednosti
//     pobede += promenaPobeda;
//     ukupneIgre += promenaUkupneIgre;

//     // Postavi nove vrednosti u tabelu
//     pobedeEl.textContent = pobede;
//     ukupneIgreEl.textContent = ukupneIgre;
//     let logPoruka = `${imeTakmicara}:`;

//     if (promenaPobeda !== 0) {
//         logPoruka += ` Pobede ${promenaPobeda > 0 ? "+" : ""}${promenaPobeda}, Ukupno pobeda: ${pobede}`;
//     }

//     if (promenaUkupneIgre !== 0) {
//         logPoruka += `${promenaPobeda !== 0 ? "," : ""} Ukupne igre ${promenaUkupneIgre > 0 ? "+" : ""}${promenaUkupneIgre}, Ukupno: ${ukupneIgre}`;
//     }

//     // Pozivamo log funkciju samo ako ima promene
//     if (promenaPobeda !== 0 || promenaUkupneIgre !== 0) {
//         logUpdate(logPoruka);
//     }

//     // Pošalji PUT zahtev serveru
//     fetch(`https://morning-taiga-69885-23caee796dab.herokuapp.com/api/takmicari/${id}`, {
//         method: "PUT",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ pobede, ukupne_igre: ukupneIgre })
//     })
//     .then(response => response.json())
//     .then(data => {
//         console.log("✅ Uspešno ažurirano:", data);
//     })
//     .catch(error => console.error("❌ Greška prilikom ažuriranja:", error));
// }