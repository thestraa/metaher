const mysql = require('mysql2');
const express = require("express");
const cors = require("cors"); 
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const app = express();
const port = process.env.PORT || 3000; 
const API_URL = process.env.API_URL || 'http://localhost:3000/api/takmicari';
const SECRET_KEY = process.env.SECRET_KEY;  // Korišćenje sigurnog ključa za JWT


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
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Ruta za početnu stranicu
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const users = [
  { username: 'admin', password: '$2a$10$7eHEsdMkRzR1FtzIuKxx5eFH51EVz4Zrz8Imn3bFOSsqevu52zBzi' } // Hashovana lozinka za "admin"
];

// Login ruta
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  const user = users.find(u => u.username === username);
  if (!user) {
    return res.status(400).json({ message: 'Korisnik ne postoji' });
  }

  // Provera lozinke
  bcrypt.compare(password, user.password, (err, result) => {
    if (err || !result) {
      return res.status(400).json({ message: 'Pogrešna lozinka' });
    }

    // Kreiraj JWT token
    const token = jwt.sign({ username: user.username }, SECRET_KEY, { expiresIn: '24h' });

    // Postavi token u cookie
    res.cookie('authToken', token, {
      httpOnly: true,   // Token nije dostupan putem JavaScript-a
      secure: process.env.NODE_ENV === 'production',  // Samo na HTTPS
      maxAge: 24 * 60 * 60 * 1000,  // 24h
    });
    
    res.json({ message: 'Uspesna prijava' });
  });
});

// Middleware za proveru autentifikacije putem JWT tokena iz cookies
function authenticateJWT(req, res, next) {
  const token = req.cookies.authToken;
  if (!token) return res.status(403).json({ message: 'Nedostaje token' });

  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) return res.status(403).json({ message: 'Neautorizovani pristup' });
    req.user = decoded;
    next();
  });
}

// Protected route za admin pristup
app.get('/api/admin', authenticateJWT, (req, res) => {
  res.json({ message: 'Dobrodošli, admin!' });
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

app.post('/api/glasanje', (req, res) => {
  const { takmicarId } = req.body;
  const ipAddress = req.ip.replace(/^.*:/, ''); // Uzimamo IP adresu korisnika

  if (!takmicarId) {
      return res.status(400).json({ success: false, message: 'Neispravan ID takmičara' });
  }

  // PROVERAVAMO DA LI JE IP ADRESA VEĆ GLASALA ZA BILO KOGA U POSLEDNJIH 24H
  const checkQuery = 'SELECT * FROM glasanje WHERE ip_address = ? ORDER BY created_at DESC LIMIT 1';
  
  connection.query(checkQuery, [ipAddress], (err, result) => {
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
              return res.status(400).json({ success: false, message: 'Već ste glasali! Možete glasati ponovo nakon 24h.' });
          }
      }

      // Ako nije glasao u poslednjih 24h, dozvoljavamo glasanje
      const updateQuery = 'UPDATE takmicari SET glasovi = glasovi + 1 WHERE id = ?';
      connection.query(updateQuery, [takmicarId], (err, result) => {
          if (err) {
              console.error("Greška pri ažuriranju broja glasova:", err);
              return res.status(500).json({ success: false, message: 'Greška pri glasanju' });
          }

          // Upisujemo glas u bazu (samo jednom u 24h)
          const insertQuery = 'INSERT INTO glasanje (ip_address, takmicar_id, created_at) VALUES (?, ?, NOW())';
          connection.query(insertQuery, [ipAddress, takmicarId], (err, result) => {
              if (err) {
                  console.error("Greška pri unosu glasanja:", err);
                  return res.status(500).json({ success: false, message: 'Greška pri snimanju glasanja' });
              }

              // Vraćamo ažurirane podatke o takmičaru
              const selectQuery = 'SELECT * FROM takmicari WHERE id = ?';
              connection.query(selectQuery, [takmicarId], (err, result) => {
                  if (err) {
                      console.error("Greška pri preuzimanju podataka o takmičaru:", err);
                      return res.status(500).json({ success: false, message: 'Greška pri preuzimanju podataka' });
                  }

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
