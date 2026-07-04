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
  client.query(`
    SELECT u.email, u.id as user_id, e.id as emp_id
    FROM users u
    LEFT JOIN employees e ON u.id = e.user_id
  `).then(res => {
    console.table(res.rows);
    client.end();
  });
});
