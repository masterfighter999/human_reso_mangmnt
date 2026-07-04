import { query } from '../config/database';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { UserRole } from '../types';
import { UpdateEmployeeInput } from '../validators/employee.validator';

export class EmployeeService {
  /**
   * Fetch an employee by ID. Includes salary structure and documents.
   * Also ensures an employee can only fetch their own profile, unless they're an admin.
   */
  async getProfile(employeeId: string, requesterUserId: string, requesterRole: UserRole): Promise<any> {
    // Determine the user_id of the requested employee
    const empRes = await query(
      `SELECT *, employee_id AS employee_code FROM employees WHERE id = $1`,
      [employeeId]
    );
    if (empRes.rowCount === 0) {
      throw new NotFoundError('Employee');
    }
    const employee = empRes.rows[0];

    // Authorization check
    if (requesterRole !== 'ADMIN' && employee.user_id !== requesterUserId) {
      throw new ForbiddenError('You can only view your own profile');
    }

    // Fetch salary structure
    const salaryRes = await query(
      `SELECT * FROM salary_structures WHERE employee_id = $1 AND effective_to IS NULL`,
      [employeeId]
    );

    // Fetch documents
    const docsRes = await query(`SELECT * FROM documents WHERE employee_id = $1`, [employeeId]);

    return {
      employee,
      salary_structure: salaryRes.rows[0] || null,
      documents: docsRes.rows,
    };
  }

  /**
   * Fetch profile by userId (for the /profile shortcut endpoint)
   */
  async getProfileByUserId(userId: string, requesterRole: UserRole): Promise<any> {
    const empRes = await query(`SELECT id FROM employees WHERE user_id = $1`, [userId]);
    if (empRes.rowCount === 0) {
      throw new NotFoundError('Employee profile');
    }
    return this.getProfile(empRes.rows[0].id, userId, requesterRole);
  }

  /**
   * Update employee details.
   * Role-based checks: Employee can only update limited fields. Admin can update everything.
   */
  async updateProfile(
    employeeId: string,
    data: UpdateEmployeeInput,
    requesterUserId: string,
    requesterRole: UserRole
  ): Promise<any> {
    const empRes = await query(
      `SELECT *, employee_id AS employee_code FROM employees WHERE id = $1`,
      [employeeId]
    );
    if (empRes.rowCount === 0) {
      throw new NotFoundError('Employee');
    }
    const employee = empRes.rows[0];

    // Authorization check
    if (requesterRole !== 'ADMIN' && employee.user_id !== requesterUserId) {
      throw new ForbiddenError('You can only edit your own profile');
    }

    // Determine what fields to update based on role
    const fieldsToUpdate: Record<string, any> = {};

    // Fields both can update
    if (data.address !== undefined) fieldsToUpdate.address = data.address;
    if (data.phone !== undefined) fieldsToUpdate.phone = data.phone;
    if (data.personal_email !== undefined) fieldsToUpdate.personal_email = data.personal_email;
    if (data.residing_address !== undefined) fieldsToUpdate.residing_address = data.residing_address;
    if (data.about_me !== undefined) fieldsToUpdate.about_me = data.about_me;
    if (data.skills !== undefined) fieldsToUpdate.skills = JSON.stringify(data.skills);
    if (data.certifications !== undefined) fieldsToUpdate.certifications = JSON.stringify(data.certifications);
    if (data.interests !== undefined) fieldsToUpdate.interests = JSON.stringify(data.interests);

    // Admin only fields
    if (requesterRole === 'ADMIN') {
      if (data.department !== undefined) fieldsToUpdate.department = data.department;
      if (data.designation !== undefined) fieldsToUpdate.designation = data.designation;
      if (data.date_of_joining !== undefined) fieldsToUpdate.date_of_joining = data.date_of_joining;
      if (data.date_of_birth !== undefined) fieldsToUpdate.date_of_birth = data.date_of_birth;
      if (data.gender !== undefined) fieldsToUpdate.gender = data.gender;
      if (data.marital_status !== undefined) fieldsToUpdate.marital_status = data.marital_status;
      if (data.nationality !== undefined) fieldsToUpdate.nationality = data.nationality;
    }

    if (Object.keys(fieldsToUpdate).length === 0) {
      return employee; // nothing to update
    }

    const setKeys = Object.keys(fieldsToUpdate).map((k, i) => `${k} = $${i + 2}`).join(', ');
    const values = Object.values(fieldsToUpdate);

    const updateRes = await query(
      `UPDATE employees SET ${setKeys}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [employeeId, ...values]
    );

    return updateRes.rows[0];
  }

  /**
   * Upload Document / Profile Picture logic
   */
  async uploadDocument(
    employeeId: string,
    fileType: string,
    fileUrl: string,
    requesterUserId: string,
    requesterRole: UserRole
  ): Promise<any> {
    const empRes = await query(`SELECT user_id FROM employees WHERE id = $1`, [employeeId]);
    if (empRes.rowCount === 0) {
      throw new NotFoundError('Employee');
    }
    const employee = empRes.rows[0];

    if (requesterRole !== 'ADMIN' && employee.user_id !== requesterUserId) {
      throw new ForbiddenError('You can only upload documents for your own profile');
    }

    if (fileType === 'profile_picture') {
      await query(`UPDATE employees SET profile_picture_url = $1 WHERE id = $2`, [fileUrl, employeeId]);
      return { type: 'profile_picture', url: fileUrl };
    } else {
      const docRes = await query(
        `INSERT INTO documents (employee_id, doc_type, file_url, uploaded_by) 
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [employeeId, fileType, fileUrl, requesterUserId]
      );
      return docRes.rows[0];
    }
  }
}
