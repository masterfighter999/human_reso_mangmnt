import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { validate } from '../middlewares/validate.middleware';
import { authenticate } from '../middlewares/auth.middleware';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema,
} from '../validators/auth.validator';

const router = Router();

// Public routes
router.post('/register',       validate(registerSchema),      authController.register);
router.post('/login',          validate(loginSchema),         authController.login);
router.post('/refresh',        validate(refreshTokenSchema),  authController.refresh);
router.post('/logout',         validate(refreshTokenSchema),  authController.logout);

// Protected routes
router.get('/me',              authenticate,                  authController.me);
router.post('/change-password', authenticate, validate(changePasswordSchema), authController.changePassword);

export default router;
