import { Router } from 'express';
import * as dashboardController from '../controllers/dashboard.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();

// ─── Protected Routes ─────────────────────────────────────────────────────────

// All dashboard routes require authentication
router.use(authenticate);

// Admin / HR dashboard - Restricted to admins
router.get(
  '/admin',
  authorize('ADMIN'),
  dashboardController.getAdminDashboard
);

// Employee dashboard - Any authenticated user (admin or employee) can view their own
// Or you could restrict to 'employee' only: authorize('EMPLOYEE', 'ADMIN')
router.get(
  '/employee',
  authorize('ADMIN', 'EMPLOYEE'),
  dashboardController.getEmployeeDashboard
);

export default router;
