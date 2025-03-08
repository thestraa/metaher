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

// Odabrati linkove sa navbar-a i footera
const navLinks = document.querySelectorAll('.nav-links a, .footer-links a, .glasaj a'); // Selektuj sve linkove

// Dodati event listener za svaki link
navLinks.forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault(); // Sprečiti default ponašanje linka (skrolovanje)

    // Na osnovu href-a pronalazimo sekciju
    const targetId = link.getAttribute('href').substring(1); // Uzima id sa #statistika
    const targetSection = document.getElementById(targetId);

    // Skroluj do sekcije sa offset-om
    window.scrollTo({
      top: targetSection.offsetTop - 100, // Pomeri 100px iznad sekcije
      behavior: 'smooth' // Glatko skrolovanje
    });
  });
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
            <img src="${takmicar.slika}" alt="${takmicar.ime} ${takmicar.prezime}" loading="lazy">
            <h3>${takmicar.ime} ${takmicar.prezime}</h3>
            <p>Uspešnost u igrama:</p> 
            <p class="uspesnost">${uspesnost.toFixed(2)}%</p>
            <button class="details-btn" data-takmicar='${JSON.stringify(takmicar)}'>Detalji</button>
            <button class="share-btn" data-name="${takmicar.ime} ${takmicar.prezime}"><i class="fas fa-share-alt"></i></button>
          `;

          // Promena boje uspešnosti
          const uspesnostElement = div.querySelector('.uspesnost');
          uspesnostElement.style.color = uspesnost > 50 ? "green" : "red";

          containerZeleni.appendChild(div);

          // Dodaj event listener za dugme
          const shareButton = div.querySelector(".share-btn");
          shareButton.addEventListener("click", async () => {
              const name = shareButton.getAttribute("data-name");
              const shareUrl = `https://survivorstatistika.com/takmicar/${takmicar.ime.toLowerCase()}-${takmicar.prezime.toLowerCase()}`;
              const text = `Pogledaj statistiku za ${name} na Survivor Statistici!`;
        
              if (navigator.share) {
                  try {
                      await navigator.share({
                          title: "Survivor 2025 Statistika",
                          text: text,
                          url: shareUrl
                      });
                  } catch (error) {
                      console.error("Deljenje nije uspelo:", error);
                  }
              } else {
                  navigator.clipboard.writeText(shareUrl)
                      .then(() => alert("Link kopiran!"))
                      .catch(err => console.error("Greška pri kopiranju:", err));
              }
          });
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
            <button class="details-btn" data-takmicar='${JSON.stringify(takmicar)}'>Detalji</button>
            <button class="share-btn" data-name="${takmicar.ime} ${takmicar.prezime}"><i class="fas fa-share-alt"></i></button>
          `;
        
          // Promena boje uspešnosti
          const uspesnostElement = div.querySelector('.uspesnost');
          uspesnostElement.style.color = uspesnost > 50 ? "green" : "red";
        
          containerZuti.appendChild(div);
        
          // Dodaj event listener za dugme
          const shareButton = div.querySelector(".share-btn");
          shareButton.addEventListener("click", async () => {
              const name = shareButton.getAttribute("data-name");
              const shareUrl = `https://survivorstatistika.com/takmicar/${takmicar.ime.toLowerCase()}-${takmicar.prezime.toLowerCase()}`;
              const text = `Pogledaj statistiku za ${name} na Survivor Statistici!`;
        
              if (navigator.share) {
                  try {
                      await navigator.share({
                          title: "Survivor 2025 Statistika",
                          text: text,
                          url: shareUrl
                      });
                  } catch (error) {
                      console.error("Deljenje nije uspelo:", error);
                  }
              } else {
                  navigator.clipboard.writeText(shareUrl)
                      .then(() => alert("Link kopiran!"))
                      .catch(err => console.error("Greška pri kopiranju:", err));
              }
          });
        });
      }
    })
    .catch(error => console.error("Greška pri učitavanju podataka:", error));
});


// Prikazivanje pobeda dinamicko grafik
const canvas = document.getElementById('pobedeChart');
canvas.width = canvas.parentElement.clientWidth;
canvas.height = canvas.parentElement.clientWidth * 0.75; // Održava dobar odnos širine i visine

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

