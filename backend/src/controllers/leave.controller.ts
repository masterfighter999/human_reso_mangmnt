import { Request, Response, NextFunction } from 'express';
import { LeaveService } from '../services/leave.service';
import { sendSuccess } from '../utils/response.util';
import { AuthenticatedRequest } from '../types';
import { ApplyLeaveInput, UpdateLeaveStatusInput } from '../validators/leave.validator';

const leaveService = new LeaveService();

export const applyLeave = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { sub: userId } = (req as AuthenticatedRequest).user;
    const input = req.body as ApplyLeaveInput;
    const data = await leaveService.applyLeave(userId, input);
    sendSuccess(res, data, 'Leave request submitted successfully');
  } catch (err) {
    next(err);
  }
};

export const getLeaves = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { sub: userId, role } = (req as AuthenticatedRequest).user;
    const employeeId = req.query.employeeId as string | undefined;

    const data = await leaveService.getLeaves(userId, role, employeeId);
    sendSuccess(res, data, 'Leaves fetched successfully');
  } catch (err) {
    next(err);
  }
};

export const updateLeaveStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { sub: userId } = (req as AuthenticatedRequest).user;
    const input = req.body as UpdateLeaveStatusInput;

    const data = await leaveService.updateLeaveStatus(id, userId, input);
    sendSuccess(res, data, 'Leave status updated successfully');
  } catch (err) {
    next(err);
  }
};
