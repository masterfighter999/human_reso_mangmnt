/**
 * seed.ts
 *
 * Seeds the database with essential bootstrap data:
 *  - 1 ADMIN user  (credentials printed to console, change immediately)
 *  - Default leave types (Paid, Sick, Casual, Unpaid)
 *
 * Safe to re-run — uses INSERT ... ON CONFLICT DO NOTHING throughout.
 *
 * Run:  npm run db:seed
 */

import { pool } from '../config/database';
import { hashPassword } from '../utils/auth.util';

// ─── Admin Credentials ────────────────────────────────────────────────────────
// Override via environment variables to avoid hardcoded secrets in CI.

const ADMIN_EMAIL    = process.env.SEED_ADMIN_EMAIL    ?? 'admin@hrms.local';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'Admin@1234!';
const ADMIN_FIRST    = process.env.SEED_ADMIN_FIRST    ?? 'System';
const ADMIN_LAST     = process.env.SEED_ADMIN_LAST     ?? 'Admin';

// ─── Leave Types ──────────────────────────────────────────────────────────────

const LEAVE_TYPES = [
  { name: 'Paid Leave',    code: 'PL',  max_days: 18, is_paid: true  },
  { name: 'Sick Leave',    code: 'SL',  max_days: 12, is_paid: true  },
  { name: 'Casual Leave',  code: 'CL',  max_days: 6,  is_paid: true  },
  { name: 'Unpaid Leave',  code: 'UPL', max_days: 30, is_paid: false },
];

// ─── Seed Functions ───────────────────────────────────────────────────────────

async function seedAdminUser(): Promise<void> {
  console.log('  👤  Seeding admin user...');

  const passwordHash = await hashPassword(ADMIN_PASSWORD);

  // Insert user
  const userResult = await pool.query<{ id: string }>(
    `INSERT INTO users (email, password_hash, role)
     VALUES ($1, $2, 'ADMIN')
     ON CONFLICT (email) DO NOTHING
     RETURNING id`,
    [ADMIN_EMAIL, passwordHash],
  );

  if (userResult.rowCount === 0) {
    console.log(`  ⏭   Admin user already exists (${ADMIN_EMAIL}), skipping.`);
    return;
  }

  const userId = userResult.rows[0].id;

  // Auto-generate employee ID for the admin
  const countResult = await pool.query<{ count: string }>(
    'SELECT COUNT(*) as count FROM employees',
  );
  const sequence = parseInt(countResult.rows[0].count, 10) + 1;
  const employeeId = `EMP-${new Date().getFullYear()}-${String(sequence).padStart(4, '0')}`;

  // Insert corresponding employee record
  await pool.query(
    `INSERT INTO employees (
       employee_id, user_id, first_name, last_name,
       date_of_joining, employment_type, status
     )
     VALUES ($1, $2, $3, $4, NOW(), 'FULL_TIME', 'ACTIVE')
     ON CONFLICT (user_id) DO NOTHING`,
    [employeeId, userId, ADMIN_FIRST, ADMIN_LAST],
  );

  console.log(`  ✅  Admin user created:`);
  console.log(`       Email:    ${ADMIN_EMAIL}`);
  console.log(`       Password: ${ADMIN_PASSWORD}`);
  console.log(`       EmpID:    ${employeeId}`);
  console.log(`  ⚠️   Change the admin password immediately after first login!\n`);
}

async function seedLeaveTypes(): Promise<void> {
  console.log('  📋  Seeding leave types...');

  for (const lt of LEAVE_TYPES) {
    const result = await pool.query(
      `INSERT INTO leave_types (name, code, max_days_per_year, is_paid)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (code) DO NOTHING`,
      [lt.name, lt.code, lt.max_days, lt.is_paid],
    );

    if (result.rowCount && result.rowCount > 0) {
      console.log(`  ✅  Leave type: ${lt.name} (${lt.code})`);
    } else {
      console.log(`  ⏭   Leave type already exists: ${lt.code}`);
    }
  }
}

// ─── Runner ───────────────────────────────────────────────────────────────────

async function seed(): Promise<void> {
  console.log('\n🌱  Seeding database...\n');

  try {
    await seedAdminUser();
    await seedLeaveTypes();
    console.log('\n✨  Seeding complete.\n');
  } catch (err) {
    console.error('\n❌  Seeding failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