//Modal za takmicare
document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("takmicar-modal");
  const closeModal = document.querySelector(".close-btn");
  const shareButton = document.getElementById("modal-share-btn");
  let sharingInProgress = false; // Ovaj flag će označiti da li je trenutno aktivan proces deljenja

  // Funkcija za učitavanje podataka o takmičaru iz URL-a
  const loadTakmicarFromUrl = async () => {
    const path = window.location.pathname.split('/');
    if (path[1] === 'takmicar' && path[2]) {
      const imePrezime = path[2].replace('-', ''); // Prebacuje "-" u razmak
  
      try {
        // Dohvati podatke sa servera za tog takmičara
        const response = await fetch(`/api/takmicar/${imePrezime}`);
        const takmicar = await response.json();
  
        // Ažuriraj modal sa podacima o takmičaru
        document.getElementById("modal-ime").textContent = `${takmicar.ime} ${takmicar.prezime}`;
        document.getElementById("modal-zanimanje").textContent = `${takmicar.zanimanje}, ${takmicar.godine}`;
        document.getElementById("modal-ukupne-igre").textContent = takmicar.ukupne_igre;
        document.getElementById("modal-pobede").textContent = takmicar.pobede;
        document.getElementById("modal-porazi").textContent = takmicar.ukupne_igre - takmicar.pobede;
        document.getElementById("modal-pobednicki-postotak").textContent = ((takmicar.pobede / takmicar.ukupne_igre) * 100).toFixed(2) + "%";
        document.getElementById("modal-slika").src = takmicar.slika;
        document.getElementById("modal-slika").alt = `${takmicar.ime} ${takmicar.prezime}`;
  
        // Dodaj takmičara kao data atribut na modal
        modal.dataset.takmicar = JSON.stringify(takmicar);
  
        modal.style.display = "block"; // Prikazi modal
      } catch (error) {
        console.error('Greška pri učitavanju takmičara:', error);
      }
    }
  };

  // Pozivaj funkciju za učitavanje takmičara sa URL-a
  loadTakmicarFromUrl();

  // Deljenje se obavlja samo ako nije u toku prethodni proces
  shareButton.addEventListener("click", async () => {
    if (sharingInProgress) {
      return; // Ako je deljenje u toku, ignorisanje ponovljenih pokušaja
    }

    sharingInProgress = true; // Označi da je deljenje u toku

    // Dohvati takmičara iz modal-a preko data atributa
    const takmicar = JSON.parse(modal.dataset.takmicar);

    const shareUrl = `https://survivorstatistika.com/takmicar/${takmicar.ime.toLowerCase()}-${takmicar.prezime.toLowerCase()}`;
    const text = `Pogledaj statistiku za ${takmicar.ime} ${takmicar.prezime} na Survivor Statistici!`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "Survivor 2025 Statistika",
          text: text,
          url: shareUrl
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        alert("Link kopiran!");
      }
    } catch (error) {
      console.error("Deljenje nije uspelo:", error);
    }

    sharingInProgress = false; // Resetuj flag nakon što je deljenje završeno
  });

  // Zatvaranje modala
  closeModal.addEventListener("click", () => {
    modal.style.display = "none";
    history.pushState(null, "", "/"); // Vraća korisnika na početnu stranicu
  });

  // Dodaj event listener za klik na detalje takmičara
  document.body.addEventListener("click", (e) => {
    if (e.target.classList.contains("details-btn")) {
      const takmicar = JSON.parse(e.target.dataset.takmicar);

      document.getElementById("modal-ime").textContent = `${takmicar.ime} ${takmicar.prezime}`;
      document.getElementById("modal-zanimanje").textContent = `${takmicar.zanimanje}, ${takmicar.godine}`;
      document.getElementById("modal-ukupne-igre").textContent = takmicar.ukupne_igre;
      document.getElementById("modal-pobede").textContent = takmicar.pobede;
      document.getElementById("modal-porazi").textContent = takmicar.ukupne_igre - takmicar.pobede;
      document.getElementById("modal-pobednicki-postotak").textContent = ((takmicar.pobede / takmicar.ukupne_igre) * 100).toFixed(2) + "%";
      document.getElementById("modal-slika").src = takmicar.slika;
      document.getElementById("modal-slika").alt = `${takmicar.ime} ${takmicar.prezime}`;

      // Dodaj takmičara kao data atribut na modal
      modal.dataset.takmicar = JSON.stringify(takmicar);

      modal.style.display = "block";

      // Ažuriraj URL u browseru
      const newUrl = `/takmicar/${takmicar.ime.toLowerCase()}-${takmicar.prezime.toLowerCase()}`;
      history.pushState({ takmicar }, "", newUrl);
    }
  });
});
