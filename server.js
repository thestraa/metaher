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
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


// API za prikazivanje pobeda
app.get('/api/pobede', async (req, res) => {
  try {
      const [rows] = await connection.execute('SELECT zeleni, zuti FROM pobede');
      res.json(rows[0]); 
  } catch (error) {
      console.error("Greška pri dohvaćanju pobeda:", error);
      res.status(500).json({ error: 'Greška servera' });
  }
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
// API za preuzimanje takmičara - MODAL
app.get("/api/takmicar/:id", async (req, res) => {
  const takmicarId = req.params.id;  // ID iz URL-a
  try {
    const [result] = await connection.execute("SELECT * FROM takmicari WHERE id = ?", [takmicarId]);
    
    if (result.length === 0) {
      return res.status(404).json({ error: "Takmičar nije pronađen" });
    }

    res.json(result[0]);
  } catch (err) {
    console.error("Greška pri dohvatanju takmičara:", err);
    res.status(500).json({ error: "Greška na serveru" });
  }
});
// API za preuzimanje takmičara po imenu i prezimenu
// API za preuzimanje takmičara po imenu i prezimenu
app.get("/api/takmicar/:imePrezime", async (req, res) => {
  try {
    // Dekodiraj imePrezime i zameni '-' sa razmakom
    const imePrezime = decodeURIComponent(req.params.imePrezime.replace('-', ' '));
    console.log("Ime i prezime iz URL-a:", imePrezime);

    // Splituj ime i prezime i konvertuj oba u mala slova
    const [ime, prezime] = imePrezime.split(' ').map(str => str.toLowerCase());

    // SQL upit sa LOWER za oba imena i prezimena
    const [results] = await connection.execute(
      "SELECT * FROM takmicari WHERE LOWER(ime) = ? AND LOWER(prezime) = ?",
      [ime, prezime]
    );

    if (results.length === 0) {
      return res.status(404).json({ error: "Takmičar nije pronađen" });
    }

    res.json(results[0]); // Vraća podatke o jednom takmičaru
  } catch (err) {
    console.error("Greška pri dohvatanju takmičara:", err);
    res.status(500).json({ error: "Greška na serveru" });
  }
});


// Dodavanje takmičara
app.post("/api/takmicari", async (req, res) => {
  try {
    const { ime, prezime, pobede, ukupne_igre, tim } = req.body;
    if (!tim || (tim !== "zeleni" && tim !== "zuti")) {
      return res.status(400).json({ error: "Tim mora biti dodeljen." });
    }

    const noviTakmicar = { ime, prezime, pobede, ukupne_igre, tim };
    const [result] = await connection.execute('INSERT INTO takmicari SET ?', [noviTakmicar]);
    res.status(201).json(result);
  } catch (err) {
    console.error("Greška pri dodavanju takmičara:", err);
    res.status(500).json({ error: "Greška pri dodavanju takmičara." });
  }
});

// Ažuriranje takmičara
app.put("/api/takmicari/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { pobede, ukupne_igre } = req.body;

    const query = "UPDATE takmicari SET pobede = ?, ukupne_igre = ? WHERE id = ?";
    const [result] = await connection.execute(query, [pobede, ukupne_igre, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Takmičar nije pronađen" });
    }
    res.json({ message: "Podaci ažurirani uspešno" });
  } catch (err) {
    console.error("Greška pri ažuriranju takmičara:", err);
    res.status(500).json({ error: "Greška na serveru" });
  }
});

// Brisanje takmičara
app.delete("/api/takmicari/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const query = "DELETE FROM takmicari WHERE id = ?";
    const [result] = await connection.execute(query, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Takmičar nije pronađen" });
    }
    res.json({ message: "Takmičar uspešno obrisan" });
  } catch (err) {
    console.error("Greška pri brisanju takmičara:", err);
    res.status(500).json({ error: "Greška na serveru" });
  }
});

// Glasanje
app.post('/api/glasanje', async (req, res) => {
  try {
    const { takmicarId } = req.body;
    const ipAddress = req.ip.replace(/^.*:/, '');


    if (!takmicarId) {
      return res.status(400).json({ success: false, message: 'Neispravan ID takmičara' });
    }

    const checkQuery = 'SELECT created_at FROM glasanje WHERE ip_address = ? ORDER BY created_at DESC LIMIT 1';
    const [result] = await connection.execute(checkQuery, [ipAddress]);

    if (result.length > 0) {
      const lastVoteTime = new Date(result[0].created_at);
      const now = new Date();
      const diffInHours = (now - lastVoteTime) / (1000 * 60 * 60);

      if (diffInHours < 24) {
        return res.status(400).json({ success: false, message: 'Već ste glasali! Možete glasati ponovo nakon 24h.' });
      }
    }

    await connection.execute('UPDATE takmicari SET glasovi = glasovi + 1 WHERE id = ?', [takmicarId]);
    await connection.execute('INSERT INTO glasanje (ip_address, takmicar_id, created_at) VALUES (?, ?, NOW())', [ipAddress, takmicarId]);
    const [takmicar] = await connection.execute('SELECT * FROM takmicari WHERE id = ?', [takmicarId]);

    res.status(200).json({ success: true, message: 'Glas je uspešno zabeležen!', takmicar: takmicar[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Greška na serveru' });
  }
});

app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {  // Ako je API zahtev, nemoj slati index.html
    return res.status(404).json({ error: 'API ruta nije pronađena' });
  }

  // Za sve ostale rute, pošaljite index.html
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});