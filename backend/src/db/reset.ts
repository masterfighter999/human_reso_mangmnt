/**
 * reset.ts
 *
 * Drops all tables and enums in the correct dependency order,
 * then re-runs all migrations from scratch.
 *
 * ⚠️  DESTRUCTIVE — for development / CI only. Never run in production.
 *
 * Run:  npm run db:reset
 */

import { pool } from '../config/database';

async function reset(): Promise<void> {
  const env = process.env.NODE_ENV ?? 'development';

  if (env === 'production') {
    console.error('❌  db:reset is disabled in production.');
    process.exit(1);
  }

  console.log('\n⚠️   Resetting database (all data will be lost)...\n');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Drop tables in reverse dependency order
    await client.query(`
      DROP TABLE IF EXISTS
        audit_logs,
        payslips,
        salary_structures,
        documents,
        leave_requests,
        leave_types,
        attendance,
        employees,
        refresh_tokens,
        users,
        schema_migrations
      CASCADE
    `);

    // Drop all custom enums
    await client.query(`
      DROP TYPE IF EXISTS
        audit_action,
        leave_status,
        attendance_status,
        employment_status,
        employment_type,
        user_role
      CASCADE
    `);

    await client.query('COMMIT');
    console.log('  ✅  All tables and types dropped.\n');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }

  console.log('  ℹ️   Run `npm run db:migrate` to re-apply all migrations.\n');
}

reset().catch((err) => {
  console.error('❌  Reset failed:', err);
  process.exit(1);
});
