import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { collection, doc, getDoc, setDoc, updateDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from './AuthContext';
import { useNotifications } from './NotificationContext';
import { useRotaContext } from './RotaContext';
import { differenceInDays, parseISO, isWithinInterval, addDays, format, startOfYear, endOfYear } from 'date-fns';
import {
  LeaveRequest,
  LeaveEntitlement,
  TeamCalendarEntry,
  LeaveAvailability,
  LeaveType,
  LeaveStats
} from '../types/leave';

interface LeaveContextType {
  leaveRequests: LeaveRequest[];
  leaveEntitlement: LeaveEntitlement | null;
  isLoading: boolean;
  requestLeave: (request: Omit<LeaveRequest, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  approveLeave: (leaveId: string, approvalNotes?: string) => Promise<void>;
  rejectLeave: (leaveId: string, approvalNotes?: string) => Promise<void>;
  cancelLeave: (leaveId: string) => Promise<void>;
  updateLeaveRequest: (leaveId: string, updates: Partial<LeaveRequest>) => Promise<void>;
  getLeaveForPeriod: (startDate: string, endDate: string) => Promise<LeaveRequest[]>;
  isOnLeave: (userId: string, date: string) => Promise<boolean>;
  getLeaveConflicts: (startDate: string, endDate: string) => Promise<{
    userId: string;
    dates: string[];
    type: LeaveType;
  }[]>;
  calculateLeaveDays: (startDate: string, endDate: string) => number;
  checkLeaveAvailability: (startDate: string, endDate: string, leaveType: LeaveType) => Promise<LeaveAvailability>;
  teamCalendar: TeamCalendarEntry[];
  getLeaveStats: () => LeaveStats;
  createLeaveRequest: (request: Omit<LeaveRequest, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => Promise<void>;
}

const LeaveContext = createContext<LeaveContextType | null>(null);

export const useLeave = () => {
  const context = useContext(LeaveContext);
  if (!context) {
    throw new Error('useLeave must be used within a LeaveProvider');
  }
  return context;
};

interface Props {
  children: React.ReactNode;
}

export const LeaveProvider: React.FC<Props> = ({ children }) => {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [leaveEntitlement, setLeaveEntitlement] = useState<LeaveEntitlement | null>(null);
  const [teamCalendar, setTeamCalendar] = useState<TeamCalendarEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { currentUser, userData } = useAuth();
  const { notify } = useNotifications();
  const { currentRota } = useRotaContext();

  // Load leave requests
  const loadLeaveRequests = useCallback(async () => {
    if (!currentUser) return;

    try {
      setIsLoading(true);
      const leaveQuery = query(collection(db, 'leave-requests'));
      const snapshot = await getDocs(leaveQuery);
      const requests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as LeaveRequest[];
      setLeaveRequests(requests);
    } catch (error) {
      console.error('Error loading leave requests:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  // Load leave entitlement
  const loadLeaveEntitlement = useCallback(async () => {
    if (!currentUser) return;

    try {
      const entitlementDoc = await getDoc(doc(db, 'leave-entitlements', currentUser.uid));
      if (entitlementDoc.exists()) {
        setLeaveEntitlement(entitlementDoc.data() as LeaveEntitlement);
      }
    } catch (error) {
      console.error('Error loading leave entitlement:', error);
    }
  }, [currentUser]);

  // Calculate leave days excluding weekends
  const calculateLeaveDays = useCallback((startDate: string, endDate: string): number => {
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    let days = 0;
    let current = start;

    while (current <= end) {
      if (current.getDay() !== 0 && current.getDay() !== 6) {
        days++;
      }
      current = addDays(current, 1);
    }

    return days;
  }, []);

  // Check if user is on leave
  const isOnLeave = useCallback(async (userId: string, date: string): Promise<boolean> => {
    return leaveRequests.some(request => 
      request.userId === userId &&
      request.status === 'approved' &&
      isWithinInterval(parseISO(date), {
        start: parseISO(request.startDate),
        end: parseISO(request.endDate)
      })
    );
  }, [leaveRequests]);

  // Get leave conflicts
  const getLeaveConflicts = useCallback(async (
    startDate: string,
    endDate: string
  ) => {
    if (!currentRota) return [];

    const conflicts: { userId: string; dates: string[]; type: LeaveType }[] = [];
    const start = parseISO(startDate);
    const end = parseISO(endDate);

    leaveRequests
      .filter(request => request.status === 'approved')
      .forEach(request => {
        const requestStart = parseISO(request.startDate);
        const requestEnd = parseISO(request.endDate);

        if (isWithinInterval(requestStart, { start, end }) ||
            isWithinInterval(requestEnd, { start, end })) {
          const affectedDates = [];
          let current = requestStart;

          while (current <= requestEnd) {
            if (isWithinInterval(current, { start, end })) {
              affectedDates.push(format(current, 'yyyy-MM-dd'));
            }
            current = addDays(current, 1);
          }

          conflicts.push({
            userId: request.userId,
            dates: affectedDates,
            type: request.leaveType
          });
        }
      });

    return conflicts;
  }, [currentRota, leaveRequests]);

  // Check leave availability
  const checkLeaveAvailability = useCallback(async (
    startDate: string,
    endDate: string,
    leaveType: LeaveType
  ): Promise<LeaveAvailability> => {
    if (!currentUser || !currentRota || !leaveEntitlement) {
      return { isAvailable: false, conflicts: [] };
    }

    const conflicts: LeaveAvailability['conflicts'] = [];

    // Check leave year boundaries
    const leaveYearStart = startOfYear(new Date());
    const leaveYearEnd = endOfYear(new Date());
    const requestStart = parseISO(startDate);
    const requestEnd = parseISO(endDate);

    if (!isWithinInterval(requestStart, { start: leaveYearStart, end: leaveYearEnd }) ||
        !isWithinInterval(requestEnd, { start: leaveYearStart, end: leaveYearEnd })) {
      conflicts.push({
        type: 'leave-year',
        message: 'Leave must be taken within the current leave year'
      });
    }

    // Check balance for annual leave
    if (leaveType === 'Annual Leave') {
      const requestedDays = calculateLeaveDays(startDate, endDate);
      if (requestedDays > leaveEntitlement.remainingDays) {
        conflicts.push({
          type: 'balance',
          message: 'Insufficient leave balance'
        });
      }
    }

    // Check team limit (max 2 staff on leave per day)
    const overlappingLeave = leaveRequests.filter(request => 
      request.status === 'approved' &&
      isWithinInterval(parseISO(startDate), {
        start: parseISO(request.startDate),
        end: parseISO(request.endDate)
      })
    );

    if (overlappingLeave.length >= 2) {
      conflicts.push({
        type: 'team-limit',
        message: 'Maximum number of staff already on leave during this period'
      });
    }

    // Check role coverage
    const affectedShifts = currentRota.shifts.filter(shift =>
      isWithinInterval(parseISO(shift.date), {
        start: parseISO(startDate),
        end: parseISO(endDate)
      })
    );

    const hasUncoveredShifts = affectedShifts.some(shift =>
      shift.assignedStaff.some(assignment =>
        typeof assignment === 'string'
          ? assignment === currentUser.uid
          : assignment.userId === currentUser.uid
      )
    );

    if (hasUncoveredShifts) {
      conflicts.push({
        type: 'role-coverage',
        message: 'You are scheduled for shifts during this period'
      });
    }

    return {
      isAvailable: conflicts.length === 0,
      conflicts
    };
  }, [currentUser, currentRota, leaveEntitlement, leaveRequests, calculateLeaveDays]);

  // Get leave statistics
  const getLeaveStats = useCallback((): LeaveStats => {
    const stats: LeaveStats = {
      pending: 0,
      approved: 0,
      declined: 0,
      cancelled: 0,
      totalDays: 0,
      byType: {
        'Annual Leave': 0,
        'Unpaid Leave': 0,
        'Emergency Leave': 0
      },
      bySite: {}
    };

    leaveRequests.forEach(request => {
      // Update status counts
      stats[request.status]++;

      // Update type counts
      stats.byType[request.leaveType]++;

      // Update site counts
      stats.bySite[request.site] = (stats.bySite[request.site] || 0) + 1;

      // Update total days for approved leave
      if (request.status === 'approved') {
        stats.totalDays += request.totalDays;
      }
    });

    return stats;
  }, [leaveRequests]);

  // Update leave request
  const updateLeaveRequest = useCallback(async (
    leaveId: string,
    updates: Partial<LeaveRequest>
  ): Promise<void> => {
    try {
      const leaveRef = doc(db, 'leave-requests', leaveId);
      await updateDoc(leaveRef, {
        ...updates,
        updatedAt: new Date().toISOString()
      });

      setLeaveRequests(prev =>
        prev.map(request =>
          request.id === leaveId
            ? { ...request, ...updates, updatedAt: new Date().toISOString() }
            : request
        )
      );

      notify({
        type: 'system',
        title: 'Leave Request Updated',
        message: 'The leave request has been updated',
        userId: currentUser?.uid || '',
        priority: 'low'
      });
    } catch (error) {
      console.error('Error updating leave request:', error);
      throw error;
    }
  }, [currentUser, notify]);

  // Create leave request
  const createLeaveRequest = useCallback(async (
    request: Omit<LeaveRequest, 'id' | 'status' | 'createdAt' | 'updatedAt'>
  ): Promise<void> => {
    if (!currentUser) return;

    try {
      const leaveRef = doc(collection(db, 'leave-requests'));
      const now = new Date().toISOString();
      const newRequest: LeaveRequest = {
        id: leaveRef.id,
        ...request,
        status: 'pending',
        createdAt: now,
        updatedAt: now
      };

      await setDoc(leaveRef, newRequest);
      setLeaveRequests(prev => [...prev, newRequest]);

      notify({
        type: 'system',
        title: 'Leave Request Created',
        message: 'Your leave request has been submitted',
        userId: currentUser.uid,
        priority: 'low'
      });
    } catch (error) {
      console.error('Error creating leave request:', error);
      throw error;
    }
  }, [currentUser, notify]);

  // Initial data load
  useEffect(() => {
    if (currentUser) {
      loadLeaveRequests();
      loadLeaveEntitlement();
    }
  }, [currentUser, loadLeaveRequests, loadLeaveEntitlement]);

  const value = {
    leaveRequests,
    leaveEntitlement,
    isLoading,
    requestLeave: createLeaveRequest,
    approveLeave: async (leaveId: string, approvalNotes?: string) => {
      const updates: Partial<LeaveRequest> = {
        status: 'approved',
        approvedBy: currentUser?.uid,
        approvalNotes,
        updatedAt: new Date().toISOString()
      };
      await updateLeaveRequest(leaveId, updates);
    },
    rejectLeave: async (leaveId: string, approvalNotes?: string) => {
      const updates: Partial<LeaveRequest> = {
        status: 'declined',
        approvalNotes,
        updatedAt: new Date().toISOString()
      };
      await updateLeaveRequest(leaveId, updates);
    },
    cancelLeave: async (leaveId: string) => {
      const updates: Partial<LeaveRequest> = {
        status: 'cancelled',
        updatedAt: new Date().toISOString()
      };
      await updateLeaveRequest(leaveId, updates);
    },
    updateLeaveRequest,
    getLeaveForPeriod: async (startDate: string, endDate: string) => {
      return leaveRequests.filter(request =>
        isWithinInterval(parseISO(request.startDate), {
          start: parseISO(startDate),
          end: parseISO(endDate)
        })
      );
    },
    isOnLeave,
    getLeaveConflicts,
    calculateLeaveDays,
    checkLeaveAvailability,
    teamCalendar,
    getLeaveStats,
    createLeaveRequest
  };

  return (
    <LeaveContext.Provider value={value}>
      {children}
    </LeaveContext.Provider>
  );
};
