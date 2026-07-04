import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { env } from './env';

// ─── Singleton Pool ───────────────────────────────────────────────────────────
// One pool is shared across the entire process.
// pg handles individual TCP connections internally.

export const pool = new Pool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  ssl: env.DB_SSL ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on('error', (err) => {
  console.error('[DB Pool] Unexpected error on idle client:', err);
});

// ─── Typed Query Helper ───────────────────────────────────────────────────────
// Always use parameterized queries ($1, $2, …) — never string interpolation.

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<QueryResult<T>> {
  const start = Date.now();
  const result = await pool.query<T>(text, params);

  if (env.NODE_ENV === 'development') {
    console.log('[DB]', {
      query: text.replace(/\s+/g, ' ').trim().slice(0, 100),
      rows: result.rowCount,
      ms: Date.now() - start,
    });
  }

  return result;
}

// ─── Transaction Helper ───────────────────────────────────────────────────────
// Automatically rolls back on any error thrown inside the callback.

export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// ─── Health Check ─────────────────────────────────────────────────────────────

export async function checkDbConnection(): Promise<boolean> {
  try {
    await query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}
