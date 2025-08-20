const mysql = require('mysql2');

const connection = mysql.createConnection(process.env.DATABASE_URL);

connection.connect((err) => {
  if (err) {
    console.error('Greška pri povezivanju sa bazom: ' + err.stack);
    return;
  }
  console.log('Povezan sa bazom kao ID s' + connection.threadId);
});