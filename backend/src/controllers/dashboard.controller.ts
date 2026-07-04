import { Request, Response, NextFunction } from 'express';
import { DashboardService } from '../services/dashboard.service';
import { sendSuccess } from '../utils/response.util';
import { AuthenticatedRequest } from '../types';

const dashboardService = new DashboardService();

// ─── GET /dashboard/admin ─────────────────────────────────────────────────────

export const getAdminDashboard = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const stats = await dashboardService.getAdminDashboardStats();
    sendSuccess(res, stats, 'Admin dashboard stats fetched successfully');
  } catch (err) {
    next(err);
  }
};

// ─── GET /dashboard/employee ──────────────────────────────────────────────────

export const getEmployeeDashboard = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { sub: userId } = (req as AuthenticatedRequest).user;
    const stats = await dashboardService.getEmployeeDashboardStats(userId);
    sendSuccess(res, stats, 'Employee dashboard stats fetched successfully');
  } catch (err) {
    next(err);
  }
};
