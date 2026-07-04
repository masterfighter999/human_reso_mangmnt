import { Request, Response, NextFunction } from 'express';
import { AttendanceService } from '../services/attendance.service';
import { sendSuccess } from '../utils/response.util';
import { AuthenticatedRequest } from '../types';
import { CheckInInput, CheckOutInput } from '../validators/attendance.validator';

const attendanceService = new AttendanceService();

export const checkIn = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { sub: userId } = (req as AuthenticatedRequest).user;
    const input = req.body as CheckInInput;
    const data = await attendanceService.checkIn(userId, input);
    sendSuccess(res, data, 'Checked in successfully');
  } catch (err) {
    next(err);
  }
};

export const checkOut = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { sub: userId } = (req as AuthenticatedRequest).user;
    const input = req.body as CheckOutInput;
    const data = await attendanceService.checkOut(userId, input);
    sendSuccess(res, data, 'Checked out successfully');
  } catch (err) {
    next(err);
  }
};

export const getAttendance = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { sub: userId, role } = (req as AuthenticatedRequest).user;
    const employeeId = req.query.employeeId as string | undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    const data = await attendanceService.getAttendance(userId, role, employeeId, startDate, endDate);
    sendSuccess(res, data, 'Attendance fetched successfully');
  } catch (err) {
    next(err);
  }
};
