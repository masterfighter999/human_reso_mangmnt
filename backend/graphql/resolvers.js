const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'default_hrms_secret_key_2026';

// Helper to sign JWT tokens
function signToken(user) {
  return jwt.sign(
    { id: user.id, login_id: user.login_id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// Helper to calculate salary components
function calculateComponents(monthlyWage) {
  const basic = parseFloat((monthlyWage * 0.50).toFixed(2));
  const hra = parseFloat((basic * 0.50).toFixed(2));
  const standardAllowance = 4167.00;
  const performanceBonus = parseFloat((basic * 0.0833).toFixed(2));
  const lta = parseFloat((basic * 0.0833).toFixed(2));
  const fixedAllowance = parseFloat((monthlyWage - (basic + hra + standardAllowance + performanceBonus + lta)).toFixed(2));

  return {
    basic,
    hra,
    standardAllowance,
    performanceBonus,
    lta,
    fixedAllowance
  };
}

const resolvers = {
  // Queries
  me: async (args, context) => {
    if (!context.user) return null;
    const res = await db.query('SELECT id, login_id, email, role, email_verified, created_at, updated_at FROM users WHERE id = $1', [context.user.id]);
    return res.rows[0];
  },

  myProfile: async (args, context) => {
    if (!context.user) throw new Error('Authentication required');
    const res = await db.query('SELECT * FROM employees WHERE user_id = $1', [context.user.id]);
    return res.rows[0];
  },

  employees: async (args, context) => {
    if (!context.user || context.user.role !== 'admin') {
      throw new Error('Unauthorized');
    }
    const res = await db.query('SELECT * FROM employees ORDER BY created_at DESC');
    return res.rows;
  },

  employee: async ({ id }, context) => {
    if (!context.user) throw new Error('Authentication required');
    const res = await db.query('SELECT * FROM employees WHERE id = $1', [id]);
    const emp = res.rows[0];
    if (!emp) return null;
    
    // Only admin or the employee themselves can see profile
    if (context.user.role !== 'admin' && context.user.id !== emp.user_id) {
      throw new Error('Unauthorized');
    }
    return emp;
  },

  attendanceLogs: async ({ employeeId, month }, context) => {
    if (!context.user) throw new Error('Authentication required');
    let empId = employeeId;
    if (context.user.role !== 'admin') {
      // Employees can only fetch their own logs
      const empRes = await db.query('SELECT id FROM employees WHERE user_id = $1', [context.user.id]);
      if (empRes.rowCount === 0) throw new Error('Employee profile not found');
      empId = empRes.rows[0].id;
    } else if (!empId) {
      // Admin: if no employeeId is provided, get today's attendance for all
      const dateStr = new Date().toISOString().split('T')[0];
      const res = await db.query(`
        SELECT a.*, concat(e.first_name, ' ', e.last_name) as employee_name 
        FROM attendance a
        JOIN employees e ON a.employee_id = e.id
        WHERE a.att_date = $1
      `, [dateStr]);
      return res.rows;
    }

    let queryStr = 'SELECT a.*, concat(e.first_name, \' \', e.last_name) as employee_name FROM attendance a JOIN employees e ON a.employee_id = e.id WHERE a.employee_id = $1';
    const params = [empId];

    if (month) {
      // Month format: YYYY-MM
      queryStr += ' AND to_char(a.att_date, \'YYYY-MM\') = $2';
      params.push(month);
    }
    queryStr += ' ORDER BY a.att_date DESC';
    const res = await db.query(queryStr, params);
    return res.rows;
  },

  activeCheckIn: async (args, context) => {
    if (!context.user) throw new Error('Authentication required');
    const empRes = await db.query('SELECT id FROM employees WHERE user_id = $1', [context.user.id]);
    if (empRes.rowCount === 0) return null;
    const employeeId = empRes.rows[0].id;

    const res = await db.query(
      'SELECT * FROM attendance WHERE employee_id = $1 AND att_date = CURRENT_DATE AND check_out IS NULL',
      [employeeId]
    );
    return res.rows[0] || null;
  },

  leaveRequests: async ({ employeeId, status }, context) => {
    if (!context.user) throw new Error('Authentication required');
    let empId = employeeId;
    if (context.user.role !== 'admin') {
      const empRes = await db.query('SELECT id FROM employees WHERE user_id = $1', [context.user.id]);
      if (empRes.rowCount === 0) throw new Error('Employee profile not found');
      empId = empRes.rows[0].id;
    }

    let queryStr = `
      SELECT r.*, concat(e.first_name, ' ', e.last_name) as employee_name
      FROM leave_requests r
      JOIN employees e ON r.employee_id = e.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (empId) {
      queryStr += ` AND r.employee_id = $${paramIndex++}`;
      params.push(empId);
    }
    if (status) {
      queryStr += ` AND r.status = $${paramIndex++}`;
      params.push(status);
    }
    queryStr += ' ORDER BY r.created_at DESC';

    const res = await db.query(queryStr, params);
    return res.rows;
  },

  leaveTypes: async () => {
    const res = await db.query('SELECT * FROM leave_types');
    return res.rows;
  },

  leaveBalances: async ({ employeeId }, context) => {
    if (!context.user) throw new Error('Authentication required');
    let empId = employeeId;
    if (context.user.role !== 'admin') {
      const empRes = await db.query('SELECT id FROM employees WHERE user_id = $1', [context.user.id]);
      if (empRes.rowCount === 0) throw new Error('Employee profile not found');
      empId = empRes.rows[0].id;
    }

    // Get all leave types
    const typesRes = await db.query('SELECT * FROM leave_types');
    const leaveTypes = typesRes.rows;

    const balances = [];
    for (const lt of leaveTypes) {
      // Calculate total approved leave days for this type in current year
      const currentYear = new Date().getFullYear();
      const takenRes = await db.query(`
        SELECT COALESCE(SUM(duration_days), 0) as days_taken
        FROM leave_requests
        WHERE employee_id = $1 
          AND leave_type_id = $2 
          AND status = 'approved'
          AND EXTRACT(YEAR FROM start_date) = $3
      `, [empId, lt.id, currentYear]);
      
      const daysTaken = parseFloat(takenRes.rows[0].days_taken);
      const maxDays = lt.max_days_per_year;
      const daysAvailable = maxDays ? Math.max(0, maxDays - daysTaken) : 999; // unlimited for unpaid

      balances.push({
        leave_type_id: lt.id,
        leave_type_name: lt.name,
        leave_category: lt.category,
        max_days: maxDays,
        days_taken: daysTaken,
        days_available: daysAvailable
      });
    }

    return balances;
  },

  payslips: async ({ employeeId, month }, context) => {
    if (!context.user) throw new Error('Authentication required');
    let empId = employeeId;
    if (context.user.role !== 'admin') {
      const empRes = await db.query('SELECT id FROM employees WHERE user_id = $1', [context.user.id]);
      if (empRes.rowCount === 0) throw new Error('Employee profile not found');
      empId = empRes.rows[0].id;
    }

    let queryStr = `
      SELECT p.*, concat(e.first_name, ' ', e.last_name) as employee_name, e.employee_code
      FROM payslips p
      JOIN employees e ON p.employee_id = e.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (empId) {
      queryStr += ` AND p.employee_id = $${paramIndex++}`;
      params.push(empId);
    }
    if (month) {
      // month format: YYYY-MM
      queryStr += ` AND to_char(p.pay_period_start, 'YYYY-MM') = $${paramIndex++}`;
      params.push(month);
    }
    queryStr += ' ORDER BY p.pay_period_start DESC';

    const res = await db.query(queryStr, params);
    return res.rows;
  },

  // Mutations
  registerAdmin: async ({ companyName, name, email, phone, password }) => {
    // Check if any admin exists
    const adminCheck = await db.query('SELECT 1 FROM users WHERE role = \'admin\'');
    if (adminCheck.rowCount > 0) {
      throw new Error('Admin registration is closed. Contact the system administrator.');
    }

    // Split name to first and last name
    const nameParts = name.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || 'Admin';

    // Generate Login ID
    const yearStr = new Date().getFullYear().toString();
    const cleanFirst = firstName.substring(0, 2).toUpperCase().padEnd(2, 'X');
    const cleanLast = lastName.substring(0, 2).toUpperCase().padEnd(2, 'X');
    const loginId = `OI${cleanFirst}${cleanLast}${yearStr}0001`;

    const passwordHash = await bcrypt.hash(password, 10);

    // Create User inside transaction
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      const userRes = await client.query(`
        INSERT INTO users (login_id, email, password_hash, role, email_verified)
        VALUES ($1, $2, $3, 'admin', TRUE)
        RETURNING *
      `, [loginId, email, passwordHash]);
      const user = userRes.rows[0];

      const empRes = await client.query(`
        INSERT INTO employees (user_id, employee_code, first_name, last_name, phone, date_of_joining)
        VALUES ($1, $2, $3, $4, $5, CURRENT_DATE)
        RETURNING *
      `, [user.id, loginId, firstName, lastName, phone]);
      const employee = empRes.rows[0];

      // Seed salary structure for admin (fixed default wage)
      const wage = 100000.00;
      const comps = calculateComponents(wage);
      await client.query(`
        INSERT INTO salary_structures (
          employee_id, monthly_wage, basic_pay, hra, standard_allowance, 
          performance_bonus, lta, fixed_allowance, pf_rate_percent, professional_tax, effective_from
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 12.00, 200.00, CURRENT_DATE)
      `, [employee.id, wage, comps.basic, comps.hra, comps.standardAllowance, comps.performanceBonus, comps.lta, comps.fixedAllowance]);

      await client.query('COMMIT');

      const token = signToken(user);
      return { token, user, employee };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  login: async ({ loginIdOrEmail, password }) => {
    const res = await db.query(
      'SELECT * FROM users WHERE login_id = $1 OR email = $2',
      [loginIdOrEmail, loginIdOrEmail]
    );
    const user = res.rows[0];
    if (!user) throw new Error('Invalid credentials');

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) throw new Error('Invalid credentials');

    // Get employee profile if exists
    const empRes = await db.query('SELECT * FROM employees WHERE user_id = $1', [user.id]);
    const employee = empRes.rows[0] || null;

    // Update last login
    await db.query('UPDATE users SET last_login_at = now() WHERE id = $1', [user.id]);

    const token = signToken(user);
    return { token, user, employee };
  },

  createEmployee: async ({ firstName, lastName, email, phone, department, designation, dateOfJoining, monthlyWage }, context) => {
    if (!context.user || context.user.role !== 'admin') {
      throw new Error('Unauthorized');
    }

    // Generate login_id
    const joinYear = new Date(dateOfJoining).getFullYear().toString();
    const cleanFirst = firstName.trim().substring(0, 2).toUpperCase().padEnd(2, 'X');
    const cleanLast = lastName.trim().substring(0, 2).toUpperCase().padEnd(2, 'X');
    
    // Count existing employees joined in that year to generate serial number
    const countRes = await db.query(
      'SELECT COUNT(*) FROM employees WHERE EXTRACT(YEAR FROM date_of_joining) = $1',
      [parseInt(joinYear)]
    );
    const count = parseInt(countRes.rows[0].count) + 1;
    const serialStr = count.toString().padStart(4, '0');
    const loginId = `OI${cleanFirst}${cleanLast}${joinYear}${serialStr}`;

    // Auto-generate temp password: e.g. Temp@1234
    const tempPassword = `Temp@${Math.floor(1000 + Math.random() * 9000)}`;
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // Create User
      const userRes = await client.query(`
        INSERT INTO users (login_id, email, password_hash, role)
        VALUES ($1, $2, $3, 'employee')
        RETURNING *
      `, [loginId, email, passwordHash]);
      const user = userRes.rows[0];

      // Create Employee
      const empRes = await client.query(`
        INSERT INTO employees (
          user_id, employee_code, first_name, last_name, phone, 
          department, designation, date_of_joining
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [user.id, loginId, firstName, lastName, phone, department, designation, dateOfJoining]);
      const employee = empRes.rows[0];

      // Set Salary Structure
      const comps = calculateComponents(monthlyWage);
      await client.query(`
        INSERT INTO salary_structures (
          employee_id, monthly_wage, basic_pay, hra, standard_allowance, 
          performance_bonus, lta, fixed_allowance, pf_rate_percent, professional_tax, effective_from
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 12.00, 200.00, $9)
      `, [employee.id, monthlyWage, comps.basic, comps.hra, comps.standardAllowance, comps.performanceBonus, comps.lta, comps.fixedAllowance, dateOfJoining]);

      await client.query('COMMIT');
      
      // Log credentials for admin display
      console.log(`EMPLOYEE CREATED: ${loginId} | Temporary Password: ${tempPassword}`);
      
      // We return employee, but we can also store the temp password temporarily or display it in console.
      // To show it on UI, let's inject it into employee object metadata (which isn't saved but returned in the resolver)
      // Since about_me is type TEXT, we can temporarily return it in about_me or design a metadata field.
      // Let's store temporary text in about_me for display, so the admin sees the temp password on success!
      employee.about_me = `Credentials -> Login ID: ${loginId} | Temporary Password: ${tempPassword}`;
      
      return employee;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  updateProfile: async ({ id, phone, address, profilePictureUrl, department, designation, dateOfBirth, gender, marital_status, nationality, personalEmail, residingAddress, aboutMe, skills, certifications, interests }, context) => {
    if (!context.user) throw new Error('Authentication required');

    let employeeId = id;
    if (context.user.role !== 'admin') {
      // Non-admins can only update themselves
      const empRes = await db.query('SELECT id FROM employees WHERE user_id = $1', [context.user.id]);
      if (empRes.rowCount === 0) throw new Error('Employee profile not found');
      employeeId = empRes.rows[0].id;
    } else if (!employeeId) {
      // Admin updating self
      const empRes = await db.query('SELECT id FROM employees WHERE user_id = $1', [context.user.id]);
      employeeId = empRes.rows[0].id;
    }

    // Build update query
    const fields = [];
    const params = [];
    let index = 1;

    if (phone !== undefined) { fields.push(`phone = $${index++}`); params.push(phone); }
    if (address !== undefined) { fields.push(`address = $${index++}`); params.push(address); }
    if (profilePictureUrl !== undefined) { fields.push(`profile_picture_url = $${index++}`); params.push(profilePictureUrl); }
    if (department !== undefined && context.user.role === 'admin') { fields.push(`department = $${index++}`); params.push(department); }
    if (designation !== undefined && context.user.role === 'admin') { fields.push(`designation = $${index++}`); params.push(designation); }
    if (dateOfBirth !== undefined) { fields.push(`date_of_birth = $${index++}`); params.push(dateOfBirth); }
    if (gender !== undefined) { fields.push(`gender = $${index++}`); params.push(gender); }
    if (marital_status !== undefined) { fields.push(`marital_status = $${index++}`); params.push(marital_status); }
    if (nationality !== undefined) { fields.push(`nationality = $${index++}`); params.push(nationality); }
    if (personalEmail !== undefined) { fields.push(`personal_email = $${index++}`); params.push(personalEmail); }
    if (residingAddress !== undefined) { fields.push(`residing_address = $${index++}`); params.push(residingAddress); }
    if (aboutMe !== undefined) { fields.push(`about_me = $${index++}`); params.push(aboutMe); }
    if (skills !== undefined) { fields.push(`skills = $${index++}`); params.push(JSON.stringify(skills)); }
    if (certifications !== undefined) { fields.push(`certifications = $${index++}`); params.push(JSON.stringify(certifications)); }
    if (interests !== undefined) { fields.push(`interests = $${index++}`); params.push(JSON.stringify(interests)); }

    if (fields.length === 0) {
      const res = await db.query('SELECT * FROM employees WHERE id = $1', [employeeId]);
      return res.rows[0];
    }

    params.push(employeeId);
    const queryStr = `UPDATE employees SET ${fields.join(', ')}, updated_at = now() WHERE id = $${index} RETURNING *`;
    const updateRes = await db.query(queryStr, params);
    return updateRes.rows[0];
  },

  updateSalaryStructure: async ({ employeeId, workingDaysWeek, breakTimeMins, bankName, accountNumber, ifscCode, panNo, uanNo, monthlyWage }, context) => {
    if (!context.user || context.user.role !== 'admin') {
      throw new Error('Unauthorized');
    }

    const comps = calculateComponents(monthlyWage);
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // Expire current active salary structure
      await client.query(`
        UPDATE salary_structures 
        SET effective_to = CURRENT_DATE 
        WHERE employee_id = $1 AND effective_to IS NULL
      `, [employeeId]);

      // Insert new structure
      const insertRes = await client.query(`
        INSERT INTO salary_structures (
          employee_id, working_days_week, break_time_mins, bank_name, account_number, 
          ifsc_code, pan_no, uan_no, monthly_wage, basic_pay, hra, standard_allowance, 
          performance_bonus, lta, fixed_allowance, pf_rate_percent, professional_tax, effective_from, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 12.00, 200.00, CURRENT_DATE, $16)
        RETURNING *
      `, [
        employeeId, workingDaysWeek, breakTimeMins, bankName, accountNumber, 
        ifscCode, panNo, uanNo, monthlyWage, comps.basic, comps.hra, comps.standardAllowance, 
        comps.performanceBonus, comps.lta, comps.fixedAllowance, context.user.id
      ]);

      await client.query('COMMIT');
      return insertRes.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  changePassword: async ({ currentPassword, newPassword }, context) => {
    if (!context.user) throw new Error('Authentication required');

    const res = await db.query('SELECT password_hash FROM users WHERE id = $1', [context.user.id]);
    const user = res.rows[0];
    if (!user) throw new Error('User not found');

    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) throw new Error('Incorrect current password');

    const newHash = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2', [newHash, context.user.id]);
    return true;
  },

  checkIn: async ({ remarks }, context) => {
    if (!context.user) throw new Error('Authentication required');
    const empRes = await db.query('SELECT id FROM employees WHERE user_id = $1', [context.user.id]);
    if (empRes.rowCount === 0) throw new Error('Employee profile not found');
    const employeeId = empRes.rows[0].id;

    // Check if already checked in today
    const checkRes = await db.query(
      'SELECT 1 FROM attendance WHERE employee_id = $1 AND att_date = CURRENT_DATE',
      [employeeId]
    );
    if (checkRes.rowCount > 0) {
      throw new Error('Already checked in today');
    }

    const insertRes = await db.query(`
      INSERT INTO attendance (employee_id, att_date, check_in, status, remarks)
      VALUES ($1, CURRENT_DATE, now(), 'present', $2)
      RETURNING *
    `, [employeeId, remarks]);

    return insertRes.rows[0];
  },

  checkOut: async ({ remarks }, context) => {
    if (!context.user) throw new Error('Authentication required');
    const empRes = await db.query('SELECT id FROM employees WHERE user_id = $1', [context.user.id]);
    if (empRes.rowCount === 0) throw new Error('Employee profile not found');
    const employeeId = empRes.rows[0].id;

    // Find today's active check-in
    const activeRes = await db.query(
      'SELECT * FROM attendance WHERE employee_id = $1 AND att_date = CURRENT_DATE AND check_out IS NULL',
      [employeeId]
    );
    const active = activeRes.rows[0];
    if (!active) {
      throw new Error('No active check-in found for today');
    }

    const checkOutTime = new Date();
    const checkInTime = new Date(active.check_in);
    
    // Calculate total hours
    const diffMs = checkOutTime - checkInTime;
    const workHours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));
    const extraHours = parseFloat(Math.max(0, workHours - 8.00).toFixed(2));

    const updateRes = await db.query(`
      UPDATE attendance 
      SET check_out = $1, work_hours = $2, extra_hours = $3, remarks = COALESCE($4, remarks), updated_at = now()
      WHERE id = $5
      RETURNING *
    `, [checkOutTime, workHours, extraHours, remarks, active.id]);

    return updateRes.rows[0];
  },

  applyLeave: async ({ leaveTypeId, startDate, endDate, remarks, attachmentUrl }, context) => {
    if (!context.user) throw new Error('Authentication required');
    const empRes = await db.query('SELECT id FROM employees WHERE user_id = $1', [context.user.id]);
    if (empRes.rowCount === 0) throw new Error('Employee profile not found');
    const employeeId = empRes.rows[0].id;

    // Calculate duration in days
    const start = new Date(startDate);
    const end = new Date(endDate);
    const timeDiff = end - start;
    const durationDays = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)) + 1;

    if (durationDays <= 0) {
      throw new Error('End date must be greater than or equal to start date');
    }

    // Get leave type category
    const ltRes = await db.query('SELECT * FROM leave_types WHERE id = $1', [leaveTypeId]);
    const leaveType = ltRes.rows[0];
    if (!leaveType) throw new Error('Invalid leave type');

    // For paid/sick leaves, validate remaining balance
    if (leaveType.category !== 'unpaid') {
      const year = start.getFullYear();
      const approvedRes = await db.query(`
        SELECT COALESCE(SUM(duration_days), 0) as days_taken
        FROM leave_requests
        WHERE employee_id = $1 AND leave_type_id = $2 AND status = 'approved'
          AND EXTRACT(YEAR FROM start_date) = $3
      `, [employeeId, leaveTypeId, year]);
      
      const taken = parseFloat(approvedRes.rows[0].days_taken);
      const available = leaveType.max_days_per_year - taken;
      if (durationDays > available) {
        throw new Error(`Insufficient leave balance. Requested: ${durationDays}, Available: ${available}`);
      }
    }

    const insertRes = await db.query(`
      INSERT INTO leave_requests (employee_id, leave_type_id, start_date, end_date, duration_days, remarks, attachment_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [employeeId, leaveTypeId, startDate, endDate, durationDays, remarks, attachmentUrl]);

    return insertRes.rows[0];
  },

  reviewLeave: async ({ leaveRequestId, status, reviewComments }, context) => {
    if (!context.user || context.user.role !== 'admin') {
      throw new Error('Unauthorized');
    }

    const reviewerRes = await db.query('SELECT id FROM employees WHERE user_id = $1', [context.user.id]);
    const reviewerId = reviewerRes.rows[0]?.id;

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const updateRes = await client.query(`
        UPDATE leave_requests
        SET status = $1, reviewed_by = $2, review_comments = $3, reviewed_at = now(), updated_at = now()
        WHERE id = $4
        RETURNING *
      `, [status, reviewerId, reviewComments, leaveRequestId]);
      const request = updateRes.rows[0];

      if (!request) throw new Error('Leave request not found');

      // If approved, create attendance entries with status='leave' for the leave days
      if (status === 'approved') {
        const start = new Date(request.start_date);
        const end = new Date(request.end_date);
        
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0];
          // Check if weekday
          const day = d.getDay();
          const isWeekend = (day === 0 || day === 6); // Sun = 0, Sat = 6
          
          if (!isWeekend) {
            // Upsert attendance for those days with status='leave'
            await client.query(`
              INSERT INTO attendance (employee_id, att_date, status, remarks)
              VALUES ($1, $2, 'leave', 'Approved leave')
              ON CONFLICT (employee_id, att_date) DO UPDATE
              SET status = 'leave', remarks = 'Approved leave', updated_at = now()
            `, [request.employee_id, dateStr]);
          }
        }
      }

      await client.query('COMMIT');
      return request;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  generatePayslips: async ({ month }, context) => {
    if (!context.user || context.user.role !== 'admin') {
      throw new Error('Unauthorized');
    }

    // Month format: YYYY-MM (e.g. "2026-07")
    const [year, m] = month.split('-').map(Number);
    const totalDaysInMonth = new Date(year, m, 0).getDate();
    const payPeriodStart = `${month}-01`;
    const payPeriodEnd = `${month}-${totalDaysInMonth}`;

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // Get all active employees who have a salary structure
      const empRes = await client.query(`
        SELECT e.id, e.date_of_joining, s.id as salary_structure_id, s.monthly_wage
        FROM employees e
        JOIN salary_structures s ON e.id = s.employee_id
        WHERE s.effective_to IS NULL AND e.employment_status = 'active'
      `);
      const employees = empRes.rows;
      const payslips = [];

      for (const emp of employees) {
        // Calculate attendance metrics
        // Weekdays count in month
        let totalWorkdays = 0;
        for (let day = 1; day <= totalDaysInMonth; day++) {
          const date = new Date(year, m - 1, day);
          const dayOfWeek = date.getDay();
          if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            totalWorkdays++;
          }
        }

        // Count leaves (Paid/Sick/Unpaid)
        const unpaidRes = await client.query(`
          SELECT COALESCE(SUM(duration_days), 0) as count
          FROM leave_requests r
          JOIN leave_types t ON r.leave_type_id = t.id
          WHERE r.employee_id = $1 
            AND r.status = 'approved'
            AND t.category = 'unpaid'
            AND r.start_date >= $2 AND r.end_date <= $3
        `, [emp.id, payPeriodStart, payPeriodEnd]);
        const unpaidLeaveDays = parseFloat(unpaidRes.rows[0].count);

        // Count present workdays
        const presentRes = await client.query(`
          SELECT COUNT(*) as count
          FROM attendance
          WHERE employee_id = $1 
            AND att_date BETWEEN $2 AND $3
            AND status IN ('present', 'half_day')
        `, [emp.id, payPeriodStart, payPeriodEnd]);
        const presentDays = parseInt(presentRes.rows[0].count);

        // Count approved paid/sick leave days in attendance table
        const leaveDaysRes = await client.query(`
          SELECT COUNT(*) as count
          FROM attendance
          WHERE employee_id = $1 
            AND att_date BETWEEN $2 AND $3
            AND status = 'leave'
        `, [emp.id, payPeriodStart, payPeriodEnd]);
        const leaveDays = parseInt(leaveDaysRes.rows[0].count);

        // Calculate absent days (Workdays where employee had no attendance entry and no approved leave)
        // Absent = totalWorkdays - presentDays - leaveDays - unpaidLeaveDays
        const absentDays = Math.max(0, totalWorkdays - presentDays - leaveDays - unpaidLeaveDays);

        // Payable days = totalDaysInMonth - unpaidLeaveDays - absentDays
        const payableDays = Math.max(0, totalDaysInMonth - unpaidLeaveDays - absentDays);

        // Fetch salary structure
        const structRes = await client.query('SELECT * FROM salary_structures WHERE id = $1', [emp.salary_structure_id]);
        const struct = structRes.rows[0];

        // Pro-rate earnings
        const ratio = payableDays / totalDaysInMonth;
        const basicEarned = parseFloat((struct.basic_pay * ratio).toFixed(2));
        const hraEarned = parseFloat((struct.hra * ratio).toFixed(2));
        const standardAllowanceEarned = parseFloat((struct.standard_allowance * ratio).toFixed(2));
        const performanceBonusEarned = parseFloat((struct.performance_bonus * ratio).toFixed(2));
        const ltaEarned = parseFloat((struct.lta * ratio).toFixed(2));
        const fixedAllowanceEarned = parseFloat((struct.fixed_allowance * ratio).toFixed(2));

        const grossEarnings = parseFloat((basicEarned + hraEarned + standardAllowanceEarned + performanceBonusEarned + ltaEarned + fixedAllowanceEarned).toFixed(2));

        // Deductions
        const pfDeduction = parseFloat((basicEarned * (struct.pf_rate_percent / 100)).toFixed(2));
        const ptDeduction = struct.professional_tax; // professional tax is fixed ₹200
        const totalDeductions = parseFloat((pfDeduction + ptDeduction).toFixed(2));

        const netPay = parseFloat((grossEarnings - totalDeductions).toFixed(2));

        // Create payslip
        const payslipRes = await client.query(`
          INSERT INTO payslips (
            employee_id, salary_structure_id, pay_period_start, pay_period_end,
            total_days_in_month, payable_days, absent_days, unpaid_leave_days,
            basic_earned, hra_earned, standard_allowance_earned, performance_bonus_earned,
            lta_earned, fixed_allowance_earned, gross_earnings, pf_deduction, pt_deduction,
            total_deductions, net_pay, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, 'draft')
          ON CONFLICT DO NOTHING
          RETURNING *
        `, [
          emp.id, emp.salary_structure_id, payPeriodStart, payPeriodEnd,
          totalDaysInMonth, payableDays, absentDays, unpaidLeaveDays,
          basicEarned, hraEarned, standardAllowanceEarned, performanceBonusEarned,
          ltaEarned, fixedAllowanceEarned, grossEarnings, pfDeduction, ptDeduction,
          totalDeductions, netPay
        ]);

        if (payslipRes.rowCount > 0) {
          payslips.push(payslipRes.rows[0]);
        }
      }

      await client.query('COMMIT');
      return payslips;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
};

// Resolver bindings for complex types
const EmployeeResolvers = {
  salary_structure: async (parent, args, context) => {
    if (!context.user || context.user.role !== 'admin') return null;
    const res = await db.query('SELECT * FROM salary_structures WHERE employee_id = $1 AND effective_to IS NULL', [parent.id]);
    return res.rows[0] || null;
  },
  work_status: async (parent, args, context) => {
    const attRes = await db.query(
      'SELECT status FROM attendance WHERE employee_id = $1 AND att_date = CURRENT_DATE',
      [parent.id]
    );
    if (attRes.rowCount > 0) {
      const status = attRes.rows[0].status;
      if (status === 'present' || status === 'half_day') return 'present';
      if (status === 'leave') return 'leave';
    }
    return 'absent';
  }
};

const LeaveRequestResolvers = {
  leave_type: async (parent) => {
    const res = await db.query('SELECT * FROM leave_types WHERE id = $1', [parent.leave_type_id]);
    return res.rows[0] || null;
  }
};

// Expose main resolvers plus nesting resolvers
module.exports = {
  ...resolvers,
  Employee: EmployeeResolvers,
  LeaveRequest: LeaveRequestResolvers
};
