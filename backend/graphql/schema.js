const { buildSchema } = require('graphql');

const schema = buildSchema(`
  enum UserRole {
    admin
    employee
  }

  enum EmploymentStatus {
    active
    on_leave
    suspended
    terminated
  }

  enum AttendanceStatus {
    present
    absent
    half_day
    leave
  }

  enum LeaveStatus {
    pending
    approved
    rejected
  }

  enum LeaveCategory {
    paid
    sick
    unpaid
  }

  type User {
    id: ID!
    login_id: String!
    email: String!
    role: UserRole!
    email_verified: Boolean!
    created_at: String!
    updated_at: String!
  }

  type Employee {
    id: ID!
    user_id: ID!
    employee_code: String!
    first_name: String!
    last_name: String!
    phone: String
    address: String
    profile_picture_url: String
    department: String
    designation: String
    date_of_joining: String!
    employment_status: EmploymentStatus!
    reporting_manager_id: ID
    date_of_birth: String
    gender: String
    marital_status: String
    nationality: String
    personal_email: String
    residing_address: String
    about_me: String
    skills: [String]
    certifications: [String]
    interests: [String]
    created_at: String!
    updated_at: String!
    work_status: String
    salary_structure: SalaryStructure # Admin only
  }

  type Attendance {
    id: ID!
    employee_id: ID!
    att_date: String!
    check_in: String
    check_out: String
    work_hours: Float
    extra_hours: Float
    status: AttendanceStatus!
    remarks: String
    created_at: String!
    updated_at: String!
    employee_name: String
  }

  type LeaveType {
    id: ID!
    name: String!
    category: LeaveCategory!
    max_days_per_year: Int
    description: String
  }

  type LeaveRequest {
    id: ID!
    employee_id: ID!
    leave_type_id: ID!
    start_date: String!
    end_date: String!
    duration_days: Float!
    remarks: String
    attachment_url: String
    status: LeaveStatus!
    reviewed_by: ID
    review_comments: String
    reviewed_at: String
    created_at: String!
    updated_at: String!
    leave_type: LeaveType
    employee_name: String
  }

  type LeaveBalance {
    leave_type_id: ID!
    leave_type_name: String!
    leave_category: LeaveCategory!
    max_days: Int
    days_taken: Float!
    days_available: Float!
  }

  type SalaryStructure {
    id: ID!
    employee_id: ID!
    working_days_week: Int!
    break_time_mins: Int!
    bank_name: String
    account_number: String
    ifsc_code: String
    pan_no: String
    uan_no: String
    monthly_wage: Float!
    basic_pay: Float!
    hra: Float!
    standard_allowance: Float!
    performance_bonus: Float!
    lta: Float!
    fixed_allowance: Float!
    pf_rate_percent: Float!
    professional_tax: Float!
    effective_from: String!
    effective_to: String
  }

  type Payslip {
    id: ID!
    employee_id: ID!
    salary_structure_id: ID!
    pay_period_start: String!
    pay_period_end: String!
    total_days_in_month: Int!
    payable_days: Float!
    absent_days: Float!
    unpaid_leave_days: Float!
    basic_earned: Float!
    hra_earned: Float!
    standard_allowance_earned: Float!
    performance_bonus_earned: Float!
    lta_earned: Float!
    fixed_allowance_earned: Float!
    gross_earnings: Float!
    pf_deduction: Float!
    pt_deduction: Float!
    total_deductions: Float!
    net_pay: Float!
    status: String!
    created_at: String!
    updated_at: String!
    employee_name: String
    employee_code: String
  }

  type AuthPayload {
    token: String!
    user: User!
    employee: Employee
  }

  type Query {
    me: User
    myProfile: Employee
    employees: [Employee!]!
    employee(id: ID!): Employee
    attendanceLogs(employeeId: ID, month: String): [Attendance!]!
    activeCheckIn: Attendance
    leaveRequests(employeeId: ID, status: String): [LeaveRequest!]!
    leaveTypes: [LeaveType!]!
    leaveBalances(employeeId: ID): [LeaveBalance!]!
    payslips(employeeId: ID, month: String): [Payslip!]!
  }

  type Mutation {
    registerAdmin(
      companyName: String!
      name: String!
      email: String!
      phone: String!
      password: String!
    ): AuthPayload!

    login(
      loginIdOrEmail: String!
      password: String!
    ): AuthPayload!

    createEmployee(
      firstName: String!
      lastName: String!
      email: String!
      phone: String!
      department: String
      designation: String
      dateOfJoining: String!
      monthlyWage: Float!
    ): Employee!

    updateProfile(
      id: ID # Only admin can specify this to update others
      phone: String
      address: String
      profilePictureUrl: String
      department: String
      designation: String
      dateOfBirth: String
      gender: String
      marital_status: String
      nationality: String
      personalEmail: String
      residingAddress: String
      aboutMe: String
      skills: [String]
      certifications: [String]
      interests: [String]
    ): Employee!

    updateSalaryStructure(
      employeeId: ID!
      workingDaysWeek: Int!
      breakTimeMins: Int!
      bankName: String
      accountNumber: String
      ifscCode: String
      panNo: String
      uanNo: String
      monthlyWage: Float!
    ): SalaryStructure!

    changePassword(
      currentPassword: String!
      newPassword: String!
    ): Boolean!

    checkIn(remarks: String): Attendance!
    checkOut(remarks: String): Attendance!
    
    applyLeave(
      leaveTypeId: ID!
      startDate: String!
      endDate: String!
      remarks: String
      attachmentUrl: String
    ): LeaveRequest!

    reviewLeave(
      leaveRequestId: ID!
      status: LeaveStatus!
      reviewComments: String
    ): LeaveRequest!

    generatePayslips(month: String!): [Payslip!]!
  }
`);

module.exports = schema;
