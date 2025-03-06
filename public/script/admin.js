const API_URL = "http://localhost:3000/api/takmicari";

// Funkcija za učitavanje takmičara
function ucitajTakmicare() {
    fetch(API_URL)
        .then(res => res.json())
        .then(data => {

            const listaTakmicara = document.getElementById("listaTakmicara");

            // Očisti postojeću tabelu
            listaTakmicara.innerHTML = "";

            // Kombinuj zelene i žute takmičare u jedan niz
            const sviTakmicari = [...data.zeleniTim, ...data.zutiTim];

            // Proveri da li su podaci sada niz
            if (Array.isArray(sviTakmicari)) {
                // Ako je sviTakmicari niz, iteriraj kroz njega
                sviTakmicari.forEach(t => {
                    const row = document.createElement("tr");
                    row.setAttribute("data-id", t.id);

                    row.innerHTML = `
                        <td>${t.id}</td>
                        <td>${t.ime}</td>
                        <td>${t.prezime}</td>
                        <td>${t.pobede}</td>
                        <td>${t.ukupne_igre}</td>
                        <td>${t.tim || "Nema tima"}</td> <!-- Prikazujemo tim -->
                        <td>
                            <button id="updateButton-${t.id}">
                                ✏ Ažuriraj
                            </button>
                            <button class="deltebtn" onclick="obrisiTakmicara(${t.id})">🗑 Obrisi</button>
                        </td>
                    `;
                    listaTakmicara.appendChild(row);

                    // Dodaj event listener za ažuriranje
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
    fetch("http://localhost:3000/api/takmicari", {
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

// Funkcija za otvaranje modala
function otvoriModal(id, ime, prezime, pobede, ukupne_igre, tim) {
    document.getElementById("edit-id").value = id;
    document.getElementById("edit-ime").value = ime;
    document.getElementById("edit-prezime").value = prezime;
    document.getElementById("edit-pobede").value = pobede;
    document.getElementById("edit-ukupne-igre").value = ukupne_igre;
    document.getElementById("edit-tim").value = tim;
    document.getElementById("modal").style.display = "block";
}

function zatvoriModal() {
    document.getElementById("modal").style.display = "none";
}

// Funkcija za slanje izmjena
function sacuvajIzmene() {
    const id = document.getElementById("edit-id").value;
    const ime = document.getElementById("edit-ime").value;
    const prezime = document.getElementById("edit-prezime").value;
    const pobede = document.getElementById("edit-pobede").value;
    const ukupne_igre = document.getElementById("edit-ukupne-igre").value;
    const tim = document.getElementById("edit-tim").value;

    fetch(`${API_URL}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pobede, ukupne_igre, tim })
    })
    .then(() => {
        // Dodajemo klasu 'updated' na red koji je ažuriran
        const red = document.querySelector(`tr[data-id="${id}"]`);
        red.classList.remove("updated"); // Ukloni klasu ako već postoji

        void red.offsetWidth; // Forsira reflow, resetuje animaciju
        
        red.classList.add("updated"); // Ponovo dodaj klasu
        console.log("Dodao klasu .updated na:", red);
        // Onda uklonimo klasu 'updated' nakon 7 sekundi (da bi animacija bila vidljiva)
        setTimeout(() => {
            red.classList.remove("updated");
        }, 7000);

        ucitajTakmicare(); // Osvježavanje podataka
        zatvoriModal();
    })
    .catch(err => console.error("Greška pri ažuriranju:", err));
}

// Učitaj podatke na početku
ucitajTakmicare();
