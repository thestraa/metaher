const mysql = require('mysql2');
const express = require("express");
const cors = require("cors"); 
const path = require('path');
const app = express();
const port = process.env.PORT || 3000; 
const API_URL = process.env.API_URL || 'http://localhost:3000/api/takmicari';
console.log(API_URL);

const connection = mysql.createConnection(process.env.DATABASE_URL);

connection.connect((err) => {
  if (err) {
    console.error('Greška pri povezivanju sa bazom: ' + err.stack);
    return;
  }
  console.log('Povezan sa bazom kao ID ' + connection.threadId);
});

app.listen(port, () => {
  console.log(`Server pokrenut na portu ${port}`);
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Ruta za početnu stranicu
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// API za preuzimanje takmičara
app.get("/api/takmicari", (req, res) => {
  connection.query("SELECT * FROM takmicari", (err, results) => {
    if (err) {
      console.error("Greška pri dohvatanju takmičara:", err);
      return res.status(500).json({ error: "Greška na serveru" });
    }
    const zeleniTim = results.filter(t => t.tim === "zeleni");
    const zutiTim = results.filter(t => t.tim === "zuti");

    res.json({ zeleniTim, zutiTim });
  });
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
