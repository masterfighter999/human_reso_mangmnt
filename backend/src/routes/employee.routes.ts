import { Router } from 'express';
import * as employeeController from '../controllers/employee.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { updateEmployeeSchema } from '../validators/employee.validator';
import { upload } from '../middlewares/upload.middleware';

const router = Router();

router.use(authenticate);

// /profile is a shortcut for /employees/:id where :id is the current user's employee ID
router.get('/profile', employeeController.getProfile);
router.get('/:id', employeeController.getProfile);
router.patch('/:id', validate(updateEmployeeSchema), employeeController.updateProfile);
router.post('/:id/documents', upload.single('file'), employeeController.uploadDocument);

export default router;
