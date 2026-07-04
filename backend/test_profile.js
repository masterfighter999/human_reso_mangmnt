const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: false }
});

client.connect().then(() => {
  client.query('SELECT * FROM employees WHERE user_id = $1', ['7ecb05e9-07b6-4bf1-8115-9d1e49e18ea5']).then(res => {
    console.log("Employee:");
    console.log(res.rows);
    client.end();
  });
});
