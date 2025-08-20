const mysql = require('mysql2');
const express = require("express");
const cors = require("cors"); 
const path = require('path');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const { URL } = require("url");




// const mysql = require("mysql2/promise"); // promise varijanta




const app = express();
app.use(cors());
app.use(express.json());

// --- POVEZIVANJE NA Railway MYSQL preko DATABASE_URL ---
const PORT = process.env.PORT || 3000; 
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

const dbUrlString = process.env.DATABASE_URL;

if (!dbUrlString) {
  console.error("❌ DATABASE_URL nije definisan! Proveri Railway Variables.");
  process.exit(1);
}

const dbUrl = new URL(dbUrlString);
let pool;

try {
  pool = mysql.createPool({
    host: dbUrl.hostname,
    user: dbUrl.username,
    password: dbUrl.password,
    database: dbUrl.pathname.replace("/", ""),
    port: dbUrl.port
  });

  console.log("✅ Connected to MySQL");
} catch (err) {
  console.error("❌ Database connection failed:", err);
}

const connection = pool.promise();

// Ruta za početnu stranicu
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


// API za prikazivanje pobeda
app.get('/api/pobede', async (req, res) => {
  try {
      const [rows] = await connection.execute('SELECT zeleni, zuti, epizoda FROM pobede');
      res.json(rows[0]); 
  } catch (error) {
      console.error("Greška pri dohvaćanju pobeda:", error);
      res.status(500).json({ error: 'Greška servera' });
  }
});
app.put('/api/pobede', async (req, res) => {
  const { tim } = req.body; // tim = 'zeleni' ili 'zuti'

  if (tim !== 'zeleni' && tim !== 'zuti' && tim !== 'epizoda') {
    return res.status(400).json({ error: "Neispravan naziv tima" });
  }

  try {
    // Prvo dohvati trenutne vrednosti
    const [rows] = await connection.execute('SELECT zeleni, zuti, epizoda FROM pobede');
    const trenutnaVrednost = rows[0][tim]; // Uzimamo vrednost za odabrani tim

    // Ažuriraj vrednost u bazi (povećaj za 1)
    await connection.execute(`UPDATE pobede SET ${tim} = ?`, [trenutnaVrednost + 1]);

    res.json({ message: `Pobeda dodata za tim: ${tim}`, novaVrednost: trenutnaVrednost + 1 });
  } catch (error) {
    console.error("Greška pri ažuriranju pobeda:", error);
    res.status(500).json({ error: "Greška servera" });
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
//API za kreiranje URL-a
app.get('/api/takmicar/:imePrezime', async (req, res) => {
  const [ime, prezime] = req.params.imePrezime.split('-');
  try {
    const takmicar = await getTakmicarByName(ime, prezime);
    if (!takmicar) {
      return res.status(404).json({ error: "Takmičar nije pronađen" });
    }
    res.json(takmicar);
  } catch (error) {
    console.error("Greška:", error);
    res.status(500).json({ error: "Greška na serveru" });
  }
});
async function getTakmicarByName(ime, prezime) {
  try {
    const query = "SELECT * FROM takmicari WHERE LOWER(ime) = ? AND LOWER(prezime) = ?";
    const [rows] = await connection.execute(query, [ime.toLowerCase(), prezime.toLowerCase()]);
    return rows.length > 0 ? rows[0] : null;
  } catch (err) {
    console.error("Greška:", err);
    throw err;
  }
}

// Dodavanje takmičara - ADMIN
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

// Ažuriranje takmičara - ADMIN
app.put("/api/takmicari/:id", async (req, res) => {
  const { id } = req.params;
  const fields = req.body;

  if (!id || Object.keys(fields).length === 0) {
    return res.status(400).json({ error: "Nedostaje ID ili podaci za ažuriranje" });
  }

  const setClause = Object.keys(fields).map(key => `${key} = ?`).join(", ");
  const values = Object.values(fields);

  try {
    const [result] = await connection.execute(
      `UPDATE takmicari SET ${setClause} WHERE id = ?`,
      [...values, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Takmičar nije pronađen" });
    }

    res.json({ message: "Podaci ažurirani uspešno" });
  } catch (err) {
    console.error("Greška pri ažuriranju takmičara:", err);
    res.status(500).json({ error: "Greška na serveru" });
  }
});

// Brisanje takmičara - ADMIN
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

app.get('/api/statistika/:nedelja', async (req, res) => {
  const { nedelja } = req.params;
  const [rows] = await connection.execute(
    'SELECT s.*, t.ime, t.tim, t.u_igri FROM nedeljne_statistike s JOIN takmicari t ON s.takmicar_id = t.id WHERE s.nedelja = ?',
    [nedelja]
  );
  res.json(rows);
});
// Ažuriranje takmičara nedeljna - ADMIN
app.put('/api/nedeljne/:id', async (req, res) => {
  const { id } = req.params;
  const fields = req.body;

  if (!id || Object.keys(fields).length === 0) {
    return res.status(400).send("Nedostaje ID ili podaci za ažuriranje");
  }

  const setClause = Object.keys(fields).map(key => `${key} = ?`).join(", ");
  const values = Object.values(fields);

  try {
    await connection.execute(
      `UPDATE nedeljne_statistike SET ${setClause} WHERE id = ?`,
      [...values, id]
    );
    res.sendStatus(200);
  } catch (err) {
    console.error("Greška pri ažuriranju nedeljnih podataka:", err);
    res.sendStatus(500);
  }
});
// Ažuriranje takmičara dnevna - ADMIN
app.put('/api/takmicari/dnevno/:id', async (req, res) => {
  const { id } = req.params;
  const fields = req.body;

  if (!id || Object.keys(fields).length === 0) {
    return res.status(400).send("Nedostaje ID ili podaci za ažuriranje");
  }

  const setClause = Object.keys(fields).map(key => `${key} = ?`).join(", ");
  const values = Object.values(fields);

  try {
    await connection.execute(
      `UPDATE takmicari SET ${setClause} WHERE id = ?`,
      [...values, id]
    );
    res.sendStatus(200);
  } catch (err) {
    console.error("Greška pri ažuriranju dnevnih podataka:", err);
    res.sendStatus(500);
  }
});
// Reset dnevne statistike svih takmičara
app.post('/api/takmicari/reset-dnevno', async (req, res) => {
  try {
    await connection.execute(`
      UPDATE takmicari
      SET 
        ukupne_igre_daily = 0,
        pobede_daily = 0,
        asistencije_daily = 0,
        asistencije_plus_daily = 0
    `);
    res.status(200).send("Reset uspešan");
  } catch (err) {
    console.error(err);
    res.status(500).send("Greška pri resetovanju");
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
// Sitemap Generacija
app.get('/generate-sitemap', async (req, res) => {
  try {
    console.log('Pokušavam da generišem sitemap...');
    const [takmicari] = await connection.execute("SELECT * FROM takmicari");

    if (!takmicari || takmicari.length === 0) {
      console.error('Nema takmičara u bazi.');
      return res.status(500).json({ error: 'Nema takmičara u bazi.' });
    }

    let sitemap = `<?xml version="1.0" encoding="UTF-8"?> <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

    takmicari.forEach((takmicar) => {
      const takmicarUrl = `https://survivorstatistika.com/takmicar/${takmicar.ime.toLowerCase()}-${takmicar.prezime.toLowerCase()}`;
      const lastModDate = new Date().toISOString().split('T')[0];
      sitemap += `
      <url>
        <loc>${takmicarUrl}</loc>
        <lastmod>${lastModDate}</lastmod>
      </url>`;
    });

    sitemap += `</urlset>`;

    // Ako želiš da sačuvaš sitemap u fajl:
    const path = require('path');
    const sitemapPath = path.join(__dirname, 'public', 'sitemap.xml');
    fs.writeFileSync(sitemapPath, sitemap, 'utf8');

    res.status(200).send('Sitemap je uspešno generisan i sačuvan!');
  } catch (err) {
    console.error('Greška pri generisanju sitemap-a:', err);
    res.status(500).json({ error: 'Greška pri generisanju sitemap-a' });
  }
});


app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {  // Ako je API zahtev, nemoj slati index.html
    return res.status(404).json({ error: 'API ruta nije pronađena' });
  }

  // Za sve ostale rute, pošaljite index.html
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});