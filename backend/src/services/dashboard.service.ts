import { query } from '../config/database';

export class DashboardService {
  // ── Admin / HR Dashboard ────────────────────────────────────────────────────
  
  async getAdminDashboardStats(): Promise<any> {
    // 1. Employee Count
    const employeeCountRes = await query(
      `SELECT COUNT(*) as count FROM employees WHERE employment_status = 'ACTIVE'`
    );
    const totalEmployees = parseInt(employeeCountRes.rows[0].count, 10);

    // 2. Today's Attendance (Present or Half-day or on Leave but checked in, etc.)
    // We just count the number of attendance records for today where status is not absent.
    const attendanceRes = await query(
      `SELECT COUNT(*) as count FROM attendance 
       WHERE att_date = CURRENT_DATE AND status IN ('PRESENT', 'HALF_DAY')`
    );
    const todayAttendance = parseInt(attendanceRes.rows[0].count, 10);

    // 3. Pending Leave Requests
    const leaveRes = await query(
      `SELECT COUNT(*) as count FROM leave_requests WHERE status = 'PENDING'`
    );
    const pendingLeaves = parseInt(leaveRes.rows[0].count, 10);

    return {
      totalEmployees,
      todayAttendance,
      pendingLeaveRequests: pendingLeaves,
    };
  }

  // ── Employee Dashboard ──────────────────────────────────────────────────────

  async getEmployeeDashboardStats(userId: string): Promise<any> {
    // We need to resolve userId to employee_id first
    const empRes = await query(
      `SELECT id, first_name, last_name, phone, address, profile_picture_url, date_of_birth, gender 
       FROM employees WHERE user_id = $1`,
      [userId]
    );

    if (empRes.rowCount === 0) {
      throw new Error('Employee profile not found');
    }

    const employee = empRes.rows[0];

    // 1. Profile Completeness Calculation (Simple example)
    const fieldsToCheck = [
      'first_name', 'last_name', 'phone', 'address', 
      'profile_picture_url', 'date_of_birth', 'gender'
    ];
    let filledFields = 0;
    fieldsToCheck.forEach(field => {
      if (employee[field]) filledFields++;
    });
    const profileCompleteness = Math.round((filledFields / fieldsToCheck.length) * 100);

    // 2. Today's Attendance Status
    const attendanceRes = await query(
      `SELECT status, check_in, check_out FROM attendance 
       WHERE employee_id = $1 AND att_date = CURRENT_DATE`,
      [employee.id]
    );
    const todayAttendance = attendanceRes.rows[0] || null;

    // 3. Pending Leave Requests for this employee
    const leaveRes = await query(
      `SELECT COUNT(*) as count FROM leave_requests 
       WHERE employee_id = $1 AND status = 'PENDING'`,
      [employee.id]
    );
    const pendingLeaves = parseInt(leaveRes.rows[0].count, 10);

    return {
      profileCompleteness,
      todayAttendance,
      pendingLeaveRequests: pendingLeaves,
    };
  }
}
