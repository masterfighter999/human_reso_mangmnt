const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/hrms';

const pool = new Pool({
  connectionString,
  ssl: false // For local dev, no SSL is needed
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
