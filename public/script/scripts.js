//Navbar
function toggleMenu() {
  document.querySelector(".nav-links").classList.toggle("active");
}
window.addEventListener("scroll", function () {
  let navbar = document.querySelector(".navbar");
  let navlinks = document.querySelector(".navlinks");
  if (window.scrollY > 50) {
      navbar.classList.add("scrolled");
  } else {
      navbar.classList.remove("scrolled");
  }
});

//Sorting table
function sortTable(n, defaultDir = null) {
  let table,
    rows,
    switching,
    i,
    x,
    y,
    shouldSwitch,
    dir,
    switchcount = 0;
  table = document.getElementById("statsTable");
  switching = true;
  
  // Ako je definisan defaultDir, koristi njega, inače podrazumevano "asc"
  dir = defaultDir ? defaultDir : "asc";

  while (switching) {
    switching = false;
    rows = table.rows;
    for (i = 1; i < rows.length - 1; i++) {
      shouldSwitch = false;
      x = rows[i].getElementsByTagName("TD")[n];
      y = rows[i + 1].getElementsByTagName("TD")[n];

      if (dir == "asc") {
        if (!isNaN(parseInt(x.innerHTML)) && !isNaN(parseInt(y.innerHTML))) {
          if (parseInt(x.innerHTML) > parseInt(y.innerHTML)) {
            shouldSwitch = true;
            break;
          }
        } else if (x.innerHTML.toLowerCase() > y.innerHTML.toLowerCase()) {
          shouldSwitch = true;
          break;
        }
      } else if (dir == "desc") {
        if (!isNaN(parseInt(x.innerHTML)) && !isNaN(parseInt(y.innerHTML))) {
          if (parseInt(x.innerHTML) < parseInt(y.innerHTML)) {
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
window.onload = function() {
  sortTable(3, "desc"); // Sortira tabelu prema broju pobeda (četvrta kolona, indeks 3)
};
document.addEventListener("DOMContentLoaded", function() {
  fetch("http://localhost:3000/api/takmicari")
      .then(response => response.json())
      .then(data => {
          const containerZeleni = document.getElementById("zeleniTim");
          const containerZuti = document.getElementById("zutiTim");
         

          // Očisti postojeći sadržaj
          containerZeleni.innerHTML = "";
          containerZuti.innerHTML = "";


          if (Array.isArray(data.zeleniTim)) {
            data.zeleniTim.forEach(takmicar => {
                const div = document.createElement("div");
                const uspesnost = takmicar.pobede / takmicar.ukupne_igre * 100;
        
                div.classList.add("takmicar", "card");
                div.innerHTML = `
                    <img src="${takmicar.slika}" alt="${takmicar.ime} ${takmicar.prezime}">
                    <h3>${takmicar.ime} ${takmicar.prezime}</h3>
                    <p>Uspešnost u igrama:</p> 
                    <p class="uspesnost">${(uspesnost).toFixed(2)}%</p>
                `;
        
                // Selektujte p element sa klasom 'uspesnost' i menjajte boju
                const uspesnostElement = div.querySelector('.uspesnost');
                if (uspesnost > 50) {
                    uspesnostElement.style.color = "green";
                } else {
                    uspesnostElement.style.color = "red";
                }
        
                containerZeleni.appendChild(div);
            });
        }

          if (Array.isArray(data.zutiTim)) {
              data.zutiTim.forEach(takmicar => {
                  const div = document.createElement("div");
                  const uspesnost = takmicar.pobede / takmicar.ukupne_igre * 100;

                  div.classList.add("takmicar", "card");
                  div.innerHTML = `
                      <img src="${takmicar.slika}" alt="${takmicar.ime} ${takmicar.prezime}">
                      <h3>${takmicar.ime} ${takmicar.prezime}</h3>
                        <p>Uspešnost u igrama:</p> 
                      <p class="uspesnost">${(uspesnost).toFixed(2)}%</p>
                  `;

                  // Selektujte p element sa klasom 'uspesnost' i menjajte boju
                  const uspesnostElement = div.querySelector('.uspesnost');
                  if (uspesnost > 50) {
                      uspesnostElement.style.color = "green";
                  } else {
                      uspesnostElement.style.color = "red";
                  }
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
