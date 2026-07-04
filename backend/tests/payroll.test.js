// Simple test script for HRMS Payroll Calculations
// Run with: node backend/tests/payroll.test.js

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

function calculatePayslip({
  monthlyWage,
  totalDaysInMonth,
  unpaidLeaveDays,
  absentDays,
  pfRatePercent = 12.00,
  professionalTax = 200.00
}) {
  const struct = calculateComponents(monthlyWage);
  
  const payableDays = Math.max(0, totalDaysInMonth - unpaidLeaveDays - absentDays);
  const ratio = payableDays / totalDaysInMonth;
  
  const basicEarned = parseFloat((struct.basic * ratio).toFixed(2));
  const hraEarned = parseFloat((struct.hra * ratio).toFixed(2));
  const standardAllowanceEarned = parseFloat((struct.standardAllowance * ratio).toFixed(2));
  const performanceBonusEarned = parseFloat((struct.performanceBonus * ratio).toFixed(2));
  const ltaEarned = parseFloat((struct.lta * ratio).toFixed(2));
  const fixedAllowanceEarned = parseFloat((struct.fixedAllowance * ratio).toFixed(2));

  const grossEarnings = parseFloat((basicEarned + hraEarned + standardAllowanceEarned + performanceBonusEarned + ltaEarned + fixedAllowanceEarned).toFixed(2));

  const pfDeduction = parseFloat((basicEarned * (pfRatePercent / 100)).toFixed(2));
  const ptDeduction = professionalTax;
  const totalDeductions = parseFloat((pfDeduction + ptDeduction).toFixed(2));

  const netPay = parseFloat((grossEarnings - totalDeductions).toFixed(2));

  return {
    payableDays,
    basicEarned,
    hraEarned,
    standardAllowanceEarned,
    performanceBonusEarned,
    ltaEarned,
    fixedAllowanceEarned,
    grossEarnings,
    pfDeduction,
    ptDeduction,
    totalDeductions,
    netPay
  };
}

function runTests() {
  console.log("=== RUNNING PAYROLL CALCULATION TESTS ===");

  // Test 1: Component sums on 50,000 wage
  console.log("\nTest 1: Component breakdown for 50,000 monthly wage");
  const wage = 50000.00;
  const comps = calculateComponents(wage);
  console.log("Breakdown:", comps);
  const totalEarnings = comps.basic + comps.hra + comps.standardAllowance + comps.performanceBonus + comps.lta + comps.fixedAllowance;
  console.log(`Sum of components: ${totalEarnings}`);
  if (Math.abs(totalEarnings - wage) < 0.01) {
    console.log("PASS: Components sum to exactly the monthly wage!");
  } else {
    console.error(`FAIL: Sum is ${totalEarnings}, expected ${wage}`);
  }

  // Test 2: Payslip with zero leaves/absences for July (31 days)
  console.log("\nTest 2: Pro-rating with 0 absences in July (31 days)");
  const fullPayslip = calculatePayslip({
    monthlyWage: 50000,
    totalDaysInMonth: 31,
    unpaidLeaveDays: 0,
    absentDays: 0
  });
  console.log("Full July Payslip:", fullPayslip);
  if (fullPayslip.payableDays === 31 && fullPayslip.grossEarnings === 50000.00) {
    console.log("PASS: 100% pay calculated for full attendance!");
  } else {
    console.error("FAIL: Incorrect full pay calculation");
  }

  // Test 3: Pro-rating with 3 unpaid leave days and 2 absent days in July
  console.log("\nTest 3: Pro-rating with 3 unpaid leaves and 2 absences in July");
  const proRatedPayslip = calculatePayslip({
    monthlyWage: 50000,
    totalDaysInMonth: 31,
    unpaidLeaveDays: 3,
    absentDays: 2
  });
  console.log("Pro-rated July Payslip (26 payable days):", proRatedPayslip);
  const expectedPayableDays = 26;
  const expectedRatio = expectedPayableDays / 31;
  const expectedGross = parseFloat((50000.00 * expectedRatio).toFixed(2));
  
  if (proRatedPayslip.payableDays === expectedPayableDays && Math.abs(proRatedPayslip.grossEarnings - expectedGross) < 0.1) {
    console.log("PASS: Payslip correctly pro-rated for 26/31 days!");
  } else {
    console.error(`FAIL: Got gross ${proRatedPayslip.grossEarnings}, expected ~${expectedGross}`);
  }

  console.log("\n=== PAYROLL TESTS FINISHED ===");
}

runTests();
