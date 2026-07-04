import { query } from '../config/database';
import { NotFoundError, BadRequestError } from '../utils/errors';
import { UserRole } from '../types';
import { CheckInInput, CheckOutInput } from '../validators/attendance.validator';

export class AttendanceService {
  async checkIn(userId: string, input: CheckInInput): Promise<any> {
    const empRes = await query(`SELECT id FROM employees WHERE user_id = $1`, [userId]);
    if (empRes.rowCount === 0) throw new NotFoundError('Employee profile');
    const employeeId = empRes.rows[0].id;

    // Check if already checked in today
    const todayRes = await query(
      `SELECT * FROM attendance WHERE employee_id = $1 AND att_date = CURRENT_DATE`,
      [employeeId]
    );

    if (todayRes.rowCount && todayRes.rowCount > 0) {
      throw new BadRequestError('You have already checked in today');
    }

    const attRes = await query(
      `INSERT INTO attendance (employee_id, att_date, check_in, status, remarks)
       VALUES ($1, CURRENT_DATE, NOW(), 'present', $2) RETURNING *`,
      [employeeId, input.remarks || null]
    );

    return attRes.rows[0];
  }

  async checkOut(userId: string, input: CheckOutInput): Promise<any> {
    const empRes = await query(`SELECT id FROM employees WHERE user_id = $1`, [userId]);
    if (empRes.rowCount === 0) throw new NotFoundError('Employee profile');
    const employeeId = empRes.rows[0].id;

    const todayRes = await query(
      `SELECT * FROM attendance WHERE employee_id = $1 AND att_date = CURRENT_DATE`,
      [employeeId]
    );

    if (todayRes.rowCount === 0) {
      throw new BadRequestError('You have not checked in today');
    }

    const attendance = todayRes.rows[0];
    if (attendance.check_out) {
      throw new BadRequestError('You have already checked out today');
    }

    const attRes = await query(
      `UPDATE attendance 
       SET check_out = NOW(), 
           work_hours = EXTRACT(EPOCH FROM (NOW() - check_in))/3600,
           remarks = COALESCE($2, remarks),
           updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [attendance.id, input.remarks || null]
    );

    return attRes.rows[0];
  }

  async getAttendance(
    userId: string,
    role: UserRole,
    employeeIdParam?: string,
    startDate?: string,
    endDate?: string
  ): Promise<any> {
    // Determine which employee to fetch
    let targetEmployeeId = employeeIdParam;
    
    if (!targetEmployeeId) {
      // Fetch for self
      const empRes = await query(`SELECT id FROM employees WHERE user_id = $1`, [userId]);
      if (empRes.rowCount === 0) throw new NotFoundError('Employee profile');
      targetEmployeeId = empRes.rows[0].id;
    } else {
      // Requesting someone else's attendance
      if (role !== 'admin') {
        const empRes = await query(`SELECT id FROM employees WHERE user_id = $1`, [userId]);
        if (empRes.rowCount === 0 || empRes.rows[0].id !== targetEmployeeId) {
          throw new BadRequestError('You can only view your own attendance');
        }
      }
    }

    let sql = `SELECT * FROM attendance WHERE employee_id = $1`;
    const params: any[] = [targetEmployeeId];

    if (startDate) {
      params.push(startDate);
      sql += ` AND att_date >= $${params.length}`;
    }
    
    if (endDate) {
      params.push(endDate);
      sql += ` AND att_date <= $${params.length}`;
    }

    sql += ` ORDER BY att_date DESC`;

    const res = await query(sql, params);
    return res.rows;
  }
}
