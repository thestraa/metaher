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

const canvas = document.getElementById('pobedeChart');
canvas.width = canvas.parentElement.clientWidth;
canvas.height = canvas.parentElement.clientWidth * 0.75; // Održava dobar odnos širine i visine
// Prikazivanje pobeda dinamicko grafik
async function prikaziPobede() {
  try {
      const response = await fetch('https://morning-taiga-69885-23caee796dab.herokuapp.com/api/pobede'); // Zameni sa pravim URL-om
      const data = await response.json();

      const ctx = document.getElementById('pobedeChart').getContext('2d');

      new Chart(ctx, {
          type: 'doughnut', // Doughnut chart (kružni dijagram)
          data: {
              datasets: [{
                  data: [data.zeleni, data.zuti],
                  backgroundColor: ['#00360c', '#f4b400'], // Zelena i žuta
                  borderColor: ['#02310c', '#d39e00'], // Tamnija nijansa za ivice
                  borderWidth: 2,
                  hoverOffset: 20 // Efekat "iskačuće" animacije kada pređeš mišem
              }]
          },
          options: {
              responsive: true,
              
              plugins: {
                  legend: {
                      display: true,
                      position: 'bottom',
                      labels: {
                          color: '#fff', // Bele etikete ako je tamna pozadina
                          font: { size: 16 }
                      }
                  }
              },
              animation: {
                  animateScale: true,  // Skaliranje prilikom učitavanja
                  animateRotate: true  // Rotacija prilikom učitavanja
              }
          }
      });

  } catch (error) {
      console.error('Greška pri dohvaćanju pobeda:', error);
  }
}
// Ponovno skaliranje grafika kada se prozor promeni
window.addEventListener('resize', prikaziPobede);
// Poziv funkcije nakon učitavanja stranice
document.addEventListener('DOMContentLoaded', prikaziPobede);

// Prikazivanje pobeda dinamicko
async function prikaziPobedes() {
  try {
      const response = await fetch('https://morning-taiga-69885-23caee796dab.herokuapp.com/api/pobede'); // Zameni sa pravim URL-om backenda
      const data = await response.json();

      document.getElementById('zeleni-pobede').textContent = data.zeleni;
      document.getElementById('zuti-pobede').textContent = data.zuti;
  } catch (error) {
      console.error('Greška pri dohvaćanju pobeda:', error);
  }
}

// Poziv funkcije nakon učitavanja stranice
document.addEventListener('DOMContentLoaded', prikaziPobedes);