import { query } from '../config/database';
import { NotFoundError, BadRequestError } from '../utils/errors';
import { UserRole } from '../types';
import { ApplyLeaveInput, UpdateLeaveStatusInput } from '../validators/leave.validator';

export class LeaveService {
  async applyLeave(userId: string, input: ApplyLeaveInput): Promise<any> {
    const empRes = await query(`SELECT id FROM employees WHERE user_id = $1`, [userId]);
    if (empRes.rowCount === 0) throw new NotFoundError('Employee profile');
    const employeeId = empRes.rows[0].id;

    const start = new Date(input.start_date);
    const end = new Date(input.end_date);
    
    // Calculate duration in days (inclusive)
    const durationDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1;

    if (durationDays <= 0) {
      throw new BadRequestError('Invalid date range');
    }

    // Check if leave_type exists
    const leaveTypeRes = await query(`SELECT * FROM leave_types WHERE id = $1`, [input.leave_type_id]);
    if (leaveTypeRes.rowCount === 0) throw new NotFoundError('Leave type');

    const res = await query(
      `INSERT INTO leave_requests (employee_id, leave_type_id, start_date, end_date, duration_days, remarks)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [employeeId, input.leave_type_id, input.start_date, input.end_date, durationDays, input.remarks || null]
    );

    return res.rows[0];
  }

  async getLeaves(userId: string, role: UserRole, employeeIdParam?: string): Promise<any> {
    let targetEmployeeId = employeeIdParam;

    if (!targetEmployeeId) {
      if (role !== 'admin') {
        const empRes = await query(`SELECT id FROM employees WHERE user_id = $1`, [userId]);
        if (empRes.rowCount && empRes.rowCount > 0) {
          targetEmployeeId = empRes.rows[0].id;
        }
      }
    }

    let sql = `SELECT lr.*, lt.name as leave_type_name, lt.category as leave_category 
               FROM leave_requests lr
               JOIN leave_types lt ON lr.leave_type_id = lt.id`;
    const params: any[] = [];

    if (targetEmployeeId) {
      params.push(targetEmployeeId);
      sql += ` WHERE lr.employee_id = $1`;
    }

    sql += ` ORDER BY lr.created_at DESC`;

    const res = await query(sql, params);
    return res.rows;
  }

  async updateLeaveStatus(
    leaveId: string,
    userId: string,
    input: UpdateLeaveStatusInput
  ): Promise<any> {
    const empRes = await query(`SELECT id FROM employees WHERE user_id = $1`, [userId]);
    if (empRes.rowCount === 0) throw new NotFoundError('Admin employee profile');
    const reviewerId = empRes.rows[0].id;

    const leaveRes = await query(`SELECT * FROM leave_requests WHERE id = $1`, [leaveId]);
    if (leaveRes.rowCount === 0) throw new NotFoundError('Leave request');

    if (leaveRes.rows[0].status !== 'pending') {
      throw new BadRequestError('Leave request is already processed');
    }

    const res = await query(
      `UPDATE leave_requests 
       SET status = $1, reviewed_by = $2, review_comments = $3, reviewed_at = NOW(), updated_at = NOW()
       WHERE id = $4 RETURNING *`,
      [input.status, reviewerId, input.review_comments || null, leaveId]
    );

    return res.rows[0];
  }
}
