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
                    const row = document.createElement("tr");
                    row.setAttribute("data-id", t.id);

                    row.innerHTML = `
                        <td>${t.id}</td>
                        <td>${t.ime}</td>
                        <td>${t.prezime}</td>
                        <td>${t.ukupne_igre}</td>
                        <td>${t.pobede}</td>
                        <td>${t.tim || "Nema tima"}</td>
                        <td>
                            <button id="updateButton-${t.id}">
                                ✏ Ažuriraj
                            </button>
                            <button class="deltebtn" onclick="obrisiTakmicara(${t.id})">🗑 Obrisi</button>
                        </td>
                    `;
                    listaTakmicara.appendChild(row);

                    const updateButton = document.getElementById(`updateButton-${t.id}`);
                    updateButton.addEventListener("click", function() {
                        otvoriModal(t.id, t.ime, t.prezime, t.pobede, t.ukupne_igre, t.tim);
                    });
                });
            } else {
                console.error("Očekivao se niz, ali je dobijen:", sviTakmicari);
            }
        })
        .catch(err => console.error("Greška pri učitavanju takmičara:", err));
}

// Funkcija za dodavanje takmičara
document.getElementById("dodajTakmicaraForm").addEventListener("submit", function(e) {
    e.preventDefault();

    const ime = document.getElementById("ime").value;
    const prezime = document.getElementById("prezime").value;
    const pobede = document.getElementById("pobede").value || 0;
    const ukupne_igre = document.getElementById("ukupne_igre").value || 0;
    const tim = document.getElementById("tim").value;
   
    const takmicar = {
        ime,
        prezime,
        pobede,
        ukupne_igre,
        tim // Dodajemo tim u telo zahteva
    };
    fetch(API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"  // Pobrinite se da je Content-Type postavljen na JSON
        },
        body: JSON.stringify({
            ime: ime,
            prezime: prezime,
            pobede: pobede,
            ukupne_igre: ukupne_igre,
            tim: tim
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Greška pri dodavanju takmičara');
        }
        return response.json();
    })
    .then(data => {
        console.log("Takmičar je uspešno dodat:", data);
        ucitajTakmicare();  // Ponovno učitaj takmičare
    })
    .catch(err => {
        console.error("Greška pri dodavanju:", err);
});
});
// Funkcija za brisanje takmičara
function obrisiTakmicara(id) {
    if (confirm("Da li ste sigurni da želite da obrišete takmičara?")) {
        fetch(`${API_URL}/${id}`, { method: "DELETE" })
            .then(() => ucitajTakmicare())
            .catch(err => console.error("Greška pri brisanju:", err));
    }
}

// Modified modal opening function to store original values
function otvoriModal(id, ime, prezime, pobede, ukupne_igre, tim) {
    const modal = document.getElementById("modal");
    modal.dataset.originalData = JSON.stringify({
        ime: ime,
        prezime: prezime,
        pobede: pobede,
        ukupne_igre: ukupne_igre,
        tim: tim
    });
    
    document.getElementById("edit-id").value = id;
    document.getElementById("edit-ime").value = ime;
    document.getElementById("edit-prezime").value = prezime;
    document.getElementById("edit-pobede").value = pobede;
    document.getElementById("edit-ukupne-igre").value = ukupne_igre;
    document.getElementById("edit-tim").value = tim;
    modal.style.display = "block";
}

function zatvoriModal() {
    document.getElementById("modal").style.display = "none";
}

// Modified sacuvajIzmene function with logging
function sacuvajIzmene() {
    const modal = document.getElementById("modal");
    const originalData = JSON.parse(modal.dataset.originalData);
    const { ime, prezime } = originalData; // Get player name
    
    const id = document.getElementById("edit-id").value;
    const pobede = document.getElementById("edit-pobede").value;
    const ukupne_igre = document.getElementById("edit-ukupne-igre").value;


    // Build log message
    const changes = [];
    
    if (originalData.ukupne_igre !== ukupne_igre) {
        changes.push(`Ukupne igre sa ${originalData.ukupne_igre} na ${ukupne_igre}`);
    }

    if (originalData.pobede !== pobede) {
        changes.push(`Pobede sa ${originalData.pobede} na ${pobede}`);
    }

    if (changes.length > 0) {
        const message = `Igrač ${ime} ${prezime}: ${changes.join(', ')}`;
        logUpdate(message);
    }

    fetch(`${API_URL}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pobede, ukupne_igre, tim })
    })
    .then(() => {
        const red = document.querySelector(`tr[data-id="${id}"]`);
        red.classList.remove("updated");
        void red.offsetWidth;
        red.classList.add("updated");
        setTimeout(() => red.classList.remove("updated"), 7000);
        ucitajTakmicare();
        zatvoriModal();
    })
    .catch(err => console.error("Greška pri ažuriranju:", err));
}

// Učitaj podatke na početku
ucitajTakmicare();
