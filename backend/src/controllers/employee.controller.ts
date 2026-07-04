import { Request, Response, NextFunction } from 'express';
import { EmployeeService } from '../services/employee.service';
import { sendSuccess } from '../utils/response.util';
import { AuthenticatedRequest } from '../types';
import { UpdateEmployeeInput } from '../validators/employee.validator';
import { env } from '../config/env';

const employeeService = new EmployeeService();

// ─── GET /employees/:id ───────────────────────────────────────────────────────

export const getProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { sub: userId, role } = (req as AuthenticatedRequest).user;
    
    // Support the /profile shortcut (if route is /profile, id is undefined)
    if (!id || id === 'profile') {
      const data = await employeeService.getProfileByUserId(userId, role);
      sendSuccess(res, data, 'Profile fetched successfully');
      return;
    }

    const data = await employeeService.getProfile(id, userId, role);
    sendSuccess(res, data, 'Employee profile fetched successfully');
  } catch (err) {
    next(err);
  }
};

// ─── PATCH /employees/:id ─────────────────────────────────────────────────────

export const updateProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { sub: userId, role } = (req as AuthenticatedRequest).user;
    const input = req.body as UpdateEmployeeInput;

    const data = await employeeService.updateProfile(id, input, userId, role);
    sendSuccess(res, data, 'Profile updated successfully');
  } catch (err) {
    next(err);
  }
};

// ─── POST /employees/:id/documents ────────────────────────────────────────────

export const uploadDocument = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { sub: userId, role } = (req as AuthenticatedRequest).user;
    const { fileType } = req.body; // e.g., 'profile_picture', 'resume', 'id_proof'

    if (!req.file) {
      res.status(400).json({ success: false, message: 'No file uploaded' });
      return;
    }

    if (!fileType) {
      res.status(400).json({ success: false, message: 'fileType is required in body' });
      return;
    }

    // Construct a public URL based on the uploaded file
    const fileUrl = `${req.protocol}://${req.get('host')}/${env.UPLOAD_DIR}/${req.file.filename}`;

    const data = await employeeService.uploadDocument(id, fileType, fileUrl, userId, role);
    sendSuccess(res, data, 'Document uploaded successfully');
  } catch (err) {
    next(err);
  }
};
