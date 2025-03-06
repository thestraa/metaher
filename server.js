const express = require("express");
const cors = require("cors"); 
const db = require("./db");
const path = require('path');  // Za lakše rešavanje putanj
const app = express();
const port = process.env.PORT || 3000;  // koristi Heroku dodeljeni port ili 3000 ako nije dodeljen

app.listen(port, () => {
  console.log(`Server pokrenut na portu ${port}`);
});
app.use(cors()); //Omogućava frontend-u da komunicira sa backend-om
app.use(express.json());

// Omogućiti pristup statičkim fajlovima, ako ih imaš (CSS, slike, JS)
app.use(express.static(path.join(__dirname, 'public')));

// Ruka koja šalje HTML stranicu
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));  // Pošaljemo HTML fajl sa početne stranice
});

app.get("/api/takmicari", (req, res) => {
  db.query("SELECT * FROM takmicari", (err, results) => {
    if (err) {
      console.error("Greška pri dohvatanju takmičara:", err);
      return res.status(500).json({ error: "Greška na serveru" });
    }
      // Podeli takmičare u dve grupe
      const zeleniTim = results.filter(t => t.tim === "zeleni");
      const zutiTim = results.filter(t => t.tim === "zuti");

    res.json({ zeleniTim, zutiTim });
  });
});

// Dodavanje podataka
app.post("/api/takmicari", (req, res) => {
  const { ime, prezime, pobede, ukupne_igre, tim } = req.body;

  // Provera da li je tim dodeljen
  if (!tim || (tim !== "zeleniTim" && tim !== "zutiTim")) {
      return res.status(400).json({ error: "Tim mora biti dodeljen." });
  }

  const noviTakmicar = {
      ime,
      prezime,
      pobede,
      ukupne_igre,
      tim
  };

  // Dodajte takmičara u bazu (prilagodite kako čuvate podatke)
  db.collection("takmicari").insertOne(noviTakmicar)
      .then(result => {
          res.status(201).json(result.ops[0]);
      })
      .catch(error => {
          res.status(500).json({ error: "Greška pri dodavanju takmičara." });
      });
});

// Ažuriranje podataka
app.put("/api/takmicari/:id", (req, res) => {
  const { id } = req.params;
  const { pobede, ukupne_igre } = req.body;

  const query = "UPDATE takmicari SET pobede = ?, ukupne_igre = ? WHERE id = ?";
  db.query(query, [pobede, ukupne_igre, id], (err, result) => {
    if (err) {
      console.error("Greška pri ažuriranju takmičara:", err);
      return res.status(500).json({ error: "Greška na serveru" });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Takmičar nije pronađen" });
    }
    res.json({ message: "Podaci ažurirani uspešno" });
  });
});

// Brisanje podataka
app.delete("/api/takmicari/:id", (req, res) => {
  const { id } = req.params;

  const query = "DELETE FROM takmicari WHERE id = ?";
  db.query(query, [id], (err, result) => {
    if (err) {
      console.error("Greška pri brisanju takmičara:", err);
      return res.status(500).json({ error: "Greška na serveru" });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Takmičar nije pronađen" });
    }
    res.json({ message: "Takmičar uspešno obrisan" });
  });
});

app.listen(3000, "0.0.0.0", () => {
  console.log("Server pokrenut na portu 3000");
});

app.post('/api/glasanje', (req, res) => {
  const { takmicarId } = req.body;
  const ipAddress = req.ip; // Uzimamo IP adresu korisnika

  if (!takmicarId) {
      return res.status(400).json({ success: false, message: 'Neispravan ID takmičara' });
  }

  // Prvo proveravamo da li je IP adresa već glasala za ovog takmičara i da li je prošlo manje od 24h
  const checkQuery = 'SELECT * FROM glasanje WHERE ip_address = ? AND takmicar_id = ? ORDER BY created_at DESC LIMIT 1';
  db.query(checkQuery, [ipAddress, takmicarId], (err, result) => {
      if (err) {
          console.error("Greška pri proveri glasanja:", err);
          return res.status(500).json({ success: false, message: 'Greška pri proveri glasa' });
      }

      if (result.length > 0) {
          const lastVote = result[0];
          const now = new Date();
          const lastVoteTime = new Date(lastVote.created_at);
          const diffInMilliseconds = now - lastVoteTime;
          const diffInHours = diffInMilliseconds / (1000 * 60 * 60);

          if (diffInHours < 24) {
              return res.status(400).json({ success: false, message: 'Možete glasati tek nakon 24h.' });
          }
      }

      // Ako nije glasao u poslednjih 24h, dozvoljavamo glasanje
      const updateQuery = 'UPDATE takmicari SET glasovi = glasovi + 1 WHERE id = ?';
      db.query(updateQuery, [takmicarId], (err, result) => {
          if (err) {
              console.error("Greška pri ažuriranju broja glasova:", err);
              return res.status(500).json({ success: false, message: 'Greška pri glasanju' });
          }

          // Započinjemo unos u tabelu glasanje sa IP adresom i vremenom glasanja
          const insertQuery = 'INSERT INTO glasanje (ip_address, takmicar_id, created_at) VALUES (?, ?, NOW())';
          db.query(insertQuery, [ipAddress, takmicarId], (err, result) => {
              if (err) {
                  console.error("Greška pri unosu glasanja:", err);
                  return res.status(500).json({ success: false, message: 'Greška pri snimanju glasanja' });
              }

              // Vraćamo uspešan odgovor sa ažuriranim brojem glasova
              const selectQuery = 'SELECT * FROM takmicari WHERE id = ?';
              db.query(selectQuery, [takmicarId], (err, result) => {
                  if (err) {
                      console.error("Greška pri preuzimanju podataka o takmičaru:", err);
                      return res.status(500).json({ success: false, message: 'Greška pri preuzimanju podataka' });
                  }

                  res.status(200).json({
                      success: true,
                      message: 'Glas je uspešno zabeležen!',
                      takmicar: result[0] // Vraćamo ažurirane podatke o takmičaru
                  });
              });
          });
      });
  });
});
