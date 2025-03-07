const API_URL = 'https://morning-taiga-69885-23caee796dab.herokuapp.com/api/takmicari';

function fetchStats() {
    fetch(API_URL) // Obavezno koristite vašu tačnu URL adresu API-ja
    .then(response => response.json())
    .then(data => {

        const statsBody = document.getElementById('statsBody');
        statsBody.innerHTML = ''; // Čistimo tabelu pre nego što dodamo nove redove

        // Prolazimo kroz Zeleni Tim
        if (Array.isArray(data.zeleniTim)) {
            data.zeleniTim.forEach(takmicar => {
                const row = document.createElement('tr');
                const uspesnost = (takmicar.pobede / takmicar.ukupne_igre) * 100;
                row.classList.add("green"); // Ponovo dodaj klasu
                

                const imeCell = document.createElement('td');
                imeCell.textContent = takmicar.ime;
                row.appendChild(imeCell);

                const plemeCell = document.createElement('td');
                plemeCell.textContent = takmicar.tim.charAt(0).toUpperCase() + takmicar.tim.slice(1); // Uzimamo prvo slovo i pretvaramo u veliko
                row.appendChild(plemeCell);

                const ukupneIgreCell = document.createElement('td');
                ukupneIgreCell.textContent = takmicar.ukupne_igre;
                row.appendChild(ukupneIgreCell);

                const pobedeCell = document.createElement('td');
                pobedeCell.textContent = takmicar.pobede;
                row.appendChild(pobedeCell);

                const poraziCell = document.createElement('td');
                poraziCell.textContent = takmicar.ukupne_igre - takmicar.pobede;
                row.appendChild(poraziCell);

                const uspesnostCell = document.createElement('td');
                uspesnostCell.textContent = uspesnost.toFixed(2) || 'Nema podataka'; // Ako nema poslednje igre, pišemo 'Nema podataka'
                row.appendChild(uspesnostCell);

                statsBody.appendChild(row);
            });
        }

        // Prolazimo kroz Žuti Tim
        if (Array.isArray(data.zutiTim)) {
            data.zutiTim.forEach(takmicar => {
                const row = document.createElement('tr');
                const uspesnost = (takmicar.pobede / takmicar.ukupne_igre) * 100;
                row.classList.add("yellow"); // Ponovo dodaj klasu

                const imeCell = document.createElement('td');
                imeCell.textContent = takmicar.ime;
                row.appendChild(imeCell);

                const plemeCell = document.createElement('td');
                plemeCell.textContent = takmicar.tim.charAt(0).toUpperCase() + takmicar.tim.slice(1); // Uzimamo prvo slovo i pretvaramo u veliko
                row.appendChild(plemeCell);

                const ukupneIgreCell = document.createElement('td');
                ukupneIgreCell.textContent = takmicar.ukupne_igre;
                row.appendChild(ukupneIgreCell);

                const pobedeCell = document.createElement('td');
                pobedeCell.textContent = takmicar.pobede;
                row.appendChild(pobedeCell);

                const poraziCell = document.createElement('td');
                poraziCell.textContent = takmicar.ukupne_igre - takmicar.pobede;
                row.appendChild(poraziCell);

                const uspesnostCell = document.createElement('td');
                uspesnostCell.textContent = uspesnost.toFixed(2) || 'Nema podataka'; // Ako nema poslednje igre, pišemo 'Nema podataka'
                row.appendChild(uspesnostCell);

                statsBody.appendChild(row);
            });
        }

    })
    .catch(error => {
        console.error('Greška pri učitavanju podataka:', error);
    });

}
fetchStats();