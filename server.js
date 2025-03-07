const mysql = require('mysql2');
const express = require("express");
const cors = require("cors"); 
const path = require('path');
const cookieParser = require('cookie-parser');
const app = express();
const port = process.env.PORT || 3000; 
const API_URL = process.env.API_URL || 'http://localhost:3000/api/takmicari';


const pool = mysql.createPool({
  uri: process.env.DATABASE_URL,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const connection = pool.promise();

app.listen(port, () => {
  console.log(`Server pokrenut na portu ${port}`);
});

app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Ruta za početnu stranicu
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});


// API za preuzimanje takmičara
app.get("/api/takmicari", async (req, res) => {
  try {
    const [results] = await connection.execute("SELECT * FROM takmicari");
    const zeleniTim = results.filter(t => t.tim === "zeleni");
    const zutiTim = results.filter(t => t.tim === "zuti");

    res.json({ zeleniTim, zutiTim });
  } catch (err) {
    console.error("Greška pri dohvatanju takmičara:", err);
    res.status(500).json({ error: "Greška na serveru" });
  }
});

// Dodavanje takmičara
app.post("/api/takmicari", (req, res) => {
  const { ime, prezime, pobede, ukupne_igre, tim } = req.body;

  if (!tim || (tim !== "zeleni" && tim !== "zuti")) {
    return res.status(400).json({ error: "Tim mora biti dodeljen." });
  }

  const noviTakmicar = {
    ime,
    prezime,
    pobede,
    ukupne_igre,
    tim
  };

  connection.query('INSERT INTO takmicari SET ?', noviTakmicar, (err, result) => {
    if (err) {
      console.error("Greška pri dodavanju takmičara:", err);
      return res.status(500).json({ error: "Greška pri dodavanju takmičara." });
    }
    res.status(201).json(result);
  });
});

// Ažuriranje podataka
app.put("/api/takmicari/:id", (req, res) => {
  const { id } = req.params;
  const { pobede, ukupne_igre } = req.body;

  const query = "UPDATE takmicari SET pobede = ?, ukupne_igre = ? WHERE id = ?";
  connection.query(query, [pobede, ukupne_igre, id], (err, result) => {
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
  connection.query(query, [id], (err, result) => {
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

app.post('/api/glasanje', (req, res) => {
  const { takmicarId } = req.body;
  const ipAddress = req.ip.replace(/^.*:/, ''); // Uzimamo IP adresu korisnika

  console.log("📌 Početak glasanja za ID:", takmicarId);

  if (!takmicarId) {
      return res.status(400).json({ success: false, message: 'Neispravan ID takmičara' });
  }

  const checkQuery = 'SELECT created_at FROM glasanje WHERE ip_address = ? ORDER BY created_at DESC LIMIT 1';

  connection.query(checkQuery, [ipAddress], (err, result) => {
      if (err) {
          console.error("❌ Greška pri proveri glasanja:", err);
          return res.status(500).json({ success: false, message: 'Greška pri proveri glasa' });
      }

      console.log("📌 Rezultat provere glasanja:", result);

      if (result.length > 0) {
          const lastVote = result[0];
          const now = new Date();
          const lastVoteTime = new Date(lastVote.created_at);
          const diffInHours = (now - lastVoteTime) / (1000 * 60 * 60);

          if (diffInHours < 24) {
              console.log("⚠️ Korisnik već glasao u poslednjih 24h!");
              return res.status(400).json({ success: false, message: 'Već ste glasali! Možete glasati ponovo nakon 24h.' });
          }
      }

      console.log("✅ Glasanje dozvoljeno!");

      const updateQuery = 'UPDATE takmicari SET glasovi = glasovi + 1 WHERE id = ?';
      connection.query(updateQuery, [takmicarId], (err, result) => {
          if (err) {
              console.error("❌ Greška pri ažuriranju broja glasova:", err);
              return res.status(500).json({ success: false, message: 'Greška pri glasanju' });
          }

          console.log("📌 Glasovi ažurirani!");

          const insertQuery = 'INSERT INTO glasanje (ip_address, takmicar_id, created_at) VALUES (?, ?, NOW())';
          connection.query(insertQuery, [ipAddress, takmicarId], (err, result) => {
              if (err) {
                  console.error("❌ Greška pri unosu glasanja:", err);
                  return res.status(500).json({ success: false, message: 'Greška pri snimanju glasanja' });
              }

              console.log("✅ Glasanje snimljeno!");

              const selectQuery = 'SELECT * FROM takmicari WHERE id = ?';
              connection.query(selectQuery, [takmicarId], (err, result) => {
                  if (err) {
                      console.error("❌ Greška pri preuzimanju podataka o takmičaru:", err);
                      return res.status(500).json({ success: false, message: 'Greška pri preuzimanju podataka' });
                  }

                  console.log("📌 Slanje odgovora sa ažuriranim podacima!");

                  res.status(200).json({
                      success: true,
                      message: 'Glas je uspešno zabeležen!',
                      takmicar: result[0]
                  });
              });
          });
      });
  });
});
