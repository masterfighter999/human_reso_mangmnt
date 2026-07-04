/**
 * migrate.ts
 *
 * Custom SQL migration runner — no ORM required.
 *
 * How it works:
 *  1. Creates a `schema_migrations` tracking table if it doesn't exist.
 *  2. Reads all *.sql files from the migrations/ directory, sorted by name.
 *  3. Skips files already recorded in `schema_migrations`.
 *  4. Runs each new migration inside its own transaction.
 *  5. Records the filename on success; rolls back + exits on failure.
 *
 * Run:  npm run db:migrate
 */

import fs from 'fs';
import path from 'path';
import { pool } from '../config/database';

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function ensureMigrationsTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id          SERIAL      PRIMARY KEY,
      filename    VARCHAR(255) NOT NULL UNIQUE,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function getAppliedMigrations(): Promise<Set<string>> {
  const result = await pool.query<{ filename: string }>(
    'SELECT filename FROM schema_migrations ORDER BY id ASC',
  );
  return new Set(result.rows.map((r) => r.filename));
}

async function runMigration(filename: string, sql: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query(
      'INSERT INTO schema_migrations (filename) VALUES ($1)',
      [filename],
    );
    await client.query('COMMIT');
    console.log(`  ✅  Applied: ${filename}`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function migrate(): Promise<void> {
  console.log('\n🔄  Running migrations...\n');

  await ensureMigrationsTable();
  const applied = await getAppliedMigrations();

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort(); // lexicographic order — relies on numeric prefixes (001_, 002_, …)

  let ran = 0;

  for (const filename of files) {
    if (applied.has(filename)) {
      console.log(`  ⏭   Skipped (already applied): ${filename}`);
      continue;
    }

    const filePath = path.join(MIGRATIONS_DIR, filename);
    const sql = fs.readFileSync(filePath, 'utf-8');

    await runMigration(filename, sql);
    ran++;
  }

  if (ran === 0) {
    console.log('\n✨  Database is already up to date.\n');
  } else {
    console.log(`\n✨  ${ran} migration(s) applied successfully.\n`);
  }

  await pool.end();
}

migrate().catch((err) => {
  console.error('\n❌  Migration failed:', err);
  process.exit(1);
});
