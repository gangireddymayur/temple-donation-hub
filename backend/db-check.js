const path = require('path');
const fs = require('fs');

// Load environment variables
if (fs.existsSync(path.resolve(__dirname, '.env'))) {
  require('dotenv').config({ path: path.resolve(__dirname, '.env') });
} else if (fs.existsSync(path.resolve(process.cwd(), '.env'))) {
  require('dotenv').config();
} else if (fs.existsSync(path.resolve(__dirname, '../.env'))) {
  require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
} else {
  require('dotenv').config();
}

const mysql = require('mysql2/promise');

async function main() {
  console.log('Testing connection with:');
  console.log(`- Host: ${process.env.DB_HOST || '127.0.0.1'}`);
  console.log(`- Port: ${process.env.DB_PORT || 3306}`);
  console.log(`- Database: ${process.env.DB_NAME}`);
  console.log(`- User: ${process.env.DB_USER}`);
  console.log(`- Password: ${process.env.DB_PASSWORD ? '******' : '(not set)'}`);

  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT || 3306),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    });

    console.log('Successfully connected to database!');
    
    const [rows] = await connection.query('SELECT 1 + 1 AS test');
    console.log('Database test query result:', rows);

    await connection.end();
  } catch (err) {
    console.error('Connection failed with error:', err.message);
    console.error(err.stack);
  }
}

main().catch(console.error);
