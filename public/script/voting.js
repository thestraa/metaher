function voting() {
    fetch('http://localhost:3000/api/takmicari') // Obavezno koristite vašu tačnu URL adresu API-ja
    .then(response => response.json())
    .then(data => {

        const votingBody = document.getElementById('votingBody');
        votingBody.innerHTML = ''; // Čistimo tabelu pre nego što dodamo nove redove

        // Sortiranje takmičara po broju glasova
        const sortByGlasovi = (a, b) => b.glasovi - a.glasovi;

        // Kombinujemo takmičare iz oba tima u jedan niz
        const allTakmicari = [...(data.zeleniTim || []), ...(data.zutiTim || [])];

        // Sortiramo sve takmičare po broju glasova
        allTakmicari.sort(sortByGlasovi).forEach(takmicar => {
            const row = document.createElement('div');
            row.classList.add("card"); // Dodaj klasu
            row.setAttribute('data-id', takmicar.id); // Dodaj data-id atribut za identifikaciju

            const slikaCell = document.createElement('img');
            slikaCell.src = takmicar.slika;
            row.appendChild(slikaCell);

            const imeCell = document.createElement('h3');
            imeCell.textContent = takmicar.ime;
            row.appendChild(imeCell);

            const glasoviCell = document.createElement('p');
            glasoviCell.textContent = "Glasova: " + takmicar.glasovi;
            row.appendChild(glasoviCell);

            row.addEventListener('click', () => {
                handleVoting(takmicar.id, glasoviCell); // Pozivanje nove funkcije
            });

            votingBody.appendChild(row);
        });

    })
    .catch(error => {
        console.error('Greška pri učitavanju podataka:', error);
    });
}

// Nova funkcija koja se poziva kada korisnik klikne na takmičara
function handleVoting(takmicarId, glasoviCell) {
    fetch('http://localhost:3000/api/glasanje', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ takmicarId })
    })
    .then(response => response.json())
    .then(responseData => {
        if (responseData.success) {
            // Ažuriraj glasove u DOM-u sa vrednostima koje se vrate iz backend-a
            glasoviCell.textContent = `Glasova: ${responseData.takmicar.glasovi}`;
            
            // Prikazivanje obaveštenja o uspehu
            showNotification('Hvala Vam što ste glasali! Glas je uspešno zabeležen.', 'success');
        } else {
            // Prikazivanje greške
            showNotification(responseData.message, 'error');
        }
    })
    .catch(error => {
        console.error('Greška pri glasanju:', error);
        showNotification('Došlo je do greške pri glasanju. Pokušajte ponovo.', 'error');
    });
}

// Funkcija za prikazivanje obaveštenja
function showNotification(message, type) {
    const notification = document.getElementById('notification');
    
    // Promena boje obavesti zavisno od tipa (uspeh ili greška)
    if (type === 'success') {
        notification.style.backgroundColor = '#4CAF50'; // Zelena za uspeh
    } else {
        notification.style.backgroundColor = '#f44336'; // Crvena za grešku
    }

    // Prikazivanje obavesti
    notification.textContent = message;
    notification.classList.add('show');

    // Sakrivanje obavesti nakon 3 sekunde
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}
voting(); // Pozivamo funkciju koja učitava takmičare
