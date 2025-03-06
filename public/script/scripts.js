const API_URL = 'https://morning-taiga-69885-23caee796dab.herokuapp.com/api/takmicari';

// Navbar toggle
window.toggleMenu = function () {
  document.querySelector(".nav-links").classList.toggle("active");
};

// Zatvori meni kada se klikne na link
document.querySelectorAll(".nav-links a").forEach(link => {
  link.addEventListener("click", () => {
    document.querySelector(".nav-links").classList.remove("active");
  });
});

// Dodaj klasu "scrolled" na navbar pri skrolovanju
window.addEventListener("scroll", function () {
  let navbar = document.querySelector(".navbar");
  if (window.scrollY > 50) {
    navbar.classList.add("scrolled");
  } else {
    navbar.classList.remove("scrolled");
  }
});

//Sorting table
window.sortTable = function(n, defaultDir = null) {
  let table, rows, switching, i, x, y, shouldSwitch, dir, switchcount = 0;
  table = document.getElementById("statsTable");
  switching = true;
  
  // Ako je definisan defaultDir, koristi njega, inače podrazumevano "asc"
  dir = defaultDir ? defaultDir : "asc";

  while (switching) {
    switching = false;
    rows = table.getElementsByTagName("TR"); // Pronađi sve redove tabele
    for (i = 1; i < rows.length - 1; i++) { // Počni od 1 da bi izbegao zaglavlje
      shouldSwitch = false;
      x = rows[i].getElementsByTagName("TD")[n]; // Dohvati ćelije u određenoj koloni
      y = rows[i + 1].getElementsByTagName("TD")[n];

      if (dir == "asc") {
        if (!isNaN(parseFloat(x.innerHTML)) && !isNaN(parseFloat(y.innerHTML))) {
          if (parseFloat(x.innerHTML) > parseFloat(y.innerHTML)) { // Ako su brojevi
            shouldSwitch = true;
            break;
          }
        } else if (x.innerHTML.toLowerCase() > y.innerHTML.toLowerCase()) { // Ako su stringovi
          shouldSwitch = true;
          break;
        }
      } else if (dir == "desc") {
        if (!isNaN(parseFloat(x.innerHTML)) && !isNaN(parseFloat(y.innerHTML))) {
          if (parseFloat(x.innerHTML) < parseFloat(y.innerHTML)) {
            shouldSwitch = true;
            break;
          }
        } else if (x.innerHTML.toLowerCase() < y.innerHTML.toLowerCase()) {
          shouldSwitch = true;
          break;
        }
      }
    }
    if (shouldSwitch) {
      rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
      switching = true;
      switchcount++;
    } else {
      if (switchcount == 0 && dir == "asc") {
        dir = "desc";
        switching = true;
      }
    }
  }
}

window.addEventListener('load', function() {
  setTimeout(() => {
    sortTable(3, "desc"); // Sortira tabelu prema broju pobeda (četvrta kolona, indeks 3)
  }, 500); // Dodaj malo kašnjenje kako bi podaci imali vremena da se učitaju
});

document.addEventListener("DOMContentLoaded", function() {
  fetch(API_URL)
    .then(response => response.json())
    .then(data => {
      const containerZeleni = document.getElementById("zeleniTim");
      const containerZuti = document.getElementById("zutiTim");

      // Očisti postojeći sadržaj
      containerZeleni.innerHTML = "";
      containerZuti.innerHTML = "";

      if (Array.isArray(data.zeleniTim)) {
        // Sortiraj po procentu pobeda u opadajućem redosledu
        data.zeleniTim.sort((a, b) => (b.pobede / b.ukupne_igre) - (a.pobede / a.ukupne_igre));

        data.zeleniTim.forEach(takmicar => {
          const div = document.createElement("div");
          const uspesnost = (takmicar.pobede / takmicar.ukupne_igre) * 100;

          div.classList.add("takmicar", "card");
          div.innerHTML = `
            <img src="${takmicar.slika}" alt="${takmicar.ime} ${takmicar.prezime}">
            <h3>${takmicar.ime} ${takmicar.prezime}</h3>
            <p>Uspešnost u igrama:</p> 
            <p class="uspesnost">${uspesnost.toFixed(2)}%</p>
          `;

          // Promena boje uspešnosti
          const uspesnostElement = div.querySelector('.uspesnost');
          uspesnostElement.style.color = uspesnost > 50 ? "green" : "red";

          containerZeleni.appendChild(div);
        });
      }

      if (Array.isArray(data.zutiTim)) {
        // Sortiraj po procentu pobeda u opadajućem redosledu
        data.zutiTim.sort((a, b) => (b.pobede / b.ukupne_igre) - (a.pobede / a.ukupne_igre));

        data.zutiTim.forEach(takmicar => {
          const div = document.createElement("div");
          const uspesnost = (takmicar.pobede / takmicar.ukupne_igre) * 100;

          div.classList.add("takmicar", "card");
          div.innerHTML = `
            <img src="${takmicar.slika}" alt="${takmicar.ime} ${takmicar.prezime}">
            <h3>${takmicar.ime} ${takmicar.prezime}</h3>
            <p>Uspešnost u igrama:</p> 
            <p class="uspesnost">${uspesnost.toFixed(2)}%</p>
          `;

          // Promena boje uspešnosti
          const uspesnostElement = div.querySelector('.uspesnost');
          uspesnostElement.style.color = uspesnost > 50 ? "green" : "red";

          containerZuti.appendChild(div);
        });
      }
    })
    .catch(error => console.error("Greška pri učitavanju podataka:", error));
});

// Funkcija za kreiranje grafikona
function prikaziGrafikon(pobedeZuti, pobedeZeleni) {
  const ctx = document.getElementById("pobedeGrafikon").getContext("2d");

  // Kreiraj okrugli grafikon
  new Chart(ctx, {
      type: "pie",  // Tip grafikona
      data: {
          labels: [`${pobedeZuti}`, `${pobedeZeleni}`],  // Oznake timova
          datasets: [{
              data: [pobedeZuti, pobedeZeleni],  // Podaci o pobedama
              backgroundColor: ["#f4b400", "#00360c"],  // Boje timova (žuti, zeleni)
              hoverBackgroundColor: ["#f5c029", "#025b15"],  // Boje na hover
          }]
      },
      options: {
          responsive: true,  // Da bude responzivno
          plugins: {
              legend: {
                  position: "top",  // Pozicija legende
                  labels: {
                    font: {
                        family: "'Montserrat', sans-serif",  // Promeni font
                        size: 16,  // Veličina fonta
                        weight: "bold",  // Debljina fonta
                    },
                    color: "#fff",  // Boja teksta legendi
                    boxWidth: 20,  // Širina kutije boje u legendi
                    boxHeight: 20,  // Visina kutije boje u legendi
                }
              }
          }
      }
  });
}

// Manuelno uneseni podaci
const pobedeZuti = 3;  // Broj pobeda žutih
const pobedeZeleni = 1;  // Broj pobeda zelenih

// Prikazivanje grafikona sa brojem pobeda
prikaziGrafikon(pobedeZuti, pobedeZeleni);
