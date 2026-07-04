import { Router } from 'express';
import * as leaveController from '../controllers/leave.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { applyLeaveSchema, updateLeaveStatusSchema } from '../validators/leave.validator';

const router = Router();

router.use(authenticate);

router.post('/', validate(applyLeaveSchema), leaveController.applyLeave);
router.get('/', leaveController.getLeaves);

// Admin only route
router.patch('/:id/status', authorize('ADMIN'), validate(updateLeaveStatusSchema), leaveController.updateLeaveStatus);

export default router;
