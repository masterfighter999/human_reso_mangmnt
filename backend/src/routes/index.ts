import { Router, Request, Response } from 'express';
import authRoutes from './auth.routes';
import { checkDbConnection } from '../config/database';

const router = Router();

// ─── Health Check ─────────────────────────────────────────────────────────────
router.get('/health', async (_req: Request, res: Response) => {
  const dbOk = await checkDbConnection();
  const status = dbOk ? 200 : 503;

  res.status(status).json({
    success: dbOk,
    message: dbOk ? 'Service healthy' : 'Database unavailable',
    data: {
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      db: dbOk ? 'connected' : 'disconnected',
    },
  });
});

// ─── Domain Routes ────────────────────────────────────────────────────────────
router.use('/auth', authRoutes);

// More feature routes will be added here as we build them:
// router.use('/employees', employeeRoutes);
// router.use('/attendance', attendanceRoutes);
// router.use('/leave', leaveRoutes);
// router.use('/payroll', payrollRoutes);

export default router;
