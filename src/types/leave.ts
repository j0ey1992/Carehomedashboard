export type LeaveStatus = 'pending' | 'approved' | 'declined' | 'cancelled';
export type LeaveType = 'Annual Leave' | 'Unpaid Leave' | 'Emergency Leave';

export interface LeaveRequest {
  id: string;
  userId: string;
  staffName: string;
  site: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  leaveType: LeaveType;
  status: LeaveStatus;
  notes?: string;
  approvedBy?: string;
  approvalNotes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface LeaveEntitlement {
  id: string;
  userId: string;
  site: string;
  leaveYear: string;  // "2023-2024"
  totalEntitlement: number;  // 32 days
  remainingDays: number;
  carryForwardDays: number;
  createdAt: string;
  updatedAt: string;
}

export interface TeamCalendarEntry {
  date: string;
  userIds: string[];
  type: LeaveType;
}

export interface LeaveAvailability {
  isAvailable: boolean;
  conflicts: {
    type: 'team-limit' | 'role-coverage' | 'shift-assigned' | 'balance' | 'leave-year';
    message: string;
  }[];
}

export interface LeaveStats {
  pending: number;
  approved: number;
  declined: number;
  cancelled: number;
  totalDays: number;
  byType: Record<LeaveType, number>;
  bySite: Record<string, number>;
}
